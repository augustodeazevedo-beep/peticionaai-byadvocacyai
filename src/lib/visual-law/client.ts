import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VisualLawDocument } from "./document";
import { DEFAULT_STYLE, type VisualLawStyle } from "./types";

export async function fetchVisualLawStyle(pieceId: string): Promise<VisualLawStyle> {
  const { data } = await supabase
    .from("piece_visual_styles" as any)
    .select("*")
    .eq("piece_id", pieceId)
    .maybeSingle();
  if (!data) return DEFAULT_STYLE;
  return {
    template: (data as any).template,
    font: (data as any).font,
    color_palette: (data as any).color_palette,
    custom_primary: (data as any).custom_primary,
    custom_accent: (data as any).custom_accent,
    direction: (data as any).direction,
    density: (data as any).density,
    extra_instructions: (data as any).extra_instructions,
    elements: (data as any).elements ?? DEFAULT_STYLE.elements,
  };
}

export async function upsertVisualLawStyle(pieceId: string, userId: string, style: VisualLawStyle) {
  const payload = { piece_id: pieceId, user_id: userId, ...style };
  const { error } = await supabase
    .from("piece_visual_styles" as any)
    .upsert(payload, { onConflict: "piece_id" });
  if (error) throw error;
}

export type VisualLawGenerateInput = {
  pieceId: string;
  userId: string;
  title: string;
  authorOrCase?: string;
  contentText: string;
  style: VisualLawStyle;
};

export async function generateVisualLawPdf(input: VisualLawGenerateInput): Promise<{ url: string; versionId: string; path: string }> {
  const element = createElement(VisualLawDocument as any, {
    title: input.title,
    authorOrCase: input.authorOrCase,
    contentText: input.contentText,
    vlStyle: input.style,
  });
  const blob = await pdf(element as any).toBlob();

  const versionId = crypto.randomUUID();
  const path = `visual-law/${input.userId}/${input.pieceId}/${versionId}.pdf`;
  const { error: upErr } = await supabase.storage.from("piece-exports").upload(path, blob, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upErr) throw upErr;

  const { error: insErr } = await supabase.from("piece_visual_versions" as any).insert({
    id: versionId,
    piece_id: input.pieceId,
    user_id: input.userId,
    style_snapshot: input.style as unknown as Record<string, unknown>,
    pdf_storage_path: path,
  });
  if (insErr) throw insErr;

  const { data: signed } = await supabase.storage
    .from("piece-exports")
    .createSignedUrl(path, 60 * 60 * 24);
  return { url: signed?.signedUrl ?? "", versionId, path };
}

export async function downloadVersionPdf(path: string): Promise<string> {
  const { data } = await supabase.storage.from("piece-exports").createSignedUrl(path, 60 * 60 * 24);
  return data?.signedUrl ?? "";
}