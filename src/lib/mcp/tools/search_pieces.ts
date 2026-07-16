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
  name: "search_pieces",
  title: "Buscar peças",
  description:
    "Busca peças do usuário por trecho no título ou no conteúdo textual (case-insensitive). Retorna correspondências recentes.",
  inputSchema: {
    query: z.string().trim().min(2).max(200).describe("Termo de busca (mín. 2 caracteres)."),
    limit: z.number().int().min(1).max(25).default(10),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    const safe = query.replace(/[%,()]/g, " ");
    const { data, error } = await supabaseForUser(ctx)
      .from("pieces")
      .select("id, title, area, piece_type, status, updated_at")
      .or(`title.ilike.%${safe}%,content_text.ilike.%${safe}%`)
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { results: data ?? [] },
    };
  },
});