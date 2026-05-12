## Etapa 7 — Polimento UX premium (loading, cache local, comparação)

O plano inicial (msg #139) detalhava itens que ainda não foram entregues nas Etapas 1–6:

- **Loading screen fullscreen premium** com progress ring verde, título "Analisando documento…", subtítulo "PODE LEVAR ATÉ 3 MINUTOS", percentual animado, fade-in + blur backdrop. Hoje só existe um `StreamingIndicator` minimalista.
- **Persistência local opcional** no store Zustand (cache-first, evita refetch ao reabrir a peça antes de versões hidratarem do servidor).
- **Comparação entre versões** (rollback já existe, mas não há diff visual para o usuário entender o que mudou).

Esta etapa fecha esses pontos sem tocar lógica de geração/análise/export.

### Arquivos novos

1. `src/components/visual-law/loading/GenerationOverlay.tsx`
   - Overlay fullscreen renderizado via portal quando `isGenerating === true`.
   - Progress ring SVG circular animado (cor `--primary`), percentual estimado pelo crescimento de `streamBuffer.length` vs. baseline (heurística cap 95% até `finishGeneration`).
   - Título "Analisando documento…", subtítulo "PODE LEVAR ATÉ 3 MINUTOS", contador de caracteres recebidos, botão "Cancelar" (chama `cancelGeneration`).
   - `backdrop-blur-md`, `bg-background/80`, `motion-safe:animate-in fade-in`.
   - Acessibilidade: `role="dialog"`, `aria-busy`, foco preso, ESC já existente cancela.

2. `src/components/visual-law/versions/VersionDiffDialog.tsx`
   - Dialog Radix que recebe `versionA`, `versionB`.
   - Diff por linha usando `diff` (lib pequena, ~10kb) ou implementação interna LCS simples (preferir interna para evitar dep nova).
   - Painel duas colunas: removidas (vermelho suave) / adicionadas (verde suave), tokens semânticos.
   - Header mostra timestamps + direção de cada versão.

3. `src/lib/visual-law/diff.ts`
   - `diffLines(a: string, b: string): DiffSegment[]` com algoritmo LCS simplificado (Myers básico). Sem dependência externa.

### Edits

- `src/stores/visualLaw.ts`
  - Envolver `create` com `persist` middleware (`zustand/middleware`) usando `partialize` que persiste APENAS `documentConfig` por `pieceId` (mapa `configByPiece: Record<string, VLDocumentConfig>`). Não persistir `versions` (já vêm do servidor) nem `streamBuffer`.
  - Em `initFromPiece`, hidratar `documentConfig` a partir do mapa se existir.
  - Adicionar selector `selectCompareTarget(id)` para o diff dialog.

- `src/components/visual-law/VisualLawAIPanel.tsx`
  - Renderizar `<GenerationOverlay />` no topo (irmão do `SplitPane`). Manter `StreamingIndicator` ou removê-lo (substituído pelo overlay).

- `src/components/visual-law/versions/VersionsTimeline.tsx`
  - Adicionar botão "Comparar" no `VersionCard` (ícone `GitCompare`) que define `compareTargetId` e abre o `VersionDiffDialog` comparando contra a versão ativa.

- `src/components/visual-law/versions/VersionCard.tsx`
  - Adicionar prop `onCompare` e o botão correspondente.

### Sem migração

Todas as mudanças são frontend. Nenhuma alteração no schema ou edge functions.

### Smoke test

1. Build passa.
2. Disparar geração → overlay fullscreen aparece com ring animado, percentual subindo conforme tokens chegam, botão Cancelar funcional.
3. ESC durante geração fecha o overlay e cancela.
4. Após terminar, overlay desaparece com fade-out.
5. Trocar fonte/cor/densidade na sidebar, recarregar página → config persiste por peça.
6. Clicar "Comparar" em uma versão antiga → dialog abre mostrando diff linha-a-linha contra a versão ativa.

### Fora do escopo

- Diff inline (granularidade de palavra) — fica para iteração futura.
- Histórico/listagem de exports anteriores (mencionado na Etapa 6 como futuro).
- Templates visuais avançados de PDF (capa, marca d'água).
- Compartilhamento público de versão.

### Riscos / mitigação

- **Percentual "fake"**: deixar explícito que é estimativa visual; cap em 95% até `finishGeneration` empurrar para 100%.
- **`persist` corrompendo store**: usar `version: 1` + `migrate` no-op para futuras quebras de schema.
- **Diff custoso em conteúdos longos**: limitar a 5k linhas; acima disso mostrar aviso "documento muito grande para diff completo".
