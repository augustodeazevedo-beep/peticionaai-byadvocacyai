## Objetivo
Refinar o logotipo do Peticione.AI com uma estética mais "IA-native" (mantendo a identidade atual que você gostou) e aplicá-lo em três pontos da plataforma. Em seguida, publicar.

## 1. Upgrade do logotipo
Editar o arquivo existente `src/assets/peticione-logo.png` via `imagegen--edit_image`, preservando a base atual (paleta neon-cyan, wordmark) e adicionando elementos sutis que remetem à IA:
- Nó/circuito neural integrado ao símbolo (pequenos pontos conectados por linhas finas saindo do ícone)
- Leve efeito de "glow" e gradiente cyan→violeta para sensação tech
- Acabamento limpo, vetorial, fundo transparente
- Manter legibilidade em tamanhos pequenos (uso como favicon/ícone)

Também gerar uma versão **somente do símbolo** (sem wordmark) em `src/assets/peticione-icon.png` para uso compacto na barra superior.

## 2. Aplicação do logo
- **Landing page (`src/routes/index.tsx`)**: inserir o logo (versão completa) centralizado, imediatamente acima do slogan no hero.
- **Login e Signup (`src/routes/login.tsx`, `src/routes/signup.tsx`, `src/routes/reset-password.tsx`)**: inserir o logo acima do título do card de autenticação.
- **Header da plataforma (`src/components/AppHeader.tsx`)**: substituir/adicionar o ícone (versão símbolo) ao lado do nome "Peticione.AI" na barra superior.

## 3. Publicação
Após validar visualmente as mudanças, abrir o diálogo de publicação para você confirmar o deploy.

## Detalhes técnicos
- Usar `imagegen--edit_image` com a imagem atual como referência (mantém continuidade visual).
- PNG com fundo transparente para todos os usos.
- Componente `<Logo />` já existente será atualizado para aceitar prop `variant: "full" | "icon"`.
- Nenhuma alteração de schema ou backend.

## Fora de escopo
- Reescrita do design system / paleta.
- Novas páginas ou funcionalidades.
- Iteração 2 (jurisprudência, jurimetria, assessor jurídico).
