## Implementação

**1. `src/components/AppSidebar.tsx`**
- Adicionar "BY ADVOCACY.AI" abaixo do `<BrandLockup>` no `SidebarHeader` (apenas quando expandido), com `text-[10px] tracking-[0.25em] text-muted-foreground text-center`.
- Adicionar `<SidebarTrigger>` no canto superior direito do header para colapsar/expandir.

**2. `src/styles.css`**
- Adicionar regra para ocultar scrollbar do conteúdo do sidebar:
  ```css
  [data-sidebar="content"] { scrollbar-width: none; }
  [data-sidebar="content"]::-webkit-scrollbar { display: none; }
  ```

Sidebar já está com `collapsible="icon"`, então o modo "só ícones" já funciona — apenas falta o gatilho visível dentro do próprio sidebar.