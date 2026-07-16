
# LexGuard — Detector de riscos na resposta da IA

Inspirado no OpenDetector (open.forlex.ai) e adaptado à arquitetura do Peticiona.AI: um detector multi-camada que audita o **texto gerado da peça** (e, opcionalmente, o prompt que a originou) e devolve **findings** com `severidade`, `categoria`, `trecho`, `offset`, `explicação` e `correção sugerida`, com destaque visual no editor e possibilidade de aplicar a correção.

## Escopo (v1)

Alvo principal: peças salvas em `pieces`. Botão dispara auditoria e devolve findings persistidos, versionados por hash de conteúdo. Auditoria também disponível ad-hoc no Workspace (texto colado, sem persistir).

## Categorias de detecção

1. **prompt_injection** — tentativas de sequestro de instrução no *input* do usuário (system_notes, context_items) e no output (ex.: `ignore previous instructions`, `system:`, `<|im_start|>`, HTML/markdown oculto, base64 suspeito, links exfiltrantes).
2. **jailbreak** — pedidos/insinuações de contornar guardrails (DAN, roleplay para burlar ética, "responda sem restrições").
3. **fake_citation** — leis/artigos, súmulas, RE/REsp/HC, decisões atribuídas a tribunal com dados inconsistentes ou inexistentes.
4. **fake_jurisprudence** — precedente citado que **não é encontrado** no DataJud/Jurisprudencias.AI ou com relator/data divergente.
5. **hallucination** — afirmação factual sem base no contexto/documentos anexos, contradição interna, número/data/valor sem fonte.
6. **pii_leak** (bônus, baixo custo) — CPF/RG/endereço de terceiros indevidamente expostos.

Cada finding:
```
{ id, category, severity: "low|medium|high|critical",
  snippet, start, end,          // offsets no content_text
  explanation, suggested_fix,   // texto de substituição sugerido
  evidence?: { source, url, matched_id },
  confidence: 0..1 }
```

## Pipeline (server function `auditPieceContent`)

```text
        ┌──── Stage A: heurísticas (regex + listas)
input → │     prompt_injection, jailbreak, pii_leak    ─┐
        └──── Stage B: extrator de citações            ─┤
              (Lei X, art. Y; Súmula N; RE/REsp/HC…)   ─┼─► merge + dedup ─► rank
        ┌──── Stage C: validador de jurisprudência    ─┤
        │     usa jurisprudenciaService + DataJud     ─┤
        └──── Stage D: revisor LLM (Lovable AI)       ─┘
              gemini-3.5-flash + Output.object schema
              → hallucinations, weak_citations, contradições
```

- **Stage A** roda em ~50ms, cobre casos óbvios sem consumir token.
- **Stage B** extrai citações com regex específicos de PT-BR jurídico (`Lei nº ...`, `art. ... da CF`, `Súmula ... STJ`, `REsp ... /SP`, `HC ...`, ADI/ADPF, etc.).
- **Stage C** consulta cada citação no `jurisprudenciaService` e no DataJud; miss → `fake_jurisprudence (high)`, divergência de metadados → `medium`, sem cobertura → `low (unverified)`.
- **Stage D** recebe o `content_text` + citações extraídas + contexto (input_data + anexos textuais) e retorna JSON com findings de alucinação/contradição via `Output.object` (structuredOutputs desligado; Gemini). Prompt inclui regras do `cognitive_os_config.shadow_cabinet`.
- Merge deduplica por (categoria, start±5).

## Backend

Novos arquivos:
- `src/lib/audit/detectors.ts` — regex/listas para Stage A + extrator de citações (puro, testável).
- `src/lib/audit/citations.ts` — normalização e validação via `jurisprudenciaService`.
- `src/lib/audit.functions.ts` — `auditPieceContent({ pieceId })`, `auditRawText({ text, context? })` (para workspace), `applyAuditFix({ pieceId, findingId })`.
- `src/lib/audit.server.ts` — chamada Lovable AI Gateway com `Output.object` (schema Zod dos findings).

Migração SQL:
```sql
create table public.piece_audits (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references public.pieces(id) on delete cascade,
  user_id uuid not null,
  content_hash text not null,            -- sha256 do content_text auditado
  findings jsonb not null default '[]',
  score int not null,                    -- 0-100 (100 = limpo)
  model text,
  created_at timestamptz default now()
);
create index on public.piece_audits (piece_id, created_at desc);

grant select, insert, delete on public.piece_audits to authenticated;
grant all on public.piece_audits to service_role;
alter table public.piece_audits enable row level security;

create policy "own audits"
  on public.piece_audits for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## Frontend

Novo componente `src/components/pieces/AuditPanel.tsx`, montado em `/pecas/$id` ao lado do `IntelligencePanel`:

- Cabeçalho: **Score** (0–100), contagem por severidade, botão **Auditar novamente** (desabilitado se `content_hash` inalterado — mostra cache).
- Lista de findings agrupada por categoria, com badge de severidade colorida (crítico=vermelho, alto=laranja, médio=âmbar, baixo=cyan).
- Ao clicar num finding: rola até o trecho e **destaca** em `PageMockup`/editor (via `<mark data-audit-id>`); painel lateral abre com explicação + `suggested_fix` + botões **Aplicar correção**, **Ignorar**, **Marcar falso-positivo**.
- Evidence link (quando houver): abre modal de detalhe (para citações, mostra o registro do DataJud/Jurisprudencias.AI).

Novo componente `src/components/workspace/AuditQuick.tsx` — auditoria de texto colado no Workspace, sem persistência, mesmo pipeline.

Integração leve: `IntelligencePanel` ganha uma linha "Auditoria: score X • Y críticos" com atalho para abrir o `AuditPanel`.

## Regras de aplicação

- **Aplicar correção**: substitui `[start, end)` em `content_text`/`content_html` (regenera HTML pelo `pieceAssembler`), grava nova versão em `piece_versions`, invalida audit e reexecuta Stage A+B+C locais (Stage D roda só sob demanda).
- **Ignorar / falso-positivo**: atualiza `findings[i].dismissed = { reason, at }` no jsonb (sem excluir para trilha de auditoria).
- **Alto/crítico não corrigido**: badge no cartão da peça na listagem + bloqueio opcional de export (config em `ai_governance_prefs.block_export_on_critical`, default `false`).

## Segurança

- Ambas as server fns usam `requireSupabaseAuth`; RLS garante escopo do usuário.
- Stage D nunca recebe secrets; prompt do auditor é isolado do prompt gerador (dupla instrução defensiva contra self-injection).
- Custo controlado: caching por `content_hash`, limite mensal reaproveita `monthly_token_cap` de `user_integrations`.
- Regex de PII rodam server-side; findings de PII trazem apenas os últimos 3 dígitos.

## Como diferencia do OpenDetector

- Camada C **específica jurídica BR** conectada ao **DataJud** e ao serviço interno de jurisprudências (o OpenDetector é genérico).
- Escrita, versionamento e correção **inline no editor de peças**, com trilha de auditoria por versão.
- Reaproveita o `cognitive_os_config.shadow_cabinet` já existente para o Stage D → consistência com o pipeline de geração.

## Entregáveis

1. Migração `piece_audits` + RLS.
2. `src/lib/audit/detectors.ts` (Stage A + B) com testes rápidos.
3. `src/lib/audit/citations.ts` (Stage C) reutilizando `jurisprudenciaService`.
4. `src/lib/audit.server.ts` + `audit.functions.ts` (Stage D + orquestração).
5. `AuditPanel.tsx` + integração em `/pecas/$id` (highlight, apply-fix).
6. `AuditQuick.tsx` no Workspace.
7. Toggle de export-block em `ai_governance_prefs` e badge de status na lista de peças.

Sem cobrança de nova secret — usa `LOVABLE_API_KEY` e `DATAJUD_API_KEY` já configurados.
