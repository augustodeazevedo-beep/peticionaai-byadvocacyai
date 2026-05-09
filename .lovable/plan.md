## Diagnóstico
Comparando as duas referências:
- **Imagem atual (image-20)**: o container aparece quase totalmente preto — a arte gerada existe no fundo, mas o gradiente do card está muito opaco e cobre praticamente toda a imagem.
- **Referência desejada (image-21, Study.AI)**: a arte ocupa visivelmente ~60% direita do box, com transição suave para o lado escuro onde fica o texto de boas-vindas. A imagem é parte do conteúdo do box, não um plano de fundo apagado.

A imagem JÁ está aplicada ao box correto (`DashboardHero` em `_authenticated.dashboard.tsx`) — o problema é apenas o gradiente de máscara, que está abafando demais a arte.

## Alteração
Arquivo único: `src/routes/_authenticated.dashboard.tsx` (componente `DashboardHero`).

Ajustar o gradiente para revelar mais da arte no lado direito, mantendo legibilidade do texto à esquerda:

- **Antes**: `linear-gradient(90deg, hsl(var(--card)) 0%, hsl(var(--card)/0.75) 35%, transparent 75%)`
- **Depois**: `linear-gradient(90deg, hsl(var(--card)) 0%, hsl(var(--card)/0.92) 25%, hsl(var(--card)/0.4) 50%, transparent 70%)`

Efeito:
- 0–25%: fundo opaco (texto 100% legível).
- 25–50%: transição suave (texto ainda legível, arte começa a aparecer).
- 50–70%: arte cada vez mais nítida.
- 70–100%: arte totalmente visível (páginas de petição + nós neurais).

Também trocar `backgroundPosition: "right center"` para `"right center"` (mantido) e adicionar `min-height` sutil (`md:min-h-[110px]`) caso necessário para a arte respirar — opcional, validar visualmente após o ajuste do gradiente.

## Fora do escopo
- Regenerar a imagem (a arte atual já está alinhada à identidade).
- Mudar tipografia, badge, layout do texto ou tamanho do hero.
- Alterar outros containers da plataforma.
