## Limpar a landing page: remover acesso às ferramentas, manter apenas login

O `AppHeader` (usado **somente** em `src/routes/index.tsx`, a landing) hoje exibe:
- nav com links para Workspace, Assistentes, Dashboard, Nova Peça, Ferramentas, Admin (visível quando o usuário está logado);
- um dropdown "Minha conta" com atalhos para todas as ferramentas internas + Sair (quando logado);
- botões "Entrar" / "Criar conta" (quando deslogado).

A landing deve ser puramente comercial — nada de atalhos internos. Acesso à plataforma só pela autenticação.

### Ação em `src/components/AppHeader.tsx`

- **Remover** todo o bloco `<nav>` com os links de ferramentas (linhas 26–49).
- **Remover** o `DropdownMenu` "Minha conta" com a lista de ferramentas. Substituir, quando o usuário estiver logado, por dois botões enxutos:
  - `Acessar plataforma` (variant primário com `bg-gradient-brand`) → `/dashboard`.
  - `Sair` (variant ghost) → chama `signOut()` e volta para `/`.
- **Manter**, quando deslogado, apenas:
  - `Entrar` (ghost) → `/login`.
  - `Criar conta` (gradient) → `/signup`.
- Limpar imports não usados: `DropdownMenu*`, `useNavigate` (se não restar uso), e ícones (`LayoutDashboard`, `FilePlus`, `Link2`, `Settings`, `Menu`, `Sparkles`, `BookOpen`, `Users`, `Cpu`) — manter apenas `LogOut` se for usado nos botões.

### Observações

- O header autenticado (`_authenticated.tsx`) **não muda** — usuários dentro da plataforma continuam com sidebar, menu Apps e menu de conta normais.
- O footer (`AppFooter`) na landing continua igual.

Sem mudanças de backend.
