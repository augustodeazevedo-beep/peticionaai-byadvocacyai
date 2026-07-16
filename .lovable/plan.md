
## Objetivo

Transformar o Detect.AI numa ferramenta acessível como página própria (não só aba dentro da peça), com o layout do print anexado: header, card principal para colar/anexar texto, contador de caracteres e coluna lateral com "Histórico recente".

## Rota e navegação

- Nova rota: `src/routes/_authenticated.detect-ai.tsx` (`/detect-ai`).
- Item no sidebar (`src/components/AppSidebar.tsx`) chamado **Detect.AI** com ícone `ShieldCheck`, acima ou junto de "Configurações".
- Link "Ajustar regras" no topo do card apontando para `/configuracoes/detect-ai` (já existe).

## Layout (fiel ao print)

```text
┌───────────────── header ─────────────────┐
│ 🛡 Detect.AI                              │
│    Auditoria cética de textos gerados... │
└──────────────────────────────────────────┘
┌──────────── card principal ────────┐  ┌── Histórico recente ──┐
│ Detect.AI                          │  │ 🕒 Histórico recente  │
│ Cole a resposta gerada por IA…     │  │ (lista das 20 últimas │
│ ┌────────────────────────────────┐ │  │  verificações ou      │
│ │ Cole aqui o texto a auditar…   │ │  │  estado vazio)        │
│ │                                │ │  └───────────────────────┘
│ └────────────────────────────────┘ │
│ [📎 Anexar .txt / .md]   0 / 30.000│
│                       [▶ Iniciar]  │
│ Rodapé: aviso de persistência      │
└────────────────────────────────────┘
```

- Grid `lg:grid-cols-[1fr_320px]`, tokens semânticos (`glass`, `bg-gradient-brand`, `text-gradient-brand`) — sem cores hardcoded.
- Textarea grande (min-h 380px), fonte mono suave no placeholder.
- Contador de caracteres reativo, limite 30 000; botão desabilitado se vazio/estourado.
- Botão "Anexar .txt / .md": `<input type="file" accept=".txt,.md,text/plain,text/markdown">`, lê via `file.text()` e injeta no textarea (rejeita > 30k com toast).
- Botão "Iniciar verificação" com ícone `Play`, variante primária gradiente.

## Backend

Reaproveita o pipeline existente sem novas migrations:

- Nova server fn `auditPasteText` em `src/lib/audit.functions.ts`:
  - `.middleware([requireSupabaseAuth])`
  - input: `{ text: string(1..30000), context?: string, skipLlm?: boolean }`
  - chama `runPipeline` de `src/lib/audit/pipeline.server.ts`
  - aplica `applyPrefsToFindings` (lendo `detectai_prefs` do usuário) para respeitar allowlist/severidade
  - persiste em `piece_audits` com `piece_id = null` (auditoria avulsa) — **requer** migration leve tornando `piece_id` nullable + policy `user_id = auth.uid()` para linhas sem peça. Alternativa sem migration: tabela nova `detectai_checks` (id, user_id, text_preview, score, findings jsonb, created_at) com RLS por usuário e GRANTs padrão.
  - **Decisão**: criar tabela nova `detectai_checks` (mais limpa, não mistura com auditorias de peças) — evita mexer no schema de `piece_audits`.

- Nova server fn `listDetectAiChecks` retorna as últimas 20 do usuário para a coluna "Histórico recente".

## Histórico recente

- Card lateral com título "Histórico recente" e relógio (`Clock`).
- Vazio: mostra "Nada verificado ainda. Suas 20 últimas verificações aparecem aqui." (igual ao print).
- Populado: lista `score` + `data relativa` + primeiros ~60 chars do texto; clique abre modal com findings completos (reusa `AuditPanel` em modo readonly recebendo `findings`+`score` via props — pequena refatoração para aceitar dados externos além de `pieceId`).

## AuditPanel: pequeno ajuste

Hoje o painel busca por `pieceId`. Adicionar prop opcional `initialData?: { findings, score, id }` e, quando presente, pular fetch e permitir só leitura (sem "Aplicar correção", já que não há peça).

## Migration

```sql
create table public.detectai_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text_preview text not null,
  score int not null,
  findings jsonb not null default '[]'::jsonb,
  model text,
  stages jsonb,
  content_hash text,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.detectai_checks to authenticated;
grant all on public.detectai_checks to service_role;
alter table public.detectai_checks enable row level security;
create policy "own rows select" on public.detectai_checks for select to authenticated using (auth.uid() = user_id);
create policy "own rows insert" on public.detectai_checks for insert to authenticated with check (auth.uid() = user_id);
create policy "own rows delete" on public.detectai_checks for delete to authenticated using (auth.uid() = user_id);
create index on public.detectai_checks (user_id, created_at desc);
```

## Arquivos tocados

- **novo** `src/routes/_authenticated.detect-ai.tsx` — página completa.
- **edit** `src/lib/audit.functions.ts` — adicionar `auditPasteText` + `listDetectAiChecks`.
- **edit** `src/components/pieces/AuditPanel.tsx` — aceitar `initialData` opcional.
- **edit** `src/components/AppSidebar.tsx` — item de menu Detect.AI.
- **migration** — tabela `detectai_checks`.

## Fora de escopo

- Não altero o pipeline (`runPipeline`, detectores, LLM auditor).
- Não altero a aba Detect.AI já existente dentro do editor de peças (continua funcionando).
- Não altero a tela de configurações do Detect.AI.

