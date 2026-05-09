## Remover ícone da Advocacy.AI no lockup interno do sidebar

No último ajuste, o ícone da Advocacy.AI foi adicionado em dois pontos:
1. Rodapé (`AppFooter`) — junto ao texto "by Advocacy.AI · Prospect.AI · ...".
2. Sidebar (`AppSidebar`) — junto ao subtítulo "BY ADVOCACY.AI" abaixo do lockup do Peticiona.AI.

A imagem de referência mostra o lockup interno (sidebar) **sem** o ícone da Advocacy — apenas o texto "BY ADVOCACY.AI" abaixo do wordmark Peticiona.AI.

### Ação

- Em `src/components/AppSidebar.tsx`, remover o `<img src={advocacyIcon} … />` que foi inserido ao lado do texto "By Advocacy.AI", voltando o `<span>` ao formato anterior (apenas o texto em uppercase, tracking largo).
- Remover o import `import advocacyIcon from "@/assets/advocacy-ai-icon.png"` do mesmo arquivo (não será mais usado ali).
- **Manter** o ícone no `AppFooter.tsx` (rodapé), pois o pedido é específico ao "logotipo interno da plataforma".
- **Manter** o arquivo `src/assets/advocacy-ai-icon.png` (ainda usado pelo footer e útil para replicar no ecossistema).

Sem mudanças de backend.
