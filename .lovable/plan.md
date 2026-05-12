# Fundação Visual Law — Etapa 1 (incremental, sem breaking changes)

Objetivo desta entrega: criar **somente a base arquitetural** (tipos, store Zustand, estrutura de pastas e contratos) que sustentará as próximas etapas (Edge Function streaming, novo layout Split Pane, sistema de versões/rollback). Nada de UI nova, nada de remoção do `VisualLawPanel` atual nem do PDF `@react-pdf/renderer`.

## Princípios

- Reutilizar tudo que já existe: `supabase` client, design system (`src/styles.css`, shadcn), `BrandMark`, padrão `*.functions.ts` / `*.server.ts`, e o `VisualLawPanel` atual continua funcionando intacto.
- Zero dependências novas (Zustand já está no projeto — store `src/stores/workspace.ts`).
- Tipagem estrita, sem `any`; selectors prontos para evitar re-renders.
- Cache-first by design: estado de versões e `documentContent` viverão na store; rollback será leitura local, jamais nova chamada de IA.

## Estrutura de pastas a criar

```text
src/
├── stores/
│   └── visualLaw.ts                  # Zustand store (state + actions + selectors)
├── types/
│   └── visual-law.ts                 # Tipos compartilhados (Version, Config, Direction, etc.)
├── services/
│   └── visual-law/
│       └── generate.ts               # Cliente SSE (stub tipado, sem fetch ainda)
├── hooks/
│   └── visual-law/
│       ├── useVisualLawStore.ts      # Selectors memoizados
│       └── useVisualLawVersions.ts   # Helpers de versão/rollback
├── lib/
│   └── visual-law/
│       ├── client.ts                 # (já existe — não tocar)
│       ├── document.tsx              # (já existe — não tocar)
│       ├── parser.ts                 # (já existe — não tocar)
│       └── types.ts                  # (já existe — não tocar)
└── components/
    └── visual-law/
        ├── VisualLawPanel.tsx        # (já existe — não tocar)
        ├── layout/                   # (vazio, .gitkeep) — futuro Split Pane
        ├── viewer/                   # (vazio, .gitkeep) — futuro Document Viewer
        ├── sidebar/                  # (vazio, .gitkeep) — futuras tabs
        ├── versions/                 # (vazio, .gitkeep) — painel de versões
        ├── legal/                    # (vazio, .gitkeep) — blocos jurídicos
        └── loading/                  # (vazio, .gitkeep) — overlay premium
```

Nenhum arquivo existente é modificado nesta etapa.

## Tipos (`src/types/visual-law.ts`)

```ts
export type VLDirection = "organizar" | "explicar" | "mais_visual";
export type VLDensity = "enxuto" | "padrao" | "confortavel";
export type VLFontFamily = "Helvetica" | "Charter" | "Playfair";

export interface VLDocumentConfig {
  fontFamily: VLFontFamily;
  primaryColor: string;          // hex; default #283753
  density: VLDensity;
  hiddenElements: VLElementKey[];
}

export type VLElementKey =
  | "timeline" | "quadro_probatorio" | "sintese_executiva"
  | "blocos_jurisprudenciais" | "fluxograma" | "quadro_comparativo"
  | "card_argumentativo" | "destaque_normativo"
  | "matriz_controversias" | "pedidos_vinculados";

export interface VLLegalMetadata {
  pieceType?: string;
  area?: string | null;
  citations?: { source: string; locator?: string }[];
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
  timestamp: string;             // ISO
  content: string;
  config: VLDocumentConfig;
  prompt: string;                // refinement prompt; "" para base
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
```

## Store Zustand (`src/stores/visualLaw.ts`)

State:
- `pieceId: string | null`
- `documentContent: string`
- `documentConfig: VLDocumentConfig`
- `versions: VLVersion[]`
- `selectedVersionId: string | null`
- `isGenerating: boolean`
- `streamBuffer: string`
- `generationError: string | null`
- `legalValidation: VLLegalValidation | null`
- `riskAnalysis: VLRiskAnalysis | null`
- `abortRef: AbortController | null` (não persistido)

Actions:
- `initFromPiece(pieceId, content, metadata)`
- `setConfig(patch)`
- `toggleElement(key)`
- `startGeneration(controller)` / `appendToken(chunk)` / `finishGeneration(versionPayload)` / `failGeneration(message)` / `cancelGeneration()`
- `selectVersion(id)` — **lê do array local, jamais chama IA**
- `rollbackTo(id)` — promove versão a "current" sem nova request
- `reset()`

Selectors exportados (evitar re-render):
- `selectActiveVersion`
- `selectVersionsTimeline`
- `selectIsStreaming`
- `selectVisibleElements`

Persistência: opcional via `persist` middleware com chave `visual-law:${pieceId}` (ativável depois — nesta etapa o middleware fica plugado mas com `skipHydration` e habilitação por flag).

## Cliente SSE stub (`src/services/visual-law/generate.ts`)

Apenas a **interface tipada** e o esqueleto (sem fetch real ainda):

```ts
export interface StreamHandlers {
  onToken: (chunk: string) => void;
  onDone: (final: { content: string; validation?: VLLegalValidation; risk?: VLRiskAnalysis }) => void;
  onError: (err: Error) => void;
}
export async function streamVisualLaw(
  payload: VLGeneratePayload,
  handlers: StreamHandlers,
  signal: AbortSignal,
): Promise<void> { /* TODO etapa 2 */ }
```

Isso garante que a Etapa 2 (Edge Function) plugue sem refator.

## Hooks (`src/hooks/visual-law/*`)

- `useVisualLawStore` re-exporta selectors com `shallow` para componentes futuros.
- `useVisualLawVersions` expõe `{ versions, active, select, rollback }`.

Nenhum hook é consumido nesta etapa (só preparação).

## Modelo LLM definido para Etapa 2

`google/gemini-2.5-flash` via Lovable AI Gateway (LOVABLE_API_KEY já provisionado). Sem novos secrets.

## O que **não** é feito agora

- Edge function `generate-visual-law` (Etapa 2)
- Novo layout Split Pane / loading overlay / sidebar tabs (Etapa 3)
- Migration de tabela para versões persistidas no servidor (Etapa 4 — hoje cabe na store/localStorage)
- Qualquer alteração no `VisualLawPanel.tsx`, `lib/visual-law/*`, rotas ou PDF atual

## Checklist de aceitação desta etapa

- [ ] `bun run build` passa sem erros
- [ ] Nenhum arquivo existente foi modificado
- [ ] Store importável: `import { useVisualLawStore } from "@/stores/visualLaw"` compila
- [ ] Tipos exportados de `@/types/visual-law` cobrem todo o spec
- [ ] App segue funcionando idêntico (login, /pecas/$id, aba Visual Law atual)

## Roadmap das próximas etapas (para alinhamento)

1. **Etapa 2** — Edge function `generate-visual-law` com SSE + integração no `streamVisualLaw`.
2. **Etapa 3** — Novo layout Split Pane (Viewer 70% / Sidebar 30%) atrás de feature flag, coexistindo com o painel atual.
3. **Etapa 4** — Loading overlay premium, painel de versões com rollback, persistência opcional.
4. **Etapa 5** — Camada legal (validação anti-alucinação, shadow cabinet, checklist final) e exports adicionais.
