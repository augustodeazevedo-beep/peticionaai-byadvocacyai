## Objetivo

Criar uma **Biblioteca de Modelos de Peças** organizada por **área** e **tipo de peça**, com CRUD completo, e integrá-la ao fluxo de geração (`/pecas/nova`) e à montagem (assembler / prompts), para que cada nova peça possa partir de um modelo consistente do escritório.

## 1. Modelo de dados

Nova tabela `piece_templates`:

- `id`, `user_id` (RLS por dono)
- `name` (ex.: "Inicial Cobrança Padrão")
- `description`
- `area` (civel, trabalhista, criminal, ...)
- `piece_type` (peticao_inicial_civel, contestacao, ...)
- `scope` (`pessoal` | `escritorio`) — futuro multi-user; por ora só `pessoal`
- `content_md` (corpo do modelo em markdown, com placeholders `{{cliente}}`, `{{juizo}}`, `{{fatos}}`, `{{pedidos}}`)
- `structure` jsonb — seções fixas (endereçamento, qualificação, fatos, fundamentos, pedidos, valor da causa, fechamento) com flags `included`/`locked`
- `style_overrides` jsonb — preferências de estilo (numeração, tom, fontes) que sobrescrevem o Brand Kit por modelo
- `prompt_hints` text — instruções extras enviadas ao pipeline cognitivo
- `tags` text[]
- `is_default` bool — modelo padrão por (area, piece_type)
- `usage_count` int — incrementado a cada uso
- `last_used_at` timestamptz
- `created_at` / `updated_at`

Índices: `(user_id, area, piece_type)`, `(user_id, is_default)`. Trigger `set_updated_at`. RLS: `auth.uid() = user_id` para todas as operações.

Em `pieces`, adicionar coluna `template_id uuid` (nullable) para rastrear de qual modelo a peça nasceu.

## 2. CRUD — rota `/biblioteca/modelos`

Nova rota `_authenticated.biblioteca.modelos.tsx` (lista) e `_authenticated.biblioteca.modelos.$id.tsx` (editor).

- **Lista**: cards/tabela agrupados por área, com filtros por `piece_type`, busca por nome, badges de `is_default` e `usage_count`. Ações: Novo, Duplicar, Editar, Excluir, Marcar como padrão.
- **Editor**: formulário em abas
  - *Identificação*: nome, descrição, área, tipo, tags
  - *Estrutura*: toggles por seção (endereçamento, qualificação, fatos, ...) + ordem
  - *Conteúdo*: editor markdown com painel de placeholders disponíveis e helper para inserir
  - *Estilo*: overrides de fonte, numeração de parágrafos, fechamento padrão
  - *Prompt*: `prompt_hints` + preview de como entra no pipeline
- **Helpers** em `src/lib/pieceTemplates.ts`: `listTemplates`, `getTemplate`, `upsertTemplate`, `deleteTemplate`, `setDefault`, `incrementUsage`, `renderTemplate(content, vars)`.

Adicionar item "Modelos de Peça" no `AppSidebar` (grupo Biblioteca).

## 3. Seleção no fluxo de criação (`/pecas/nova`)

Nova etapa no formulário, logo após escolher Área + Tipo:

- **TemplatePicker**: lista os modelos do usuário filtrados por `(area, piece_type)`, com opção "Sem modelo (gerar do zero)" e destaque para o `is_default`.
- Ao escolher um modelo:
  - Pré-preenche campos do form a partir de `structure` e `style_overrides`
  - Mostra preview lateral (resumo + primeiras linhas do `content_md`)
  - Marca `template_id` na peça criada e incrementa `usage_count` / `last_used_at`
- Botão "Salvar campos atuais como novo modelo" no final do form (atalho para criar modelo a partir do contexto preenchido).

## 4. Integração com geração e montagem

- `mikeClient.generatePiece` recebe `templateId`. A edge function `mike-generate` busca o template (via service role) e injeta:
  - `template.content_md` como esqueleto base no prompt do estágio cognitivo
  - `template.prompt_hints` em `instruction_priority`
  - `template.structure` como contrato de seções obrigatórias
- `pieceAssembler.assemblePiece` recebe `template` e usa `structure` para decidir quais wrappers aplicar (sobrepondo defaults) e `style_overrides` para fechamento/numeração.
- `pieces.brand_overrides` continua tendo prioridade sobre `style_overrides` do modelo, que por sua vez tem prioridade sobre o Brand Kit.

Ordem de precedência final: **brand_overrides da peça > template.style_overrides > Brand Kit > defaults do sistema**.

## 5. UX no editor de peça (`/pecas/$id`)

- Badge "Gerada a partir de: {template.name}" no header.
- Ação "Atualizar modelo a partir desta peça" (sobrescreve `content_md` do template com o conteúdo atual — com confirmação).
- Ação "Salvar como novo modelo" a qualquer momento.

## 6. Seed inicial

Migration de seed (apenas estrutura — sem conteúdo proprietário) cria 4-6 modelos vazios marcados como `is_default = false` por par comum: Petição Inicial Cível, Contestação, Recurso de Apelação, Reclamação Trabalhista, Habeas Corpus, Manifestação. Usuário preenche depois.

## Detalhes técnicos

**Arquivos novos**
- `supabase/migrations/<ts>_piece_templates.sql` — tabela, RLS, índices, trigger, coluna `template_id` em `pieces`
- `src/lib/pieceTemplates.ts` — CRUD + `renderTemplate`
- `src/routes/_authenticated.biblioteca.modelos.tsx` — lista
- `src/routes/_authenticated.biblioteca.modelos.$id.tsx` — editor (id = `novo` para criação)
- `src/components/templates/TemplatePicker.tsx` — usado em `/pecas/nova`
- `src/components/templates/TemplateForm.tsx` — abas do editor
- `src/components/templates/PlaceholderHelper.tsx`

**Arquivos editados**
- `src/routes/_authenticated.pecas.nova.tsx` — adiciona TemplatePicker + envia `template_id`
- `src/routes/_authenticated.pecas.$id.tsx` — badge + ações de salvar/atualizar modelo
- `src/components/AppSidebar.tsx` — item "Modelos de Peça"
- `src/lib/mikeClient.ts` — propaga `templateId`
- `supabase/functions/mike-generate/index.ts` e `prompts.ts` — injeção do template no pipeline
- `src/lib/pieceAssembler.ts` — aplica `structure` e `style_overrides`

**Fora de escopo**
- Compartilhamento de modelos entre usuários (campo `scope` fica reservado)
- Versionamento histórico de modelos
- Marketplace público de modelos
- Editor WYSIWYG (apenas markdown nesta fase)

Confirma esse escopo? Se quiser, ajusto: remover seed, simplificar editor para 1 aba, ou priorizar só CRUD agora e deixar integração com pipeline para depois.