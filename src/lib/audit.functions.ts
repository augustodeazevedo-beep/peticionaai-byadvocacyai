import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AuditFinding } from "@/lib/audit/types";
import { computeScore } from "@/lib/audit/types";
import { hashContent, runPipeline } from "@/lib/audit/pipeline.server";
import { applyPrefsToFindings, DEFAULT_PREFS } from "@/lib/detectai.functions";
import type { DetectAiPrefs } from "@/lib/detectai.functions";

const auditTextInput = z.object({
  text: z.string().trim().min(1).max(80_000),
  context: z.string().max(20_000).optional().nullable(),
  skipLlm: z.boolean().optional(),
});

/** Auditoria ad-hoc de texto (workspace, sem persistir). */
export const auditRawText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => auditTextInput.parse(d))
  .handler(async ({ data }) => {
    return runPipeline(data.text, data.context ?? null, data.skipLlm ?? false);
  });

/** Auditoria avulsa (cola-texto) — persiste em detectai_checks e aplica prefs do usuário. */
const pasteInput = z.object({
  text: z.string().trim().min(1).max(30_000),
  context: z.string().max(20_000).optional().nullable(),
  skipLlm: z.boolean().optional(),
});

export const auditPasteText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pasteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const sb = supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => { eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> } };
        insert: (v: Record<string, unknown>) => { select: (c: string) => { single: () => Promise<{ data: unknown; error: { message: string } | null }> } };
      };
    };
    const { data: prefsRow } = await sb
      .from("detectai_prefs")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const prefs = (prefsRow ?? DEFAULT_PREFS) as DetectAiPrefs;
    const skipLlm = data.skipLlm ?? !(prefs?.llm_auditor_enabled ?? true);

    const result = await runPipeline(data.text, data.context ?? null, skipLlm);
    const filtered = applyPrefsToFindings(result.findings, prefs);
    const score = filtered.length === 0 ? 100 : result.score;

    const preview = data.text.slice(0, 240);
    const { data: saved, error } = await sb
      .from("detectai_checks")
      .insert({
        user_id: userId,
        text_preview: preview,
        score,
        findings: filtered as unknown as Record<string, unknown>,
        model: result.model,
        stages: result.stages as unknown as Record<string, unknown>,
        content_hash: result.content_hash,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return saved as unknown as {
      id: string;
      user_id: string;
      text_preview: string;
      score: number;
      findings: AuditFinding[];
      model: string | null;
      stages: Record<string, unknown>;
      content_hash: string;
      created_at: string;
    };
  });

/** Últimas 20 verificações Detect.AI do usuário (histórico da página standalone). */
export const listDetectAiChecks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("detectai_checks")
      .select("id, text_preview, score, findings, model, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    return (data ?? []) as unknown as Array<{
      id: string;
      text_preview: string;
      score: number;
      findings: AuditFinding[];
      model: string | null;
      created_at: string;
    }>;
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