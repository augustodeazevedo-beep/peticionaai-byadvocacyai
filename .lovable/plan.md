## Objetivo
Adotar a arte enviada como **a marca definitiva do Peticione.AI** e aplicá-la de forma consistente, com cuidado de branding profissional, em toda a plataforma.

A arte enviada é **só o símbolo** (a pena estilizada com nós neurais, em gradiente cyan→violeta, fundo transparente). Portanto, o sistema de marca passa a ter dois lockups oficiais:

- **Símbolo (icon-only)** — usado em ícone de header, favicon, PWA, share images quando o espaço é apertado.
- **Lockup horizontal (símbolo + wordmark "Peticione.AI")** — usado no hero da landing, telas de auth, e-mails, OG image. O wordmark será **tipográfico** (não um PNG embutido), para garantir nitidez em qualquer tamanho e tema.

## 1. Substituir arquivos de logo
- Substituir `src/assets/peticione-icon.png` pela arte enviada (passa a ser o símbolo oficial).
- Substituir `src/assets/peticione-logo.png` também pela mesma arte (símbolo). Quem precisa do lockup completo passa a usar o componente `<LogoLockup />` (ver passo 2).
- Atualizar `public/favicon.ico` / favicon PNG para a nova marca.

## 2. Refatorar o sistema de componentes de marca
Reescrever `src/components/Logo.tsx` com três componentes oficiais e bem documentados:

- `<BrandMark size>` — apenas o símbolo (substitui o atual `LogoMark`).
- `<BrandLockup size variant="horizontal" | "stacked" tone="light" | "dark">` — símbolo + wordmark tipográfico. O wordmark usa a fonte Inter (peso 600) para "Peticione" e JetBrains Mono para ".AI" com gradiente cyan→violeta, respeitando o design system. Inclui espaçamento, alinhamento óptico e tamanho mínimo legível. Substitui o atual `LogoFull`.
- `<BrandWordmark>` — versão só-texto, para contextos onde o símbolo já apareceu.

Compatibilidade: manter `LogoMark` e `LogoFull` como aliases para não quebrar imports existentes, mas marcar como deprecated em comentário.

## 3. Aplicar com cuidado de branding em toda a plataforma
- **Header (`AppHeader.tsx`)**: `<BrandMark size={32} />` + wordmark tipográfico (já existe parcialmente — refinar espaçamento, peso, tracking, e estado hover sutil com glow cyan).
- **Hero da landing (`routes/index.tsx`)**: trocar `<LogoFull />` por `<BrandLockup variant="stacked" />` em tamanho generoso (símbolo ~96px + wordmark grande embaixo), centrado sobre o background temático já criado, com leve drop-shadow para integrar luminosamente.
- **Login / Signup / Reset password**: `<BrandLockup variant="stacked" size="md" />` no topo do card, removendo o `<LogoMark>` atual.
- **AppFooter**: `<BrandMark size={24} />` + "Peticione.AI" em wordmark pequeno + "by Advocacy.AI" como tagline.
- **Tela 404 / loading**: `<BrandMark>` com leve animação pulse.
- **Favicon e meta tags**: atualizar `index.html`/`__root.tsx` com `<link rel="icon">` apontando para o novo símbolo, e `apple-touch-icon`. Atualizar `og:image` para uma versão do lockup sobre fundo escuro.

## 4. Diretrizes de uso (registradas em memória do projeto)
Salvar em `mem://design/brand` regras canônicas:
- Espaçamento mínimo ao redor do símbolo: ½ da sua altura.
- Tamanho mínimo do símbolo: 24px (digital).
- Nunca distorcer, recolorir, rotacionar ou aplicar contorno.
- Sobre fundos claros (futuras telas) usar variante `tone="light"` (a definir em iteração futura — por enquanto a marca é otimizada para dark theme).
- Wordmark sempre em Inter 600 + JetBrains Mono para ".AI", com gradiente do design system.

## Detalhes técnicos
- Copiar `user-uploads://image-2.png` → `src/assets/peticione-icon.png` e `src/assets/peticione-logo.png` (overwrite).
- Gerar favicon.ico/png a partir do símbolo via script (`/tmp/favicon.py` com Pillow).
- Componentes em React + Tailwind, sem novas dependências.
- Sem mudanças em backend, schema, rotas ou auth.

## Fora de escopo
- Versão "tone=light" da marca para fundos claros (criar quando surgir tela light-mode).
- Animação Lottie/SVG da marca.
- Brand book/manual em PDF (pode ser entregue futuramente como artefato).
- Reescrever o background do hero — já está bom.
