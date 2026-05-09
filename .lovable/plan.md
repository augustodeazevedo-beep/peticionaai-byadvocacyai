
## Objetivo

1. Conectar **Peticione.AI ↔ Inventaria.AI** (https://inventariaai.lovable.app), reaproveitando o padrão já implementado para Advoga.AI (system_settings + integration_logs + endpoint público + UI admin).
2. Realizar **auditoria completa** do código-fonte focada em (a) vazamento de dados, (b) incongruências lógicas que afetem eficiência das ferramentas (geração de peças, Visual Law, BYOK Mike, integrações).

A Inventaria.AI hoje gera petições de inventário/sucessão e simulações (ITCMD, partilha, holding, doação×inventário, escrituras). Não há endpoint público próprio — vamos criar dos dois lados o mesmo padrão usado para Advoga.

---

## Fase 1 — Integração Inventaria.AI

### 1.1 Outbound — Peticione.AI → Inventaria.AI
Quando uma peça de natureza sucessória/patrimonial é gerada (ou via botão manual), enviar PDF Visual Law / contexto para Inventaria.AI iniciar uma triagem ou anexar a um inventário existente.

- Endpoint destino (a criar no Inventaria.AI): `https://inventariaai.lovable.app/api/public/peticione-import`
- Header: `x-webhook-secret: <PETICIONE_TO_INVENTARIA_SECRET>`
- Payload:
```json
{
  "external_id": "peticione:<piece_id>",
  "title": "string",
  "piece_type": "peticao_inventario|escritura_partilha|...",
  "client_name": "string|null",
  "summary": "string|null",
  "document_url": "https://...signed-url (24h)",
  "owner_email": "email"
}
```
- Disparado a partir de `VisualLawPanel` (botão "Enviar ao Inventaria.AI") e opcionalmente em `generateVisualLawVersion` quando `inventaria_auto_send=true` e `piece_type` ∈ tipos sucessórios.

### 1.2 Inbound — Inventaria.AI → Peticione.AI
Endpoint público novo aqui para receber **starter sucessório** (triagem completa, lista de bens, herdeiros) e abrir uma minuta pré-preenchida.

- Rota: `src/routes/api/public/inventaria-process-context.tsx` (POST)
- Header: `x-webhook-secret: <INVENTARIA_TO_PETICIONE_SECRET>` (validado por `timingSafeEqual`)
- Payload Zod:
```json
{
  "external_id": "inventaria:<triagem_id>",
  "title": "string",
  "owner_email": "email",
  "client_name": "string|null",
  "area": "sucessoes",
  "piece_type_hint": "peticao_inventario_consensual|escritura_partilha|holding|...",
  "summary": "string",
  "structured_payload": { /* falecido, herdeiros, bens, flags, resultado, cessoes, herancasCumulativas */ },
  "attachments": [{ "filename": "...", "url": "https://...", "mime_type": "..." }]
}
```
- Comportamento: idêntico ao `advoga-process-context`:
  1. Resolve `user_id` por `owner_email` via `supabaseAdmin.auth.admin.listUsers` (paginado) — **corrigir** o método se hoje usa SQL direta a `auth.users` (ver auditoria 2.3).
  2. Upsert `projects` por `(user_id, title)` (ou `cnj_number` quando existir).
  3. Cria `pieces` (status `draft`) + `workspace`. Persiste `structured_payload` em `pieces.input_data` e gera `instructions` markdown a partir do summary.
  4. Anexos → bucket `case-files` + `case_files` + `workspace_context_items`.
  5. Loga em `integration_logs` (`integration='inventaria_inbound'`).
  6. Retorna `{ ok, piece_id, workspace_id, deeplink }`.

### 1.3 Configuração
- Reaproveita `system_settings`. Novas chaves (defaults via migração):
  - `inventaria_outbound_url` (default URL acima)
  - `inventaria_outbound_secret` (`is_secret=true`)
  - `inventaria_inbound_secret` (`is_secret=true`)
  - `inventaria_auto_send` (default `false`)
- UI: adicionar **`InventariaIntegrationCard.tsx`** logo abaixo do `AdvogaIntegrationCard` em `/configuracoes/ia` (admin). Mesmo layout: URL outbound, secrets, URL inbound copiável, toggle auto-send, botão "Testar conexão" (POST ping).

### 1.4 Visual Law / Outbound trigger
- `VisualLawPanel` ganha menu "Enviar para…" com opções **Advoga.AI** e **Inventaria.AI** (substitui o botão único atual). Se `auto_send` correspondente estiver ligado, dispara em `generateVisualLawVersion` em paralelo (não bloqueia upload).

### 1.5 Arquivos
**Criar:**
- `src/lib/inventaria.functions.ts` (sendPieceToInventaria, pingInventaria)
- `src/lib/inventaria.server.ts` (helpers + log)
- `src/routes/api/public/inventaria-process-context.tsx`
- `src/components/integrations/InventariaIntegrationCard.tsx`

**Editar:**
- `src/components/visual-law/VisualLawPanel.tsx` (menu unificado de envio)
- `src/lib/visual-law/client.ts` (auto-send para os dois destinos)
- `src/routes/_authenticated.configuracoes.ia.tsx` (montar card)

**Migração SQL:** insert defaults em `system_settings` para 4 chaves.

---

## Fase 2 — Auditoria (segurança + lógica)

Auditoria executada como leitura/checagem. Cada item gera **patch mínimo** ou registro em `mem://` quando for "comportamento esperado".

### 2.1 RLS e dados sensíveis
- Verificar `system_settings.read non-secret` — confirmar que `is_secret=true` NUNCA é lido por client (`SELECT *` em `library.ts`, `mikeClient.ts`, `AdvogaIntegrationCard.tsx`). Substituir por server functions quando necessário.
- `user_integrations.api_key_encrypted` está nomeado como "encrypted" mas é texto puro (auditar `mike-generate/index.ts` linha "mikeKey = userIntegration.api_key_encrypted"). **Ação:** ou cifrar de fato com `pgsodium`/`vault`, ou renomear coluna e expor o risco no UI. Recomendado: mover para `vault` e referenciar por id.
- `pieces public read by slug` — confirmar que `content_html` exposto via slug não vaza `input_data` ou `checklist` com PII. Ajustar `src/routes/p.$slug.tsx` para `select` explícito (não `*`).
- Buckets `case-files`, `piece-exports`, `library-files` são privados — checar se policies de storage existem (geralmente ausentes na migração inicial). Adicionar policies por `auth.uid() = (storage.foldername(name))[1]`.

### 2.2 Endpoints públicos (`/api/public/*`)
- `advoga-process-context`: revisar limites (anexos ≤ 25MB, total ≤ 20), timeout de download, validação de `mime_type`, deduplicação por `external_id`.
- Novo `inventaria-process-context` herda mesmas regras.
- Adicionar **rate limit** simples por `external_id` + IP (in-memory ou tabela `integration_rate_limits`) para mitigar abuso.

### 2.3 Resolução de `user_id` por email
- Se `advoga.server.ts` usa `supabaseAdmin.from('auth.users').select(...)` direto, isso falha em produção (schema `auth` não exposto via PostgREST). Trocar por `supabaseAdmin.auth.admin.listUsers({ page, perPage })` paginado, ou criar função SQL `security definer` `public.user_id_by_email(email)` retornando `uuid`.

### 2.4 Edge function `mike-generate`
- Quota mensal (`monthly_token_cap`) lê `total_tokens` mas não soma — confirmar (já visto: usa `reduce`, ok).
- Falta proteção: se Mike retorna 200 mas `content` vazio → cai no fallback Lovable AI **sem** registrar falha do Mike em `integration_logs`. Adicionar log de tentativa.
- `system_settings` lido sem filtro: traz `is_secret=true` se policy permitir admin? Rodar como service role bypassa RLS — **ok**, mas certifique-se de que segredos não são logados.

### 2.5 Visual Law
- `client.ts` faz upload e gera signedUrl 1h — outbound usa 24h; alinhar TTL para 24h em ambos para não expirar antes de processamento downstream.
- `parser.ts`: validar limites de tamanho de markdown (DoS por payload grande na geração de PDF).

### 2.6 Bibliotecários / Assistentes
- `librarians.model_piece_ids` — checar se ao listar few-shot pieces existe filtro `user_id = auth.uid()` (RLS já garante, mas revisar a leitura cruzada).

### 2.7 Logs de integração
- `integration_logs.request_summary/response_summary` — confirmar truncamento (≤ 2KB). Sem isso, payload com PII pode persistir indefinidamente. Adicionar truncamento e remover `Authorization` headers.

### 2.8 Frontend
- `AppSidebar.tsx`: confirmar que rota DJEN foi removida do `routeTree.gen.ts` (após delete) — checar build limpo.
- `_authenticated.admin.integracoes.tsx` lê `system_settings.*` direto via client; valores `is_secret=true` retornarão `null` (policy bloqueia). Confirmar que UI mostra placeholder e não quebra.

### 2.9 Build / TypeScript
- Rodar typecheck pós-mudanças e corrigir qualquer import quebrado decorrente do novo card.

---

## Detalhes técnicos

```text
┌──────────────┐  outbound POST   ┌────────────────┐
│ Peticione.AI │ ───────────────▶ │  Advoga.AI     │
│              │ ◀─────────────── │  Inventaria.AI │
└──────────────┘  inbound POST    └────────────────┘
        │
        ├─ system_settings: <provider>_outbound_url/secret, _inbound_secret, _auto_send
        ├─ integration_logs: integration in ('advoga_outbound','advoga_inbound','inventaria_outbound','inventaria_inbound')
        └─ /api/public/{advoga|inventaria}-process-context.tsx
```

Reaproveitamento total: helpers `loadProviderConfig(provider)` e `recordIntegrationLog(...)` em `src/lib/integrations.server.ts` para evitar duplicação entre Advoga e Inventaria.

## Ordem de execução

1. **Refactor leve** — extrair `integrations.server.ts` comum (Advoga já existente passa a usá-lo).
2. **Migração** — inserir 4 chaves `inventaria_*` em `system_settings`; storage policies dos buckets se ausentes; truncamento em `integration_logs` (trigger BEFORE INSERT).
3. **Server** — `inventaria.server.ts`, `inventaria.functions.ts`, endpoint inbound.
4. **UI** — `InventariaIntegrationCard` em `/configuracoes/ia`; menu unificado em `VisualLawPanel`.
5. **Auditoria** — aplicar correções 2.1→2.9 em PRs pequenos por arquivo.
6. **Testes manuais** — ping outbound, POST inbound com secret válido/ inválido, geração de PDF com auto-send para os dois destinos.

## Critérios de aceitação

- Admin configura URL+secrets do Inventaria.AI e "Testar conexão" retorna 200.
- POST autenticado em `/api/public/inventaria-process-context` cria projeto+peça+workspace+anexos; POST sem secret → 401 sem vazar mensagem.
- Botão Visual Law oferece envio para Advoga **ou** Inventaria; logs em `integration_logs` com payload truncado.
- Auditoria 2.1–2.9: cada item resolvido (patch) ou justificado em `mem://constraints/auditoria-<data>`.
- Build TypeScript limpo; nenhum select `*` em rotas públicas; storage buckets com policies por owner.

## Fora do escopo

- Mudança no esquema de `pieces.input_data` (mantém `jsonb` livre).
- Reescrita de `mike-generate` (apenas patch de logging).
- UI de visualização de `integration_logs` (já existe via admin SQL; dashboard fica para fase futura).
