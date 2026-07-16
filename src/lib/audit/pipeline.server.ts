import { createHash } from "node:crypto";
import {
  detectHeuristics,
  extractCitations,
  mergeFindings,
} from "@/lib/audit/detectors";
import type { AuditFinding, AuditResult, AuditStages } from "@/lib/audit/types";
import { computeScore } from "@/lib/audit/types";

export function hashContent(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

export async function runPipeline(
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