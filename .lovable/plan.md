## Banner de saudação no Dashboard

Criar um container superior em `src/routes/_authenticated.dashboard.tsx` (acima do título "Minhas peças") replicando o estilo da imagem de referência:

- **Layout**: card horizontal full-width, altura ~140px, bordas arredondadas (`rounded-xl`), borda sutil `border-border/50`.
- **Fundo**: gradiente escuro com a arte temática "circuitos + balança da justiça" no lado direito (decorativa, opacidade reduzida) — gerada via `imagegen` em `src/assets/dashboard-hero-bg.jpg` no mesmo estilo cyan→violeta da marca.
- **Conteúdo (esquerda, padding generoso)**:
  - Chip pequeno no topo: `AI-Native · Advoga.AI` em verde-lima sobre pílula escura.
  - Saudação grande (`text-3xl md:text-4xl font-bold`):
    - "Boa tarde, " em branco (varia conforme hora: Bom dia / Boa tarde / Boa noite).
    - Nome do usuário em **MAIÚSCULAS** (`uppercase`) e cor `text-gradient-brand` (cyan→violeta), conforme print.
  - Linha inferior: data por extenso em português (ex: "Sábado, 09 De Maio De 2026") em `text-muted-foreground text-sm`.

## Fonte do nome

- Buscar `full_name` da tabela `profiles` (já existe, populada no signup) via `supabase.from("profiles").select("full_name").eq("id", user.id).single()`.
- Fallback: parte local do e-mail (`user.email.split("@")[0]`).
- Aplicar `.toUpperCase()` ao renderizar.

## Detalhes técnicos

- Arquivo a editar: `src/routes/_authenticated.dashboard.tsx`.
- Novo componente local `DashboardHero` (mesmo arquivo, simples).
- Saudação dinâmica por hora local: `<12 → "Bom dia"`, `<18 → "Boa tarde"`, senão `"Boa noite"`.
- Data formatada com `date-fns` (já importado): `format(new Date(), "EEEE, dd 'De' MMMM 'De' yyyy", { locale: ptBR })` → capitalizar primeira letra e meses.
- Imagem de fundo: `<div>` absoluto à direita com `bg-[url(...)] bg-cover bg-right opacity-40 mix-blend-screen mask-image` para esmaecer na esquerda.
- Sem mudanças de schema, RLS já permite `select own profile`.

## Fora de escopo

- Edição/persistência do nome em uma página de "Configurações" (não existe ainda). Se desejar, criamos depois.
