import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type LibraryItemType = Database["public"]["Enums"]["library_item_type"];

export type LibraryItem = {
  id: string;
  user_id: string;
  folder_id: string | null;
  type: LibraryItemType;
  title: string;
  description: string | null;
  content_text: string | null;
  storage_path: string | null;
  source_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  tags: string[];
  is_favorite: boolean;
  is_shared: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type LibraryFolder = {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
};

export type Librarian = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  practice_area: string | null;
  piece_type: string | null;
  reasoning_prompt: string | null;
  formatting_rules: Record<string, unknown>;
  visual_law_defaults: Record<string, unknown>;
  model_piece_ids: string[];
};

export async function listLibraryItems(filters?: { type?: LibraryItemType; folder_id?: string | null; search?: string }) {
  let q = supabase.from("library_items").select("*").order("updated_at", { ascending: false });
  if (filters?.type) q = q.eq("type", filters.type);
  if (filters?.folder_id !== undefined) {
    q = filters.folder_id === null ? q.is("folder_id", null) : q.eq("folder_id", filters.folder_id);
  }
  if (filters?.search) q = q.ilike("title", `%${filters.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LibraryItem[];
}

export async function listFolders() {
  const { data, error } = await supabase.from("library_folders").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as LibraryFolder[];
}

export async function createFolder(input: { name: string; parent_id?: string | null; color?: string }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sem sessão");
  const { data, error } = await supabase.from("library_folders").insert({
    user_id: u.user.id, name: input.name, parent_id: input.parent_id ?? null, color: input.color ?? null,
  }).select().single();
  if (error) throw error;
  return data as LibraryFolder;
}

export async function createLibraryItem(input: {
  type: LibraryItemType;
  title: string;
  description?: string;
  content_text?: string;
  source_url?: string;
  folder_id?: string | null;
  tags?: string[];
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sem sessão");
  const { data, error } = await supabase.from("library_items").insert({
    user_id: u.user.id,
    type: input.type,
    title: input.title,
    description: input.description ?? null,
    content_text: input.content_text ?? null,
    source_url: input.source_url ?? null,
    folder_id: input.folder_id ?? null,
    tags: input.tags ?? [],
  }).select().single();
  if (error) throw error;
  return data as LibraryItem;
}

export async function deleteLibraryItem(id: string) {
  const { error } = await supabase.from("library_items").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleFavorite(id: string, value: boolean) {
  const { error } = await supabase.from("library_items").update({ is_favorite: value }).eq("id", id);
  if (error) throw error;
}

export async function listLibrarians() {
  const { data, error } = await supabase.from("librarians").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Librarian[];
}

export async function createLibrarian(input: {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  practice_area?: string;
  piece_type?: string;
  reasoning_prompt?: string;
  formatting_rules?: Record<string, unknown>;
  visual_law_defaults?: Record<string, unknown>;
  model_piece_ids?: string[];
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sem sessão");
  const { data, error } = await supabase.from("librarians").insert({
    user_id: u.user.id,
    name: input.name,
    description: input.description ?? null,
    icon: input.icon ?? "BookOpen",
    color: input.color ?? "cyan",
    practice_area: input.practice_area ?? null,
    piece_type: input.piece_type ?? null,
    reasoning_prompt: input.reasoning_prompt ?? null,
    formatting_rules: input.formatting_rules ?? {},
    visual_law_defaults: input.visual_law_defaults ?? {},
    model_piece_ids: input.model_piece_ids ?? [],
  }).select().single();
  if (error) throw error;
  return data as Librarian;
}

export async function updateLibrarian(id: string, patch: Partial<{
  name: string;
  description: string | null;
  practice_area: string | null;
  piece_type: string | null;
  reasoning_prompt: string | null;
  formatting_rules: Record<string, unknown>;
  visual_law_defaults: Record<string, unknown>;
  model_piece_ids: string[];
}>) {
  const { error } = await supabase.from("librarians").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteLibrarian(id: string) {
  const { error } = await supabase.from("librarians").delete().eq("id", id);
  if (error) throw error;
}

export async function listLibrarianItems(librarian_id: string) {
  const { data, error } = await supabase
    .from("librarian_items")
    .select("library_item_id, library_items(*)")
    .eq("librarian_id", librarian_id);
  if (error) throw error;
  return ((data ?? []) as Array<{ library_items: LibraryItem | null }>)
    .map((r) => r.library_items)
    .filter((x): x is LibraryItem => !!x);
}

export async function addItemToLibrarian(librarian_id: string, library_item_id: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sem sessão");
  const { error } = await supabase.from("librarian_items").insert({
    librarian_id, library_item_id, user_id: u.user.id,
  });
  if (error && !String(error.message).includes("duplicate")) throw error;
}

export async function removeItemFromLibrarian(librarian_id: string, library_item_id: string) {
  const { error } = await supabase
    .from("librarian_items")
    .delete()
    .eq("librarian_id", librarian_id)
    .eq("library_item_id", library_item_id);
  if (error) throw error;
}

export async function countLibrarianItems(librarian_id: string) {
  const { count, error } = await supabase
    .from("librarian_items")
    .select("*", { count: "exact", head: true })
    .eq("librarian_id", librarian_id);
  if (error) throw error;
  return count ?? 0;
}