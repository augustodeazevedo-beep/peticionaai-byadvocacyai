## Diagnóstico
Dois problemas no hero do dashboard:

1. **A imagem não aparece**: o gradiente usa `hsl(var(--card))`, mas `--card` está definido em **oklch** no `src/styles.css` (`--card: oklch(0.22 0.03 260)`). `hsl(oklch(...))` é sintaxe inválida → todo o `background-image` é descartado pelo CSS → a `url(${heroBg})` nunca renderiza. Por isso a caixa aparece totalmente preta.
2. **Os blocos não estão translúcidos**: o hero usa `bg-card` (sólido). Os outros cards do dashboard já usam a classe utilitária `.glass` (definida em `src/styles.css` como `oklch(0.22 0.03 260 / 0.6)` + `backdrop-filter: blur(12px)`), mas o hero não.

## Alterações
Arquivo único: `src/routes/_authenticated.dashboard.tsx` (componente `DashboardHero`).

1. **Trocar `bg-card` por `glass`** no container do hero, alinhando ao restante dos cards do dashboard (translúcido + blur + borda sutil).

2. **Corrigir o overlay sobre a imagem** usando cores válidas em oklch (não `hsl(var(--card))`):
   ```ts
   backgroundImage: `linear-gradient(90deg,
     oklch(0.16 0.02 260 / 0.92) 0%,
     oklch(0.16 0.02 260 / 0.75) 30%,
     oklch(0.16 0.02 260 / 0.35) 55%,
     oklch(0.16 0.02 260 / 0.05) 80%,
     transparent 100%
   ), url(${heroBg})`
   ```
   Resultado: imagem visível em toda a faixa direita, escurecida progressivamente à esquerda para garantir legibilidade do "Boa tarde, NOME".

3. Manter `backgroundSize: "cover"` e `backgroundPosition: "right center"`.

## Fora do escopo
- Regenerar a imagem.
- Mexer no segundo bloco ("Nenhuma peça ainda") — já é `glass`, está correto.
- Mudar tipografia, tamanhos ou layout do hero.
