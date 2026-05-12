# Etapa 2 — Edge Function `generate-visual-law` com Streaming SSE

Objetivo: implementar a geração/refinamento Visual Law via **Lovable AI Gateway** (`google/gemini-2.5-flash`), com streaming SSE token a token, e plugar na store já criada na Etapa 1. Continua sem alterar o `VisualLawPanel` atual nem o PDF — a integração na UI vem na Etapa 3.

## Por que Edge Function (e não `createServerFn`)

O projeto já adota Supabase Edge Functions para LLM (`mike-generate`) e exports (`export-piece-docx`, `export-document`). Para **SSE token-a-token**, o caminho mais robusto e consistente com o que já existe é uma edge function Deno que faz proxy do stream do Lovable AI Gateway. Mantém o padrão da codebase, evita conflitos com o runtime SSR do Worker da TanStack Start e é o pattern documentado em `connecting-to-ai-models`.

## Arquivos criados / modificados

```text
supabase/
├── config.toml                                 # adiciona bloco da função (verify_jwt = true)
└── functions/
    └── generate-visual-law/
        ├── index.ts                            # SSE proxy + system prompt jurídico
        └── prompts.ts                          # builders de system/user prompts

src/
└── services/
    └── visual-law/
        └── generate.ts                         # implementa streamVisualLaw (substitui stub)
```

Nenhum outro arquivo é tocado.

## Edge Function — `supabase/functions/generate-visual-law/index.ts`

Responsabilidades:
1. Validar `Authorization` (verify_jwt = true → exige usuário logado).
2. Aceitar `POST` JSON com `VLGeneratePayload` (mesmo shape dos types da Etapa 1).
3. Montar `messages` chamando `buildSystemPrompt(payload)` + `buildUserPrompt(payload)` (em `prompts.ts`).
4. Chamar `https://ai.gateway.lovable.dev/v1/chat/completions` com:
   - `model: "google/gemini-2.5-flash"`
   - `stream: true`
   - `messages: [...]`
5. Repassar o `response.body` diretamente ao cliente como `text/event-stream`.
6. Tratar `429` (rate limit) e `402` (créditos) devolvendo JSON com mensagem amigável.
7. CORS completo (mesmo padrão das funções existentes).

Pseudo-shape:

```ts
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const payload = await req.json() as VLGeneratePayload;
  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      stream: true,
      messages: [
        { role: "system", content: buildSystemPrompt(payload) },
        { role: "user",   content: buildUserPrompt(payload) },
      ],
    }),
  });

  if (upstream.status === 429) return json({ error: "Rate limit excedido. Tente novamente em instantes." }, 429);
  if (upstream.status === 402) return json({ error: "Créditos do Lovable AI esgotados. Adicione créditos no Workspace." }, 402);
  if (!upstream.ok)            return json({ error: "Falha no gateway de IA." }, 500);

  return new Response(upstream.body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
});
```

## `prompts.ts` — System prompt jurídico (anti-alucinação)

Implementa um system prompt fiel ao spec do usuário. Cobre:
- Persona (acadêmica, técnica, persuasiva, didática).
- Sequência de raciocínio: **fatos → provas → análise → fundamento → pedido**.
- Anti-alucinação: nunca inventar jurisprudência/datas/fatos; usar formatos `Evento X – arquivo Y` / `Documento X – fls. Y`; quando faltar prova: `"não há prova nos autos sobre este ponto."`; conflitos devem ser destacados, nunca harmonizados.
- Preservação: provas, lógica processual, hierarquia argumentativa, pedidos e teses críticas **não podem ser resumidos**.
- Visual Law deve **apenas reorganizar/clarificar**, nunca alterar sentido jurídico.
- Formatação Word/PDF: Arial 12, 1.5, justificado, recuo 2,5 cm, citação longa recuo 4 cm fonte 10, hierarquia `I. / I.1. / I.1.a.`, sem markdown residual.
- Estrutura petitória completa quando aplicável (Endereçamento → Assinatura).
- ABNT NBR 10520:2023 para citações.
- Pós-documento `OBSERVAÇÕES AO OPERADOR` listando arquivos usados, placeholders, documentos faltantes, dependências, encerrando com a pergunta padrão.

`buildUserPrompt(payload)` injeta:
- `payload.direction` traduzido em instrução ("apenas reorganizar" | "explicar mais" | "intensificar Visual Law").
- `payload.density` ("enxuto" | "padrão" | "confortável").
- `payload.config` (fonte, cor primária — orienta apenas tonalidade textual; cor real é aplicada no viewer).
- `payload.hiddenElements` ("não inclua: timeline, quadro_probatorio, …").
- `payload.refinementPrompt` quando houver (instrução adicional do usuário).
- `payload.legalMetadata` (tipo da peça, área, citações conhecidas).
- `payload.currentContent` como base a ser refinada.

## `supabase/config.toml`

Adicionar (sem alterar `project_id` nem outras funções):

```toml
[functions.generate-visual-law]
verify_jwt = true
```

## Cliente — `src/services/visual-law/generate.ts` (substitui o stub)

Implementação real do `streamVisualLaw`:

- Usa `fetch` direto a `${VITE_SUPABASE_URL}/functions/v1/generate-visual-law` (não `supabase.functions.invoke`, que não streamia bem).
- Header `Authorization: Bearer <session.access_token>` obtido via `supabase.auth.getSession()`; `apikey: VITE_SUPABASE_PUBLISHABLE_KEY`.
- Parser SSE **linha-a-linha** seguindo o pitfall checklist (sem split em `\n\n`, lida com CRLF, comentários `:`, JSON parcial entre chunks, `[DONE]`, flush final).
- Para cada `delta.content`, chama `handlers.onToken(chunk)`.
- Ao concluir, agrega o conteúdo total e chama `handlers.onDone({ content })`. (Validation/risk virão na Etapa 5; nesta etapa retornam undefined.)
- Erros 429/402/500 → mensagem amigável via `handlers.onError(new Error(...))`.
- Suporta `AbortSignal` (passado pelo store) para cancelamento limpo.

## Integração com a store (Etapa 1) — sem novos componentes

A store já expõe `startGeneration / appendToken / finishGeneration / failGeneration / cancelGeneration`. Esta etapa **apenas implementa o serviço** que será chamado pela UI da Etapa 3. Para validação, será incluída uma função utilitária `runGeneration(payload)` que orquestra:

```ts
// src/services/visual-law/generate.ts (export adicional)
export async function runGeneration(payload: VLGeneratePayload) {
  const controller = new AbortController();
  const store = useVisualLawStore.getState();
  store.startGeneration(controller);
  let aggregated = "";
  await streamVisualLaw(
    payload,
    {
      onToken: (chunk) => { aggregated += chunk; store.appendToken(chunk); },
      onDone: ({ content }) => store.finishGeneration({
        content: content || aggregated,
        config: payload.config,
        prompt: payload.refinementPrompt,
        direction: payload.direction,
        legalMetadata: payload.legalMetadata,
      }),
      onError: (err) => store.failGeneration(err.message),
    },
    controller.signal,
  );
}
```

> Importante: para evitar a regra do `tss-serverfn-split`, o cliente é apenas frontend (não é `.functions.ts`); pode coexistir com helpers no mesmo arquivo sem riscos.

## Configuração / secrets

- `LOVABLE_API_KEY` já está provisionado no projeto (visto em `<secrets>`). **Sem nada para o usuário fazer.**
- `verify_jwt = true` exige usuário autenticado — coerente com o uso atual (`/pecas/$id` está sob `_authenticated`).

## Testes / validação

1. `bun run build` passa.
2. Deploy da edge function (automático).
3. Smoke test via `supabase--curl_edge_functions` em `POST /generate-visual-law` com payload mínimo, validando:
   - Status `200`.
   - Resposta `text/event-stream`.
   - Linhas `data: { ... }` chegando incrementalmente; encerramento com `data: [DONE]`.
4. Teste 401 sem auth; 429/402 simulados via inspeção de logs (`supabase--edge_function_logs`).

## O que **não** entra nesta etapa

- Qualquer mudança de UI (Split Pane, sidebar tabs, loading overlay) → Etapa 3.
- Persistência de versões em tabela Supabase → Etapa 4 (hoje permanecem na store/local).
- Validação anti-alucinação automatizada (`legalValidation`) e shadow cabinet (`riskAnalysis`) extraídos via tool calling estruturado → Etapa 5.

## Checklist de aceitação

- [ ] `supabase/functions/generate-visual-law/{index.ts,prompts.ts}` criados e deployados.
- [ ] `supabase/config.toml` com bloco `[functions.generate-visual-law] verify_jwt = true`.
- [ ] `src/services/visual-law/generate.ts` implementa `streamVisualLaw` real + `runGeneration` orquestrador.
- [ ] `bun run build` passa.
- [ ] Smoke test SSE retorna tokens incrementais.
- [ ] `VisualLawPanel`, rotas e PDF atuais permanecem inalterados.
