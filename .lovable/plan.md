## Correções: ícone duplicado + realocação do botão Apps

### 1. Remover o `SidebarTrigger` duplicado do `AppSidebar`

Hoje aparecem dois ícones de ocultar a barra lateral lado a lado: um dentro do `SidebarHeader` (em `src/components/AppSidebar.tsx`) e outro no header do layout `_authenticated` (`src/routes/_authenticated.tsx`).

**Ação:** remover o `SidebarTrigger` e seu wrapper `absolute` do `SidebarHeader` em `src/components/AppSidebar.tsx`. Manter apenas o `BrandLockup` + subtítulo "By Advocacy.AI" no estado expandido e `BrandMark` no estado colapsado. Remover o import não usado de `SidebarTrigger`. O trigger global continua no header do `_authenticated.tsx` (canto superior esquerdo), que é o único ponto de controle.

### 2. Mover o menu "Apps" para o header do layout autenticado

Hoje o `DropdownMenu` "Apps" vive em `src/components/AppHeader.tsx` (header público, não usado nas rotas autenticadas). Por isso, dentro de uma página autenticada (`/dashboard`, `/workspace`, etc.) o botão não aparece — somente o menu do usuário renderizado por `_authenticated.tsx`.

A imagem de referência mostra o botão `⊞ Apps` à esquerda do email do usuário, no header fino do layout autenticado, exatamente como no Inventaria.AI.

**Ação:**

- Em `src/routes/_authenticated.tsx`, dentro do componente `AccountMenu` (ou ao lado dele no header), adicionar o `DropdownMenu` "Apps" — mesma estrutura visual já implementada em `AppHeader.tsx`:
  - Trigger: `Button variant="outline" size="sm"` com ícone `LayoutGrid` + label `Apps` (oculto em telas `< sm`).
  - Conteúdo: cabeçalho "ECOSSISTEMA / Advocacy.AI" + lista de `ECOSYSTEM_APPS` (Inventaria, Peticiona [atual], Advoga, Fin) com cards de ícone, nome (sufixo `.AI` em `text-gradient-brand`), tagline e indicador `Check`/`ExternalLink`.
- Posicionar o trigger **antes** do menu do usuário (`Apps` à esquerda, email/`Sair` à direita), envolvendo ambos em um `div` com `gap-2`.
- Imports adicionais em `_authenticated.tsx`: `LayoutGrid`, `Check`, `ExternalLink` de `lucide-react`; `ECOSYSTEM_APPS` de `@/lib/ecosystem`.
- Remover o bloco "Apps" de `src/components/AppHeader.tsx` para evitar duplicação (e o import `LayoutGrid`/`Check`/`ExternalLink`/`ECOSYSTEM_APPS` ali, se não usados em outro ponto). `AppHeader` continua servindo as rotas públicas (landing, login, signup) sem o launcher — ele só faz sentido para usuários autenticados.

### Sem mudanças de backend

Apenas frontend. Sem migrations, sem secrets, sem alterações em `ecosystem.ts`.
