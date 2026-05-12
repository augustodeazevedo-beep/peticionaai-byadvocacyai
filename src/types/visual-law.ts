export type VLDirection = "organizar" | "explicar" | "mais_visual";
export type VLDensity = "enxuto" | "padrao" | "confortavel";
export type VLFontFamily = "Helvetica" | "Charter" | "Playfair";

export type VLElementKey =
  | "timeline"
  | "quadro_probatorio"
  | "sintese_executiva"
  | "blocos_jurisprudenciais"
  | "fluxograma"
  | "quadro_comparativo"
  | "card_argumentativo"
  | "destaque_normativo"
  | "matriz_controversias"
  | "pedidos_vinculados";

export interface VLDocumentConfig {
  fontFamily: VLFontFamily;
  primaryColor: string;
  density: VLDensity;
  hiddenElements: VLElementKey[];
}

export interface VLLegalCitation {
  source: string;
  locator?: string;
}

export interface VLLegalMetadata {
  pieceType?: string;
  area?: string | null;
  citations?: VLLegalCitation[];
}

export interface VLRiskAnalysis {
  fragilidadesProbatorias: string[];
  viciosFormais: string[];
  riscosImprocedencia: string[];
  argumentosAdversos: string[];
}

export interface VLLegalValidation {
  alegacoesSemProva: string[];
  tesesSemFundamento: string[];
  pedidosOrfaos: string[];
  placeholders: string[];
}

export interface VLVersion {
  id: string;
  timestamp: string;
  content: string;
  config: VLDocumentConfig;
  prompt: string;
  direction: VLDirection;
  legalMetadata: VLLegalMetadata;
  validation?: VLLegalValidation;
  risk?: VLRiskAnalysis;
}

export interface VLGeneratePayload {
  currentContent: string;
  density: VLDensity;
  direction: VLDirection;
  refinementPrompt: string;
  config: VLDocumentConfig;
  legalMetadata: VLLegalMetadata;
  hiddenElements: VLElementKey[];
}

export const DEFAULT_VL_CONFIG: VLDocumentConfig = {
  fontFamily: "Helvetica",
  primaryColor: "#283753",
  density: "padrao",
  hiddenElements: [],
};