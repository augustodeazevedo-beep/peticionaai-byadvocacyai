/**
 * Cliente server-only para a API Jurisprudências.AI.
 * Endpoints reais:
 *   GET /api/v1/courts
 *   GET /api/v1/courts/:court_id/decisions?q=&page=&pub_from=&pub_to=&trial_from=&trial_to=
 *   GET /api/v1/courts/:court_id/decisions/lookup?n=
 */
const API_BASE_URL = "https://jurisprudencias.ai/api/v1";

export type ApiDecision = {
  id?: string;
  process_number?: string;
  court?: string;
  judging_body?: string;
  rapporteur?: string;
  judgment_date?: string;
  publication_date?: string;
  syllabus?: string;
  url?: string;
  decision_type?: string;
  [k: string]: unknown;
};

export type ApiSearchResponse = {
  data?: ApiDecision[];
  decisions?: ApiDecision[];
  total?: number;
  page?: number;
  per_page?: number;
  [k: string]: unknown;
};

function getKey(): string {
  const key = process.env.JURISPRUDENCIAS_AI_API_KEY;
  if (!key) {
    throw new Error(
      "JURISPRUDENCIAS_AI_API_KEY não configurada no servidor. Peça ao administrador para definir o segredo.",
    );
  }
  return key;
}

async function callApi(path: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`${API_BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  const resp = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getKey()}`,
      Accept: "application/json",
    },
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    let detail = text;
    try {
      const j = JSON.parse(text);
      detail = j?.error?.message ?? detail;
    } catch {
      /* keep raw */
    }
    const friendly =
      resp.status === 401
        ? "Chave da API Jurisprudências.AI inválida ou ausente."
        : resp.status === 429
          ? "Limite diário de buscas no Jurisprudências.AI atingido. Tente novamente mais tarde."
          : resp.status === 404
            ? "Recurso não encontrado no Jurisprudências.AI."
            : `Erro ${resp.status} na API Jurisprudências.AI`;
    throw new Error(`${friendly}${detail ? ` — ${detail}` : ""}`);
  }
  return (await resp.json()) as unknown;
}

export function hasApiKey(): boolean {
  return Boolean(process.env.JURISPRUDENCIAS_AI_API_KEY);
}

export async function apiSearchDecisions(opts: {
  court_id: string;
  q: string;
  page?: number;
  pub_from?: string;
  pub_to?: string;
  trial_from?: string;
  trial_to?: string;
}) {
  const data = (await callApi(`/courts/${encodeURIComponent(opts.court_id)}/decisions`, {
    q: opts.q,
    page: opts.page ?? 0,
    pub_from: opts.pub_from,
    pub_to: opts.pub_to,
    trial_from: opts.trial_from,
    trial_to: opts.trial_to,
  })) as ApiSearchResponse;
  return data;
}

export async function apiLookupDecision(opts: { court_id: string; n: string }) {
  const data = (await callApi(
    `/courts/${encodeURIComponent(opts.court_id)}/decisions/lookup`,
    { n: opts.n },
  )) as ApiDecision | { data?: ApiDecision };
  return data;
}

export async function apiListCourts() {
  return (await callApi(`/courts`, {})) as unknown;
}