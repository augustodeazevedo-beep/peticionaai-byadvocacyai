import { supabase } from "@/integrations/supabase/client";

export type GenerateInput = {
  piece_type: string;
  area?: string;
  fields: Record<string, unknown>;
  context?: string;
};

export type GenerateResult = {
  content: string;
  model_used: string;
  source: "mike" | "lovable_ai";
};

export async function generatePiece(input: GenerateInput): Promise<GenerateResult> {
  const { data, error } = await supabase.functions.invoke("mike-generate", { body: input });
  if (error) throw error;
  return data as GenerateResult;
}

export type ExportResult = { url: string; path: string };

export async function exportPieceDocx(piece_id: string): Promise<ExportResult> {
  const { data, error } = await supabase.functions.invoke("export-piece-docx", { body: { piece_id } });
  if (error) throw error;
  return data as ExportResult;
}