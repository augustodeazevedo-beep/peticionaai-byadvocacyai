import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ContextType = Database["public"]["Enums"]["context_item_type"];
export type Strictness = Database["public"]["Enums"]["template_strictness"];
export type DocumentSource = Database["public"]["Enums"]["document_source"];

export type WorkspaceContextItem = {
  id: string;
  workspace_id: string;
  user_id: string;
  type: ContextType;
  title: string;
  preview: string | null;
  source_url: string | null;
  storage_path: string | null;
  display_order: number;
  payload: Record<string, unknown>;
  library_item_id: string | null;
  strictness: Strictness | null;
  ocr_required: boolean;
  created_at: string;
};

const ALLOWED_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/webm",
];

const MAX_BYTES = 20 * 1024 * 1024;

async function userId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sessão expirada.");
  return data.user.id;
}

/** Garante que existe um workspace ativo do usuário; cria se necessário. */
export async function ensureActiveWorkspace(initialTitle = "Nova minuta"): Promise<string> {
  const uid = await userId();
  const { data: existing } = await supabase
    .from("workspaces")
    .select("id")
    .eq("user_id", uid)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data, error } = await supabase
    .from("workspaces")
    .insert({ user_id: uid, title: initialTitle })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function listContext(workspaceId: string): Promise<WorkspaceContextItem[]> {
  const { data, error } = await supabase
    .from("workspace_context_items")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkspaceContextItem[];
}

async function appendContext(input: {
  workspaceId: string;
  type: ContextType;
  title: string;
  preview?: string;
  source_url?: string;
  storage_path?: string;
  library_item_id?: string;
  strictness?: Strictness;
  ocr_required?: boolean;
  payload?: Record<string, unknown>;
}) {
  const uid = await userId();
  const { count } = await supabase
    .from("workspace_context_items")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", input.workspaceId);
  const { data, error } = await supabase
    .from("workspace_context_items")
    .insert({
      workspace_id: input.workspaceId,
      user_id: uid,
      type: input.type,
      title: input.title,
      preview: input.preview ?? null,
      source_url: input.source_url ?? null,
      storage_path: input.storage_path ?? null,
      library_item_id: input.library_item_id ?? null,
      strictness: input.strictness ?? null,
      ocr_required: input.ocr_required ?? false,
      display_order: count ?? 0,
      payload: (input.payload ?? {}) as never,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as WorkspaceContextItem;
}

export async function uploadAndRegister(opts: {
  workspaceId: string;
  file: File;
  kind: "documentos" | "modelos" | "transcricoes";
  title?: string;
  strictness?: Strictness;
  ocrRequired?: boolean;
}) {
  const { workspaceId, file, kind, title, strictness, ocrRequired } = opts;
  if (file.size > MAX_BYTES) throw new Error("Arquivo excede 20 MB.");
  if (!ALLOWED_MIMES.includes(file.type)) {
    throw new Error(`Tipo não suportado: ${file.type || "desconhecido"}.`);
  }
  const uid = await userId();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const path = `${kind}/${uid}/${Date.now()}_${safeName}`;
  const { error: upErr } = await supabase.storage.from("library-files").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) throw upErr;

  const libType = kind === "modelos" ? "modelo" : kind === "transcricoes" ? "documento" : "documento";
  const { data: lib, error: libErr } = await supabase
    .from("library_items")
    .insert({
      user_id: uid,
      type: libType,
      title: title || file.name,
      storage_path: path,
      mime_type: file.type,
      size_bytes: file.size,
      source: kind === "transcricoes" ? "transcricao" : "upload",
      template_strictness: strictness ?? null,
      ocr_status: ocrRequired ? "pending" : "skipped",
    })
    .select("id")
    .single();
  if (libErr) throw libErr;

  return appendContext({
    workspaceId,
    type: kind === "modelos" ? "modelo" : "documento",
    title: title || file.name,
    preview: `${(file.size / 1024).toFixed(0)} KB · ${file.type}`,
    storage_path: path,
    library_item_id: lib.id,
    strictness: kind === "modelos" ? strictness ?? "flexivel" : undefined,
    ocr_required: !!ocrRequired,
  });
}

export async function ingestUrl(workspaceId: string, url: string, title?: string) {
  if (!/^https?:\/\//i.test(url)) throw new Error("URL inválida.");
  return appendContext({
    workspaceId,
    type: "web",
    title: title || new URL(url).hostname,
    preview: url.slice(0, 200),
    source_url: url,
  });
}

export async function ingestText(workspaceId: string, title: string, content: string) {
  if (!title.trim()) throw new Error("Informe um título.");
  if (!content.trim()) throw new Error("Conteúdo vazio.");
  const uid = await userId();
  const { data: lib, error } = await supabase
    .from("library_items")
    .insert({
      user_id: uid,
      type: "documento",
      title,
      content_text: content,
      source: "texto",
    })
    .select("id")
    .single();
  if (error) throw error;
  return appendContext({
    workspaceId,
    type: "texto",
    title,
    preview: content.slice(0, 200),
    library_item_id: lib.id,
  });
}

export async function addLibraryItemToWorkspace(workspaceId: string, item: {
  id: string; title: string; type: string; content_text: string | null; storage_path: string | null;
}) {
  const ctxType: ContextType = item.type === "modelo" ? "modelo"
    : item.type === "legislacao" ? "legislacao"
    : item.type === "jurisprudencia" ? "jurisprudencia"
    : "biblioteca_item";
  return appendContext({
    workspaceId,
    type: ctxType,
    title: item.title,
    preview: item.content_text?.slice(0, 200) ?? undefined,
    library_item_id: item.id,
    storage_path: item.storage_path ?? undefined,
    payload: {},
  });
}

export async function removeContext(id: string) {
  const { error } = await supabase.from("workspace_context_items").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderContext(orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, idx) =>
      supabase.from("workspace_context_items").update({ display_order: idx }).eq("id", id),
    ),
  );
}