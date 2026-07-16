import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import type { AuditFinding, AuditSeverity } from "@/lib/audit/types";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function summarize(findings: AuditFinding[], score: number) {
  const active = findings.filter((f) => !f.dismissed);
  const bySev: Record<AuditSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const f of active) bySev[f.severity]++;
  return `Detect.AI: score=${score} · critical=${bySev.critical} · high=${bySev.high} · medium=${bySev.medium} · low=${bySev.low}`;
}

export default defineTool({
  name: "audit_piece",
  title: "Detect.AI — auditar peça",
  description:
    "Roda o pipeline Detect.AI sobre o conteúdo de uma peça do usuário autenticado e persiste o resultado em piece_audits (cacheado por hash de conteúdo). Retorna score, findings com severidade/trecho/correção sugerida e metadados do estágio.",
  inputSchema: {
    piece_id: z.string().uuid().describe("UUID da peça a auditar."),
    force: z
      .boolean()
      .optional()
      .describe("Se true, ignora o cache por content_hash e roda o pipeline novamente."),
    skip_llm: z
      .boolean()
      .optional()
      .describe("Se true, pula o estágio D (auditor LLM)."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: true },
  handler: async ({ piece_id, force, skip_llm }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };

    try {
      const supabase = supabaseForUser(ctx);
      const userId = ctx.getUserId();

      const { data: piece, error } = await supabase
        .from("pieces")
        .select("id, content_text, input_data, user_id")
        .eq("id", piece_id)
        .maybeSingle();
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      if (!piece)
        return { content: [{ type: "text", text: "Peça não encontrada." }], isError: true };
      const text = piece.content_text ?? "";
      if (!text.trim())
        return { content: [{ type: "text", text: "A peça está vazia — nada a auditar." }], isError: true };

      const { hashContent, runPipeline } = await import("@/lib/audit/pipeline.server");
      const hash = hashContent(text);

      if (!force) {
        const { data: cached } = await supabase
          .from("piece_audits")
          .select("*")
          .eq("piece_id", piece_id)
          .eq("content_hash", hash)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cached) {
          const findings = (cached.findings as unknown as AuditFinding[]) ?? [];
          return {
            content: [{ type: "text", text: `${summarize(findings, cached.score ?? 0)} (cache)` }],
            structuredContent: { audit: cached, findings },
          };
        }
      }

      const ctxStr =
        typeof piece.input_data === "object" && piece.input_data
          ? JSON.stringify(piece.input_data).slice(0, 15_000)
          : null;

      const result = await runPipeline(text, ctxStr, skip_llm ?? false);

      const { data: saved, error: insErr } = await supabase
        .from("piece_audits")
        .insert({
          piece_id,
          user_id: userId,
          content_hash: result.content_hash,
          findings: result.findings as unknown as any,
          score: result.score,
          model: result.model,
          stages: result.stages as unknown as any,
        })
        .select("*")
        .single();
      if (insErr) return { content: [{ type: "text", text: insErr.message }], isError: true };

      return {
        content: [{ type: "text", text: summarize(result.findings, result.score) }],
        structuredContent: { audit: saved, findings: result.findings },
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Falha ao auditar peça: ${(e as Error).message}` }],
        isError: true,
      };
    }
  },
});