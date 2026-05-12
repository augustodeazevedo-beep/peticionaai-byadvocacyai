## Auditoria completa — achados e plano de correção

Varredura cobriu: linter Supabase, security scanner (Supabase + TanStack), edge functions, server functions, RLS, fluxo de geração e renderização de peças, autenticação e logs. Linter sem alertas; scanner reportou **8 achados** e a leitura manual revelou **3 bugs adicionais** (incluindo um que degrada qualidade do output).

---

### 🔴 Críticos (segurança)

**C1. `lookupCnjMetadata` sem autenticação + chave DataJud hardcoded** — `src/lib/cnj.functions.ts`
- Server function exposta sem `requireSupabaseAuth`. Qualquer um pode invocar via RPC.
- Chave `APIKey cDZHYzlZa0JadVREZDJCendQbXY...` literal no código (já vazada no histórico).
- **Correção:** adicionar middleware `requireSupabaseAuth`; mover chave para `process.env.DATAJUD_API_KEY` (secret); usar a chave pública do CNJ se for o caso e documentar; rotacionar chave atual.

**C2. `analyze-visual-law` e `generate-visual-law` — checagem dupla de auth** — `supabase/functions/{analyze,generate}-visual-law/index.ts`
- `verify_jwt = true` no `config.toml` já barra anônimos no gateway, mas o handler não revalida nem extrai `userId` para logging/quota. Sem cap no `currentContent`.
- **Correção:** acrescentar verificação de bearer + `supabase.auth.getUser` (espelhar `mike-generate`); validar payload com Zod (`currentContent` máx. 50 000 chars; `direction`, `density` whitelisted); registrar usage em `token_usage`.

---

### 🟠 Altos (segurança / privacidade)

**A1. Bucket `office-brand` público** — qualquer URL adivinhável expõe logos/assinatura.
- **Correção:** tornar privado e gerar **signed URLs** no `LogoUploader` e no PageMockup, ou adicionar policy SELECT em `storage.objects` restrita ao dono do path. (Logos costumam ser públicos por design — confirmar se é desejado; se sim, ignorar com justificativa em `security_memory`.)

**A2. Compartilhamento público vaza `input_data` e `observations`** — RLS `pieces public read by slug`.
- Política libera **todas** colunas. `input_data` contém fatos do cliente; `observations` traz auditoria interna; `model_used` revela vendor.
- **Correção:** criar **view** `public.pieces_public` apenas com `id, title, content_html, updated_at, public_slug` e dar SELECT a `anon`/`authenticated`. Trocar policy da tabela para apenas `is_shared = true` em colunas seguras via view; client público (`p.$slug.tsx`) passa a ler da view.

**A3. `vl_versions` expõe `prompt`, `risk`, `validation`, `legal_metadata` em links públicos.**
- **Correção:** mesma abordagem A2 — view `vl_versions_public` com `content, direction, created_at` apenas.

**A4. Admin guard apenas client-side** — `_authenticated.admin.integracoes.tsx`
- Protegido só por `useEffect`. Hoje a tabela `system_settings` tem RLS `has_role(admin)`, então leitura/escrita já é segura no backend. O risco é vazamento da estrutura da UI.
- **Correção:** adicionar `beforeLoad` na rota chamando server fn `requireAdmin()` que valida via `has_role` no servidor e `throw redirect`. Manter RLS atual.

---

### 🟡 Médios (qualidade / robustez)

**M1. Verbosidade de erros** — `export-document/index.ts:213` e `export-piece-docx/index.ts:208` retornam `e.message` ao cliente.
- **Correção:** logar `console.error(e)` e retornar `"Erro ao gerar o documento."` genérico.

**M2. Persona/persona prompts em `system_settings` legíveis por todo usuário autenticado** — policy `system_settings read non-secret`. Hoje vários prompts ficam com `is_secret = false`.
- **Correção:** marcar `peticiona_persona`, `peticiona_shadow_cabinet`, `cognitive_os_config` como `is_secret = true` e ajustar leitura para edge functions (já usam service role).

---

### 🐛 Bugs funcionais (qualidade do output)

**B1. `content_html` salvo como markdown bruto em `_authenticated.pecas.$id.tsx`** (linhas 92, 108, 122, 127, 140)
- Após edição/regeneração/remontagem o `update` grava `content_html: content` (texto markdown), enquanto a criação inicial em `pecas.nova.tsx` converte com `markdownToHtml`. Resultado: link público (`/p/$slug`) e o painel HTML passam a exibir asteriscos e `#` em texto puro a partir da primeira edição.
- **Correção:** extrair `markdownToHtml` para `src/lib/markdown.ts` (ou usar `marked` que já está no projeto via `services/visual-law/markdown.ts`) e aplicá-lo em todas as 5 chamadas de update; sanitizar com DOMPurify antes de exibir.

**B2. Streaming SSE pode não fechar em desconexão do cliente** — `mike-generate/index.ts` linha 137 (IIFE não-awaitada)
- Se o usuário aborta, `writer.close()` ainda roda e o callback de persistência de `token_usage` executa, mas `await writeEvent("done", ...)` pode falhar silenciosamente. Não bloqueante hoje, mas vale checar `req.signal` no loop e abortar `provider(...)`.
- **Correção:** propagar `req.signal` para `provider` e `pipeDraftStream`; encerrar pipeline cedo quando `aborted`.

**B3. `markdownToHtml` artesanal incompleto** — `pecas.nova.tsx:26-95`
- Não trata blockquotes, links, escapes; e na linha 64 fecha lista escolhendo `</ul>` ou `</ol>` por inspeção do HTML — quebra com listas aninhadas.
- **Correção:** consolidar com `marked` (já dependência) + DOMPurify, e remover a função artesanal.

---

### Plano de execução (ordem proposta)

1. **C1 + DataJud secret** — middleware `requireSupabaseAuth` em `lookupCnjMetadata`, mover chave para `DATAJUD_API_KEY`, pedir secret e rotacionar.
2. **C2** — auth + Zod + caps nas duas funções visual-law; registrar `token_usage`.
3. **B1 + B3** — criar `src/lib/markdown.ts` com `marked` + `DOMPurify`; substituir nas 5 chamadas de update e na criação.
4. **A2 + A3** — migration: views públicas `pieces_public` e `vl_versions_public`; trocar policies; ajustar `p.$slug.tsx`.
5. **A4** — server fn `requireAdmin` + `beforeLoad` em rotas admin.
6. **M1** — erros genéricos nas duas edge functions de export.
7. **M2** — `is_secret = true` nos prompts sensíveis.
8. **A1** — decisão sobre `office-brand` (privado + signed URLs OU manter público com justificativa em security memory).
9. **B2** — propagar `AbortSignal` no pipeline cognitivo.

### Detalhes técnicos

**Arquivos a editar/criar**
- `src/lib/cnj.functions.ts` — middleware + env
- `src/lib/markdown.ts` (novo) — `markdownToHtml(md)` com `marked` + `DOMPurify`
- `src/routes/_authenticated.pecas.{nova,$id}.tsx` — usar markdown lib
- `supabase/functions/{analyze,generate}-visual-law/index.ts` — auth + Zod
- `supabase/functions/{export-document,export-piece-docx}/index.ts` — erro genérico
- `src/routes/p.$slug.tsx` — ler de view pública
- `src/lib/admin.functions.ts` (novo) — `requireAdmin` server fn; `_authenticated.admin.integracoes.tsx` — `beforeLoad`
- Migrations: views `pieces_public`, `vl_versions_public`; policies revisadas; storage policy `office-brand` (se privado); `system_settings is_secret`

**Pacote novo**
- `bun add isomorphic-dompurify` (DOMPurify Worker-safe)

**Fora de escopo**
- Reescrever pipeline cognitivo
- Migrar autenticação para SSR completo
- Auditoria de dependências npm (cobrir em loop separado)

Confirma esse escopo? Posso priorizar somente os críticos (C1, C2, B1) se preferir entregar em ondas menores.