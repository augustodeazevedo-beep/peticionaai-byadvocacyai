import { create } from "zustand";
import type { Decision } from "@/lib/jurisprudencia.functions";

type State = {
  itens: Decision[];
  add: (d: Decision) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
};

export const useJurisprudenciaContexto = create<State>((set, get) => ({
  itens: [],
  add: (d) =>
    set((s) => (s.itens.some((x) => x.id === d.id) ? s : { itens: [...s.itens, d] })),
  remove: (id) => set((s) => ({ itens: s.itens.filter((x) => x.id !== id) })),
  clear: () => set({ itens: [] }),
  has: (id) => get().itens.some((x) => x.id === id),
}));

/** Monta o bloco de contexto antialucinação a ser injetado no prompt. */
export function buildJurisprudenciaContextBlock(itens: Decision[]): string {
  if (!itens.length) return "";
  const lines = itens.map((d, i) => {
    const header = [
      d.court || "Tribunal",
      d.process_number ? `Proc. ${d.process_number}` : null,
      d.judging_body || null,
      d.rapporteur ? `Rel. ${d.rapporteur}` : null,
      d.judgment_date ? `j. ${d.judgment_date}` : null,
      d.publication_date ? `DJe ${d.publication_date}` : null,
    ]
      .filter(Boolean)
      .join(" — ");
    const link = d.url ? `\n   Fonte: ${d.url}` : "";
    const ementa = (d.syllabus || "").replace(/\s+/g, " ").trim();
    return `${i + 1}) ${header}\n   EMENTA (citar entre aspas, sem alterar): "${ementa}"${link}`;
  });
  return [
    "",
    "[JURISPRUDÊNCIAS SELECIONADAS — CITAR LITERALMENTE COM ASPAS]",
    lines.join("\n"),
    "",
    "REGRA ANTIALUCINAÇÃO (obrigatória): é proibido parafrasear, resumir,",
    "completar ou inventar trechos de jurisprudência. Use APENAS as ementas",
    "acima quando citar precedentes, reproduzindo o texto entre aspas e",
    "referenciando tribunal, número do processo, órgão julgador, relator e",
    'data conforme fornecido. Se faltar suporte jurisprudencial, declare',
    '"sem precedente fornecido" em vez de inventar.',
    "",
  ].join("\n");
}