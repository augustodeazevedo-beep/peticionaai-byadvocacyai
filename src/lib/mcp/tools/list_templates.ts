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
  name: "list_templates",
  title: "Listar modelos de peça",
  description:
    "Lista os modelos de peça disponíveis para o usuário autenticado (próprios e compartilhados), com nome, área e tipo.",
  inputSchema: {
    area: z.string().optional().describe("Filtrar por área (ex.: 'trabalhista', 'civel')."),
    piece_type: z.string().optional().describe("Filtrar por tipo de peça."),
    limit: z.number().int().min(1).max(50).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ area, piece_type, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    let q = supabaseForUser(ctx)
      .from("piece_templates")
      .select("id, name, area, piece_type, description, tags, scope, usage_count, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (area) q = q.eq("area", area);
    if (piece_type) q = q.eq("piece_type", piece_type);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { templates: data ?? [] },
    };
  },
});