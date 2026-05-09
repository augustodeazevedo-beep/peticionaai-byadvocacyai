## Objetivo
Atualizar o menu "Apps" do dashboard para exibir todos os produtos do ecossistema Advocacy.AI, incluindo os que ainda não estão listados (Prospect.AI e Study.AI), e padronizar as URLs com os links oficiais informados.

## Alterações
Arquivo único: `src/lib/ecosystem.ts`

1. Atualizar URLs existentes para os links oficiais:
   - Peticiona.AI → `https://peticionaai-byadvocacyai.lovable.app` (atual: `current: true`)
   - Advoga.AI → `https://advogaai-byadvocacy.lovable.app` (já correto)
   - Inventaria.AI → `https://inventariaai.lovable.app` (corrigir “ttps” do usuário)
   - Fin.AI → `https://finai-byadvocacyia.lovable.app`

2. Adicionar dois novos apps com ícones do `lucide-react` coerentes com a identidade:
   - **Prospect.AI** — `tagline: "Captação inteligente de clientes"` — ícone `Target` — `https://prospectai-byadvocacyai.lovable.app`
   - **Study.AI** — `tagline: "Estudo e formação jurídica com IA"` — ícone `GraduationCap` — `https://studyai-plataforma.lovable.app`

3. Atualizar o tipo `EcosystemApp["id"]` para incluir `"prospect"` e `"study"`.

4. Ordem sugerida no menu (fluxo natural do escritório): Prospect → Inventaria → Peticiona (atual) → Advoga → Fin → Study.

## Fora do escopo
- Mudanças visuais no `AppsMenu` em `_authenticated.tsx` (já itera sobre `ECOSYSTEM_APPS`, então os novos apps aparecem automaticamente).
- Criação de páginas internas ou integrações para os novos produtos.