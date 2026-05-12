## Etapa 3 — Camada UI Visual Law AI (streaming + versões in-memory)

Objetivo: Entregar a interface da nova plataforma Visual Law AI consumindo o store Zustand (Etapa 1) e o serviço `streamVisualLaw` / edge function `generate-visual-law` (Etapa 2). Integração **incremental**: o `VisualLawPanel` legado (PDF) continua intocado; adicionamos uma nova aba paralela.

### Escopo

1. **Nova aba "Visual Law AI (beta)"** em `src/routes/_authenticated.pecas.$id.tsx`, ao lado de "Visual Law" (legado). Sem mexer na aba atual nem no fluxo de PDF.
2. **Componente raiz** `VisualLawAIPanel` que monta o store via `initFromPiece(pieceId, contentText, { pieceType, area })` no mount.
3. **Layout Split Pane** (`layout/SplitPane.tsx`): coluna esquerda = viewer (flex-1), coluna direita = sidebar fixa (w-[360px]); colapsável em <lg para tabs.

### Componentes a criar

```
src/components/visual-law/
  VisualLawAIPanel.tsx              ← orquestrador (store + handlers)
  layout/SplitPane.tsx              ← grid responsivo
  viewer/DocumentViewer.tsx         ← render do documentContent + cursor de stream
  viewer/StreamingCursor.tsx        ← caret pulsante durante isGenerating
  viewer/MarkdownDocument.tsx       ← parser leve (react-markdown já existe? senão render whitespace-pre-wrap)
  sidebar/ConfigSidebar.tsx         ← tabs (Direção / Densidade / Aparência / Elementos)
  sidebar/DirectionPicker.tsx       ← organizar | explicar | mais_visual
  sidebar/DensityPicker.tsx         ← enxuto | padrao | confortavel
  sidebar/AppearancePicker.tsx      ← fontFamily + primaryColor
  sidebar/ElementsToggle.tsx        ← toggles dos 10 VLElementKey
  sidebar/RefinementPrompt.tsx      ← textarea + botão "Gerar/Regenerar"
  versions/VersionsTimeline.tsx     ← lista vertical com select/rollback
  versions/VersionCard.tsx          ← item (timestamp, direction, badges)
  loading/StreamingIndicator.tsx    ← barra superior com tokens/seg
  loading/CancelButton.tsx          ← chama cancelGeneration()
  legal/.gitkeep                    ← placeholders Etapa 5
```

### Fluxo de geração

1. Usuário ajusta config na sidebar (mutações via `setConfig` / `toggleElement`).
2. Digita prompt em `RefinementPrompt` e clica "Gerar".
3. Handler monta `VLGeneratePayload` a partir do estado e chama `runGeneration(payload)` de `services/visual-law/generate.ts` (já existe).
4. `runGeneration` controla `startGeneration` → `appendToken` (viewer atualiza em tempo real) → `finishGeneration` (cria versão e seleciona).
5. Erros 429/402 viram `toast.error` legível; cancelamento via `cancelGeneration()`.

### Versões (in-memory nesta etapa)

- Persistência fica para Etapa 4 (nova tabela `vl_versions`). Por ora: array em memória do store.
- `VersionsTimeline` permite `selectVersion(id)` (read-only) e `rollbackTo(id)` (reaplica config + content).
- Diff/preview entre versões fica fora do escopo.

### Integração na rota

```tsx
// _authenticated.pecas.$id.tsx
<TabsTrigger value="visual-ai">Visual Law AI (beta)</TabsTrigger>
...
<TabsContent value="visual-ai">
  <VisualLawAIPanel
    pieceId={piece.id}
    contentText={piece.content_text ?? ""}
    pieceType={piece.piece_type}
    area={piece.area}
    onContentChange={(t) => /* opcional: salvar draft no piece */}
  />
</TabsContent>
```

### Design system

- Tokens semânticos do `src/styles.css` (`bg-card`, `border-border/50`, `text-gradient-brand`, `bg-gradient-brand`).
- Tipografia: Inter no chrome; viewer respeita `documentConfig.fontFamily` (Helvetica/Charter/Playfair) via `style={{ fontFamily }}`.
- `documentConfig.primaryColor` aplicado como CSS var inline no viewer (`--vl-primary`) para títulos e barras laterais.
- Densidade controla `leading` e `space-y` no viewer.

### Acessibilidade

- Sidebar com `role="complementary"` e `aria-label`.
- Cancelar geração: tecla `Esc` enquanto `isGenerating`.
- Streaming respeita `prefers-reduced-motion` (sem cursor pulsante).
- Botões com `aria-busy`/`aria-live="polite"` para o viewer.

### Performance

- Viewer renderiza `documentContent` com `useMemo` particionado por blocos (split em `\n\n`) para evitar reflow do documento inteiro a cada token.
- `streamBuffer` não é usado no viewer (já é appended a `documentContent`); fica para `StreamingIndicator` mostrar contagem de tokens.
- Sidebar memoizada (`memo` + selectors fatiados do Zustand) para não re-renderizar a cada token.

### Fora do escopo (próximas etapas)

- **Etapa 4**: persistência de versões (tabela `vl_versions` + RLS + sync no store).
- **Etapa 5**: análise de risco e validação jurídica (`VLLegalValidation`, `VLRiskAnalysis`) com painel próprio.
- **Etapa 6**: export (PDF/DOCX) da nova plataforma — o PDF atual segue na aba legada.

### Smoke test

1. `bun run build` deve passar.
2. Abrir uma peça → aba "Visual Law AI (beta)" → conteúdo aparece no viewer.
3. Selecionar direção `mais_visual`, densidade `confortavel`, prompt "Adicione timeline dos fatos" → clicar Gerar → tokens aparecem em streaming.
4. Cancelar no meio → conteúdo volta à última versão.
5. Gerar 2x → timeline mostra 2 versões → clicar versão anterior restaura conteúdo + config.

### Riscos / mitigação

- Conflito de nomes com painel legado → namespace `VisualLawAI*`.
- Edge function exige JWT → cliente já injeta `supabase.auth.getSession()` no `streamVisualLaw` (verificar; ajustar se necessário).
- `react-markdown` pode não estar instalado → usar `whitespace-pre-wrap` simples nesta etapa.
