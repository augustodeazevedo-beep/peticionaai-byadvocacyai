# Plano de Upgrade — Funcionalidades inspiradas no Portal AI-Minuta

Análise dos prints identificou 9 blocos de funcionalidade. Vou implementar em 5 fases, do esqueleto navegacional até as integrações pesadas, sempre respeitando o branding Peticione.AI (dark, gradiente cyan→violeta, BrandLockup).

## Visão geral das funcionalidades observadas

| Print | Funcionalidade | Status atual no Peticione.AI |
|-------|----------------|------------------------------|
| Dashboard com nav superior (Início, Histórico, Documentos, Modelos, Referências, Biblioteca, Bibliotecários) + sidebar (Nova minuta, Compartilhamentos, Histórico de Lote, Projetos) | Workspace tabular para construir o "contexto" da peça | Não existe — temos apenas Dashboard simples + Nova Peça |
| Modo Agêntico (Pensamento Baixo/Médio/Alto, Ativar perguntas, Aprovar roteiro, Referência rastreável, Jurisprudência, Legislação, Modelos, Contadoria, Verbosidade Curto/Longo) | Painel de configuração da estratégia da IA antes de redigir | Não existe |
| Composer inferior com Padrão/Agêntico, "Sem contexto", Perfil, microfone | Editor de prompt com chips de contexto e modo | Parcial — temos formulário rígido em `/pecas/nova` |
| Documentos (drag-drop, OCR automático, Arquivos/Transcrever/URL/Inserir texto/Biblioteca) | Ingestão de fontes documentais como contexto | Não existe |
| Modelos (drag-drop modelo + Flexível/Rigoroso/Molde) | Templates de estilo de redação | Não existe |
| Legislação (pesquisa semântica em 18.187 leis federais + filtros) | Busca de normas com RAG | Não existe |
| Jurisprudência (TJRS, TRF4, STJ, STF, Pesquisa inteligente) | Busca de precedentes | Não existe |
| Pesquisa Web | Busca web genérica para fundamentação | Não existe |
| Biblioteca (Pastas, Minha biblioteca, Compartilhados, Podcasts, Diagramas — Prompt/Documento/Legislação) | Repositório pessoal de ativos reutilizáveis | Não existe |
| Bibliotecários (agrupamentos com Ativar/desativar) | "Coleções" temáticas que ativam vários ativos de uma vez | Não existe |
| Processamento Individual / em Lote | Geração em massa de peças | Parcial — só individual |

## Fase 1 — Workspace + arquitetura de contexto (fundação)

**Objetivo:** substituir o formulário rígido por um workspace que reproduz a barra superior de abas e o composer inferior.

- Nova rota `/_authenticated/workspace.tsx` (entrada padrão pós-login junto com Dashboard).
- Componente `<WorkspaceTabs>` com as 7 abas: Início, Histórico, Documentos, Modelos, Referências, Biblioteca, Bibliotecários (lucide icons + estilo "pill" dark com gradiente quando ativa).
- Componente `<ContextComposer>` fixo no rodapé com:
  - Textarea com placeholder "Instruções ao Peticione.AI para geração da peça…"
  - Slash menu `/` → prompts salvos; `@` → biblioteca/bibliotecários.
  - Chips inferiores: Perfil, Padrão/Agêntico (toggle), Indicador de contexto ("Sem contexto" / "N itens"), Pensamento (Baixo/Médio/Alto), botão de geração, microfone (placeholder).
- Estado global do workspace via Zustand (`src/stores/workspace.ts`): `mode`, `thinking`, `contextItems[]`, `instructions`, `selectedTemplate`.
- Sidebar esquerdo expansível: Nova minuta, Compartilhamentos, Histórico de Lote, Projetos, Histórico (últimos 7 dias) — usando `<Sheet>` em mobile.

**Banco:** novas tabelas `workspaces`, `workspace_context_items` (tipo enum: documento, modelo, legislacao, jurisprudencia, web, biblioteca_item, bibliotecario), `projects`.

## Fase 2 — Biblioteca e Bibliotecários

**Objetivo:** dar ao usuário um repositório pessoal de ativos reutilizáveis e a capacidade de agrupá-los.

- Rotas: `/_authenticated/biblioteca.tsx`, `/_authenticated/bibliotecarios.tsx`.
- Tabelas:
  - `library_items` (id, user_id, type: prompt|documento|legislacao|jurisprudencia|modelo|podcast|diagrama, title, description, content_text, file_path, tags[], folder_id, is_shared).
  - `library_folders` (hierárquica via parent_id).
  - `librarians` (id, user_id, name, description, color, icon).
  - `librarian_items` (junção many-to-many).
- UI Biblioteca: árvore de pastas à esquerda, lista com chips de tipo, busca, botões Adicionar / Compartilhamentos, ações (favoritar, visualizar, mover, compartilhar, excluir).
- UI Bibliotecários: cards com ícone colorido, contador de itens (documentos/modelos/comentários), botão **Ativar** que injeta todos os itens do bibliotecário no `contextItems` do workspace atual.
- Storage bucket `library-files` (privado, RLS por user_id) para uploads de PDF/DOCX.

## Fase 3 — Aba Documentos + Modelos + Referências

**Objetivo:** popular o "contexto" do workspace.

- **Documentos:** drag-and-drop, toggle OCR automático, opções Arquivos / Transcrever (áudio→texto via Lovable AI gemini) / URL (fetch + extração) / Inserir texto / Biblioteca (modal escolhendo `library_items` tipo documento). Cada item vira um `workspace_context_items` com preview.
- **Modelos:** drag-drop de .docx (preferência), 3 modos: **Flexível** (apenas inspiração), **Rigoroso** (segue estrutura), **Molde** (substitui placeholders). Persistido como `library_items` tipo modelo.
- **Referências:** lista consolidada do que já está no contexto, com possibilidade de remover/reordenar.

## Fase 4 — Pesquisa: Legislação, Jurisprudência, Web

**Objetivo:** três motores de busca acopláveis ao contexto.

- **Legislação:** busca semântica via embeddings sobre uma base curada (fase inicial: ingestão dos códigos principais — CC, CPC, CP, CPP, CLT, CDC, CTN — em `legislation_articles` com pgvector). Filtros avançados: norma, ano, palavras. Botão "Salvar na biblioteca" e "Adicionar ao contexto".
- **Jurisprudência:** busca por palavras-chave + toggle "Pesquisa inteligente" (reescrita do query por LLM). Tribunais como chips removíveis (TJRS, TRF4, STJ, STF — extensível). Provedor: edge function `search-jurisprudence` que faz scraping/API pública (DataJud CNJ) + cache.
- **Web:** edge function `web-search` usando uma API de busca (Brave/Tavily — pedir secret se necessário). Resultados com título, URL, snippet, botão de adicionar.
- Dropdown unificado no header das três abas para alternar entre Legislação/Jurisprudência/Web (igual ao print).

## Fase 5 — Modo Agêntico + Processamento em Lote + Histórico

**Objetivo:** orquestração avançada da geração.

- **Modo Agêntico (modal "Como o agente trabalha"):**
  - Fase 1 — Pensamento (Baixo/Médio/Alto) → mapeia para max_tokens de raciocínio.
  - Fases 2-3 — Interação: toggles Ativar perguntas (o agente faz perguntas antes de gerar) e Aprovar roteiro (mostra outline para aprovação).
  - Fase 4 — Pesquisas: toggles Referência rastreável, Jurisprudência, Legislação, Modelos, Contadoria (cálculos jurídicos).
  - Fase 5 — Verbosidade (Curto/Longo).
- Edge function `mike-generate` evoluída para um agente multi-step (planejamento → perguntas → outline → redação → citações) usando `google/gemini-3-flash-preview` por padrão e `google/gemini-2.5-pro` no modo Alto + Referência rastreável.
- **Processamento em Lote:** rota `/_authenticated/lote.tsx` para gerar N peças aplicando o mesmo contexto a uma planilha CSV/XLSX de variáveis. Tabela `batch_jobs` + `batch_items` com status por item.
- **Histórico:** rota `/_authenticated/historico.tsx` com agrupamento "Últimos 7 dias", "Este mês", busca, filtros por projeto/status.
- **Projetos:** agrupamento de peças (`projects`, `pieces.project_id`) com UI no sidebar.

## Detalhes técnicos

- **Estado:** Zustand para workspace (já listado); TanStack Query para todos os fetches Supabase.
- **Backend:** Lovable Cloud (Supabase). Migrations separadas por fase. RLS estrito por `user_id` em todas as tabelas; `librarians` e `library_items` com flag `is_shared` + tabela `share_grants`.
- **Edge functions novas:** `transcribe-audio`, `extract-url`, `search-legislation`, `search-jurisprudence`, `web-search`, `agent-orchestrate`, `batch-process`.
- **IA:** Lovable AI Gateway. Embeddings via `google/gemini-3-flash-preview` (texto) ou OpenAI ada quando necessário (pedir secret). pgvector ativado.
- **UI kit:** continuar shadcn + tokens de `src/styles.css`. Padronizar `<TabPill>`, `<ContextChip>`, `<ResourceCard>`, `<DropZone>`, `<SemanticSearchBox>` em `src/components/workspace/`.
- **Acessibilidade & responsividade:** sidebar vira Sheet em <md, abas superiores viram horizontal scroll com snap, composer fixo com `safe-area-inset-bottom`.

## Diagrama de navegação

```text
/_authenticated
├── /workspace            ← novo home: tabs + composer
│   ├── tab: Início
│   ├── tab: Histórico
│   ├── tab: Documentos
│   ├── tab: Modelos
│   ├── tab: Referências
│   ├── tab: Biblioteca   ← também acessível em /biblioteca
│   └── tab: Bibliotecários
├── /biblioteca
├── /bibliotecarios
├── /pesquisa/legislacao
├── /pesquisa/jurisprudencia
├── /pesquisa/web
├── /lote                 ← processamento em lote
├── /historico
├── /projetos/$id
├── /pecas/$id            ← editor (já existe, será integrado ao agente)
└── /admin/...
```

## Fora de escopo desta primeira rodada

- Podcasts e Diagramas da Biblioteca (apenas placeholders na UI).
- Extensão de navegador "Peticione Conecta" para tribunais.
- Compartilhamento entre organizações (apenas usuário→usuário individual).
- Contadoria com cálculos jurídicos completos (entra como stub).

## Sequência de entrega sugerida

1. **Fase 1** — Workspace + composer + estado global (1 entregável).
2. **Fase 2** — Biblioteca + Bibliotecários (1 entregável).
3. **Fase 3** — Documentos + Modelos + Referências (1 entregável).
4. **Fase 4** — Pesquisas (Legislação → Jurisprudência → Web; pode ser quebrado em 2).
5. **Fase 5** — Agente + Lote + Histórico (1-2 entregáveis).

Posso começar pela Fase 1 ao aprovar este plano, ou ajustar prioridades se você quiser entregar Biblioteca/Pesquisa antes do workspace.