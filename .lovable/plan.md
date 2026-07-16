# Plano: Aba "Tutorial"

Criar uma nova seção autenticada `/tutorial` que apresente, de forma didática e navegável, a lógica base do Peticiona.AI e todas as funcionalidades disponíveis — com ganchos diretos para cada tela do produto.

## Estrutura da página

Rota nova: `src/routes/_authenticated.tutorial.tsx` (URL `/tutorial`).
Link no `AppSidebar` (grupo "Principal"), ícone `GraduationCap`, entre "Dashboard" e "Nova Peça".

Layout: shell autenticado padrão, com dois níveis:

```text
┌───────────────────────────────────────────────────────────┐
│  Hero: "Como o Peticiona.AI trabalha por você"            │
│  ──> Pipeline cognitivo em 4 etapas (cards animados)      │
├─────────────┬─────────────────────────────────────────────┤
│  Sumário    │  Conteúdo da seção ativa                    │
│  (sticky)   │  (cards, GIF/screenshot, CTA "Abrir")       │
│             │                                             │
│  1. Base    │                                             │
│  2. Criação │                                             │
│  3. Detect  │                                             │
│  ...        │                                             │
└─────────────┴─────────────────────────────────────────────┘
```

Componentes internos (todos em `src/components/tutorial/`):
- `TutorialHero.tsx` — pitch curto + diagrama do pipeline cognitivo (Protocolo → Adversarial → Redação → Auditoria).
- `TutorialSidebar.tsx` — sumário sticky com scroll-spy.
- `TutorialSection.tsx` — bloco padrão (título, subtítulo, benefícios, "quando usar", botão CTA que navega para a rota real).
- `FeatureCard.tsx` — card compacto com ícone Lucide + descrição + link.
- `PipelineDiagram.tsx` — visual das 4 etapas com tokens `bg-gradient-brand` / `text-gradient-brand`.

## Seções de conteúdo

1. **Lógica base** — o que é o Peticiona.AI, o pipeline cognitivo em 4 etapas, princípios (anti-alucinação, ABNT, LGPD, zero-knowledge).
2. **Criação de peças** — wizard `/pecas/nova`, seções estratégicas do formulário, seleção de modelo, geração e overlay.
3. **Editor & Inteligência** — `/pecas/$id`: Intelligence Panel, Operator Notes, comandos rápidos, exportação DOCX/PDF protocolo-ready.
4. **Modelos** — biblioteca `/biblioteca/modelos`, placeholders `{{...}}`, CRUD e reuso.
5. **Detect.AI** — página standalone `/detect-ai`, gate automático na exportação, whitelist por cliente, configurações.
6. **Identidade do escritório** — `/configuracoes/identidade`, brand kit, saída pronta para protocolo.
7. **Jurisprudência & CNJ** — busca `/jurisprudencia`, metadados CNJ, jurimetria.
8. **Workspace & Assistentes** — `/workspace`, abas, bibliotecários, comandos rápidos, otimizador de tokens.
9. **Governança de IA & KPIs** — `/dashboard` (KPIs), preferências de governança.
10. **Segurança & Chave Mestra** — `/configuracoes/seguranca`, criptografia AES-256-GCM, certificados A1.
11. **Integrações & MCP** — 11 ferramentas MCP, ecossistema Advocacy.AI, integrações Advoga/Inventaria.
12. **Próximos passos** — checklist de onboarding + links para publicar/compartilhar.

Cada seção segue o mesmo padrão didático: **O que é → Por que importa → Como usar (3 passos) → Abrir agora**.

## Detalhes técnicos

- Route file: `_authenticated.tutorial.tsx` com `createFileRoute("/_authenticated/tutorial")`, `head()` com título/description próprios, sem `og:image` (não é rota pública).
- Fonte única da verdade das seções: array em `src/lib/tutorialSections.ts` (id, título, ícone, subtítulo, bullets, rota-alvo, CTA). Cada card usa `<Link to>` (nunca `<a href>`) para as rotas internas.
- Scroll-spy: `IntersectionObserver` no `TutorialSidebar` para destacar seção ativa; âncoras `id={section.id}` em cada bloco.
- Estilo: apenas tokens semânticos do design system (`bg-card`, `text-muted-foreground`, `bg-gradient-brand`, `text-gradient-brand`). Sem cores hardcoded.
- Sem novas dependências, sem alterações de schema, sem servidor. Puramente frontend/apresentação.
- Acessibilidade: `h1` único no hero, headings hierárquicos, `aria-current` no sumário, foco visível nos CTAs.
- Reutilizar `BrandMark`/`BrandLockup` no hero.
- Sem imagens geradas por IA nesta primeira versão — usar ilustrações via ícones Lucide e blocos de gradiente. (Podemos adicionar screenshots reais depois se você quiser.)

## Arquivos a criar/editar

- Criar `src/routes/_authenticated.tutorial.tsx`
- Criar `src/components/tutorial/TutorialHero.tsx`
- Criar `src/components/tutorial/TutorialSidebar.tsx`
- Criar `src/components/tutorial/TutorialSection.tsx`
- Criar `src/components/tutorial/FeatureCard.tsx`
- Criar `src/components/tutorial/PipelineDiagram.tsx`
- Criar `src/lib/tutorialSections.ts`
- Editar `src/components/AppSidebar.tsx` — adicionar item "Tutorial" em MAIN.

## Fora do escopo (posso incluir se pedir)

- Vídeos ou GIFs demonstrativos.
- Tour interativo passo a passo sobreposto na UI (ex.: Shepherd.js/Driver.js).
- Persistência do progresso do tutorial por usuário (marcar seções concluídas).
- Versão pública (fora da área autenticada) para marketing.
