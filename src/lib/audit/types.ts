export type AuditSeverity = "low" | "medium" | "high" | "critical";
export type AuditCategory =
  | "prompt_injection"
  | "jailbreak"
  | "fake_citation"
  | "fake_jurisprudence"
  | "hallucination"
  | "pii_leak";

export type AuditFinding = {
  id: string;
  category: AuditCategory;
  severity: AuditSeverity;
  snippet: string;
  start: number;
  end: number;
  explanation: string;
  suggested_fix?: string;
  confidence: number; // 0..1
  evidence?: {
    source: string;
    url?: string | null;
    matched_id?: string | null;
    detail?: string | null;
  } | null;
  dismissed?: { reason: string; at: string } | null;
};

export type AuditStages = {
  A_heuristics_ms?: number;
  B_citations_count?: number;
  C_jurisprudence_ms?: number;
  D_llm_ms?: number;
  D_model?: string | null;
  D_skipped?: boolean;
};

export type AuditResult = {
  score: number; // 0..100 (100 = limpo)
  findings: AuditFinding[];
  stages: AuditStages;
  content_hash: string;
  model?: string | null;
};

export type ExtractedCitation = {
  kind:
    | "lei"
    | "sumula"
    | "recurso" // RE, REsp, AREsp
    | "habeas_corpus"
    | "acao_constitucional" // ADI, ADPF, ADC
    | "outros";
  raw: string;
  start: number;
  end: number;
  identifier: string;
  court?: string | null;
};

export const SEVERITY_WEIGHT: Record<AuditSeverity, number> = {
  low: 3,
  medium: 8,
  high: 20,
  critical: 40,
};

export function computeScore(findings: AuditFinding[]): number {
  const active = findings.filter((f) => !f.dismissed);
  const penalty = active.reduce((s, f) => s + SEVERITY_WEIGHT[f.severity], 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}