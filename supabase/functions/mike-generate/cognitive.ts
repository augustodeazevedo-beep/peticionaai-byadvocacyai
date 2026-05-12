import {
  systemPromptCognitive,
  systemPromptAdversarial,
  systemPromptDraft,
  systemPromptAudit,
  cognitiveTool,
  adversarialTool,
  auditTool,
} from "./prompts.ts";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/* eslint-disable */
type AnyConfig = Record<string, any>;

export type PipelineInput = {
  piece_type: string;
  area: string | null;
  party_position?: string | null;
  tribunal?: string | null;
  instancia?: string | null;
  rito?: string | null;
  fase_processual?: string | null;
  fields: Record<string, unknown>;
  context?: string | null;
};

export type CognitiveCallProvider = (
  body: Record<string, unknown>,
  opts?: { stream?: boolean },
) => Promise<Response>;

/** Aceita o gateway Lovable AI por padrão. Mike segue como fallback no index. */
export function defaultLovableProvider(apiKey: string): CognitiveCallProvider {
  return async (body) =>
    fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
}

/** Extrai o primeiro tool_call args como JSON; ou retorna null. */
function extractToolJson(json: any): any | null {
  const tc = json?.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc) return null;
  try {
    return JSON.parse(tc.function?.arguments ?? "{}");
  } catch {
    return null;
  }
}

function userInputToPrompt(input: PipelineInput): string {
  const fieldsJson = JSON.stringify(input.fields, null, 2);
  return [
    `Tipo de peça: ${input.piece_type}`,
    `Área: ${input.area ?? "—"}`,
    `Posição da parte: ${input.party_position ?? "—"}`,
    `Tribunal: ${input.tribunal ?? "—"} | Instância: ${input.instancia ?? "—"}`,
    `Rito: ${input.rito ?? "—"} | Fase: ${input.fase_processual ?? "—"}`,
    "",
    "Dados fornecidos pelo operador (JSON):",
    fieldsJson,
    "",
    `Contexto adicional:\n${input.context ?? "—"}`,
  ].join("\n");
}

function modelFor(cfg: AnyConfig, key: string, fallback: string): string {
  return cfg?.models?.[key] ?? fallback;
}

/* ===========================================================
 * Etapas individuais
 * =========================================================== */

export async function stepCognitive(
  cfg: AnyConfig,
  input: PipelineInput,
  call: CognitiveCallProvider,
): Promise<{ data: any; usage: any; model: string }> {
  const model = modelFor(cfg, "cognitive_protocol", "google/gemini-2.5-pro");
  const r = await call({
    model,
    messages: [
      { role: "system", content: systemPromptCognitive(cfg) },
      { role: "user", content: userInputToPrompt(input) },
    ],
    tools: [cognitiveTool],
    tool_choice: { type: "function", function: { name: "register_cognitive_map" } },
  });
  if (!r.ok) throw new Error(`E1 status ${r.status}`);
  const j = await r.json();
  return { data: extractToolJson(j) ?? {}, usage: j.usage ?? {}, model };
}

export async function stepAdversarial(
  cfg: AnyConfig,
  input: PipelineInput,
  cognitive: any,
  call: CognitiveCallProvider,
): Promise<{ data: any; usage: any; model: string }> {
  const model = modelFor(cfg, "adversarial", "google/gemini-2.5-pro");
  const r = await call({
    model,
    messages: [
      { role: "system", content: systemPromptAdversarial(cfg) },
      {
        role: "user",
        content: `${userInputToPrompt(input)}\n\n### Mapeamento cognitivo da etapa anterior:\n${JSON.stringify(
          cognitive,
          null,
          2,
        )}`,
      },
    ],
    tools: [adversarialTool],
    tool_choice: { type: "function", function: { name: "register_adversarial" } },
  });
  if (!r.ok) throw new Error(`E2 status ${r.status}`);
  const j = await r.json();
  return { data: extractToolJson(j) ?? {}, usage: j.usage ?? {}, model };
}

/** E3 não usa stream aqui — o index.ts repassa o Response do gateway via SSE. */
export function buildDraftRequest(
  cfg: AnyConfig,
  input: PipelineInput,
  cognitive: any,
  adversarial: any,
  stream: boolean,
) {
  const model = modelFor(cfg, "draft", "google/gemini-2.5-flash");
  const userMsg = [
    userInputToPrompt(input),
    "",
    "### Mapeamento cognitivo:",
    JSON.stringify(cognitive, null, 2),
    "",
    "### Análise adversarial:",
    JSON.stringify(adversarial, null, 2),
    "",
    "Agora redija a peça processual completa em Markdown, conforme as engines.",
  ].join("\n");
  return {
    model,
    stream,
    messages: [
      { role: "system", content: systemPromptDraft(cfg, input.area, input.tribunal ?? null) },
      { role: "user", content: userMsg },
    ],
  };
}

export async function stepAudit(
  cfg: AnyConfig,
  draftMarkdown: string,
  cognitive: any,
  call: CognitiveCallProvider,
): Promise<{ data: any; usage: any; model: string }> {
  const model = modelFor(cfg, "audit", "google/gemini-2.5-pro");
  const r = await call({
    model,
    messages: [
      { role: "system", content: systemPromptAudit(cfg) },
      {
        role: "user",
        content: `### Mapeamento cognitivo:\n${JSON.stringify(
          cognitive,
          null,
          2,
        )}\n\n### Peça redigida:\n${draftMarkdown}`,
      },
    ],
    tools: [auditTool],
    tool_choice: { type: "function", function: { name: "register_audit" } },
  });
  if (!r.ok) throw new Error(`E4 status ${r.status}`);
  const j = await r.json();
  return { data: extractToolJson(j) ?? {}, usage: j.usage ?? {}, model };
}

/* ===========================================================
 * SSE helpers para encadeamento ao cliente
 * =========================================================== */

export function sseEvent(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

/** Lê o stream OpenAI-compatible do gateway e re-emite como deltas SSE simples. */
export async function pipeDraftStream(
  resp: Response,
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder,
): Promise<string> {
  if (!resp.body) return "";
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") continue;
      try {
        const obj = JSON.parse(payload);
        const delta = obj.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta) {
          full += delta;
          await writer.write(encoder.encode(sseEvent("delta", { text: delta })));
        }
      } catch {
        /* partial JSON — esperar próximo chunk */
      }
    }
  }
  return full;
}
