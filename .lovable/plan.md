## Etapa 6 — Export PDF & DOCX da plataforma Visual Law AI

Objetivo: permitir exportar a versão ativa do Visual Law AI em PDF (renderizado a partir do markdown gerado, respeitando `documentConfig` — fonte/cor/densidade) e DOCX (estrutura preservada, fonte, listas, headings). Tudo client-side, sem nova edge function. Reusa bucket `piece-exports`.

### Dependências

- `@react-pdf/renderer` ✅ já instalada
- `docx` (v9.6) ✅ já instalada
- Adicionar `marked` (~12) — parser markdown → AST simples para mapear em runs de PDF/DOCX. Pequeno (~30kb) e estável.

### Arquivos novos

1. `src/services/visual-law/markdown.ts` — parser `parseMarkdownBlocks(md): Block[]` usando `marked.lexer`. Tipos: heading (1-3), paragraph, list (ordered/unordered), blockquote, code, hr. Inline → texto plano com flags bold/italic.

2. `src/services/visual-law/exportPdf.tsx` — componente `<VisualLawPdfDoc blocks config legalMetadata title validation? risk?>` com `@react-pdf/renderer`. Função `exportVersionToPdf(version, opts)` retorna `Blob`.
   - Estilos derivados de `version.config`: fontFamily mapeado (Helvetica/Times/etc), `primaryColor` para headings/borders, espaçamento por `density`.
   - Cabeçalho com `pieceType`/`area` e título.
   - Rodapé com nº de página + timestamp da versão.
   - Apêndice opcional "Análise Jurídica" se `version.validation`/`risk` presentes (toggle no diálogo).

3. `src/services/visual-law/exportDocx.ts` — função `exportVersionToDocx(version, opts): Promise<Blob>`. Usa `docx-js` mapeando blocks para `Paragraph`/`HeadingLevel`/`numbering`. Configura página US Letter, margens 1", fontFamily da versão, headings com cor `primaryColor`. Apêndice idem PDF.

4. `src/components/visual-law/export/ExportDialog.tsx` — dialog Radix com: formato (PDF/DOCX), checkbox "Incluir análise jurídica" (desabilitado se versão sem análise), botão exportar. Chama `saveAs` (download local) e opcionalmente sobe para `piece-exports/visual-law-ai/{userId}/{pieceId}/{versionId}.{ext}` (best-effort, não bloqueia).

5. `src/components/visual-law/export/ExportButton.tsx` — botão `Download` com ícone, abre dialog. Mostrado no header do `VisualLawAIPanel`.

### Edits

- `src/components/visual-law/VisualLawAIPanel.tsx` — adicionar `<ExportButton />` no canto superior direito do painel (acima do `SplitPane`), desabilitado quando não há `selectedVersionId`.
- `src/services/visual-law/storage.ts` (novo) — helper `uploadExport(blob, ext, userId, pieceId, versionId)` no bucket `piece-exports`. Sem schema novo: bucket já existe.

### Storage / migração

Sem nova migração. Bucket `piece-exports` já tem policy do usuário (verificar — caso falte, plano contingência: criar policy `piece-exports own all` no migration). Caminho: `visual-law-ai/{userId}/{pieceId}/{versionId}.{ext}`.

### UX

- Dialog opens centered, dark theme. Estado: `idle` | `generating` | `done` | `error`. Toast de sucesso/erro.
- Download local instantâneo via `URL.createObjectURL` + `<a download>`.
- Upload em background (fire-and-forget) → futuro Etapa 7 pode listar exports anteriores.

### Smoke test

1. Build passa.
2. Gerar versão → abrir export dialog → escolher PDF → arquivo baixado abre em qualquer leitor com headings coloridos.
3. DOCX baixado abre em Word/Docs preservando headings, listas e fonte.
4. Toggle "Incluir análise jurídica" adiciona seção apêndice somente quando há dados.
5. Sem versão selecionada → botão desabilitado.

### Fora do escopo

- Histórico/listagem de exports anteriores (futuro).
- Templates visuais avançados (capa, marca d'água) — mantém layout neutro tipográfico.
- Preview WYSIWYG do PDF antes de baixar.
- Export para HTML standalone.

### Riscos / mitigação

- **Markdown complexo** (tabelas, imagens inline): MVP cobre headings/listas/quotes/parágrafos/hr; tabelas e imagens caem para texto plano com aviso silencioso.
- **Bundle size** (`@react-pdf` é grande): import dinâmico em `exportPdf.tsx` (`const { pdf } = await import("@react-pdf/renderer")`) para code-split.
- **Fontes customizadas**: usar fontes embutidas do react-pdf (Helvetica/Times-Roman/Courier) mapeando `VLFontFamily`. Sem download de fontes externas.