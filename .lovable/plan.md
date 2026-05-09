## Apps Launcher (ecossistema Advocacy.AI)

Criar um menu "Apps" no `AppHeader` igual ao da imagem, listando todas as plataformas do ecossistema com link para cada uma. O Peticione.AI aparece marcado como "atual"; as demais abrem em nova aba.

### Apps (1 fonte de verdade)

Novo arquivo `src/lib/ecosystem.ts`:

```ts
export type EcosystemApp = {
  id: "peticione" | "advoga" | "inventaria" | "fin";
  name: string;          // "Peticiona.AI"
  tagline: string;       // "Petições, minutas e contratos"
  url: string;           // https://...lovable.app
  icon: LucideIcon;      // FileText / Briefcase / Scale / Wallet
  current?: boolean;     // true para Peticione
};
```

URLs:
- **Peticiona.AI** (atual) — `https://peticionaai-byadvocacyai.lovable.app` — `FileText`
- **Advoga.AI** — `https://advogaai-byadvocacy.lovable.app` — `Briefcase`
- **Inventaria.AI** — `https://inventariaai.lovable.app` — `Scale`
- **Fin.AI** — preciso confirmar a URL publicada (ver pergunta abaixo) — `Wallet`

### UI (`src/components/AppHeader.tsx`)

Antes do menu do usuário, adicionar:

```
[ ⊞ Apps ▾ ]
```

Botão `variant="outline"` com ícone `LayoutGrid` (lucide). Ao clicar, abre `DropdownMenuContent` com:

- Cabeçalho: `ECOSSISTEMA` (uppercase 10px tracking-wide accent) + `Advocacy.AI` (font-semibold, .AI em `text-gradient-brand`).
- Lista de apps em cards verticais:
  - Item ativo (Peticiona): fundo `bg-secondary/60 border border-accent/40`, badge ✓ ao lado do nome, sem ícone de "abrir".
  - Demais: hover `bg-secondary/40`, ícone `ExternalLink` no canto direito; `<a target="_blank" rel="noopener noreferrer">`.
  - Cada item: ícone do app em quadradinho (`p-2 rounded bg-muted`), nome com sufixo `.AI` em verde-neon (`text-gradient-brand`), tagline `text-xs text-muted-foreground`.

Visível para todos os usuários logados (não depende de admin). No mobile, mantém como dropdown.

### Sem mudanças de backend

Apenas frontend e copy. Sem migrations, sem secrets.

### Pergunta antes de implementar

Confirme a **URL publicada do Fin.AI**. Possíveis padrões Lovable:
- `https://finai.lovable.app`
- `https://fin-ai.lovable.app`
- `https://finai-byadvocacy.lovable.app`
- `https://project--baeca359-2d19-4855-87bc-8f4f0de7344d.lovable.app` (URL estável por ID — recomendado se ainda não publicou com slug fixo)

Qual usar? Se preferir, já posso usar a URL estável `project--baeca359-...lovable.app` para todos os 4 apps (mais robusta, nunca quebra). Recomendo essa opção.