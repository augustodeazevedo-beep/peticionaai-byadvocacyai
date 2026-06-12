import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Decision = {
  id: string;
  process_number: string;
  court: string;
  judging_body: string;
  rapporteur: string;
  judgment_date: string;
  publication_date: string;
  syllabus: string;
  url: string | null;
  decision_type: string | null;
  raw: Record<string, unknown>;
};

export type SearchResponse = {
  data: Decision[];
  total: number;
  page: number;
};

const DateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD")
  .optional();

function normalizeDecision(raw: Record<string, unknown>, courtFallback: string): Decision {
  const r = raw as Record<string, unknown>;
  const get = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : "");
  return {
    id: String(r.id ?? r.decision_id ?? `${get("process_number")}-${get("publication_date")}`),
    process_number: get("process_number") || get("number") || "",
    court: get("court") || courtFallback,
    judging_body: get("judging_body") || get("organ") || "",
    rapporteur: get("rapporteur") || get("reporter") || "",
    judgment_date: get("judgment_date") || get("trial_date") || "",
    publication_date: get("publication_date") || get("pub_date") || "",
    syllabus: get("syllabus") || get("ementa") || get("excerpt") || "",
    url: (r.url as string) || (r.link as string) || null,
    decision_type: (r.decision_type as string) || (r.type as string) || null,
    raw: r,
  };
}

function extractDecisionsArray(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Record<string, unknown>;
  const arr = (p.data ?? p.decisions ?? p.results) as unknown;
  return Array.isArray(arr) ? (arr as Record<string, unknown>[]) : [];
}

/** Verifica se a chave do servidor está presente. */
export const getJurisprudenciaKeyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { hasApiKey } = await import("./jurisprudencia.server");
    return { hasKey: hasApiKey() };
  });

/** Busca de decisões. `court_id` é obrigatório no endpoint da API. */
export const searchJurisprudencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    court_id: string;
    q: string;
    page?: number;
    pub_from?: string;
    pub_to?: string;
    trial_from?: string;
    trial_to?: string;
  }) =>
    z
      .object({
        court_id: z.string().trim().min(2).max(20),
        q: z.string().trim().min(2).max(500),
        page: z.number().int().min(0).max(500).optional(),
        pub_from: DateStr,
        pub_to: DateStr,
        trial_from: DateStr,
        trial_to: DateStr,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { apiSearchDecisions } = await import("./jurisprudencia.server");
    const raw = await apiSearchDecisions(data);
    const items = extractDecisionsArray(raw).map((d) => normalizeDecision(d, data.court_id));
    const total =
      typeof (raw as { total?: unknown })?.total === "number"
        ? Number((raw as { total: number }).total)
        : items.length;

    // Persistência do histórico (não bloqueia a resposta em caso de erro).
    try {
      await supabase.from("jurisprudencia_buscas").insert({
        user_id: userId,
        query: data.q,
        court: data.court_id,
        page: data.page ?? 0,
        total_results: total,
        pub_from: data.pub_from ?? null,
        pub_to: data.pub_to ?? null,
        trial_from: data.trial_from ?? null,
        trial_to: data.trial_to ?? null,
      });
    } catch (e) {
      console.error("[jurisprudencia] falha ao registrar histórico", e);
    }

    const out: SearchResponse = {
      data: items,
      total,
      page: data.page ?? 0,
    };
    return out;
  });

export const lookupDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { court_id: string; n: string }) =>
    z
      .object({
        court_id: z.string().trim().min(2).max(20),
        n: z.string().trim().min(5).max(60),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { apiLookupDecision } = await import("./jurisprudencia.server");
    const raw = await apiLookupDecision(data);
    const inner =
      raw && typeof raw === "object" && "data" in raw
        ? ((raw as { data: Record<string, unknown> }).data ?? {})
        : (raw as Record<string, unknown>);
    return normalizeDecision(inner, data.court_id);
  });

export const listBuscasRecentes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("jurisprudencia_buscas")
      .select("id, query, court, page, total_results, executed_at")
      .order("executed_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const clearHistoricoJurisprudencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("jurisprudencia_buscas")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveSelecaoJurisprudencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { piece_id?: string | null; decision: Decision }) => ({
    piece_id: d.piece_id ?? null,
    decision: d.decision,
  }))
  .handler(async ({ data, context }) => {
    const dec = data.decision;
    const { data: row, error } = await context.supabase
      .from("jurisprudencia_selecoes")
      .insert({
        user_id: context.userId,
        piece_id: data.piece_id,
        decision_id: dec.id,
        court: dec.court,
        process_number: dec.process_number,
        judging_body: dec.judging_body,
        rapporteur: dec.rapporteur,
        judgment_date: dec.judgment_date,
        publication_date: dec.publication_date,
        syllabus: dec.syllabus,
        url: dec.url,
        decision_type: dec.decision_type,
        raw: dec.raw,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listSelecoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("jurisprudencia_selecoes")
      .select(
        "id, piece_id, decision_id, court, process_number, judging_body, rapporteur, judgment_date, publication_date, syllabus, url, decision_type, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const removeSelecao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: z.string().uuid().parse(d.id) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("jurisprudencia_selecoes")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });