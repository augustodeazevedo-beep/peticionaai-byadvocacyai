import { create } from "zustand";
import {
  DEFAULT_VL_CONFIG,
  type VLDocumentConfig,
  type VLElementKey,
  type VLLegalMetadata,
  type VLLegalValidation,
  type VLRiskAnalysis,
  type VLVersion,
} from "@/types/visual-law";

export interface VisualLawState {
  pieceId: string | null;
  documentContent: string;
  documentConfig: VLDocumentConfig;
  versions: VLVersion[];
  selectedVersionId: string | null;
  isGenerating: boolean;
  streamBuffer: string;
  generationError: string | null;
  legalValidation: VLLegalValidation | null;
  riskAnalysis: VLRiskAnalysis | null;
  abortRef: AbortController | null;

  initFromPiece: (
    pieceId: string,
    content: string,
    metadata?: VLLegalMetadata,
  ) => void;
  setConfig: (patch: Partial<VLDocumentConfig>) => void;
  toggleElement: (key: VLElementKey) => void;
  startGeneration: (controller: AbortController) => void;
  appendToken: (chunk: string) => void;
  finishGeneration: (
    version: Omit<VLVersion, "id" | "timestamp"> & { id?: string; timestamp?: string },
  ) => void;
  failGeneration: (message: string) => void;
  cancelGeneration: () => void;
  selectVersion: (id: string) => void;
  rollbackTo: (id: string) => void;
  hydrateVersions: (versions: VLVersion[]) => void;
  replaceLastVersionMeta: (newId: string, newTimestamp: string) => void;
  reset: () => void;
}

const initialMetadata: VLLegalMetadata = {};

export const useVisualLawStore = create<VisualLawState>((set, get) => ({
  pieceId: null,
  documentContent: "",
  documentConfig: DEFAULT_VL_CONFIG,
  versions: [],
  selectedVersionId: null,
  isGenerating: false,
  streamBuffer: "",
  generationError: null,
  legalValidation: null,
  riskAnalysis: null,
  abortRef: null,

  initFromPiece: (pieceId, content, metadata = initialMetadata) => {
    const existing = get();
    if (existing.pieceId === pieceId && existing.versions.length > 0) return;
    set({
      pieceId,
      documentContent: content,
      documentConfig: DEFAULT_VL_CONFIG,
      versions: [],
      selectedVersionId: null,
      isGenerating: false,
      streamBuffer: "",
      generationError: null,
      legalValidation: null,
      riskAnalysis: null,
      abortRef: null,
    });
    void metadata;
  },

  setConfig: (patch) =>
    set((s) => ({ documentConfig: { ...s.documentConfig, ...patch } })),

  toggleElement: (key) =>
    set((s) => {
      const hidden = s.documentConfig.hiddenElements.includes(key)
        ? s.documentConfig.hiddenElements.filter((k) => k !== key)
        : [...s.documentConfig.hiddenElements, key];
      return {
        documentConfig: { ...s.documentConfig, hiddenElements: hidden },
      };
    }),

  startGeneration: (controller) =>
    set({
      isGenerating: true,
      streamBuffer: "",
      generationError: null,
      abortRef: controller,
    }),

  appendToken: (chunk) =>
    set((s) => ({
      streamBuffer: s.streamBuffer + chunk,
      documentContent: s.documentContent + chunk,
    })),

  finishGeneration: (version) => {
    const finalVersion: VLVersion = {
      id: version.id ?? crypto.randomUUID(),
      timestamp: version.timestamp ?? new Date().toISOString(),
      content: version.content,
      config: version.config,
      prompt: version.prompt,
      direction: version.direction,
      legalMetadata: version.legalMetadata,
      validation: version.validation,
      risk: version.risk,
    };
    set((s) => ({
      versions: [...s.versions, finalVersion],
      selectedVersionId: finalVersion.id,
      documentContent: finalVersion.content,
      isGenerating: false,
      streamBuffer: "",
      abortRef: null,
      legalValidation: finalVersion.validation ?? s.legalValidation,
      riskAnalysis: finalVersion.risk ?? s.riskAnalysis,
    }));
  },

  failGeneration: (message) => {
    const last = [...get().versions].pop();
    set({
      isGenerating: false,
      streamBuffer: "",
      generationError: message,
      abortRef: null,
      documentContent: last?.content ?? get().documentContent,
    });
  },

  cancelGeneration: () => {
    const { abortRef } = get();
    abortRef?.abort();
    const last = [...get().versions].pop();
    set({
      isGenerating: false,
      streamBuffer: "",
      abortRef: null,
      documentContent: last?.content ?? get().documentContent,
    });
  },

  selectVersion: (id) => {
    const v = get().versions.find((x) => x.id === id);
    if (!v) return;
    set({
      selectedVersionId: id,
      documentContent: v.content,
      documentConfig: v.config,
      legalValidation: v.validation ?? null,
      riskAnalysis: v.risk ?? null,
    });
  },

  rollbackTo: (id) => {
    const v = get().versions.find((x) => x.id === id);
    if (!v) return;
    set({
      selectedVersionId: id,
      documentContent: v.content,
      documentConfig: v.config,
      legalValidation: v.validation ?? null,
      riskAnalysis: v.risk ?? null,
    });
  },

  hydrateVersions: (versions) => {
    if (!versions.length) return;
    const last = versions[versions.length - 1];
    set({
      versions,
      selectedVersionId: last.id,
      documentContent: last.content,
      legalValidation: last.validation ?? null,
      riskAnalysis: last.risk ?? null,
    });
  },

  replaceLastVersionMeta: (newId, newTimestamp) => {
    set((s) => {
      if (!s.versions.length) return {} as Partial<VisualLawState>;
      const versions = [...s.versions];
      const last = versions[versions.length - 1];
      versions[versions.length - 1] = { ...last, id: newId, timestamp: newTimestamp };
      return {
        versions,
        selectedVersionId: s.selectedVersionId === last.id ? newId : s.selectedVersionId,
      };
    });
  },

  reset: () =>
    set({
      pieceId: null,
      documentContent: "",
      documentConfig: DEFAULT_VL_CONFIG,
      versions: [],
      selectedVersionId: null,
      isGenerating: false,
      streamBuffer: "",
      generationError: null,
      legalValidation: null,
      riskAnalysis: null,
      abortRef: null,
    }),
}));

export const selectActiveVersion = (s: VisualLawState): VLVersion | null =>
  s.versions.find((v) => v.id === s.selectedVersionId) ?? null;

export const selectVersionsTimeline = (s: VisualLawState): VLVersion[] => s.versions;

export const selectIsStreaming = (s: VisualLawState): boolean => s.isGenerating;

export const selectVisibleElements = (s: VisualLawState): VLElementKey[] => {
  const all: VLElementKey[] = [
    "timeline",
    "quadro_probatorio",
    "sintese_executiva",
    "blocos_jurisprudenciais",
    "fluxograma",
    "quadro_comparativo",
    "card_argumentativo",
    "destaque_normativo",
    "matriz_controversias",
    "pedidos_vinculados",
  ];
  const hidden = new Set(s.documentConfig.hiddenElements);
  return all.filter((k) => !hidden.has(k));
};