## Nova imagem de fundo do banner de saudação

Gerar uma nova arte de fundo via IA com identidade visual da plataforma (Direito + IA) e aplicá-la ao container de boas-vindas do dashboard.

### Conceito visual
- Tema: **Justiça encontra Inteligência Artificial** — balança da justiça estilizada como circuito/rede neural, com livros de lei dissolvendo em partículas de dados luminosas.
- Paleta: ciano (#22D3EE) → violeta (#8B5CF6) sobre fundo navy/preto profundo, alinhada aos tokens `text-gradient-brand` / `bg-gradient-brand`.
- Estilo: futurista, minimalista, cinematográfico, com brilho sutil (glow) e linhas finas de circuito; lado direito mais denso para esmaecer suavemente à esquerda (onde fica o texto).
- Proporção horizontal larga (1536×384, ~16:4) para ocupar a faixa do banner sem distorção.

### Implementação
- Gerar a imagem com `imagegen` (modelo `standard`) salvando em `src/assets/dashboard-hero-bg.jpg` (substitui o arquivo atual, mantendo o import existente).
- Ajustar levemente o gradiente de máscara em `src/routes/_authenticated.dashboard.tsx` se necessário para garantir legibilidade do texto (lado esquerdo mais opaco).
- Sem mudanças em outros arquivos, schema ou lógica.

### Fora de escopo
- Nova animação, parallax ou troca dinâmica de imagem por horário.
