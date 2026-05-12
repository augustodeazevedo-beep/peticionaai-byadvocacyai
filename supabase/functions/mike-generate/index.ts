import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  buildDraftRequest,
  defaultLovableProvider,
  pipeDraftStream,
  sseEvent,
  stepAdversarial,
  stepAudit,
  stepCognitive,
  type PipelineInput,
} from "./cognitive.ts";

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
  pipeline: z.enum(["legacy", "cognitive"]).optional().default("legacy"),
  party_position: z.string().trim().max(40).optional().nullable(),
  tribunal: z.string().trim().max(60).optional().nullable(),
  instancia: z.string().trim().max(40).optional().nullable(),
  rito: z.string().trim().max(60).optional().nullable(),
  fase_processual: z.string().trim().max(60).optional().nullable(),
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
    const {
      piece_type,
      area,
      fields,
      context,
      workspace_id,
      piece_id,
      pipeline,
      party_position,
      tribunal,
      instancia,
      rito,
      fase_processual,
    } = parsed.data;
    if (area && !ALLOWED_AREAS.includes(area.toLowerCase() as typeof ALLOWED_AREAS[number])) {
      return jsonError("Área jurídica não suportada.", 400);
    }
    const fieldsJson = JSON.stringify(fields);
    if (fieldsJson.length > 20000) {
      return jsonError("Campos excedem o tamanho máximo permitido.", 400);
    }

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

    /* ============== Cognitive pipeline branch ============== */
    if (pipeline === "cognitive") {
      const cogRaw = map.get("cognitive_os_config") ?? "";
      let cfg: Record<string, unknown> = {};
      try {
        cfg = cogRaw ? JSON.parse(cogRaw) : {};
      } catch (e) {
        console.error("cognitive_os_config inválido:", e);
        return jsonError("Configuração cognitiva inválida.", 500);
      }
      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) return jsonError("LOVABLE_API_KEY ausente.", 500);
      const provider = defaultLovableProvider(apiKey);
      const pipelineInput: PipelineInput = {
        piece_type,
        area: area ?? null,
        party_position: party_position ?? null,
        tribunal: tribunal ?? null,
        instancia: instancia ?? null,
        rito: rito ?? null,
        fase_processual: fase_processual ?? null,
        fields,
        context: context ?? null,
      };

      const stream = new TransformStream<Uint8Array, Uint8Array>();
      const writer = stream.writable.getWriter();
      const encoder = new TextEncoder();

      // Não awaitar — devolve resposta imediatamente.
      (async () => {
        const totalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        const writeEvent = (event: string, data: unknown) =>
          writer.write(encoder.encode(sseEvent(event, data)));
        const accUsage = (u: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }) => {
          totalUsage.prompt_tokens += u.prompt_tokens ?? 0;
          totalUsage.completion_tokens += u.completion_tokens ?? 0;
          totalUsage.total_tokens += u.total_tokens ?? 0;
        };
        let cognitive: Record<string, unknown> = {};
        let adversarial: Record<string, unknown> = {};
        let audit: Record<string, unknown> = {};
        let draft = "";
        let draftModel = "";
        try {
          await writeEvent("step_start", { step: "cognitive" });
          try {
            const c = await stepCognitive(cfg, pipelineInput, provider);
            cognitive = c.data;
            accUsage(c.usage);
            await writeEvent("step_done", { step: "cognitive", data: cognitive });
          } catch (e) {
            console.error("E1 falhou:", e);
            await writeEvent("step_done", { step: "cognitive", data: cognitive, degraded: true });
          }

          await writeEvent("step_start", { step: "adversarial" });
          try {
            const a = await stepAdversarial(cfg, pipelineInput, cognitive, provider);
            adversarial = a.data;
            accUsage(a.usage);
            await writeEvent("step_done", { step: "adversarial", data: adversarial });
          } catch (e) {
            console.error("E2 falhou:", e);
            await writeEvent("step_done", { step: "adversarial", data: adversarial, degraded: true });
          }

          await writeEvent("step_start", { step: "draft" });
          const draftReq = buildDraftRequest(cfg, pipelineInput, cognitive, adversarial, true);
          draftModel = String(draftReq.model);
          const draftResp = await provider(draftReq, { stream: true });
          if (!draftResp.ok) {
            const t = await draftResp.text();
            console.error("E3 gateway error:", draftResp.status, t);
            await writeEvent("error", {
              message:
                draftResp.status === 429
                  ? "Limite de requisições atingido."
                  : draftResp.status === 402
                  ? "Créditos de IA insuficientes."
                  : "Falha ao redigir a peça.",
            });
            await writer.close();
            return;
          }
          draft = await pipeDraftStream(draftResp, writer, encoder);
          await writeEvent("step_done", { step: "draft" });

          await writeEvent("step_start", { step: "audit" });
          try {
            const au = await stepAudit(cfg, draft, cognitive, provider);
            audit = au.data;
            accUsage(au.usage);
            await writeEvent("step_done", { step: "audit", data: audit });
          } catch (e) {
            console.error("E4 falhou:", e);
            await writeEvent("step_done", { step: "audit", data: audit, degraded: true });
          }

          await writeEvent("done", {
            content: draft,
            model_used: draftModel,
            intelligence: { cognitive, adversarial, audit },
            usage: totalUsage,
          });

          // Persistência best-effort do token_usage
          try {
            await supabase.from("token_usage").insert({
              user_id: userId,
              piece_id: piece_id ?? null,
              workspace_id: workspace_id ?? null,
              provider: "lovable_ai",
              model: draftModel,
              prompt_tokens: totalUsage.prompt_tokens,
              completion_tokens: totalUsage.completion_tokens,
              total_tokens: totalUsage.total_tokens,
              purpose: "piece_generation_cognitive",
            });
            await supabase.from("integration_logs").insert({
              user_id: userId,
              integration: "lovable_ai",
              endpoint: "ai.gateway.lovable.dev",
              status_code: 200,
              ok: true,
              duration_ms: Date.now() - start,
              request_summary: `cognitive ${piece_type}/${area ?? "-"}`,
            });
          } catch (e) {
            console.error("token_usage cognitive insert failed:", e);
          }
        } catch (e) {
          console.error("cognitive pipeline fatal:", e);
          await writeEvent("error", { message: "Erro interno no pipeline cognitivo." });
        } finally {
          try {
            await writer.close();
          } catch {
            /* ignore */
          }
        }
      })();

      return new Response(stream.readable, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }
    /* ============== End cognitive pipeline ============== */

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

    // Atomic pre-check: uses FOR UPDATE lock to prevent concurrent bypass
    if (byokActive && userIntegration?.monthly_token_cap) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: tokenCheck, error: tokenCheckError } = await supabase.rpc("check_and_increment_token_usage", {
        p_user_id: userId,
        p_month_year: currentMonth,
        p_tokens: 0,
        p_monthly_cap: userIntegration.monthly_token_cap,
      });
      if (tokenCheckError) {
        console.error("Token pre-check error:", tokenCheckError);
      } else if (tokenCheck && !tokenCheck[0]?.allowed) {
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

    // Atomic increment + audit trail
    try {
      if (byokActive && userIntegration?.monthly_token_cap) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        await supabase.rpc("check_and_increment_token_usage", {
          p_user_id: userId,
          p_month_year: currentMonth,
          p_tokens: usage.total_tokens ?? 0,
          p_monthly_cap: userIntegration.monthly_token_cap,
        });
      }
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
