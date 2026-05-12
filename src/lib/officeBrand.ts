import { supabase } from "@/integrations/supabase/client";

export type LetterheadLayout = "topo" | "lateral" | "rodape" | "minimal";

export type OfficeBrand = {
  user_id: string;
  firm_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  font_family: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  oab_registration: string | null;
  letterhead_enabled: boolean;
  letterhead_layout: LetterheadLayout;
  signature_block: string | null;
  closing_text: string | null;
  default_city: string | null;
};

export const DEFAULT_BRAND: Omit<OfficeBrand, "user_id"> = {
  firm_name: "",
  logo_url: null,
  primary_color: "#283753",
  secondary_color: "#6E59A5",
  font_family: "Arial",
  address: "",
  phone: "",
  email: "",
  website: "",
  oab_registration: "",
  letterhead_enabled: true,
  letterhead_layout: "topo",
  signature_block: "",
  closing_text: "Nestes termos, pede deferimento.",
  default_city: "",
};

export const FONT_OPTIONS = [
  "Arial",
  "Times New Roman",
  "Garamond",
  "Calibri",
  "Helvetica",
  "Georgia",
] as const;

export async function loadOfficeBrand(userId: string): Promise<OfficeBrand | null> {
  const { data, error } = await supabase
    .from("office_brand")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as OfficeBrand | null) ?? null;
}

export async function saveOfficeBrand(userId: string, patch: Partial<OfficeBrand>): Promise<void> {
  const { error } = await supabase
    .from("office_brand")
    .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function uploadLogo(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const path = `${userId}/logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("office-brand")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  // Bucket é privado: armazenamos o path; URL assinada é gerada sob demanda.
  return path;
}

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Resolve um valor de logo_url para uma URL utilizável.
 * - Se já for http(s), retorna como está (compatibilidade com URLs públicas antigas).
 * - Se for um path do bucket office-brand, gera uma URL assinada (cache 50min).
 */
export async function resolveBrandAssetUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const now = Date.now();
  const cached = signedUrlCache.get(value);
  if (cached && cached.expiresAt > now) return cached.url;
  const { data, error } = await supabase.storage
    .from("office-brand")
    .createSignedUrl(value, 3600);
  if (error || !data?.signedUrl) return null;
  signedUrlCache.set(value, { url: data.signedUrl, expiresAt: now + 50 * 60 * 1000 });
  return data.signedUrl;
}

export function brandWithDefaults(b: OfficeBrand | null): OfficeBrand {
  return {
    user_id: b?.user_id ?? "",
    ...DEFAULT_BRAND,
    ...(b ?? {}),
  } as OfficeBrand;
}