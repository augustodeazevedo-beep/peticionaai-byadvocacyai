import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const safePath = /^[A-Za-z0-9._/-]{1,500}$/;

export default defineTool({
  name: "update_piece",
  title: "Atualizar peça",
  description:
    "Atualiza uma peça existente (título, tipo, área, conteúdo, metadados, status, checklist, observações, brand_overrides, assembly_options) e opcionalmente registra/remove anexos em case_files. RLS impede alterações em peças de outros usuários.",
  inputSchema: {
    id: z.string().uuid().describe("UUID da peça."),
    title: z.string().trim().min(1).max(255).optional(),
    piece_type: z.string().trim().min(1).max(120).optional(),
    area: z.string().trim().max(120).nullable().optional(),
    content_text: z.string().max(200_000).nullable().optional(),
    content_html: z.string().max(400_000).nullable().optional(),
    input_data: z.record(z.any()).optional()
      .describe("Objeto mesclado com o input_data atual (merge raso)."),
    observations: z.string().max(20_000).nullable().optional(),
    status: z.enum(["draft", "review", "final"]).optional(),
    checklist: z.record(z.any()).optional(),
    brand_overrides: z.record(z.any()).optional(),
    assembly_options: z.record(z.any()).optional(),
    add_case_files: z.array(z.object({
      path: z.string().regex(safePath, "path inválido"),
      mime: z.string().max(120).optional(),
      size: z.number().int().nonnegative().optional(),
      name: z.string().max(255).optional(),
    })).max(20).optional().describe("Anexos já enviados ao bucket case-files a associar."),
    remove_case_file_ids: z.array(z.string().uuid()).max(50).optional(),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    const sb = supabaseForUser(ctx);

    // Merge input_data if provided
    let mergedInput: Record<string, unknown> | undefined;
    if (input.input_data) {
      const { data: current, error: readErr } = await sb
        .from("pieces").select("input_data").eq("id", input.id).maybeSingle();
      if (readErr) return { content: [{ type: "text", text: readErr.message }], isError: true };
      if (!current) return { content: [{ type: "text", text: "Peça não encontrada." }], isError: true };
      mergedInput = { ...(current.input_data as Record<string, unknown> ?? {}), ...input.input_data };
    }

    const patch: Record<string, unknown> = {};
    const set = <K extends string>(k: K, v: unknown) => { if (v !== undefined) patch[k] = v; };
    set("title", input.title);
    set("piece_type", input.piece_type);
    set("area", input.area);
    set("content_text", input.content_text);
    set("content_html", input.content_html);
    set("observations", input.observations);
    set("status", input.status);
    set("checklist", input.checklist);
    set("brand_overrides", input.brand_overrides);
    set("assembly_options", input.assembly_options);
    if (mergedInput) patch.input_data = mergedInput;

    let updated: unknown = null;
    if (Object.keys(patch).length > 0) {
      const { data, error } = await sb.from("pieces").update(patch).eq("id", input.id)
        .select("id, title, piece_type, area, status, updated_at").maybeSingle();
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      if (!data) return { content: [{ type: "text", text: "Peça não encontrada ou sem permissão." }], isError: true };
      updated = data;
    }

    // Attachments
    let addedFiles: unknown[] = [];
    if (input.add_case_files?.length) {
      const rows = input.add_case_files.map((f) => ({
        user_id: ctx.getUserId(),
        piece_id: input.id,
        storage_path: f.path,
        mime_type: f.mime ?? null,
        size_bytes: f.size ?? null,
        filename: f.name ?? f.path.split("/").pop() ?? f.path,
      }));
      const { data, error } = await sb.from("case_files").insert(rows).select("id, storage_path, filename");
      if (error) return { content: [{ type: "text", text: `Anexos: ${error.message}` }], isError: true };
      addedFiles = data ?? [];
    }
    let removedFiles: unknown[] = [];
    if (input.remove_case_file_ids?.length) {
      const { data, error } = await sb.from("case_files").delete()
        .in("id", input.remove_case_file_ids).select("id");
      if (error) return { content: [{ type: "text", text: `Remoção: ${error.message}` }], isError: true };
      removedFiles = data ?? [];
    }

    return {
      content: [{ type: "text", text: `Peça ${input.id} atualizada.` }],
      structuredContent: { piece: updated, added_files: addedFiles, removed_files: removedFiles },
    };
  },
});