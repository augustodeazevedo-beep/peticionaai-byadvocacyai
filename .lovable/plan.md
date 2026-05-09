
# Plano — Fase 3 (Documentos/Modelos/Referências) + Relatório PDF + Integração Mike-first

Três entregas conectadas: (A) Fase 3 com upload real; (B) relatório PDF de benchmarking; (C) reforço da arquitetura Mike-first para que toda geração de peça consuma tokens via Mike (open-source) e o cliente pague apenas isso. Lovable AI fica como fallback opcional, nunca como caminho padrão.

---

## Parte C — Mike-first (premissa transversal)

Hoje `supabase/functions/mike-generate/index.ts` já tenta o endpoint Mike e cai para Lovable AI quando falta `MIKE_API_KEY` ou `mike_endpoint`. Vamos endurecer isso:

- **Modo de operação configurável** em `system_settings.peticiona_generation_mode`: `mike_only` (padrão) | `mike_with_fallback` | `lovable_only` (apenas dev).
- Em `mike_only`, se Mike falhar → erro claro ao usuário ("Configure o endpoint Mike em Admin → Integrações"), sem cair no Lovable.
- **BYOK por usuário (token-based billing)**: nova tabela `user_integrations` (`user_id`, `provider='mike'`, `endpoint`, `api_key_encrypted`, `model`, `monthly_token_cap`). RLS estrito por `user_id`. A função `mike-generate` lê primeiro o BYOK do usuário; só usa o endpoint global como fallback admin.
- **Telemetria de tokens**: nova tabela `token_usage` (`user_id`, `piece_id`, `provider`, `model`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `cost_usd_estimate`, `created_at`). Mike retorna `usage` no payload OpenAI-compatible — gravar a cada chamada. Dashboard exibirá consumo por mês.
- **Documentação Mike**: `docs/integracao-mike.md` com (i) endpoint esperado (`/v1/chat/completions` OpenAI-compatible), (ii) variáveis exigidas, (iii) link para o repositório upstream do Mike, (iv) exemplo de self-host (Docker compose) que o usuário/escritório pode rodar para pagar só os tokens do provedor de modelos.
- **UI**: nova página `/_authenticated/configuracoes/ia` onde o usuário cola seu endpoint Mike + chave + escolhe modelo + cota mensal. Campo `api_key` é write-only (mostrado mascarado depois).
- **Composer**: chip "Provider: Mike (BYOK)" / "Mike (compartilhado)" / "Lovable AI (fallback)" para deixar transparente o que será cobrado.

> Toda a Fase 3 abaixo grava contexto que **será consumido pelo Mike** na Fase 5 — nada de geração nesta fase, apenas ingestão.

---

## Parte A — Fase 3: Documentos, Modelos e Referências com upload real

### A.1. Migration única

Reutiliza buckets existentes (`library-files`, `case-files`). Sem buckets novos.

- enum `template_strictness`: `flexivel | rigoroso | molde`.
- enum `document_source`: `upload | url | texto | transcricao | biblioteca`.
- ALTER `library_items`: `template_strictness`, `ocr_status text` (`pending|done|skipped|failed`), `ocr_text text`, `source document_source NOT NULL DEFAULT 'upload'`.
- ALTER `workspace_context_items`: `library_item_id uuid`, `strictness template_strictness`, `ocr_required boolean DEFAULT false`.
- Index `(workspace_id, display_order)`.
- Tabelas novas para a Parte C: `user_integrations`, `token_usage` (RLS `auth.uid() = user_id`).
- Storage policies extra em `library-files` para subpastas `documentos/{uid}`, `modelos/{uid}`, `transcricoes/{uid}`.

### A.2. Server functions (TanStack `createServerFn` + middleware `requireSupabaseAuth`)

Arquivo `src/lib/workspace-ingest.functions.ts`:

1. `createSignedUploadUrl({ kind, filename, mime })` → upload direto via `uploadToSignedUrl`.
2. `registerUploadedDocument({ workspaceId, path, mime, size, title, runOcr })`.
3. `registerUploadedTemplate({ workspaceId, path, mime, size, title, strictness })`.
4. `ingestUrl({ workspaceId, url, title })` — fetch server-side, HTML→texto.
5. `ingestText({ workspaceId, title, content })`.
6. `addLibraryItemToWorkspace({ workspaceId, libraryItemId })`.
7. `reorderContext`, `removeContextItem`.
8. `runOcr` e `transcribeAudio` — chamam o **Mike** primeiro (mesmo fluxo BYOK). Se o endpoint Mike do usuário não suportar visão/áudio, cair só nesta etapa para Lovable AI (pois OCR/transcrição não é "geração de peça") — registrado em `token_usage` com `provider='lovable_ai_utility'`.

Validação Zod: 20 MB máx, mimes whitelisted (pdf/docx/png/jpg/mp3/m4a/wav/txt).

### A.3. Frontend

`src/components/workspace/ingest/`:
- `<DropZoneCard>` (drag-drop + click).
- `<UrlIngestDialog>`, `<TextIngestDialog>`, `<TranscribeDialog>` (MediaRecorder).
- `<LibraryPickerDialog>` filtrável por tipo.
- `<TemplateStrictnessSelect>` (Flexível/Rigoroso/Molde).

Refatorar `TabPanels.tsx`:
- `DocumentosPanel`: lista de contextos tipo `documento` + dropzone + 5 botões (Arquivos/Transcrever/URL/Inserir texto/Biblioteca).
- `ModelosPanel`: idem para `modelo` + strictness.
- `ReferenciasPanel`: lista consolidada com drag-to-reorder via `@dnd-kit/sortable` e badge OCR.

### A.4. Critérios de aceitação

- PDF arrastado → aparece com chip "OCR pendente" → "OCR ✓" + texto disponível em Referências.
- Modelo .docx (strictness=Molde) renderiza em Modelos e Referências.
- URL processada gera preview ≤ 200 chars.
- Reordenar persiste em `display_order`.
- Outro usuário não vê os arquivos (RLS validado).
- **Nenhuma rota de Fase 3 chama Lovable AI para geração de peça**; apenas OCR/transcrição podem usar fallback de utilidade.

---

## Parte B — Relatório PDF (`/mnt/documents/benchmarking-plataformas-juridicas-ai.pdf`)

### B.1. Coleta (websearch + fetch_website)

Para cada plataforma — **MinutaIA**, **Portal-IA DPE-RS**, **jAI** — capturar: visão geral, APIs/SDKs, auth, rate limits, integrações (PJe/Projudi/eproc/SSO/webhook), fluxo de geração observável, suporte a modelos customizados, preços/tier dev, casos reais. **Adicionar coluna Mike** em todas as comparações para evidenciar a estratégia open-source + BYOK do Peticiona.AI.

### B.2. Estrutura

1. Capa (branding Peticiona.AI).
2. Sumário executivo.
3. Metodologia.
4. Fichas técnicas (4–6 págs por plataforma + 1 ficha Mike).
5. Comparativo lado-a-lado (tabela).
6. **3 diagramas Mermaid → PNG**:
   - Arquitetura genérica de plataforma jurídica AI.
   - Fluxo agêntico (planejamento → pesquisa → redação → citação) **rodando sobre Mike**.
   - Topologia BYOK Mike + integrações tribunais.
7. Checklist de integração (auth, LGPD, retenção, OCR, RAG legislação/jurisprudência, audit log, SLA, billing por token).
8. Recomendações para Peticiona.AI (gap analysis + plano BYOK Mike).
9. Anexos com URLs.

Geração via `reportlab` (Platypus). QA visual obrigatório (`pdftoppm` → inspeção página a página). Entrega via `<lov-artifact>`.

### B.3. Aceitação

≥ 30 págs, todas as fontes citadas, diagramas ≥ 150 DPI, tabela sem clipping, lista de issues do QA visual reportada.

---

## Ordem de execução

1. Migration (Fase 3 + tabelas Mike BYOK) — aprovação do usuário antes de prosseguir.
2. Endurecimento da `mike-generate` (mode `mike_only`, leitura de `user_integrations`, gravação de `token_usage`).
3. Página `/configuracoes/ia` (BYOK).
4. Server functions de ingestão + dialogs + refactor dos panels.
5. Em paralelo: pesquisa web e geração do PDF.

Se preferir entregar em pedaços menores (ex.: só Mike-first primeiro, depois Fase 3, depois PDF), é só dizer.
