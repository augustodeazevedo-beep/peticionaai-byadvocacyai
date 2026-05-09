## Objetivo
Conectar Peticione.AI com Advoga.AI ([projeto](https://advogaai-byadvocacy.lovable.app)) de forma bidirecional, reaproveitando o endpoint que o Advoga.AI já expõe e abrindo um endpoint análogo aqui para receber "starters" de processo.

## Fluxos

### 1. Outbound — Peça gerada → Advoga.AI
Quando uma peça é exportada (PDF Visual Law) ou marcada como concluída, Peticione.AI dispara POST para o webhook que o Advoga.AI já tem pronto:

- Endpoint destino: `https://advogaai-byadvocacy.lovable.app/api/public/peticione-document-generated`
- Header: `x-webhook-secret: <PETICIONE_TO_ADVOGA_SECRET>`
- Payload (esquema do Advoga.AI):
  ```json
  {
    "processo_id": "uuid|null",
    "numero_cnj": "string|null",
    "document_url": "https://...signed-url",
    "document_type": "peticao_inicial_civel|...",
    "external_id": "peticione:<piece_id>"
  }
  ```
- Disparado em: `generateVisualLawVersion` (após upload) e botão "Enviar ao Advoga.AI" no `VisualLawPanel`.
- Quando a peça tem `project_id` com `cnj_number`, envia `numero_cnj`. `processo_id` fica null (Advoga resolve pelo CNJ ou external_id).

### 2. Inbound — Starter de processo (Advoga.AI → Peticione.AI)
Novo endpoint público em Peticione.AI para receber contexto de processo e abrir uma minuta pré-preenchida:

- Rota: `src/routes/api/public/advoga-process-context.tsx` (POST)
- Header obrigatório: `x-webhook-secret: <ADVOGA_TO_PETICIONE_SECRET>` (verificado via `timingSafeEqual`)
- Validação Zod do payload:
  ```json
  {
    "external_id": "advoga:<processo_id>",
    "numero_cnj": "0000000-00.0000.0.00.0000",
    "title": "string",
    "client_name": "string|null",
    "area": "string|null",
    "summary": "string|null",
    "piece_type_hint": "string|null",
    "owner_email": "email",
    "attachments": [{ "filename": "...", "url": "https://...", "mime_type": "..." }]
  }
  ```
- Comportamento:
  1. Resolve `user_id` via `owner_email` (admin client → `auth.users`).
  2. Upsert em `projects` por `(user_id, cnj_number)`.
  3. Cria `pieces` (status `draft`) + `workspace` vinculado, gravando `summary` em `instructions`.
  4. Para cada anexo: download → upload para bucket `case-files` → insere em `case_files` e `workspace_context_items`.
  5. Loga em `integration_logs` (`integration='advoga_inbound'`, ok, status_code).
  6. Retorna `{ ok: true, piece_id, workspace_id, deeplink: "/pecas/<id>" }`.

### 3. Configuração
- Tabela nova `integration_endpoints` (admin-only) com chaves: `advoga_outbound_url`, `advoga_outbound_secret`, `advoga_inbound_secret`, `enabled`.
- Reaproveita `system_settings` se preferir simplicidade — usar `is_secret=true` para os secrets. Decisão: usar `system_settings` (já existe e tem RLS admin).
- UI em `/configuracoes` (aba "Integrações", visível para admin):
  - Campo URL Advoga (default: `https://advogaai-byadvocacy.lovable.app/api/public/peticione-document-generated`).
  - Campos secret outbound/inbound (mascarados, atualização via `system_settings`).
  - Bloco "Webhooks de entrada" mostrando a URL completa de `/api/public/advoga-process-context` com botão copiar.
  - Toggle "Enviar peças automaticamente ao Advoga.AI ao gerar PDF".
  - Botão "Testar conexão" → POST de ping (`document_type:'ping'`) e mostra status.

### 4. Integration logs
Reutiliza tabela `integration_logs` já existente. Entradas para cada chamada in/out com `integration='advoga_outbound'|'advoga_inbound'`, duração, status_code, ok, request/response summary (truncado).

### 5. Visual Law — botão de envio
No `VisualLawPanel`, adicionar botão "Enviar para Advoga.AI" ao lado de "Baixar PDF":
- Se auto-envio estiver ligado, dispara junto com `generateVisualLawVersion`.
- Mostra toast com link da entrada criada no Advoga (quando retornar).

## Arquivos a criar/editar

**Criar:**
- `src/lib/advoga.functions.ts` — `sendDocumentToAdvoga({ pieceId, signedUrl })`, `pingAdvoga()`, `getAdvogaConfig()`, `setAdvogaConfig(...)`.
- `src/lib/advoga.server.ts` — helpers servidor (lê `system_settings`, faz fetch, registra `integration_logs`).
- `src/routes/api/public/advoga-process-context.tsx` — handler POST (validação, ingestão, logs).
- `src/components/integrations/AdvogaIntegrationCard.tsx` — UI de configuração.

**Editar:**
- `src/lib/visual-law/client.ts` — após upload, opcionalmente disparar `sendDocumentToAdvoga`.
- `src/components/visual-law/VisualLawPanel.tsx` — botão "Enviar para Advoga.AI".
- `src/routes/_authenticated.configuracoes.ia.tsx` (ou criar `/configuracoes/integracoes`) — montar `AdvogaIntegrationCard`.
- `src/components/AppSidebar.tsx` — atalho "Integrações" para admin (opcional).

**Migração SQL:**
- Inserir 4 linhas em `system_settings` (`advoga_outbound_url`, `advoga_outbound_secret`, `advoga_inbound_secret`, `advoga_auto_send`) com defaults.

## Segurança
- Inbound: verificação por `timingSafeEqual` do header `x-webhook-secret`; valida payload com Zod (limites de tamanho, regex CNJ); rejeita anexos > 25MB; total ≤ 20 anexos.
- Outbound: usa `signedUrl` válido por 1h do bucket `piece-exports`; `external_id` evita duplicatas no Advoga.
- Secrets ficam em `system_settings (is_secret=true)`, lidos apenas em server functions/route handlers (admin client).

## Critérios de aceitação
1. Admin consegue salvar URL+secrets em `/configuracoes` e ver a URL inbound copiável.
2. "Testar conexão" retorna 200 do Advoga.AI.
3. Gerar PDF de Visual Law com auto-envio ligado → registro em `integration_logs` com `ok=true` e entrada visível no Advoga (`integration_logs` deles).
4. POST manual ao endpoint inbound (com secret correto) cria projeto + peça + workspace + anexos baixados; sem secret retorna 401.
5. Build limpo, sem regressões nas demais rotas.

## Ordem de execução
1. Migração `system_settings` (defaults).
2. `advoga.server.ts` + `advoga.functions.ts`.
3. Endpoint inbound `/api/public/advoga-process-context`.
4. UI `AdvogaIntegrationCard` em configurações.
5. Integração no `VisualLawPanel` + auto-envio em `client.ts`.
6. Teste manual ponta-a-ponta (ping → envio real → recepção simulada).
