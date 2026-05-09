## Escopo

Quatro mudanças focadas em IA/UX da plataforma:

1. **Remover DJEN** — funcionalidade migrará para o Advoga.AI.
2. **Renomear "Biblioteca" → "Assistentes"** (prompts jurídicos para criação de peças).
3. **Redefinir "Bibliotecários"** — assistentes evoluídos, baseados em modelos do próprio usuário, com lógica de formatação, Visual Law e raciocínio jurídico especializado por área/peça.
4. **Reordenar a sidebar** — bloco principal (Dashboard, Nova Peça, Assistentes, Bibliotecários, Configurações de IA) sobe para o topo; atalhos (Compartilhamentos, Metadados CNJ, Histórico de Lote, busca, Projetos, Histórico) ficam abaixo.

---

## Fase 1 — Remover DJEN

**Frontend**
- Excluir `src/routes/_authenticated.djen.tsx`.
- Excluir `src/lib/djen.functions.ts`.
- Remover entrada "Comunicações DJEN" de `SHORTCUTS` em `src/components/AppSidebar.tsx`.
- Remover ícone `Megaphone` não usado.
- `src/routeTree.gen.ts` é regenerado automaticamente.

**Backend (banco)**
- Migration: remover possível valor `djen` do enum `workspace_context_item_type` (se existir) — só se não houver dados; caso haja, deixar enum e apenas parar de usar.
- Não há tabela específica DJEN para dropar.

---

## Fase 2 — Renomear Biblioteca → Assistentes

Mudança puramente de nomenclatura (rota + labels). Estrutura de dados permanece.

**Rotas**
- Renomear arquivo `src/routes/_authenticated.biblioteca.tsx` → `_authenticated.assistentes.tsx`.
- Atualizar título do route component para "Assistentes".

**Sidebar / navegação**
- `AppSidebar.tsx`: item `Biblioteca` → `Assistentes`, url `/biblioteca` → `/assistentes`, ícone mantém `BookOpen` (ou trocar para `Sparkles`/`Wand2`).
- Buscar globalmente por `/biblioteca` e `Biblioteca` em `src/` e atualizar todos os call-sites (TabPanels, ContextComposer, Workspace, etc.).

**Copy**
- Subtítulo: "Prompts jurídicos prontos para acelerar a criação de peças."

Sem mudança de schema. Tabela `library_items` (ou equivalente) permanece com mesmo nome internamente; apenas labels mudam.

---

## Fase 3 — Redefinir Bibliotecários

Bibliotecários passam a ser **assistentes especializados** baseados em **modelos do usuário** + regras de formatação + Visual Law + raciocínio jurídico por área/peça.

**Schema novo (migration)**

Estender tabela `librarians` (existente) com:
- `practice_area text` (ex.: "Consumidor", "Trabalhista")
- `piece_type text` (ex.: "Petição inicial", "Contestação", "Recurso")
- `reasoning_prompt text` — instruções de raciocínio jurídico
- `formatting_rules jsonb` — estrutura de seções/numeração
- `visual_law_defaults jsonb` — template, paleta, densidade, elementos padrão
- `model_piece_ids uuid[]` — IDs de peças do usuário usadas como referência/modelo

Criar tabela auxiliar `librarian_models` (1-N) caso prefira normalizado:
- `librarian_id`, `piece_id`, `weight`, `notes`.
RLS `own all` baseada em `user_id` do librarian.

**UI**
- `_authenticated.bibliotecarios.tsx`: dialog "Novo bibliotecário" agora com tabs:
  - **Identidade**: nome, descrição, área de atuação, tipo de peça.
  - **Raciocínio**: prompt de raciocínio jurídico especializado.
  - **Formatação**: regras estruturais (seções obrigatórias, ordem, citações).
  - **Visual Law**: defaults (template, paleta, densidade, elementos).
  - **Modelos**: seletor de peças do usuário para servir de referência.
- Card do bibliotecário exibe área + tipo de peça + nº de modelos.

**Integração com geração**
- Quando o usuário ativa um Bibliotecário no workspace, `mike-generate` recebe:
  - `reasoning_prompt` injetado no system prompt
  - `formatting_rules` como contrato de saída
  - `visual_law_defaults` aplicados ao gerar a versão Visual Law
  - texto resumido das `model_pieces` como few-shot
- Ajustar `src/lib/workspace-ingest.ts` para anexar esse contexto.

---

## Fase 4 — Reordenar Sidebar

Em `src/components/AppSidebar.tsx`:

```text
[Logo]
─────────────
[Nova minuta] (CTA)
─────────────
PRINCIPAL (novo, no topo)
  Dashboard
  Nova Peça
  Assistentes
  Bibliotecários
  Configurações de IA
─────────────
ATALHOS
  Compartilhamentos
  Metadados CNJ
  Histórico de Lote
─────────────
[Buscar no histórico…]
─────────────
PROJETOS
  …
─────────────
HISTÓRICO
  …
─────────────
[Footer pequeno]
  Sair
```

- Mover constante `FOOTER` (sem "Sair") para `MAIN` renderizado logo após o CTA "Nova minuta".
- `SHORTCUTS` permanece, mas sem DJEN.
- Footer fica apenas com "Sair".
- Garantir `tooltip` em modo `collapsed=icon` para todos os itens.

---

## Critérios de aceitação

- Rota `/djen` retorna 404; nenhum link aparece.
- Rota `/biblioteca` redireciona ou foi substituída por `/assistentes`; toda copy diz "Assistentes".
- `/bibliotecarios` permite criar bibliotecário com área, tipo de peça, raciocínio, formatação, Visual Law e modelos; geração via Mike usa esses campos.
- Sidebar mostra Dashboard/Nova Peça/Assistentes/Bibliotecários/Configurações de IA **acima** de Compartilhamentos/Metadados CNJ/Histórico de Lote.
- Build limpo, sem imports órfãos.

---

## Ordem de execução

1. Migration (Fase 1 enum cleanup + Fase 3 colunas/tabela).
2. Frontend: remover DJEN (Fase 1).
3. Frontend: renomear Biblioteca → Assistentes (Fase 2).
4. Frontend: refatorar Bibliotecários UI + integração Mike (Fase 3).
5. Frontend: reordenar sidebar (Fase 4).
6. Verificação final (build, navegação, geração com bibliotecário).
