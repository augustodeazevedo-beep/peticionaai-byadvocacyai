import type { AuditFinding, ExtractedCitation } from "./types";

// Stage C: valida citações contra o Jurisprudências.AI / DataJud.
// Retorna findings (fake_jurisprudence / fake_citation / unverified).

let counter = 0;
function nextId() {
  counter = (counter + 1) % 1_000_000;
  return `cite-${Date.now().toString(36)}-${counter.toString(36)}`;
}

function finding(
  base: ExtractedCitation,
  category: AuditFinding["category"],
  severity: AuditFinding["severity"],
  explanation: string,
  evidence?: AuditFinding["evidence"],
  confidence = 0.75,
): AuditFinding {
  return {
    id: nextId(),
    category,
    severity,
    snippet: base.raw,
    start: base.start,
    end: base.end,
    explanation,
    suggested_fix: "",
    confidence,
    evidence: evidence ?? null,
  };
}

type JurisAPIKey = string;

async function jurisSearch(
  apiKey: JurisAPIKey,
  query: string,
  signal?: AbortSignal,
): Promise<{ hits: number; sample?: Record<string, unknown> }> {
  try {
    const r = await fetch("https://api.jurisprudencias.ai/v1/search", {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ q: query, per_page: 1 }),
    });
    if (!r.ok) return { hits: -1 };
    const j = (await r.json()) as {
      total?: number;
      data?: Array<Record<string, unknown>>;
    };
    return { hits: j.total ?? j.data?.length ?? 0, sample: j.data?.[0] };
  } catch {
    return { hits: -1 };
  }
}

export async function validateCitations(
  citations: ExtractedCitation[],
  opts: { jurisApiKey?: string | null; timeoutMs?: number } = {},
): Promise<AuditFinding[]> {
  if (citations.length === 0) return [];
  const findings: AuditFinding[] = [];

  // Súmulas do STF/STJ têm faixas conhecidas (validação heurística barata).
  const SUMULA_LIMITS: Record<string, number> = { STF: 800, STJ: 700, TST: 500, TSE: 100, TCU: 400 };
  for (const c of citations) {
    if (c.kind === "sumula" && c.court) {
      const n = Number(c.identifier);
      const limit = SUMULA_LIMITS[c.court.toUpperCase()];
      if (Number.isFinite(n) && limit && n > limit * 1.5) {
        findings.push(
          finding(
            c,
            "fake_citation",
            "high",
            `Súmula ${c.identifier} do ${c.court} fora da faixa conhecida (~${limit}). Verifique se existe.`,
            null,
            0.8,
          ),
        );
      }
    }
    if (c.kind === "lei") {
      // Ex.: "Lei 99999/2099" — ano no futuro
      const yearMatch = c.identifier.match(/\/(\d{2,4})$/);
      if (yearMatch) {
        const y = Number(yearMatch[1]);
        const nowYear = new Date().getFullYear();
        const full = y < 100 ? (y < 50 ? 2000 + y : 1900 + y) : y;
        if (full > nowYear + 1) {
          findings.push(
            finding(
              c,
              "fake_citation",
              "critical",
              `Lei com ano ${full} — inexistente (ano futuro).`,
              null,
              0.99,
            ),
          );
        }
      }
    }
  }

  // Validação online via Jurisprudências.AI para precedentes (recurso/HC/ação constitucional).
  const online = citations.filter(
    (c) => c.kind === "recurso" || c.kind === "habeas_corpus" || c.kind === "acao_constitucional",
  );
  if (online.length > 0 && opts.jurisApiKey) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 6000);
    try {
      const results = await Promise.all(
        online.slice(0, 8).map((c) => jurisSearch(opts.jurisApiKey!, c.raw, ctrl.signal).then((r) => [c, r] as const)),
      );
      for (const [c, r] of results) {
        if (r.hits === -1) continue; // API indisponível — não penalizar
        if (r.hits === 0) {
          findings.push(
            finding(
              c,
              "fake_jurisprudence",
              "high",
              `Precedente ${c.raw} não encontrado nas bases consultadas. Confirme antes de citar.`,
              { source: "jurisprudencias.ai", detail: "0 resultados" },
              0.7,
            ),
          );
        }
      }
    } finally {
      clearTimeout(t);
    }
  } else if (online.length > 0) {
    // Sem chave: marca como não verificado (baixa severidade).
    for (const c of online.slice(0, 5)) {
      findings.push(
        finding(
          c,
          "fake_jurisprudence",
          "low",
          `Precedente ${c.raw} não verificado (base de jurisprudência indisponível).`,
          null,
          0.5,
        ),
      );
    }
  }

  return findings;
}