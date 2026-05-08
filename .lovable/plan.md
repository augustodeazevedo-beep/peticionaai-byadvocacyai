## Objetivo
Voltar ao logotipo anterior (o que você adorou, com a pena estilizada e os nós neurais cyan→violeta), garantindo que ele fique sem moldura/fundo, e criar uma imagem de plano de fundo temática para o container do hero da landing page, integrando o logo a essa imagem.

## 1. Restaurar o logotipo anterior
A última regeneração descaracterizou o logo (mudou a forma da pena, a cor do wordmark e adicionou irradiação tipo "sol"). Como já existe uma versão anterior aprovada salva no histórico, o caminho mais seguro e fiel é restaurá-la via histórico — não vou tentar recriar via prompt porque modelos generativos não reproduzem o mesmo resultado duas vezes.

**Ação sua:** abrir o histórico e reverter ao ponto imediatamente anterior à regeneração de hoje (a versão com a pena cyan→violeta + circuito neural sutil + wordmark "Peticione.AI" em azul-marinho/cyan).

<lov-actions>
  <lov-open-history>Abrir histórico</lov-open-history>
</lov-actions>

Após o revert, sigo com os passos abaixo no mesmo arquivo `src/assets/peticione-logo.png` (e mantenho o `peticione-icon.png` para o header).

## 2. Garantir transparência sem moldura
Pós-processar o PNG do logo restaurado para:
- Remover qualquer halo/retângulo residual em torno da arte
- Aparar o canvas (auto-crop) para que o bounding box seja exatamente a arte
- Confirmar canal alfa 100% transparente fora dos traços

Feito via script local (sem regerar a arte) usando ferramentas de imagem do sandbox.

## 3. Criar imagem de plano de fundo do hero
Gerar `src/assets/hero-background.jpg` (1920×1080) com estética que dialoga com "redação jurídica + IA":
- Ambiente escuro, profundo, em camadas — combinando com o tema dark da landing
- Elementos sutis: balança da justiça etérea, livros/códigos abertos com partículas de luz, linhas de circuito/rede neural fluindo entre símbolos jurídicos, leve textura de papel/manuscrito ao fundo
- Paleta alinhada ao design system: azul-marinho profundo, cyan luminoso, violeta, com pontos de luz dourada discretos para sugerir prestígio/tradição jurídica
- Composição com vinheta natural nos cantos e área central mais "limpa" para o logo + headline respirarem
- Sem texto, sem marcas d'água, sem rostos

## 4. Integrar logo + background no hero da landing
Em `src/routes/index.tsx`, transformar a `<section>` do hero em um container com:
- `background-image` apontando para a imagem gerada, com `bg-cover bg-center`
- Overlay em gradiente (do `--background` opaco nas bordas para semi-transparente no centro) garantindo legibilidade do texto sobre a imagem
- O `<LogoFull />` continua acima do chip "AI-Native · by Advocacy.AI" e do `<h1>`, agora "flutuando" sobre o background temático
- Borda inferior com fade suave para o restante da página (sem corte abrupto)
- Altura mínima `min-h-[80vh]` no desktop para dar presença ao container

Demais seções da landing permanecem intactas.

## Detalhes técnicos
- Imagem gerada via `imagegen--generate_image` (modelo `standard`), salva como `.jpg` para peso menor
- Overlay implementado com `linear-gradient` em CSS inline ou classe Tailwind sobre um wrapper `relative`/`absolute inset-0`
- Logo importado via ES6 (já existente)
- Sem mudanças em backend, schema, auth ou outras rotas

## Fora de escopo
- Mexer em outras páginas (login, dashboard, editor) — o background novo é só do hero
- Recriar o logo do zero via IA (vamos restaurar o anterior via histórico)
- Animações no background (fica para iteração futura, se desejar)
