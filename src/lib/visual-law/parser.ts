export type Block =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "quote"; text: string }
  | { type: "quadro"; title?: string; text: string }
  | { type: "timeline"; items: Array<{ when?: string; what: string }> };

/**
 * Parser leve: detecta marcações [QUADRO]...[/QUADRO], [TIMELINE]...[/TIMELINE], [QUOTE]...[/QUOTE]
 * e cabeçalhos markdown (#, ##, ###). O resto vira parágrafos.
 */
export function parsePieceText(input: string): Block[] {
  const text = (input || "").replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const blocks: Block[] = [];
  // Extrai blocos especiais primeiro
  const re = /\[(QUADRO|TIMELINE|QUOTE)(?:\s+title=("[^"]*"|[^\]]+))?\]([\s\S]*?)\[\/\1\]/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  const flushPlain = (s: string) => {
    s.split(/\n{2,}/).forEach((para) => {
      const trimmed = para.trim();
      if (!trimmed) return;
      if (/^#\s+/.test(trimmed)) return blocks.push({ type: "h1", text: trimmed.replace(/^#\s+/, "") });
      if (/^##\s+/.test(trimmed)) return blocks.push({ type: "h2", text: trimmed.replace(/^##\s+/, "") });
      if (/^###\s+/.test(trimmed)) return blocks.push({ type: "h3", text: trimmed.replace(/^###\s+/, "") });
      blocks.push({ type: "p", text: trimmed });
    });
  };

  while ((m = re.exec(text))) {
    if (m.index > last) flushPlain(text.slice(last, m.index));
    const tag = m[1].toUpperCase();
    const title = m[2]?.replace(/^"|"$/g, "");
    const body = m[3].trim();
    if (tag === "QUADRO") blocks.push({ type: "quadro", title, text: body });
    else if (tag === "QUOTE") blocks.push({ type: "quote", text: body });
    else if (tag === "TIMELINE") {
      const items = body
        .split(/\n+/)
        .map((line) => line.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean)
        .map((line) => {
          const mm = line.match(/^([\d/.\-A-Za-zçãâéê ]{4,40}?)\s*[—:|-]\s*(.+)$/);
          if (mm) return { when: mm[1].trim(), what: mm[2].trim() };
          return { what: line };
        });
      blocks.push({ type: "timeline", items });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) flushPlain(text.slice(last));
  return blocks;
}