import type {
  VLGeneratePayload,
  VLLegalValidation,
  VLRiskAnalysis,
} from "@/types/visual-law";

export interface StreamFinalPayload {
  content: string;
  validation?: VLLegalValidation;
  risk?: VLRiskAnalysis;
}

export interface StreamHandlers {
  onToken: (chunk: string) => void;
  onDone: (final: StreamFinalPayload) => void;
  onError: (err: Error) => void;
}

/**
 * Stub tipado para a Etapa 2 — implementação real chamará a edge function
 * `generate-visual-law` via SSE (Lovable AI Gateway, google/gemini-2.5-flash).
 */
export async function streamVisualLaw(
  _payload: VLGeneratePayload,
  _handlers: StreamHandlers,
  _signal: AbortSignal,
): Promise<void> {
  throw new Error("streamVisualLaw: implementação pendente (Etapa 2)");
}