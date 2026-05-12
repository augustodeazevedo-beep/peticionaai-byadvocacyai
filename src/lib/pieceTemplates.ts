import { supabase } from "@/integrations/supabase/client";

export type TemplateStructure = {
  enderecamento?: boolean;
  qualificacao?: boolean;
  fatos?: boolean;
  fundamentos?: boolean;
  pedidos?: boolean;
  valor_causa?: boolean;
  fechamento?: boolean;
  assinatura?: boolean;
};

export type TemplateStyleOverrides = {
  numberParagraphs?: boolean;
  closing_text?: string;
  font_family?: string;
  tone?: "formal" | "tecnico" | "didatico";
};

export type PieceTemplate = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  area: string;
  piece_type: string;
  scope: string;
  content_md: string;
  structure: TemplateStructure;
  style_overrides: TemplateStyleOverrides;
  prompt_hints: string | null;
  tags: string[];
  is_default: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TemplateUpsert = Partial<PieceTemplate> & {
  user_id: string;
  name: string;
  area: string;
  piece_type: string;
};

export const PIECE_AREAS = [
  { v: "civel", l: "Cível" },
  { v: "consumidor", l: "Consumidor" },
  { v: "familia", l: "Família" },
  { v: "trabalhista", l: "Trabalhista" },
  { v: "previdenciario", l: "Previdenciário" },
  { v: "tributario", l: "Tributário" },
  { v: "empresarial", l: "Empresarial" },
  { v: "administrativo", l: "Administrativo" },
  { v: "penal", l: "Penal" },
] as const;

export const PIECE_TYPES = [
  { v: "peticao_inicial_civel", l: "Petição Inicial — Cível" },
  { v: "contestacao", l: "Contestação" },
  { v: "replica", l: "Réplica" },
  { v: "recurso_apelacao", l: "Apelação" },
  { v: "embargos_declaracao", l: "Embargos de Declaração" },
  { v: "agravo_instrumento", l: "Agravo de Instrumento" },
  { v: "mandado_seguranca", l: "Mandado de Segurança" },
  { v: "habeas_corpus", l: "Habeas Corpus" },
  { v: "memoriais", l: "Memoriais" },
  { v: "manifestacao", l: "Manifestação" },
] as const;

export const DEFAULT_STRUCTURE: TemplateStructure = {
  enderecamento: true,
  qualificacao: true,
  fatos: true,
  fundamentos: true,
  pedidos: true,
  valor_causa: true,
  fechamento: true,
  assinatura: true,
};

export const PLACEHOLDERS = [
  { k: "{{cliente}}", l: "Nome do cliente / autor" },
  { k: "{{cliente_qualificacao}}", l: "Qualificação completa do autor" },
  { k: "{{reu}}", l: "Nome do réu" },
  { k: "{{reu_qualificacao}}", l: "Qualificação completa do réu" },
  { k: "{{juizo}}", l: "Juízo / Vara endereçada" },
  { k: "{{tribunal}}", l: "Tribunal" },
  { k: "{{cnj}}", l: "Número CNJ do processo" },
  { k: "{{fatos}}", l: "Síntese dos fatos" },
  { k: "{{fundamentos}}", l: "Fundamentos jurídicos" },
  { k: "{{pedidos}}", l: "Pedidos formulados" },
  { k: "{{valor_causa}}", l: "Valor da causa" },
  { k: "{{cidade}}", l: "Cidade" },
  { k: "{{data}}", l: "Data atual" },
] as const;

export async function listTemplates(userId: string) {
  const { data, error } = await supabase
    .from("piece_templates")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("usage_count", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PieceTemplate[];
}

export async function listTemplatesFor(userId: string, area: string, piece_type: string) {
  const { data, error } = await supabase
    .from("piece_templates")
    .select("*")
    .eq("user_id", userId)
    .eq("area", area)
    .eq("piece_type", piece_type)
    .order("is_default", { ascending: false })
    .order("usage_count", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PieceTemplate[];
}

export async function getTemplate(id: string) {
  const { data, error } = await supabase
    .from("piece_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as PieceTemplate | null;
}

export async function upsertTemplate(t: TemplateUpsert) {
  const payload = {
    ...t,
    structure: t.structure ?? DEFAULT_STRUCTURE,
    style_overrides: t.style_overrides ?? {},
    tags: t.tags ?? [],
  };
  if (t.id) {
    const { data, error } = await supabase
      .from("piece_templates")
      .update(payload)
      .eq("id", t.id)
      .select()
      .single();
    if (error) throw error;
    return data as PieceTemplate;
  }
  const { data, error } = await supabase
    .from("piece_templates")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as PieceTemplate;
}

export async function deleteTemplate(id: string) {
  const { error } = await supabase.from("piece_templates").delete().eq("id", id);
  if (error) throw error;
}

export async function setDefault(userId: string, area: string, piece_type: string, id: string) {
  // Clears other defaults for the same (area, piece_type) and sets this one as default
  await supabase
    .from("piece_templates")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("area", area)
    .eq("piece_type", piece_type);
  const { error } = await supabase
    .from("piece_templates")
    .update({ is_default: true })
    .eq("id", id);
  if (error) throw error;
}

export async function incrementUsage(id: string) {
  const cur = await getTemplate(id);
  if (!cur) return;
  await supabase
    .from("piece_templates")
    .update({
      usage_count: (cur.usage_count ?? 0) + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export function renderTemplate(content: string, vars: Record<string, string | undefined>) {
  return content.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? `{{${k}}}`));
}

export function areaLabel(v: string) {
  return PIECE_AREAS.find((a) => a.v === v)?.l ?? v;
}

export function pieceTypeLabel(v: string) {
  return PIECE_TYPES.find((p) => p.v === v)?.l ?? v;
}