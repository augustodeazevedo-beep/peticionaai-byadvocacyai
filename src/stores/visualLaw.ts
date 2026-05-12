import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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
  configByPiece: Record<string, VLDocumentConfig>;
  versions: VLVersion[];
  selectedVersionId: string | null;
  isGenerating: boolean;
  streamBuffer: string;
  generationError: string | null;
  legalValidation: VLLegalValidation | null;
  riskAnalysis: VLRiskAnalysis | null;
  abortRef: AbortController | null;
  analysisStatus: Record<string, "idle" | "running" | "done" | "error">;
  analysisError: Record<string, string | undefined>;
  compareTargetId: string | null;

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
  setAnalysisStatus: (versionId: string, status: "idle" | "running" | "done" | "error", message?: string) => void;
  setVersionAnalysis: (
    versionId: string,
    payload: { validation: VLLegalValidation; risk: VLRiskAnalysis },
  ) => void;
  setCompareTarget: (id: string | null) => void;
  reset: () => void;
}

const initialMetadata: VLLegalMetadata = {};

export const useVisualLawStore = create<VisualLawState>()(
  persist(
    (set, get) => ({
  pieceId: null,
  documentContent: "",
  documentConfig: DEFAULT_VL_CONFIG,
  configByPiece: {},
  versions: [],
  selectedVersionId: null,
  isGenerating: false,
  streamBuffer: "",
  generationError: null,
  legalValidation: null,
  riskAnalysis: null,
  abortRef: null,
  analysisStatus: {},
  analysisError: {},
  compareTargetId: null,

  initFromPiece: (pieceId, content, metadata = initialMetadata) => {
    const existing = get();
    if (existing.pieceId === pieceId && existing.versions.length > 0) return;
    const cachedConfig = existing.configByPiece[pieceId];
    set({
      pieceId,
      documentContent: content,
      documentConfig: cachedConfig ?? DEFAULT_VL_CONFIG,
      versions: [],
      selectedVersionId: null,
      isGenerating: false,
      streamBuffer: "",
      generationError: null,
      legalValidation: null,
      riskAnalysis: null,
      abortRef: null,
      analysisStatus: {},
      analysisError: {},
      compareTargetId: null,
    });
    void metadata;
  },

  setConfig: (patch) =>
    set((s) => {
      const documentConfig = { ...s.documentConfig, ...patch };
      const configByPiece = s.pieceId
        ? { ...s.configByPiece, [s.pieceId]: documentConfig }
        : s.configByPiece;
      return { documentConfig, configByPiece };
    }),

  toggleElement: (key) =>
    set((s) => {
      const hidden = s.documentConfig.hiddenElements.includes(key)
        ? s.documentConfig.hiddenElements.filter((k) => k !== key)
        : [...s.documentConfig.hiddenElements, key];
      const documentConfig = { ...s.documentConfig, hiddenElements: hidden };
      const configByPiece = s.pieceId
        ? { ...s.configByPiece, [s.pieceId]: documentConfig }
        : s.configByPiece;
      return { documentConfig, configByPiece };
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
    const analysisStatus: Record<string, "idle" | "running" | "done" | "error"> = {};
    for (const v of versions) {
      if (v.validation && v.risk) analysisStatus[v.id] = "done";
    }
    set({
      versions,
      selectedVersionId: last.id,
      documentContent: last.content,
      legalValidation: last.validation ?? null,
      riskAnalysis: last.risk ?? null,
      analysisStatus,
      analysisError: {},
    });
  },

  replaceLastVersionMeta: (newId, newTimestamp) => {
    set((s) => {
      if (!s.versions.length) return {} as Partial<VisualLawState>;
      const versions = [...s.versions];
      const last = versions[versions.length - 1];
      versions[versions.length - 1] = { ...last, id: newId, timestamp: newTimestamp };
      const analysisStatus = { ...s.analysisStatus };
      const analysisError = { ...s.analysisError };
      if (analysisStatus[last.id] !== undefined) {
        analysisStatus[newId] = analysisStatus[last.id];
        delete analysisStatus[last.id];
      }
      if (analysisError[last.id] !== undefined) {
        analysisError[newId] = analysisError[last.id];
        delete analysisError[last.id];
      }
      return {
        versions,
        selectedVersionId: s.selectedVersionId === last.id ? newId : s.selectedVersionId,
        analysisStatus,
        analysisError,
      };
    });
  },

  setAnalysisStatus: (versionId, status, message) =>
    set((s) => ({
      analysisStatus: { ...s.analysisStatus, [versionId]: status },
      analysisError: { ...s.analysisError, [versionId]: status === "error" ? (message ?? "Falha na análise") : undefined },
    })),

  setVersionAnalysis: (versionId, payload) =>
    set((s) => {
      const versions = s.versions.map((v) =>
        v.id === versionId ? { ...v, validation: payload.validation, risk: payload.risk } : v,
      );
      const isActive = s.selectedVersionId === versionId;
      return {
        versions,
        legalValidation: isActive ? payload.validation : s.legalValidation,
        riskAnalysis: isActive ? payload.risk : s.riskAnalysis,
        analysisStatus: { ...s.analysisStatus, [versionId]: "done" },
        analysisError: { ...s.analysisError, [versionId]: undefined },
      };
    }),

  setCompareTarget: (id) => set({ compareTargetId: id }),

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
      analysisStatus: {},
      analysisError: {},
      compareTargetId: null,
    }),
    }),
    {
      name: "visual-law-store",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ configByPiece: s.configByPiece }),
    },
  ),
);

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