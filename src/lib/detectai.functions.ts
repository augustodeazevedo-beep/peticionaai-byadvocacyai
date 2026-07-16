import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { auditPieceContent } from "@/lib/audit.functions";
import type {
  AuditFinding,
  AuditSeverity,
  AuditCategory,
} from "@/lib/audit/types";
import { SEVERITY_WEIGHT, computeScore } from "@/lib/audit/types";

export type BlockThreshold = "off" | "low" | "medium" | "high" | "critical";

export type RulePref = { enabled: boolean; severity: AuditSeverity };

/** Chaves de regra = categorias emitidas pelos detectores + granulares. */
export const RULE_KEYS: AuditCategory[] = [
  "prompt_injection",
  "jailbreak",
  "pii_leak",
  "fake_citation",
  "fake_jurisprudence",
  "hallucination",
];

export type DetectAiPrefs = {
  block_threshold: BlockThreshold;
  enforce_on_finalize: boolean;
  enforce_on_export: boolean;
  llm_auditor_enabled: boolean;
  rules: Record<AuditCategory, RulePref>;
  allowlist_patterns: string[];
};

export const DEFAULT_PREFS: DetectAiPrefs = {
  block_threshold: "high",
  enforce_on_finalize: true,
  enforce_on_export: true,
  llm_auditor_enabled: true,
  rules: {
    prompt_injection: { enabled: true, severity: "high" },
    jailbreak: { enabled: true, severity: "high" },
    pii_leak: { enabled: true, severity: "medium" },
    fake_citation: { enabled: true, severity: "medium" },
    fake_jurisprudence: { enabled: true, severity: "high" },
    hallucination: { enabled: true, severity: "high" },
  },
  allowlist_patterns: [],
};

const severitySchema = z.enum(["low", "medium", "high", "critical"]);
const rulePrefSchema = z.object({ enabled: z.boolean(), severity: severitySchema });

const prefsInput = z.object({
  block_threshold: z.enum(["off", "low", "medium", "high", "critical"]),
  enforce_on_finalize: z.boolean(),
  enforce_on_export: z.boolean(),
  llm_auditor_enabled: z.boolean(),
  rules: z.record(rulePrefSchema),
  allowlist_patterns: z.array(z.string().min(1).max(300)).max(50),
});

function normalizePrefs(raw: unknown): DetectAiPrefs {
  const r = (raw ?? {}) as Partial<DetectAiPrefs>;
  const rules: Record<AuditCategory, RulePref> = { ...DEFAULT_PREFS.rules };
  const incoming = (r.rules ?? {}) as Record<string, RulePref | undefined>;
  for (const key of RULE_KEYS) {
    const v = incoming[key];
    if (v && typeof v.enabled === "boolean" && severitySchema.safeParse(v.severity).success) {
      rules[key] = v;
    }
  }
  return {
    block_threshold: (r.block_threshold as BlockThreshold) ?? DEFAULT_PREFS.block_threshold,
    enforce_on_finalize: r.enforce_on_finalize ?? DEFAULT_PREFS.enforce_on_finalize,
    enforce_on_export: r.enforce_on_export ?? DEFAULT_PREFS.enforce_on_export,
    llm_auditor_enabled: r.llm_auditor_enabled ?? DEFAULT_PREFS.llm_auditor_enabled,
    rules,
    allowlist_patterns: Array.isArray(r.allowlist_patterns)
      ? r.allowlist_patterns.filter((s): s is string => typeof s === "string").slice(0, 50)
      : [],
  };
}

/** Carrega prefs; autocria com defaults se ausente. */
export const getDetectAiPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DetectAiPrefs> => {
    const { supabase, userId } = context;
    const sb = supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => { eq: (col: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> } };
        insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        upsert: (v: Record<string, unknown>, opts?: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
        delete: () => { eq: (col: string, v: string) => Promise<{ error: { message: string } | null }> };
      };
    };
    const { data } = await sb
      .from("detectai_prefs")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) return normalizePrefs(data);
    // autocria
    await sb.from("detectai_prefs").insert({
      user_id: userId,
      block_threshold: DEFAULT_PREFS.block_threshold,
      enforce_on_finalize: DEFAULT_PREFS.enforce_on_finalize,
      enforce_on_export: DEFAULT_PREFS.enforce_on_export,
      llm_auditor_enabled: DEFAULT_PREFS.llm_auditor_enabled,
      rules: DEFAULT_PREFS.rules as unknown as Record<string, unknown>,
      allowlist_patterns: DEFAULT_PREFS.allowlist_patterns,
    });
    return DEFAULT_PREFS;
  });

export const saveDetectAiPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => prefsInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // valida regex antes de gravar
    for (const p of data.allowlist_patterns) {
      try { new RegExp(p); } catch { throw new Error(`Regex inválida: ${p}`); }
    }
    const payload = {
      user_id: userId,
      block_threshold: data.block_threshold,
      enforce_on_finalize: data.enforce_on_finalize,
      enforce_on_export: data.enforce_on_export,
      llm_auditor_enabled: data.llm_auditor_enabled,
      rules: data.rules as unknown as Record<string, unknown>,
      allowlist_patterns: data.allowlist_patterns,
    };
    const sb = supabase as unknown as {
      from: (t: string) => {
        upsert: (v: Record<string, unknown>, opts?: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { error } = await sb.from("detectai_prefs").upsert(payload, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetDetectAiPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const sb = supabase as unknown as {
      from: (t: string) => { delete: () => { eq: (c: string, v: string) => Promise<unknown> } };
    };
    await sb.from("detectai_prefs").delete().eq("user_id", userId);
    return { ok: true };
  });

// -------- Gate --------

const SEV_RANK: Record<AuditSeverity, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const THRESHOLD_RANK: Record<BlockThreshold, number> = {
  off: 99,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function compileAllowlist(patterns: string[]): RegExp[] {
  const out: RegExp[] = [];
  for (const p of patterns) {
    try { out.push(new RegExp(p, "i")); } catch { /* ignore invalid */ }
  }
  return out;
}

/** Aplica as prefs sobre uma lista de findings — filtra, ajusta severidade, aplica allowlist. */
export function applyPrefsToFindings(
  findings: AuditFinding[],
  prefs: DetectAiPrefs,
): AuditFinding[] {
  const allow = compileAllowlist(prefs.allowlist_patterns);
  const out: AuditFinding[] = [];
  for (const f of findings) {
    const rule = prefs.rules[f.category];
    if (rule && rule.enabled === false) continue;
    if (allow.some((re) => re.test(f.snippet))) continue;
    const severity = rule?.severity ?? f.severity;
    out.push({ ...f, severity });
  }
  return out;
}

export type GateTrigger = "finalize" | "export_docx" | "export_pdf" | "export_html" | "manual";

const gateInput = z.object({
  pieceId: z.string().uuid(),
  trigger: z.enum(["finalize", "export_docx", "export_pdf", "export_html", "manual"]),
  force: z.boolean().optional(),
});

export type GateResult = {
  blocked: boolean;
  enforced: boolean;
  threshold: BlockThreshold;
  score: number;
  findings: AuditFinding[];
  blocking: AuditFinding[];
  trigger: GateTrigger;
  auditId: string | null;
  llm_skipped: boolean;
};

export const runDetectAiGate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => gateInput.parse(d))
  .handler(async ({ data, context }): Promise<GateResult> => {
    const { supabase, userId } = context;
    const sb = supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => { eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> } };
      };
    };
    const { data: prefsRow } = await sb
      .from("detectai_prefs")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const prefs = normalizePrefs(prefsRow ?? undefined);

    const audit = await auditPieceContent({
      data: { pieceId: data.pieceId, force: data.force ?? false, skipLlm: !prefs.llm_auditor_enabled },
    });
    const raw = (audit?.findings ?? []) as unknown as AuditFinding[];
    const filtered = applyPrefsToFindings(raw, prefs);
    const active = filtered.filter((f) => !f.dismissed);

    const threshold = prefs.block_threshold;
    const thresholdRank = THRESHOLD_RANK[threshold];
    const blocking = threshold === "off"
      ? []
      : active.filter((f) => SEV_RANK[f.severity] >= thresholdRank);

    const enforced =
      (data.trigger === "finalize" && prefs.enforce_on_finalize) ||
      (data.trigger !== "finalize" && data.trigger !== "manual" && prefs.enforce_on_export);

    return {
      blocked: enforced && blocking.length > 0,
      enforced,
      threshold,
      score: computeScore(filtered),
      findings: filtered,
      blocking,
      trigger: data.trigger,
      auditId: (audit as { id?: string })?.id ?? null,
      llm_skipped: !prefs.llm_auditor_enabled,
    };
  });

/** Utilitário client-side: se `blocked=true`, mostra dialog; devolve `true` se pode prosseguir. */
export function severityRank(s: AuditSeverity) { return SEV_RANK[s]; }
export function thresholdRank(t: BlockThreshold) { return THRESHOLD_RANK[t]; }
export const SEVERITY_WEIGHT_MAP = SEVERITY_WEIGHT;