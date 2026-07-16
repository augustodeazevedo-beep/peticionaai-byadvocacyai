import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash } from "node:crypto";
import {
  detectHeuristics,
  extractCitations,
  mergeFindings,
} from "@/lib/audit/detectors";
import type { AuditFinding, AuditResult, AuditStages } from "@/lib/audit/types";
import { computeScore } from "@/lib/audit/types";

const auditTextInput = z.object({
  text: z.string().trim().min(1).max(80_000),
  context: z.string().max(20_000).optional().nullable(),
  skipLlm: z.boolean().optional(),
});

function hashContent(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

async function runPipeline(
  text: string,
  context: string | null,
  skipLlm: boolean,
): Promise<AuditResult> {
  const stages: AuditStages = {};

  const tA = Date.now();
  const heur = detectHeuristics(text);
  stages.A_heuristics_ms = Date.now() - tA;

  const citations = extractCitations(text);
  stages.B_citations_count = citations.length;

  const { validateCitations } = await import("@/lib/audit/citations.server");
  const jurisApiKey = process.env.JURISPRUDENCIAS_AI_API_KEY ?? null;
  const tC = Date.now();
  const citeFindings = await validateCitations(citations, {
    jurisApiKey,
    timeoutMs: 6000,
  });
  stages.C_jurisprudence_ms = Date.now() - tC;

  let llmFindings: AuditFinding[] = [];
  let model: string | null = null;
  if (!skipLlm && process.env.LOVABLE_API_KEY) {
    const { llmAudit } = await import("@/lib/audit/llm.server");
    const r = await llmAudit({
      content: text,
      context: context ?? null,
      citations,
      apiKey: process.env.LOVABLE_API_KEY,
    });
    llmFindings = r.findings;
    model = r.model;
    stages.D_llm_ms = r.ms;
    stages.D_model = r.model;
  } else {
    stages.D_skipped = true;
  }

  const findings = mergeFindings(heur, citeFindings, llmFindings);
  return {
    score: computeScore(findings),
    findings,
    stages,
    content_hash: hashContent(text),
    model,
  };
}

/** Auditoria ad-hoc de texto (workspace, sem persistir). */
export const auditRawText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => auditTextInput.parse(d))
  .handler(async ({ data }) => {
    return runPipeline(data.text, data.context ?? null, data.skipLlm ?? false);
  });

const auditPieceInput = z.object({
  pieceId: z.string().uuid(),
  force: z.boolean().optional(),
  skipLlm: z.boolean().optional(),
});

/** Auditoria persistida de uma peça. Cacheia por content_hash. */
export const auditPieceContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => auditPieceInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: piece, error } = await supabase
      .from("pieces")
      .select("id, content_text, input_data, user_id")
      .eq("id", data.pieceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!piece) throw new Error("Peça não encontrada");
    const text = piece.content_text ?? "";
    if (!text.trim()) throw new Error("A peça está vazia — nada a auditar.");

    const hash = hashContent(text);

    if (!data.force) {
      const { data: cached } = await supabase
        .from("piece_audits")
        .select("*")
        .eq("piece_id", data.pieceId)
        .eq("content_hash", hash)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cached) return cached;
    }

    const ctx =
      typeof piece.input_data === "object" && piece.input_data
        ? JSON.stringify(piece.input_data).slice(0, 15_000)
        : null;

    const result = await runPipeline(text, ctx, data.skipLlm ?? false);

    const { data: saved, error: insErr } = await supabase
      .from("piece_audits")
      .insert({
        piece_id: data.pieceId,
        user_id: userId,
        content_hash: result.content_hash,
        findings: result.findings as unknown as any,
        score: result.score,
        model: result.model,
        stages: result.stages as unknown as any,
      })
      .select("*")
      .single();
    if (insErr) throw new Error(insErr.message);
    return saved;
  });

const latestInput = z.object({ pieceId: z.string().uuid() });

/** Última auditoria da peça (para cache no cliente). */
export const getLatestAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => latestInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("piece_audits")
      .select("*")
      .eq("piece_id", data.pieceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return row ?? null;
  });

const dismissInput = z.object({
  auditId: z.string().uuid(),
  findingId: z.string().min(1),
  reason: z.enum(["false_positive", "acknowledged", "wont_fix"]),
});

/** Marca um finding como descartado (falso positivo / reconhecido / não corrigir). */
export const dismissAuditFinding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => dismissInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("piece_audits")
      .select("id, findings")
      .eq("id", data.auditId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Auditoria não encontrada");
    const findings = (row.findings as unknown as AuditFinding[]) ?? [];
    const next = findings.map((f) =>
      f.id === data.findingId
        ? { ...f, dismissed: { reason: data.reason, at: new Date().toISOString() } }
        : f,
    );
    const score = computeScore(next);
    const { data: updated, error: updErr } = await context.supabase
      .from("piece_audits")
      .update({ findings: next as unknown as any, score })
      .eq("id", data.auditId)
      .select("*")
      .single();
    if (updErr) throw new Error(updErr.message);
    return updated;
  });

const applyFixInput = z.object({
  pieceId: z.string().uuid(),
  auditId: z.string().uuid(),
  findingId: z.string().min(1),
});

/** Aplica a correção sugerida (substitui [start,end) em content_text). */
export const applyAuditFix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => applyFixInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: audit, error: aErr } = await supabase
      .from("piece_audits")
      .select("id, findings, content_hash")
      .eq("id", data.auditId)
      .maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!audit) throw new Error("Auditoria não encontrada");

    const findings = (audit.findings as unknown as AuditFinding[]) ?? [];
    const target = findings.find((f) => f.id === data.findingId);
    if (!target) throw new Error("Finding não encontrado");

    const { data: piece, error: pErr } = await supabase
      .from("pieces")
      .select("id, content_text")
      .eq("id", data.pieceId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!piece) throw new Error("Peça não encontrada");

    const text = piece.content_text ?? "";
    if (hashContent(text) !== audit.content_hash) {
      throw new Error(
        "O conteúdo da peça mudou desde a auditoria. Rode a auditoria novamente antes de aplicar.",
      );
    }
    const start = target.start;
    const end = target.end;
    if (start < 0 || end > text.length || start > end) {
      throw new Error("Intervalo do finding inválido.");
    }
    const replacement = target.suggested_fix ?? "";
    const nextText = text.slice(0, start) + replacement + text.slice(end);

    const { error: upErr } = await supabase
      .from("pieces")
      .update({ content_text: nextText })
      .eq("id", data.pieceId);
    if (upErr) throw new Error(upErr.message);

    // Marca o finding como resolvido no audit atual (não gera novo audit — cliente reexecuta se quiser).
    const nextFindings = findings.map((f) =>
      f.id === data.findingId
        ? { ...f, dismissed: { reason: "fixed", at: new Date().toISOString() } }
        : f,
    );
    const score = computeScore(nextFindings);
    await supabase
      .from("piece_audits")
      .update({ findings: nextFindings as unknown as any, score })
      .eq("id", data.auditId);

    return { ok: true, content_text: nextText, delta: replacement.length - (end - start) };
  });