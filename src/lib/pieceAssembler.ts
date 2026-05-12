import type { OfficeBrand } from "./officeBrand";

export type AssemblyOptions = {
  applyLetterhead?: boolean;
  numberParagraphs?: boolean;
  includeSignatureBlock?: boolean;
  includeClosing?: boolean;
};

export type PieceContext = {
  title?: string;
  juizo?: string;
  tribunal?: string;
  autor?: string;
  autor_qualificacao?: string;
  reu?: string;
  reu_qualificacao?: string;
  valor_causa?: string;
  cnj_number?: string;
};

const HAS = (s: string | undefined, needles: string[]) => {
  if (!s) return false;
  const low = s.toLowerCase();
  return needles.some((n) => low.includes(n));
};

/**
 * Envelopa o conteúdo gerado pela IA com endereçamento, qualificação,
 * fechamento, local/data e assinatura usando o Brand Kit. Idempotente:
 * detecta se já existe para evitar duplicação.
 */
export function assemblePiece(
  content: string,
  brand: OfficeBrand | null,
  ctx: PieceContext = {},
  opts: AssemblyOptions = {},
): string {
  const apply = {
    applyLetterhead: true,
    numberParagraphs: false,
    includeSignatureBlock: true,
    includeClosing: true,
    ...opts,
  };

  let out = content.trim();

  // Endereçamento
  const hasAddress = HAS(out.split("\n").slice(0, 8).join("\n"), [
    "excelentíssim",
    "exmo.",
    "exma.",
    "meritíssim",
  ]);
  if (!hasAddress && (ctx.juizo || ctx.tribunal)) {
    const dest = ctx.juizo || `JUIZ DE DIREITO — ${ctx.tribunal}`;
    out = `**EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) ${dest.toUpperCase()}**\n\n${out}`;
  }

  // Espelho/Referência
  if (ctx.cnj_number && !out.includes(ctx.cnj_number)) {
    out = out.replace(/^/, `*Autos n.º ${ctx.cnj_number}*\n\n`);
  }

  // Numeração de parágrafos no corpo (sem alterar headings, citações, listas)
  if (apply.numberParagraphs) {
    let n = 0;
    out = out
      .split("\n")
      .map((ln) => {
        const t = ln.trim();
        if (!t) return ln;
        if (t.startsWith("#") || t.startsWith(">") || /^[-*+]\s/.test(t) || /^\d+\.\s/.test(t)) return ln;
        if (t.length < 40) return ln; // ignora títulos curtos
        n += 1;
        return `${n}. ${ln}`;
      })
      .join("\n");
  }

  // Fechamento
  const hasClosing = HAS(out, [
    "nestes termos",
    "termos em que",
    "pede deferimento",
    "p. deferimento",
  ]);
  if (apply.includeClosing && !hasClosing) {
    const closing = brand?.closing_text || "Nestes termos, pede deferimento.";
    out = `${out}\n\n${closing}`;
  }

  // Local + data
  const city = brand?.default_city?.trim();
  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const dateLine = city ? `${city}, ${today}.` : `${today}.`;
  if (!out.includes(dateLine)) {
    out = `${out}\n\n${dateLine}`;
  }

  // Bloco de assinatura
  if (apply.includeSignatureBlock) {
    const sig = (brand?.signature_block || "").trim();
    if (sig) {
      // já incluído?
      const firstLine = sig.split("\n")[0]?.trim();
      if (!firstLine || !out.includes(firstLine)) {
        out = `${out}\n\n___________________________________\n${sig}`;
      }
    }
  }

  return out;
}

/** Lê CNJ a partir do input_data salvo no piece. */
export function pieceContextFromInput(input: Record<string, unknown> | null | undefined): PieceContext {
  const i = (input ?? {}) as Record<string, string | undefined>;
  return {
    juizo: i.juizo,
    tribunal: i.tribunal,
    autor: i.autor,
    autor_qualificacao: i.autor_qualificacao,
    reu: i.reu,
    reu_qualificacao: i.reu_qualificacao,
    valor_causa: i.valor_causa,
    cnj_number: i.cnj_number,
    title: i.title,
  };
}