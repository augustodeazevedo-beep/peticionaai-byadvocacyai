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
  name: "create_template",
  title: "Criar modelo de peça",
  description:
    "Cria um modelo (template) de peça para reutilização, com corpo em markdown, placeholders {{campo}}, estrutura de seções, persona e regras (prompt_hints), tags e escopo (pessoal ou escritorio).",
  inputSchema: {
    name: z.string().trim().min(1).max(255),
    area: z.string().trim().min(1).max(120),
    piece_type: z.string().trim().min(1).max(120),
    description: z.string().max(2000).optional(),
    content_md: z.string().max(200_000).default("")
      .describe("Corpo do modelo em markdown. Use {{campo}} para placeholders."),
    structure: z.record(z.any()).optional().describe("Estrutura/seções do modelo."),
    style_overrides: z.record(z.any()).optional(),
    prompt_hints: z.string().max(20_000).optional()
      .describe("Persona e regras injetadas no pipeline de geração."),
    tags: z.array(z.string().max(60)).max(30).optional(),
    scope: z.enum(["pessoal", "escritorio"]).default("pessoal"),
    is_default: z.boolean().default(false),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    const row = {
      user_id: ctx.getUserId(),
      name: input.name,
      area: input.area,
      piece_type: input.piece_type,
      description: input.description ?? null,
      content_md: input.content_md,
      structure: input.structure ?? {},
      style_overrides: input.style_overrides ?? {},
      prompt_hints: input.prompt_hints ?? null,
      tags: input.tags ?? [],
      scope: input.scope,
      is_default: input.is_default,
    };
    const { data, error } = await supabaseForUser(ctx)
      .from("piece_templates")
      .insert(row)
      .select("id, name, area, piece_type, scope, is_default, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Modelo criado: ${data.id}` }],
      structuredContent: { template: data },
    };
  },
});