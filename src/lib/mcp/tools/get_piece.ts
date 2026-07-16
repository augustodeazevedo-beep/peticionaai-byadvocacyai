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
  name: "get_piece",
  title: "Obter peça",
  description:
    "Retorna o conteúdo completo de uma peça (texto/HTML), metadados, checklist de auditoria e observações. Requer o id da peça.",
  inputSchema: {
    id: z.string().uuid().describe("UUID da peça."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("pieces")
      .select(
        "id, title, area, piece_type, status, content_text, content_html, checklist, observations, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data)
      return { content: [{ type: "text", text: "Peça não encontrada." }], isError: true };
    return {
      content: [{ type: "text", text: data.content_text ?? "(sem conteúdo)" }],
      structuredContent: { piece: data },
    };
  },
});