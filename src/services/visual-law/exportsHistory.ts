import { supabase } from "@/integrations/supabase/client";

export interface ExportEntry {
  name: string;
  path: string;
  format: "pdf" | "docx" | "other";
  sizeBytes: number;
  updatedAt: string;
}

function inferFormat(name: string): ExportEntry["format"] {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  return "other";
}

export async function listExports(userId: string, pieceId: string): Promise<ExportEntry[]> {
  const prefix = `visual-law-ai/${userId}/${pieceId}`;
  const { data, error } = await supabase.storage
    .from("piece-exports")
    .list(prefix, { limit: 100, sortBy: { column: "updated_at", order: "desc" } });
  if (error) throw error;
  return (data ?? [])
    .filter((f) => f.name && !f.name.endsWith("/"))
    .map((f) => ({
      name: f.name,
      path: `${prefix}/${f.name}`,
      format: inferFormat(f.name),
      sizeBytes: (f.metadata as { size?: number } | null)?.size ?? 0,
      updatedAt: f.updated_at ?? f.created_at ?? new Date().toISOString(),
    }));
}

export async function getExportSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("piece-exports")
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteExport(path: string): Promise<void> {
  const { error } = await supabase.storage.from("piece-exports").remove([path]);
  if (error) throw error;
}