# MCP: escrita de peças e modelos

Adicionar quatro ferramentas MCP para permitir que agentes externos (ChatGPT, Claude, Cursor, etc.) criem e atualizem peças e modelos do usuário autenticado, respeitando RLS.

Todas seguem o mesmo padrão dos tools existentes (`get_piece`, `list_templates`): cliente Supabase com `Authorization: Bearer <token do usuário>`, `ctx.getUserId()` para `user_id`, sem chave admin, sem entrada de `user_id` pelo agente.

## Ferramentas

**`create_piece`** — cria uma peça em `public.pieces`.
- Entrada: `title` (obrigatório), `piece_type` (default `peticao_inicial_civel`), `area?`, `content_text?`, `content_html?`, `project_id?` (uuid), `template_id?` (uuid), `input_data?` (metadados do caso — cliente, parte contrária, fatos, pedidos, etc., como objeto JSON), `observations?`, `status?` (`draft`/`review`/`final`, default `draft`).
- Grava `user_id = ctx.getUserId()`; retorna `{ id, title, status, created_at }`.

**`update_piece`** — atualiza peça existente.
- Entrada: `id` (obrigatório) + campos parciais opcionais: `title`, `piece_type`, `area`, `content_text`, `content_html`, `input_data` (merge raso na aplicação — busca o objeto atual, mescla e grava), `observations`, `status`, `checklist`, `brand_overrides`, `assembly_options`.
- Anexos: `add_case_files?: [{ path, mime?, size? }]` insere linhas em `public.case_files` vinculadas à peça; `remove_case_file_ids?: uuid[]` remove por id. RLS já garante isolamento.
- Só atualiza colunas fornecidas; retorna a peça atualizada. Falha se `id` não pertence ao usuário (RLS devolve 0 linhas → erro amigável).

**`create_template`** — cria modelo em `public.piece_templates`.
- Entrada: `name`, `area`, `piece_type` (obrigatórios); `description?`, `content_md?` (corpo do modelo com placeholders `{{campo}}`), `structure?` (JSON — seções/ordem), `prompt_hints?` (persona e regras que o pipeline injeta), `tags?` (string[]), `scope?` (`pessoal`/`escritorio`, default `pessoal`), `style_overrides?` (JSON), `is_default?`.
- `user_id = ctx.getUserId()`; retorna `{ id, name, area, piece_type }`.

**`update_template`** — atualiza modelo existente.
- Entrada: `id` + campos parciais dos mesmos atributos de `create_template`.
- Merge raso em `structure`/`style_overrides` quando enviados; substituição direta em `content_md`, `prompt_hints`, `tags`, `scope`, `is_default`, `description`.
- Retorna o modelo atualizado; RLS garante ownership.

Anotações MCP: `readOnlyHint: false` nas quatro; `destructiveHint: true` apenas em `update_piece` e `update_template` quando o input remove anexos ou muda `status: "final"`? — mantido simples: sem `destructiveHint`, com `openWorldHint: false`.

## Detalhes técnicos

- Arquivos novos: `src/lib/mcp/tools/create_piece.ts`, `update_piece.ts`, `create_template.ts`, `update_template.ts`.
- Registrar em `src/lib/mcp/index.ts` no array `tools`, mantendo os cinco atuais. Atualizar `instructions` mencionando as novas capacidades de escrita.
- Reuso do helper `supabaseForUser(ctx)` já presente nos tools atuais (copiado localmente em cada arquivo, como o padrão do repositório).
- Validação com Zod: uuids validados; strings com limites (título ≤ 255, `content_text` ≤ 200k, `content_html` ≤ 400k, `content_md` ≤ 200k, `observations` ≤ 20k) para evitar payloads absurdos.
- `input_data` merge: `SELECT input_data` → `{...atual, ...novo}` → `UPDATE`. Feito em uma única operação sequencial dentro do handler.
- Anexos em `update_piece`: cada linha em `case_files` grava `user_id = ctx.getUserId()` e `piece_id = id`. Apenas o path lógico dentro do bucket `case-files` é aceito (regex `^[A-Za-z0-9._/-]{1,500}$`); upload real segue via app (o MCP não faz upload de binário).
- Todos os handlers retornam `{ content: [{ type: "text", text: ... }], structuredContent: {...}, isError? }` conforme padrão.
- Não é preciso migration: as tabelas já existem com RLS por `auth.uid()`. Não são criadas policies novas.
- Após salvar os arquivos, rodar `app_mcp_server--extract_mcp_manifest` para revalidar o manifesto.

## Fora do escopo

- Upload binário de anexos via MCP (o agente registra apenas o `path` já enviado ao bucket pelo app).
- Publicação/compartilhamento público (`is_shared`, `public_slug`) — mantido no app para exigir consentimento explícito.
- Exclusão de peças/modelos (`delete_*`) — pode entrar em iteração futura se pedido.
