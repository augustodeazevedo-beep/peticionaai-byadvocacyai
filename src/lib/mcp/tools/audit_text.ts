import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import type { AuditFinding, AuditSeverity } from "@/lib/audit/types";

function summarize(findings: AuditFinding[], score: number) {
  const active = findings.filter((f) => !f.dismissed);
  const bySev: Record<AuditSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const f of active) bySev[f.severity]++;
  const line = `score=${score} · critical=${bySev.critical} · high=${bySev.high} · medium=${bySev.medium} · low=${bySev.low}`;
  if (active.length === 0) return `Detect.AI: nenhum achado. ${line}`;
  const top = active
    .slice(0, 8)
    .map(
      (f) =>
        `- [${f.severity.toUpperCase()}][${f.category}] ${f.explanation}${
          f.suggested_fix ? ` → sugestão: ${f.suggested_fix}` : ""
        }`,
    )
    .join("\n");
  return `Detect.AI (${line}):\n${top}`;
}

export default defineTool({
  name: "audit_text",
  title: "Detect.AI — auditar texto",
  description:
    "Audita um texto jurídico com o pipeline Detect.AI e retorna achados (prompt injection, jailbreak, PII exposta, citações/leis/súmulas suspeitas, jurisprudência suspeita, alucinações). Cada achado inclui severidade, trecho (start/end + snippet), explicação e correção sugerida. Não persiste nada.",
  inputSchema: {
    text: z.string().trim().min(1).max(80_000).describe("Texto a ser auditado."),
    context: z
      .string()
      .max(20_000)
      .optional()
      .describe("Contexto opcional do caso (JSON ou texto) para melhorar a detecção de alucinações."),
    skip_llm: z
      .boolean()
      .optional()
      .describe("Se true, pula o estágio D (auditor LLM). Mais rápido e não consome créditos de IA."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ text, context, skip_llm }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    try {
      const { runPipeline } = await import("@/lib/audit/pipeline.server");
      const result = await runPipeline(text, context ?? null, skip_llm ?? false);
      return {
        content: [{ type: "text", text: summarize(result.findings, result.score) }],
        structuredContent: {
          score: result.score,
          model: result.model,
          stages: result.stages,
          content_hash: result.content_hash,
          findings: result.findings,
        },
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Falha ao auditar: ${(e as Error).message}` }],
        isError: true,
      };
    }
  },
});