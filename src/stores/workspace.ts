import { create } from "zustand";

export type ThinkingLevel = "baixo" | "medio" | "alto";
export type WorkspaceMode = "padrao" | "agentico";
export type Verbosity = "curto" | "longo";

export type ContextItemType =
  | "documento"
  | "modelo"
  | "legislacao"
  | "jurisprudencia"
  | "web"
  | "biblioteca_item"
  | "bibliotecario"
  | "prompt"
  | "transcricao"
  | "url"
  | "texto";

export type ContextItem = {
  id: string;
  type: ContextItemType;
  title: string;
  preview?: string;
};

export type AgentConfig = {
  ask_questions: boolean;
  approve_outline: boolean;
  traceable_references: boolean;
  use_jurisprudence: boolean;
  use_legislation: boolean;
  use_models: boolean;
  use_calculator: boolean;
  verbosity: Verbosity;
};

type WorkspaceState = {
  workspaceId: string | null;
  title: string;
  instructions: string;
  mode: WorkspaceMode;
  thinking: ThinkingLevel;
  agent: AgentConfig;
  contextItems: ContextItem[];

  setField: <K extends keyof WorkspaceState>(key: K, value: WorkspaceState[K]) => void;
  setAgent: (patch: Partial<AgentConfig>) => void;
  addContextItem: (item: ContextItem) => void;
  removeContextItem: (id: string) => void;
  reset: () => void;
};

const defaultAgent: AgentConfig = {
  ask_questions: false,
  approve_outline: false,
  traceable_references: true,
  use_jurisprudence: true,
  use_legislation: true,
  use_models: false,
  use_calculator: false,
  verbosity: "longo",
};

export const useWorkspace = create<WorkspaceState>((set) => ({
  workspaceId: null,
  title: "Nova minuta",
  instructions: "",
  mode: "padrao",
  thinking: "medio",
  agent: defaultAgent,
  contextItems: [],

  setField: (key, value) => set({ [key]: value } as Partial<WorkspaceState>),
  setAgent: (patch) => set((s) => ({ agent: { ...s.agent, ...patch } })),
  addContextItem: (item) =>
    set((s) =>
      s.contextItems.some((i) => i.id === item.id)
        ? s
        : { contextItems: [...s.contextItems, item] },
    ),
  removeContextItem: (id) =>
    set((s) => ({ contextItems: s.contextItems.filter((i) => i.id !== id) })),
  reset: () =>
    set({
      workspaceId: null,
      title: "Nova minuta",
      instructions: "",
      mode: "padrao",
      thinking: "medio",
      agent: defaultAgent,
      contextItems: [],
    }),
}));