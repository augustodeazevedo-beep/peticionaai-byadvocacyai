## Objetivo
Substituir a imagem de fundo do hero do dashboard (`src/assets/dashboard-hero-bg.jpg`) por uma nova arte gerada por IA com identidade visual mais forte ligada ao objeto da plataforma — **Petições jurídicas com IA**.

## Conceito visual
Composição cinematográfica e minimalista, alinhada à identidade Peticiona.AI (cyan → violeta, dark, futurista):

- **Elementos jurídicos sutis**: páginas de petição flutuando, linhas de texto estilizadas (parágrafos de documento), assinatura/rubrica, possível martelo ou balança como acento muito discreto.
- **Camada de IA**: nós neurais, partículas de dados, traços luminosos cyan→violeta percorrendo as páginas como se a IA "escrevesse" o documento.
- **Composição**: elementos concentrados à direita (onde o gradiente do card revela a imagem); lado esquerdo naturalmente escuro/limpo para preservar legibilidade do "Boa tarde, NOME".
- **Paleta**: fundo `#0F172A` (mesmo do tema dark), glow cyan `#22D3EE` e violeta `#8B5CF6`, sem outras cores.
- **Estilo**: editorial/futurista, profundidade sutil, sem texto legível, sem logos, sem rostos.
- **Formato**: 1920×512 (mesma proporção atual do banner).

## Alterações
1. Gerar nova imagem com `imagegen--generate_image` (modelo `standard` para melhor fidelidade) salvando em `src/assets/dashboard-hero-bg.jpg` (sobrescrevendo a atual).
2. Manter `_authenticated.dashboard.tsx` inalterado — o gradiente atual (`hsl(var(--card)) 0% → 0.75 35% → transparent 75%`) já garante legibilidade e será reaproveitado.

## Fora do escopo
- Mudanças no layout, tipografia ou tamanho do hero.
- Alterações no gradiente/máscara (manter o ajuste fino já validado).
- Geração de variantes responsivas (mobile/desktop) — uma única imagem cobre ambos.
