import { marked, type Tokens } from "marked";

export type InlineRun = { text: string; bold?: boolean; italic?: boolean };

export type Block =
  | { kind: "heading"; level: 1 | 2 | 3; runs: InlineRun[] }
  | { kind: "paragraph"; runs: InlineRun[] }
  | { kind: "list"; ordered: boolean; items: InlineRun[][] }
  | { kind: "blockquote"; runs: InlineRun[] }
  | { kind: "code"; text: string }
  | { kind: "hr" };

function flattenInline(tokens: Tokens.Generic[] | undefined): InlineRun[] {
  if (!tokens) return [];
  const out: InlineRun[] = [];
  const walk = (toks: Tokens.Generic[], bold = false, italic = false) => {
    for (const t of toks) {
      switch (t.type) {
        case "text":
        case "escape":
        case "html":
        case "codespan":
          out.push({ text: (t as Tokens.Text).text, bold, italic });
          break;
        case "strong":
          walk((t as Tokens.Strong).tokens ?? [], true, italic);
          break;
        case "em":
          walk((t as Tokens.Em).tokens ?? [], bold, true);
          break;
        case "link":
          walk((t as Tokens.Link).tokens ?? [], bold, italic);
          break;
        case "br":
          out.push({ text: "\n", bold, italic });
          break;
        default: {
          const inner = (t as { tokens?: Tokens.Generic[] }).tokens;
          if (inner) walk(inner, bold, italic);
          else if ((t as Tokens.Text).text) out.push({ text: (t as Tokens.Text).text, bold, italic });
        }
      }
    }
  };
  walk(tokens);
  // merge consecutive same-style
  const merged: InlineRun[] = [];
  for (const r of out) {
    const last = merged[merged.length - 1];
    if (last && !!last.bold === !!r.bold && !!last.italic === !!r.italic) {
      last.text += r.text;
    } else merged.push({ ...r });
  }
  return merged;
}

export function parseMarkdownBlocks(md: string): Block[] {
  const tokens = marked.lexer(md ?? "");
  const blocks: Block[] = [];
  for (const tok of tokens) {
    switch (tok.type) {
      case "heading": {
        const h = tok as Tokens.Heading;
        const level = (Math.min(3, Math.max(1, h.depth)) as 1 | 2 | 3);
        blocks.push({ kind: "heading", level, runs: flattenInline(h.tokens) });
        break;
      }
      case "paragraph": {
        const p = tok as Tokens.Paragraph;
        blocks.push({ kind: "paragraph", runs: flattenInline(p.tokens) });
        break;
      }
      case "list": {
        const l = tok as Tokens.List;
        const items = l.items.map((it) => flattenInline(it.tokens));
        blocks.push({ kind: "list", ordered: !!l.ordered, items });
        break;
      }
      case "blockquote": {
        const bq = tok as Tokens.Blockquote;
        blocks.push({ kind: "blockquote", runs: flattenInline(bq.tokens) });
        break;
      }
      case "code": {
        blocks.push({ kind: "code", text: (tok as Tokens.Code).text });
        break;
      }
      case "hr":
        blocks.push({ kind: "hr" });
        break;
      case "space":
        break;
      default: {
        const text = (tok as { raw?: string }).raw ?? "";
        if (text.trim()) blocks.push({ kind: "paragraph", runs: [{ text: text.trim() }] });
      }
    }
  }
  return blocks;
}
