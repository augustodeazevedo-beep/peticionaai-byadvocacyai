## Objetivo

Elevar a qualidade da redação e do output das peças para o padrão "pronto para protocolo", e permitir que cada usuário/escritório aplique sua **Identidade Visual** (logo, cores, papel timbrado, bloco de assinatura) tanto no preview quanto nas exportações DOCX/PDF.

Hoje temos: editor de Markdown cru + export DOCX simples (Arial 12, sem capa, sem cabeçalho/rodapé, sem assinatura, sem logo) e nenhum cadastro de marca do escritório. Vamos cobrir as três frentes: **estrutura da peça**, **identidade visual** e **fidelidade do preview ao output final**.

---

## 1. Identidade Visual do Escritório (Brand Kit)

Nova área em **Configurações → Identidade do Escritório** (`/configuracoes/identidade`), por usuário (com possibilidade futura de "escritório/equipe").

Campos do Brand Kit:
- Razão social / Nome do escritório
- Logo (upload, bucket `office-brand`, público)
- Cor primária e secundária (color picker, default = brand do app)
- Fonte preferida (Arial, Times New Roman, Garamond, Calibri)
- Endereço, telefone, e-mail, site, OAB/sociedade (CNPJ, nº de inscrição na OAB-Seccional)
- **Papel timbrado**: toggle on/off + escolha de layout (lateral, topo, rodapé)
- **Bloco de assinatura padrão**: nome, OAB, função, e-mail (multilinhas)
- **Fechamento padrão** ("Nestes termos, pede deferimento.")
- **Local padrão** (cidade) — a data é sempre a do protocolo

Storage: novo bucket público `office-brand` para logos.

## 2. Estrutura "pronta para protocolo" da peça

A IA já produz corpo em Markdown. Vamos padronizar a estrutura final montando antes do export, garantindo presença de:

```text
[ENDEREÇAMENTO]   (Excelentíssimo Sr. Dr. Juiz...)
[ESPAÇO]
[ESPELHO/REFERÊNCIA]   (Autos nº ..., Autor x Réu, classe)
[QUALIFICAÇÃO DAS PARTES]
[CORPO]   (I. DOS FATOS / II. DO DIREITO / III. DOS PEDIDOS) - parágrafos numerados
[VALOR DA CAUSA]
[FECHAMENTO]   (Nestes termos, ...)
[LOCAL E DATA]
[ASSINATURA]   (nome + OAB)
```

Dois pontos de atuação:

a) **Pipeline cognitivo** (`mike-generate/prompts.ts`): adicionar instrução explícita de produzir as seções acima e numeração de parágrafos (1., 2., 3...) quando `rito` for processual.

b) **Montador determinístico** (novo `src/lib/pieceAssembler.ts`): no momento do export, envelopa o conteúdo da IA com endereçamento + qualificação + fechamento + assinatura usando o Brand Kit, mesmo que a IA tenha omitido. Idempotente (não duplica se já existir).

## 3. Export DOCX padrão protocolo

Reescrever `supabase/functions/export-piece-docx/index.ts`:
- Página A4, margens ABNT (sup 3cm, esq 3cm, inf 2cm, dir 2cm)
- Fonte do Brand Kit, corpo 12pt, recuo 1ª linha 2,5cm, justificado, espaço 1,5
- **Cabeçalho** com logo + nome/contatos do escritório (papel timbrado)
- **Rodapé** com nome do escritório + paginação ("Página X de Y")
- Headings com cor primária do Brand Kit
- Citação longa com recuo 4cm, fonte 10pt, espaço simples (já parcial)
- **Bloco de assinatura** centralizado: linha + nome + OAB
- Numeração automática de parágrafos do corpo (opcional por config)

## 4. Novo Export PDF (pronto para protocolo)

Adicionar export PDF reaproveitando `@react-pdf/renderer` (já usado em Visual Law). Novo `src/services/pieces/exportPdfProtocolo.tsx` com a mesma diagramação do DOCX (timbrado, margens ABNT, assinatura). Botão extra no editor: "⬇ Exportar PDF (protocolo)".

## 5. Preview fiel ao output

Na aba **Visualização** de `/pecas/$id`, trocar o `prose` genérico por um componente **PageMockup** que renderiza a peça em folha A4 simulada (fundo branco, sombra, margens, timbrado renderizado em cima, assinatura embaixo) usando os mesmos tokens do Brand Kit. Assim o usuário vê exatamente o que vai protocolar antes de exportar.

## 6. Ajustes UX no editor

- Botão "Exportar" vira menu (DOCX / PDF / HTML)
- Indicação se a Identidade Visual está configurada; se não, CTA para "Configurar agora"
- Toggle "Aplicar timbrado" por peça (default = on se Brand Kit configurado)

---

## Detalhes técnicos

**Migração SQL** (uma migration):
- Tabela `office_brand` (1 linha por user_id)
  - colunas de domínio: `firm_name`, `logo_url`, `primary_color`, `secondary_color`, `font_family`, `address`, `phone`, `email`, `website`, `oab_registration`, `letterhead_enabled`, `letterhead_layout`, `signature_block`, `closing_text`, `default_city`
  - RLS: dono lê/edita o próprio registro
- Bucket público `office-brand` + policies (insert/update/delete só dono pelo path `${user_id}/...`, select público)
- Coluna `pieces.brand_overrides JSONB` (opcional; permite override por peça) e `pieces.assembly_options JSONB` (numerar parágrafos, incluir capa, etc.)

**Arquivos a criar:**
- `src/routes/_authenticated.configuracoes.identidade.tsx`
- `src/components/brand/BrandKitForm.tsx`, `LogoUploader.tsx`, `SignatureBlockEditor.tsx`
- `src/lib/officeBrand.ts` (tipos + fetch/save)
- `src/lib/pieceAssembler.ts` (monta peça final em Markdown estruturado)
- `src/components/pieces/PageMockup.tsx` (preview A4 com timbrado)
- `src/services/pieces/exportPdfProtocolo.tsx` (PDF client-side via react-pdf)
- Nova função edge `export-piece-pdf` (opcional, server-side) — fica para iteração se for pesado no client

**Arquivos a editar:**
- `supabase/functions/export-piece-docx/index.ts` — timbrado/assinatura/ABNT
- `supabase/functions/mike-generate/prompts.ts` — exigir estrutura protocolo + numeração
- `src/routes/_authenticated.pecas.$id.tsx` — menu de export, PageMockup, banner Brand Kit
- `src/components/AppSidebar.tsx` — link "Identidade do Escritório"
- `src/lib/mikeClient.ts` — `exportPiecePdf(pieceId)` quando server-side; client-side direto

**Fora de escopo (próxima iteração):**
- Múltiplos templates de timbrado prontos (corporativo, minimalista, clássico)
- Marca por equipe/escritório multiusuário
- Assinatura digital (ICP-Brasil)
- Watermark "MINUTA"

---

## Entrega esperada

Ao final: usuário abre `/configuracoes/identidade`, sobe logo + dados + assinatura, gera uma peça nova; o preview já mostra a folha A4 com timbrado; clica em **Exportar PDF** ou **DOCX** e recebe um arquivo pronto para protocolo, com cabeçalho/rodapé, fonte/cores do escritório, parágrafos numerados, fechamento, local/data e bloco de assinatura.
