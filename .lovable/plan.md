
# Peticione.AI — Plano revisado (v3)

Plataforma AI-Native de redação de peças jurídicas do ecossistema Advocacy.AI. Sem motor próprio de IA: orquestra o Mike via edge function, com **fallback Lovable AI** ativo desde o dia 1. Entrega em duas iterações.

## Princípio arquitetural

- Frontend chama `src/lib/mikeClient.ts` → edge `mike-generate`.
- `mike-generate` lê `system_settings`, monta system prompt e tenta Mike (se `MIKE_API_KEY` presente). Sem chave → **fallback Lovable AI Gateway** (`google/gemini-2.5-flash`). Troca futura é transparente ao frontend.
- Toda chamada externa registra em `integration_logs`.

## Branding (criar do zero)

- **Nome**: Peticione.AI
- **Wordmark**: "Peticione" sans serifada moderna + ".AI" mono neon. Ícone: pena estilizada formando um "P", gradiente neon→cyan. Geração via `imagegen` quality `premium` (PNG transparente em `src/assets/peticione-logo.png` + favicon).
- **Paleta** (oklch em `src/styles.css`): bg `oklch(0.16 0.02 260)`, surface glass `oklch(0.22 0.03 260 / 0.6)`, `--brand-neon` `oklch(0.85 0.22 145)`, `--brand-cyan` `oklch(0.78 0.15 215)`, texto `oklch(0.96 0.01 260)`.
- **Tipografia**: Inter (UI), JetBrains Mono (tags), Lora (citações jurídicas).
- Header/footer compartilhados com selo "by Advocacy.AI".

## Iteração 1 (esta entrega)

1. **Branding + design system + landing pública** (`/`) com Hero, Como Funciona, Ecossistema (Prospect.AI, Advoga.AI, Peticione.AI, Fin.AI), CTA login. SEO completo.
2. **Auth** Lovable Cloud: Google + e-mail/senha. `/login`, `/signup`, `/reset-password`.
3. **Schema + RLS**: `profiles`, `user_roles` (enum `app_role`, `has_role()` SECURITY DEFINER, allowlist admin para `augustodeazevedo@gmail.com` e `azevedo.advocacia@outlook.com`), `projects`, `pieces`, `piece_versions`, `case_files`, `system_settings`, `integration_logs`. Buckets privados: `case-files`, `piece-exports`.
4. **Admin → Integrações** (`/admin/integracoes`, gated): editor das chaves `peticione_persona`, `peticione_rules_format`, `peticione_rules_citation`, `peticione_rules_antihalucinacao`, `peticione_structure`, `peticione_checklist_final`, `peticione_shadow_cabinet`, `mike_endpoint`, `mike_org`. Seed do briefing.
5. **Fluxo "Nova Peça" Petição Inicial Cível** ponta-a-ponta: wizard guiado → `mike-generate` → editor TipTap (regenerar trecho + chat lateral) → Checklist Final + Observações → export `.docx` ABNT/NBR 10520:2023 via edge `export-piece-docx`.
6. **Dashboard** (`/dashboard`).
7. **Ferramentas → Links Úteis** (`/ferramentas/links`): catálogo (eDossiê, SINTEGRA, JUSBR, Calculadora TJRS, Assinador Gov.BR, Certidão Digital, OABRS, INSS, DPVAT, iLovePDF, Kramer, Assec, CNseg, Cjur, MundoAdvogados, Delegacia Online RS, Portal Assinaturas OAB, Meu Correspondente, Minhas Audiências…) agrupados por categoria, busca + favoritos (`user_link_favorites`).

## Iteração 2 (próxima)

8. **Jurisprudência** (`/ferramentas/jurisprudencia`): API DATAJUD/CNJ + cache em `jurisprudence_cache`. Camada AI (`mike-generate`): resumir decisão, extrair tese, julgados similares — sempre com link ao acórdão fonte. Botão "Inserir na peça" formata citação ABNT.
9. **Legislação atualizada** (`/ferramentas/legislacao`): LexML + Planalto (federal), conectores plugáveis para portais estaduais/municipais (RS prioritário). Tabela `legislation_sources` (tipo, UF, município, base_url, parser_kind). Busca unificada, marcação de artigos, "inserir referência na peça".
10. **Jurimetria** (`/jurimetria`): inspirada em Turivius/Deep Legal/Judit/Projuris.
    - Métricas: taxa de êxito por tribunal/vara/classe/assunto, tempo de tramitação, distribuição de resultados, ranking de relatores, padrões decisórios (apenas dados públicos DATAJUD).
    - Preditivo (AI): probabilidade de êxito por tese/valor/tribunal com disclaimer.
    - Ingestão sob demanda via `datajud-ingest` em `jurimetrics_cases` + materializações em `jurimetrics_aggregates` (cron).
    - Visualizações Recharts + export CSV/PDF.
11. **Assessor Jurídico** (`/assessor`) — **NOVO**:
    - Chat AI dedicado a consultas breves de dúvidas jurídicas, dentro da própria plataforma (evita o usuário sair para ChatGPT/Google).
    - Interface estilo chat com streaming SSE (markdown render, code blocks, citações destacadas).
    - Backend: edge function `assessor-chat` que reusa `mike-generate` com **persona específica** (`peticione_assessor_persona` em `system_settings`): "advogado sênior consultivo brasileiro, respostas objetivas, sempre cita base legal/súmula/precedente, recusa-se a responder sobre fatos não fornecidos sem assumir, anti-alucinação rigoroso, ao final sugere próxima ação prática".
    - **Memória de conversa**: tabela `assessor_conversations` (id, user_id, title, created_at, updated_at) + `assessor_messages` (role, content, citations jsonb, created_at). RLS por user_id. Sidebar lista conversas anteriores, novo chat, renomear/excluir.
    - **Enriquecimento opcional** (toggles): "consultar jurisprudência" (chama `datajud-search` antes de responder e injeta resumos no contexto) e "consultar legislação" (chama `lexml-search`). Quando ativo, citações aparecem como cards clicáveis abaixo da resposta.
    - **Ações rápidas**: "Transformar em peça" (envia o tema para o wizard de Nova Peça), "Salvar como nota no projeto X", "Copiar resposta".
    - **Disclaimers**: rodapé fixo "respostas indicativas, não substituem análise individual do caso"; recusa explícita para temas fora do direito.
    - Rate limit por usuário (contagem em `integration_logs`) para conter custo.
    - Sempre envia histórico completo da conversa ao gateway (mensagens previamente salvas) seguindo as melhores práticas de chatbot.

## Estrutura técnica

### Tabelas

Iteração 1: `profiles`, `user_roles`, `projects`, `pieces`, `piece_versions`, `case_files`, `system_settings`, `integration_logs`, `user_link_favorites`, `useful_links`.

Iteração 2: `jurisprudence_cache`, `legislation_sources`, `legislation_cache`, `jurimetrics_cases`, `jurimetrics_aggregates`, `user_jurimetrics_subscriptions`, `assessor_conversations`, `assessor_messages`.

RLS em tudo. Caches: SELECT autenticado, write só via edge (service role).

### Edge functions

- Iteração 1: `mike-generate`, `export-piece-docx`
- Iteração 2: `datajud-search`, `datajud-ingest`, `lexml-search`, `legislation-fetch`, `jurimetrics-recompute`, `jurisprudence-summarize`, `assessor-chat` (streaming SSE)

### Rotas (TanStack Start)

```
/                          landing pública
/login /signup /reset-password
/_authenticated/
  dashboard
  pecas/nova
  pecas/$id
  ferramentas/
    links                  Iter 1
    jurisprudencia         Iter 2
    legislacao             Iter 2
  jurimetria               Iter 2
  assessor                 Iter 2  ← NOVO
  assessor/$conversationId Iter 2
  admin/integracoes        admin-only
```

### Secrets
- `MIKE_API_KEY` (opcional)
- `LOVABLE_API_KEY` (gerenciada)
- `DATAJUD_API_KEY` (Iter 2)

## Fora do escopo

Webhooks bidirecionais Advoga, integração real com Mike, demais tipos de peça, anonimização, editor colaborativo + diff, export PDF (entra na Iter 2), biblioteca completa de modelos com CRUD.

## Pronto para implementar

Aprovando, começo pela Iteração 1 (branding → design system → auth → schema → integrações → Petição Inicial Cível → dashboard → links úteis). A Iteração 2 (jurisprudência, legislação, jurimetria, **assessor jurídico**) entra em pedido separado.
