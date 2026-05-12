import { supabase } from "@/integrations/supabase/client";
import type {
  VLDirection,
  VLLegalMetadata,
  VLLegalValidation,
  VLRiskAnalysis,
} from "@/types/visual-law";

export interface AnalysisResult {
  validation: VLLegalValidation;
  risk: VLRiskAnalysis;
}

export interface AnalyzeInput {
  content: string;
  direction: VLDirection;
  legalMetadata: VLLegalMetadata;
}

export type AnalyzeError = "rate_limit" | "credits" | "unknown";

export async function runAnalysis(
  input: AnalyzeInput,
): Promise<{ ok: true; data: AnalysisResult } | { ok: false; error: AnalyzeError; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("analyze-visual-law", {
      body: input,
    });
    if (error) {
      const status = (error as { context?: { status?: number } })?.context?.status;
      if (status === 429) return { ok: false, error: "rate_limit", message: "Limite de requisições atingido." };
      if (status === 402) return { ok: false, error: "credits", message: "Créditos do Lovable AI esgotados." };
      return { ok: false, error: "unknown", message: error.message ?? "Falha na análise jurídica." };
    }
    if (!data || typeof data !== "object" || !("validation" in data) || !("risk" in data)) {
      return { ok: false, error: "unknown", message: "Resposta inválida da análise." };
    }
    return {
      ok: true,
      data: {
        validation: (data as AnalysisResult).validation,
        risk: (data as AnalysisResult).risk,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: "unknown",
      message: e instanceof Error ? e.message : "Falha inesperada na análise.",
    };
  }
}
