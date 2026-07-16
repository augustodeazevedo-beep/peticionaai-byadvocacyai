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
  name: "list_pieces",
  title: "Listar peças",
  description:
    "Lista as peças jurídicas do usuário autenticado no Peticiona.AI, mais recentes primeiro. Retorna id, título, área, tipo de peça, status e datas.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("Máximo de peças a retornar (1-50)."),
    status: z
      .enum(["rascunho", "revisao", "final", "arquivado"])
      .optional()
      .describe("Filtrar por status."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    let q = supabaseForUser(ctx)
      .from("pieces")
      .select("id, title, area, piece_type, status, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { pieces: data ?? [] },
    };
  },
});