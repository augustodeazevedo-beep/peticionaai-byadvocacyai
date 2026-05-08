import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const start = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Caller (for log)
  let userId: string | null = null;
  try {
    const auth = req.headers.get("Authorization");
    if (auth) {
      const token = auth.replace("Bearer ", "");
      const { data } = await supabase.auth.getUser(token);
      userId = data.user?.id ?? null;
    }
  } catch { /* ignore */ }

  try {
    const body = await req.json();
    const { piece_type, area, fields, context } = body as { piece_type: string; area?: string; fields: Record<string, unknown>; context?: string };

    // Load settings
    const { data: settings } = await supabase.from("system_settings").select("key,value");
    const map = new Map((settings ?? []).map((s: { key: string; value: string | null }) => [s.key, s.value ?? ""]));

    const persona = map.get("peticione_persona") ?? "";
    const rulesFormat = map.get("peticione_rules_format") ?? "";
    const rulesCit = map.get("peticione_rules_citation") ?? "";
    const rulesAnti = map.get("peticione_rules_antihalucinacao") ?? "";
    const structure = map.get("peticione_structure") ?? "";
    const checklist = map.get("peticione_checklist_final") ?? "";
    const shadow = map.get("peticione_shadow_cabinet") ?? "";
    const mikeEndpoint = map.get("mike_endpoint") ?? "";
    const fallbackModel = map.get("mike_model") || "google/gemini-2.5-flash";

    const systemPrompt = [persona, rulesFormat, rulesCit, rulesAnti, structure, shadow, checklist].filter(Boolean).join("\n\n---\n\n");

    const userPrompt = `Tipo de peça: ${piece_type}\nÁrea: ${area ?? "—"}\n\nDados fornecidos pelo operador (JSON):\n${JSON.stringify(fields, null, 2)}\n\nContexto adicional:\n${context ?? "—"}\n\nProduza a peça completa em Markdown, seguindo a estrutura e regras. Ao final inclua as seções "## Checklist Final" e "## Observações ao Operador".`;

    const MIKE_API_KEY = Deno.env.get("MIKE_API_KEY");
    let content = "";
    let modelUsed = fallbackModel;
    let source: "mike" | "lovable_ai" = "lovable_ai";

    if (mikeEndpoint && MIKE_API_KEY) {
      // Tenta Mike (formato OpenAI-compatible esperado)
      try {
        const r = await fetch(mikeEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${MIKE_API_KEY}` },
          body: JSON.stringify({ messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] }),
        });
        if (r.ok) {
          const j = await r.json();
          content = j.choices?.[0]?.message?.content ?? j.content ?? "";
          modelUsed = "mike";
          source = "mike";
        }
      } catch (e) {
        console.error("Mike call failed, falling back:", e);
      }
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
        await supabase.from("integration_logs").insert({
          user_id: userId, integration: "lovable_ai", endpoint: "ai.gateway.lovable.dev",
          status_code: r.status, ok: false, error: text, duration_ms: Date.now() - start,
        });
        if (r.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (r.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA insuficientes. Adicione créditos em Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "Falha na geração: " + text }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const j = await r.json();
      content = j.choices?.[0]?.message?.content ?? "";
      modelUsed = fallbackModel;
    }

    await supabase.from("integration_logs").insert({
      user_id: userId, integration: source, endpoint: source === "mike" ? mikeEndpoint : "ai.gateway.lovable.dev",
      status_code: 200, ok: true, duration_ms: Date.now() - start,
      request_summary: `${piece_type} / ${area}`,
    });

    return new Response(JSON.stringify({ content, model_used: modelUsed, source }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});