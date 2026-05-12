import { buildSystemPrompt, buildUserPrompt, type VLAnalyzePayload } from "./prompts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "submit_legal_analysis",
    description: "Devolve validação jurídica e análise de risco estruturadas",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        validation: {
          type: "object",
          additionalProperties: false,
          properties: {
            alegacoesSemProva: { type: "array", items: { type: "string" } },
            tesesSemFundamento: { type: "array", items: { type: "string" } },
            pedidosOrfaos: { type: "array", items: { type: "string" } },
            placeholders: { type: "array", items: { type: "string" } },
          },
          required: ["alegacoesSemProva", "tesesSemFundamento", "pedidosOrfaos", "placeholders"],
        },
        risk: {
          type: "object",
          additionalProperties: false,
          properties: {
            fragilidadesProbatorias: { type: "array", items: { type: "string" } },
            viciosFormais: { type: "array", items: { type: "string" } },
            riscosImprocedencia: { type: "array", items: { type: "string" } },
            argumentosAdversos: { type: "array", items: { type: "string" } },
          },
          required: ["fragilidadesProbatorias", "viciosFormais", "riscosImprocedencia", "argumentosAdversos"],
        },
      },
      required: ["validation", "risk"],
    },
  },
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido" }, 405);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return jsonResponse({ error: "LOVABLE_API_KEY não configurada" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: authData, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (authError || !authData.user) return jsonResponse({ error: "Unauthorized" }, 401);

  let payload: VLAnalyzePayload;
  try {
    payload = (await req.json()) as VLAnalyzePayload;
  } catch {
    return jsonResponse({ error: "Payload JSON inválido" }, 400);
  }

  if (!payload?.content || typeof payload.content !== "string") {
    return jsonResponse({ error: "Campo content é obrigatório" }, 400);
  }
  if (payload.content.length > 50000) {
    return jsonResponse({ error: "Conteúdo excede o tamanho máximo (50.000 caracteres)." }, 400);
  }
  if (!payload.direction) {
    return jsonResponse({ error: "Campo direction é obrigatório" }, 400);
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt(payload) },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "submit_legal_analysis" } },
      }),
    });
  } catch (e) {
    console.error("analyze-visual-law upstream fetch error:", e);
    return jsonResponse({ error: "Falha ao contatar gateway de IA" }, 502);
  }

  if (upstream.status === 429) {
    return jsonResponse({ error: "rate_limit" }, 429);
  }
  if (upstream.status === 402) {
    return jsonResponse({ error: "credits" }, 402);
  }
  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    console.error("analyze-visual-law upstream error:", upstream.status, text);
    return jsonResponse({ error: "Falha no gateway de IA" }, 500);
  }

  let json: any;
  try {
    json = await upstream.json();
  } catch (e) {
    console.error("analyze-visual-law parse error:", e);
    return jsonResponse({ error: "Resposta inválida do gateway" }, 500);
  }

  const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
  const argsRaw = toolCall?.function?.arguments;
  if (!argsRaw) {
    console.error("analyze-visual-law missing tool call:", JSON.stringify(json).slice(0, 500));
    return jsonResponse({ error: "Resposta sem análise estruturada" }, 500);
  }

  let parsed: { validation: unknown; risk: unknown };
  try {
    parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
  } catch (e) {
    console.error("analyze-visual-law tool args parse error:", e);
    return jsonResponse({ error: "Argumentos da análise inválidos" }, 500);
  }

  return jsonResponse(parsed);
});
