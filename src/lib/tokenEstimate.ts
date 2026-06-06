/** Estimativa simples de tokens (~4 chars/token, padrão para modelos GPT/Gemini). */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/** Limite default da janela de contexto (128k — Gemini 2.5 Flash / GPT-5 nano). */
export const TOKEN_LIMIT = 128_000;

export const TOKEN_WARN_RATIO = 0.7;
export const TOKEN_CRITICAL_RATIO = 0.9;

export function tokenStatus(used: number, limit = TOKEN_LIMIT): "ok" | "warn" | "critical" {
  const ratio = used / limit;
  if (ratio >= TOKEN_CRITICAL_RATIO) return "critical";
  if (ratio >= TOKEN_WARN_RATIO) return "warn";
  return "ok";
}

export async function pdfFileToMarkdown(file: File): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const buf = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocumentProxy(buf);
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  const md = pages
    .map((p, i) => `## Página ${i + 1}\n\n${(p ?? "").trim()}`)
    .join("\n\n---\n\n");
  return `# ${file.name.replace(/\.pdf$/i, "")}\n\n${md}`;
}