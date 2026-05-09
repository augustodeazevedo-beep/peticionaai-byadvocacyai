import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_AREAS = ["civel", "consumidor", "trabalhista", "tributario", "penal", "familia", "empresarial", "administrativo", "previdenciario"] as const;

const inputSchema = z.object({
  piece_type: z.string().trim().min(1).max(120).regex(/^[a-z0-9_\-]+$/i, "piece_type inválido"),
  area: z.string().trim().max(60).optional().nullable(),
  fields: z.record(z.unknown()).default({}),
  context: z.string().trim().max(8000).optional().nullable(),
  workspace_id: z.string().uuid().optional().nullable(),
  piece_id: z.string().uuid().optional().nullable(),
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const start = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Require authenticated caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonError("Unauthorized", 401);
  const token = authHeader.replace("Bearer ", "");
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return jsonError("Unauthorized", 401);
  const userId: string = authData.user.id;

  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return jsonError("Corpo da requisição inválido.", 400);
    }
    const parsed = inputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonError("Dados de entrada inválidos.", 400);
    }
    const { piece_type, area, fields, context, workspace_id, piece_id } = parsed.data;
    if (area && !ALLOWED_AREAS.includes(area.toLowerCase() as typeof ALLOWED_AREAS[number])) {
      return jsonError("Área jurídica não suportada.", 400);
    }
    const fieldsJson = JSON.stringify(fields);
    if (fieldsJson.length > 20000) {
      return jsonError("Campos excedem o tamanho máximo permitido.", 400);
    }

    // Load settings
    const { data: settings } = await supabase.from("system_settings").select("key,value");
    const map = new Map((settings ?? []).map((s: { key: string; value: string | null }) => [s.key, s.value ?? ""]));

    const persona = map.get("peticiona_persona") ?? "";
    const rulesFormat = map.get("peticiona_rules_format") ?? "";
    const rulesCit = map.get("peticiona_rules_citation") ?? "";
    const rulesAnti = map.get("peticiona_rules_antihalucinacao") ?? "";
    const structure = map.get("peticiona_structure") ?? "";
    const checklist = map.get("peticiona_checklist_final") ?? "";
    const shadow = map.get("peticiona_shadow_cabinet") ?? "";
    const adminMikeEndpoint = map.get("mike_endpoint") ?? "";
    const fallbackModel = map.get("mike_model") || "google/gemini-2.5-flash";
    const generationMode = (map.get("peticiona_generation_mode") || "mike_with_fallback").trim();

    // BYOK Mike per user
    const { data: userIntegration } = await supabase
      .from("user_integrations")
      .select("endpoint, api_key_encrypted, model, is_active, monthly_token_cap")
      .eq("user_id", userId)
      .eq("provider", "mike")
      .maybeSingle();

    const byokActive = !!(userIntegration?.is_active && userIntegration.endpoint && userIntegration.api_key_encrypted);
    const mikeEndpoint = byokActive ? userIntegration!.endpoint! : adminMikeEndpoint;
    const mikeKey = byokActive ? userIntegration!.api_key_encrypted! : (Deno.env.get("MIKE_API_KEY") ?? "");
    const mikeModel = byokActive && userIntegration?.model ? userIntegration.model : (map.get("mike_model") || "");

    // Enforce monthly cap (BYOK)
    if (byokActive && userIntegration?.monthly_token_cap) {
      const since = new Date(); since.setDate(1); since.setHours(0,0,0,0);
      const { data: usageRows } = await supabase
        .from("token_usage")
        .select("total_tokens")
        .eq("user_id", userId)
        .gte("created_at", since.toISOString());
      const used = (usageRows ?? []).reduce((acc, r: { total_tokens: number }) => acc + (r.total_tokens || 0), 0);
      if (used >= userIntegration.monthly_token_cap) {
        return jsonError("Cota mensal de tokens atingida na sua integração Mike. Ajuste em Configurações → IA.", 402);
      }
    }

    const systemPrompt = [persona, rulesFormat, rulesCit, rulesAnti, structure, shadow, checklist].filter(Boolean).join("\n\n---\n\n");

    const userPrompt = `Tipo de peça: ${piece_type}\nÁrea: ${area ?? "—"}\n\nDados fornecidos pelo operador (JSON):\n${fieldsJson}\n\nContexto adicional:\n${context ?? "—"}\n\nProduza a peça completa em Markdown, seguindo a estrutura e regras. Ao final inclua as seções "## Checklist Final" e "## Observações ao Operador".`;

    let content = "";
    let modelUsed = fallbackModel;
    let source: "mike" | "lovable_ai" = "lovable_ai";
    let usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } = {};

    if (mikeEndpoint && mikeKey) {
      // Tenta Mike (formato OpenAI-compatible esperado)
      try {
        const r = await fetch(mikeEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${mikeKey}` },
          body: JSON.stringify({
            model: mikeModel || undefined,
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          }),
        });
        if (r.ok) {
          const j = await r.json();
          content = j.choices?.[0]?.message?.content ?? j.content ?? "";
          modelUsed = j.model || mikeModel || "mike";
          source = "mike";
          usage = j.usage ?? {};
        }
      } catch (e) {
        console.error("Mike call failed, falling back:", e);
      }
    }

    if (!content && generationMode === "mike_only") {
      return jsonError("Provedor Mike indisponível. Configure seu endpoint em Configurações → IA ou peça ao admin para configurar o endpoint compartilhado.", 503);
    }

    if (!content) {
      // Fallback Lovable AI
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}` },
        body: JSON.stringify({
          model: fallbackModel,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        }),
      });
      if (!r.ok) {
        const text = await r.text();
        console.error("AI gateway error:", r.status, text);
        await supabase.from("integration_logs").insert({
          user_id: userId, integration: "lovable_ai", endpoint: "ai.gateway.lovable.dev",
          status_code: r.status, ok: false, error: text, duration_ms: Date.now() - start,
        });
        if (r.status === 429) return jsonError("Limite de requisições atingido. Tente novamente em alguns instantes.", 429);
        if (r.status === 402) return jsonError("Créditos de IA insuficientes. Adicione créditos em Settings → Workspace → Usage.", 402);
        return jsonError("Falha na geração de conteúdo.", 502);
      }
      const j = await r.json();
      content = j.choices?.[0]?.message?.content ?? "";
      modelUsed = fallbackModel;
      usage = j.usage ?? {};
    }

    await supabase.from("integration_logs").insert({
      user_id: userId, integration: source, endpoint: source === "mike" ? mikeEndpoint : "ai.gateway.lovable.dev",
      status_code: 200, ok: true, duration_ms: Date.now() - start,
      request_summary: `${piece_type} / ${area}`,
    });

    // Telemetria de tokens
    try {
      await supabase.from("token_usage").insert({
        user_id: userId,
        piece_id: piece_id ?? null,
        workspace_id: workspace_id ?? null,
        provider: source,
        model: modelUsed,
        prompt_tokens: usage.prompt_tokens ?? 0,
        completion_tokens: usage.completion_tokens ?? 0,
        total_tokens: usage.total_tokens ?? 0,
        purpose: "piece_generation",
      });
    } catch (e) { console.error("token_usage insert failed:", e); }

    return new Response(JSON.stringify({ content, model_used: modelUsed, source, usage, byok: byokActive }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("mike-generate fatal error:", e);
    return jsonError("Erro interno ao processar a requisição.", 500);
  }
});