import { supabase } from "@/integrations/supabase/client";

export async function uploadExport(
  blob: Blob,
  ext: "pdf" | "docx",
  userId: string,
  pieceId: string,
  versionId: string,
): Promise<string | null> {
  const path = `visual-law-ai/${userId}/${pieceId}/${versionId}.${ext}`;
  const contentType =
    ext === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const { error } = await supabase.storage.from("piece-exports").upload(path, blob, {
    contentType,
    upsert: true,
  });
  if (error) {
    console.warn("uploadExport failed", error);
    return null;
  }
  return path;
}
