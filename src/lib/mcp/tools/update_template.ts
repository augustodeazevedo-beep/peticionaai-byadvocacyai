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
  name: "update_template",
  title: "Atualizar modelo de peça",
  description:
    "Atualiza um modelo de peça existente (nome, descrição, área, tipo, corpo markdown, estrutura, style_overrides, prompt_hints, tags, escopo, is_default). RLS impede alterações em modelos de outros usuários.",
  inputSchema: {
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(255).optional(),
    area: z.string().trim().min(1).max(120).optional(),
    piece_type: z.string().trim().min(1).max(120).optional(),
    description: z.string().max(2000).nullable().optional(),
    content_md: z.string().max(200_000).optional(),
    structure: z.record(z.any()).optional().describe("Merge raso com o structure atual."),
    style_overrides: z.record(z.any()).optional().describe("Merge raso com o style_overrides atual."),
    prompt_hints: z.string().max(20_000).nullable().optional(),
    tags: z.array(z.string().max(60)).max(30).optional(),
    scope: z.enum(["pessoal", "escritorio"]).optional(),
    is_default: z.boolean().optional(),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    const sb = supabaseForUser(ctx);

    let mergedStructure: Record<string, unknown> | undefined;
    let mergedStyle: Record<string, unknown> | undefined;
    if (input.structure || input.style_overrides) {
      const { data: current, error: readErr } = await sb
        .from("piece_templates")
        .select("structure, style_overrides")
        .eq("id", input.id).maybeSingle();
      if (readErr) return { content: [{ type: "text", text: readErr.message }], isError: true };
      if (!current) return { content: [{ type: "text", text: "Modelo não encontrado." }], isError: true };
      if (input.structure)
        mergedStructure = { ...(current.structure as Record<string, unknown> ?? {}), ...input.structure };
      if (input.style_overrides)
        mergedStyle = { ...(current.style_overrides as Record<string, unknown> ?? {}), ...input.style_overrides };
    }

    const patch: Record<string, unknown> = {};
    const set = <K extends string>(k: K, v: unknown) => { if (v !== undefined) patch[k] = v; };
    set("name", input.name);
    set("area", input.area);
    set("piece_type", input.piece_type);
    set("description", input.description);
    set("content_md", input.content_md);
    set("prompt_hints", input.prompt_hints);
    set("tags", input.tags);
    set("scope", input.scope);
    set("is_default", input.is_default);
    if (mergedStructure) patch.structure = mergedStructure;
    if (mergedStyle) patch.style_overrides = mergedStyle;

    if (Object.keys(patch).length === 0)
      return { content: [{ type: "text", text: "Nada para atualizar." }], isError: true };

    const { data, error } = await sb.from("piece_templates")
      .update(patch).eq("id", input.id)
      .select("id, name, area, piece_type, scope, is_default, updated_at")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Modelo não encontrado ou sem permissão." }], isError: true };
    return {
      content: [{ type: "text", text: `Modelo ${input.id} atualizado.` }],
      structuredContent: { template: data },
    };
  },
});