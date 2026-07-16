import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "create_piece",
  title: "Criar peça",
  description:
    "Cria uma nova peça jurídica na conta do usuário autenticado. Aceita título, tipo, área, conteúdo (texto e/ou HTML), metadados do caso (input_data), template_id opcional e status inicial. RLS garante que a peça pertence ao próprio usuário.",
  inputSchema: {
    title: z.string().trim().min(1).max(255).describe("Título da peça."),
    piece_type: z.string().trim().min(1).max(120).default("peticao_inicial_civel")
      .describe("Tipo da peça (ex.: peticao_inicial_civel, contestacao, recurso_apelacao)."),
    area: z.string().trim().max(120).optional().describe("Área jurídica (ex.: civel, trabalhista, tributario)."),
    content_text: z.string().max(200_000).optional().describe("Conteúdo em texto puro."),
    content_html: z.string().max(400_000).optional().describe("Conteúdo em HTML."),
    project_id: z.string().uuid().optional().describe("Projeto/caso ao qual a peça pertence."),
    template_id: z.string().uuid().optional().describe("Modelo utilizado como base."),
    input_data: z.record(z.any()).optional()
      .describe("Metadados do caso (cliente, parte contrária, fatos, pedidos etc.) como objeto JSON."),
    observations: z.string().max(20_000).optional().describe("Observações internas."),
    status: z.enum(["draft", "review", "final"]).default("draft").describe("Status inicial."),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    const row = {
      user_id: ctx.getUserId(),
      title: input.title,
      piece_type: input.piece_type,
      area: input.area ?? null,
      content_text: input.content_text ?? null,
      content_html: input.content_html ?? null,
      project_id: input.project_id ?? null,
      template_id: input.template_id ?? null,
      input_data: input.input_data ?? {},
      observations: input.observations ?? null,
      status: input.status,
    };
    const { data, error } = await supabaseForUser(ctx)
      .from("pieces")
      .insert(row)
      .select("id, title, piece_type, area, status, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Peça criada: ${data.id}` }],
      structuredContent: { piece: data },
    };
  },
});