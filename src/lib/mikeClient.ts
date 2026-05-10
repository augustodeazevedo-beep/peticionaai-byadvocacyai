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

/**
 * Calls the export-document edge function and returns the raw HTML blob
 * as an object URL that can be used to trigger a browser file download.
 */
export async function exportPieceHtml(piece_id: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");

  const supabaseUrl = (supabase as unknown as { supabaseUrl: string }).supabaseUrl
    ?? import.meta.env.VITE_SUPABASE_URL;

  const res = await fetch(`${supabaseUrl}/functions/v1/export-document`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ piece_id }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao exportar HTML: ${res.status} ${text}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "peticao.html";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
