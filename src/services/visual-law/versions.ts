import { supabase } from "@/integrations/supabase/client";
import type { VLVersion, VLDocumentConfig, VLDirection, VLLegalMetadata, VLLegalValidation, VLRiskAnalysis } from "@/types/visual-law";

type Row = {
  id: string;
  piece_id: string;
  user_id: string;
  content: string;
  config: VLDocumentConfig;
  prompt: string;
  direction: VLDirection;
  legal_metadata: VLLegalMetadata;
  validation: VLLegalValidation | null;
  risk: VLRiskAnalysis | null;
  created_at: string;
};

function rowToVersion(r: Row): VLVersion {
  return {
    id: r.id,
    timestamp: r.created_at,
    content: r.content,
    config: r.config,
    prompt: r.prompt,
    direction: r.direction,
    legalMetadata: r.legal_metadata,
    validation: r.validation ?? undefined,
    risk: r.risk ?? undefined,
  };
}

export async function loadVersions(pieceId: string): Promise<VLVersion[]> {
  const { data, error } = await supabase
    .from("vl_versions" as never)
    .select("*")
    .eq("piece_id", pieceId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data as unknown as Row[]) ?? []).map(rowToVersion);
}

export async function persistVersion(
  pieceId: string,
  userId: string,
  version: VLVersion,
): Promise<VLVersion> {
  const { data, error } = await supabase
    .from("vl_versions" as never)
    .insert({
      piece_id: pieceId,
      user_id: userId,
      content: version.content,
      config: version.config,
      prompt: version.prompt,
      direction: version.direction,
      legal_metadata: version.legalMetadata ?? {},
      validation: version.validation ?? null,
      risk: version.risk ?? null,
    } as never)
    .select("*")
    .single();
  if (error) throw error;
  return rowToVersion(data as unknown as Row);
}