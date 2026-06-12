/**
 * Lista canônica de tribunais suportados no filtro.
 * `id` é enviado à API como `:court_id`; `label` é o que aparece na UI.
 */
export type TribunalOption = { id: string; label: string };

export const TRIBUNAIS_JURISPRUDENCIA: ReadonlyArray<TribunalOption> = [
  { id: "stf", label: "STF — Supremo Tribunal Federal" },
  { id: "stj", label: "STJ — Superior Tribunal de Justiça" },
  { id: "tst", label: "TST — Tribunal Superior do Trabalho" },
  { id: "tjrs", label: "TJRS — Tribunal de Justiça do RS" },
  { id: "tjsp", label: "TJSP — Tribunal de Justiça de SP" },
  { id: "tjrj", label: "TJRJ — Tribunal de Justiça do RJ" },
  { id: "trf1", label: "TRF1 — Tribunal Regional Federal da 1ª Região" },
  { id: "trf2", label: "TRF2 — Tribunal Regional Federal da 2ª Região" },
  { id: "trf3", label: "TRF3 — Tribunal Regional Federal da 3ª Região" },
  { id: "trf4", label: "TRF4 — Tribunal Regional Federal da 4ª Região" },
  { id: "trf5", label: "TRF5 — Tribunal Regional Federal da 5ª Região" },
  { id: "trf6", label: "TRF6 — Tribunal Regional Federal da 6ª Região" },
] as const;

export const ALL_COURTS_VALUE = "__all__";

export function labelForCourt(id: string | null | undefined): string {
  if (!id || id === ALL_COURTS_VALUE) return "Todos os tribunais";
  return TRIBUNAIS_JURISPRUDENCIA.find((t) => t.id === id)?.label ?? id.toUpperCase();
}