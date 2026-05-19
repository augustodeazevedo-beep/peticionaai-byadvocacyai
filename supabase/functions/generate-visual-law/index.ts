import { buildSystemPrompt, buildUserPrompt, type VLGeneratePayload } from "./prompts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonError("Método não permitido.", 405);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return jsonError("LOVABLE_API_KEY não configurada.", 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonError("Unauthorized", 401);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: authData, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (authError || !authData.user) return jsonError("Unauthorized", 401);

  let payload: VLGeneratePayload;
  try {
    payload = (await req.json()) as VLGeneratePayload;
  } catch {
    return jsonError("Payload JSON inválido.", 400);
  }

  if (!payload?.currentContent || typeof payload.currentContent !== "string") {
    return jsonError("Campo currentContent é obrigatório.", 400);
  }
  if (payload.currentContent.length > 50000) {
    return jsonError("Conteúdo excede o tamanho máximo (50.000 caracteres).", 400);
  }
  if (!payload.direction || !payload.density) {
    return jsonError("Campos direction e density são obrigatórios.", 400);
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
        stream: true,
        messages: [
          { role: "system", content: buildSystemPrompt(payload) },
          { role: "user", content: buildUserPrompt(payload) },
        ],
      }),
    });
  } catch (e) {
    console.error("generate-visual-law upstream fetch error:", e);
    return jsonError("Falha ao contatar o gateway de IA.", 502);
  }

  if (upstream.status === 429) {
    return jsonError("Limite de requisições excedido. Tente novamente em instantes.", 429);
  }
  if (upstream.status === 402) {
    return jsonError(
      "Créditos do Lovable AI esgotados. Adicione créditos no Workspace.",
      402,
    );
  }
  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    console.error("generate-visual-law upstream error:", upstream.status, text);
    return jsonError("Falha no gateway de IA.", 500);
  }

  return new Response(upstream.body, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
});