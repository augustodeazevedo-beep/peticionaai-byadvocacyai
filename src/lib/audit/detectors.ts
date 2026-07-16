import type { AuditFinding, ExtractedCitation } from "./types";

// Stage A: heurísticas rápidas para prompt injection / jailbreak / PII.
// Casos óbvios sem consumir token.

type Rule = {
  category: AuditFinding["category"];
  severity: AuditFinding["severity"];
  pattern: RegExp;
  explanation: string;
  suggested_fix?: string;
  confidence?: number;
};

const INJECTION_RULES: Rule[] = [
  {
    category: "prompt_injection",
    severity: "high",
    pattern: /\bignor[ea]\s+(?:as?|todas?\s+as?)\s+(?:instru[çc][õo]es|regras)\b/gi,
    explanation: "Tentativa clássica de sequestro de instrução ('ignore as instruções').",
    suggested_fix: "",
    confidence: 0.92,
  },
  {
    category: "prompt_injection",
    severity: "high",
    pattern: /\bignore\s+(?:all\s+)?previous\s+instructions\b/gi,
    explanation: "Prompt injection em inglês ('ignore previous instructions').",
    suggested_fix: "",
    confidence: 0.95,
  },
  {
    category: "prompt_injection",
    severity: "critical",
    pattern: /<\|im_(?:start|end)\|>|<\|system\|>|<\|assistant\|>/gi,
    explanation: "Marcadores de mensagens de sistema/assistente injetados no conteúdo.",
    suggested_fix: "",
    confidence: 0.99,
  },
  {
    category: "prompt_injection",
    severity: "high",
    pattern: /(^|\n)\s*system\s*:\s*/gi,
    explanation: "Cabeçalho 'system:' inserido no texto — tentativa de reescrever a persona.",
    suggested_fix: "",
    confidence: 0.7,
  },
  {
    category: "prompt_injection",
    severity: "medium",
    pattern: /\b(?:reveal|revele|mostre|imprima)\s+(?:o\s+)?(?:seu\s+)?(?:system\s+)?prompt\b/gi,
    explanation: "Pedido para revelar o system prompt.",
    suggested_fix: "",
    confidence: 0.8,
  },
  {
    category: "jailbreak",
    severity: "high",
    pattern: /\b(?:DAN|do\s+anything\s+now|modo\s+desenvolvedor|developer\s+mode)\b/gi,
    explanation: "Padrão de jailbreak conhecido (DAN / developer mode).",
    suggested_fix: "",
    confidence: 0.9,
  },
  {
    category: "jailbreak",
    severity: "medium",
    pattern: /\b(?:sem\s+restri[çc][õo]es|ignore\s+a\s+[ée]tica|responda\s+sem\s+filtros?)\b/gi,
    explanation: "Instrução para contornar guardrails éticos.",
    suggested_fix: "",
    confidence: 0.8,
  },
];

const CPF_RE = /(?<!\d)(\d{3})\.?(\d{3})\.?(\d{3})[-.]?(\d{2})(?!\d)/g;
const RG_RE = /(?<!\d)\d{1,2}\.\d{3}\.\d{3}-[\dxX](?!\d)/g;

function cpfIsValid(digits: string): boolean {
  if (!/^\d{11}$/.test(digits)) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  const calc = (base: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += Number(base[i]) * (factor - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const d1 = calc(digits.slice(0, 9), 10);
  const d2 = calc(digits.slice(0, 10), 11);
  return d1 === Number(digits[9]) && d2 === Number(digits[10]);
}

function maskCpf(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 11) return "***";
  return `***.***.***-${digits.slice(-2)}`;
}

let counter = 0;
function nextId(prefix: string) {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export function detectHeuristics(text: string): AuditFinding[] {
  if (!text) return [];
  const out: AuditFinding[] = [];

  for (const rule of INJECTION_RULES) {
    rule.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.pattern.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      out.push({
        id: nextId(rule.category),
        category: rule.category,
        severity: rule.severity,
        snippet: text.slice(Math.max(0, start - 40), Math.min(text.length, end + 40)),
        start,
        end,
        explanation: rule.explanation,
        suggested_fix: rule.suggested_fix ?? "",
        confidence: rule.confidence ?? 0.75,
      });
      if (!rule.pattern.global) break;
    }
  }

  // PII: CPFs com dígito válido
  CPF_RE.lastIndex = 0;
  let cm: RegExpExecArray | null;
  while ((cm = CPF_RE.exec(text)) !== null) {
    const raw = cm[0];
    const digits = raw.replace(/\D/g, "");
    if (!cpfIsValid(digits)) continue;
    const start = cm.index;
    out.push({
      id: nextId("pii"),
      category: "pii_leak",
      severity: "medium",
      snippet: `CPF ${maskCpf(raw)}`,
      start,
      end: start + raw.length,
      explanation:
        "CPF completo aparente no texto. Considere mascarar (ex.: '***.***.***-99') ou confirmar a base legal (art. 7º LGPD).",
      suggested_fix: maskCpf(raw),
      confidence: 0.85,
    });
  }

  RG_RE.lastIndex = 0;
  let rm: RegExpExecArray | null;
  while ((rm = RG_RE.exec(text)) !== null) {
    const start = rm.index;
    out.push({
      id: nextId("pii"),
      category: "pii_leak",
      severity: "low",
      snippet: `RG ${rm[0].slice(0, 3)}…`,
      start,
      end: start + rm[0].length,
      explanation: "Possível RG completo — confirme a base legal e mascare se possível.",
      suggested_fix: "",
      confidence: 0.6,
    });
  }

  return out;
}

// ---- Stage B: extração de citações jurídicas em PT-BR ---------------

const CITATION_PATTERNS: Array<{ kind: ExtractedCitation["kind"]; re: RegExp }> = [
  {
    kind: "lei",
    re: /\bLei\s+(?:Complementar\s+|Federal\s+)?(?:n[º°.]?\s*)?(\d[\d.]*(?:\/\d{2,4})?)/gi,
  },
  {
    kind: "sumula",
    re: /\bS[úu]mula(?:\s+Vinculante)?\s+(?:n[º°.]?\s*)?(\d+)(?:\s+(?:do\s+)?(STF|STJ|TST|TSE|TCU))?/gi,
  },
  {
    kind: "recurso",
    re: /\b(RE|REsp|AREsp|AR|RMS|RHC)\s*(?:n[º°.]?\s*)?([\d.]+)(?:\s*\/\s*([A-Z]{2}))?/g,
  },
  {
    kind: "habeas_corpus",
    re: /\bHC\s*(?:n[º°.]?\s*)?([\d.]+)(?:\s*\/\s*([A-Z]{2}))?/g,
  },
  {
    kind: "acao_constitucional",
    re: /\b(ADI|ADPF|ADC|ADO)\s*(?:n[º°.]?\s*)?([\d.]+)/g,
  },
];

export function extractCitations(text: string): ExtractedCitation[] {
  if (!text) return [];
  const out: ExtractedCitation[] = [];
  for (const { kind, re } of CITATION_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const raw = m[0];
      const start = m.index;
      const identifier =
        kind === "recurso" || kind === "acao_constitucional"
          ? `${m[1]} ${m[2]}`.trim()
          : (m[1] ?? "").toString();
      const court =
        kind === "sumula"
          ? (m[2] as string | undefined) ?? null
          : kind === "recurso" || kind === "habeas_corpus"
            ? (m[3] as string | undefined) ?? null
            : null;
      out.push({
        kind,
        raw,
        start,
        end: start + raw.length,
        identifier,
        court,
      });
    }
  }
  // dedup por (kind, identifier, start±5)
  const seen = new Set<string>();
  return out.filter((c) => {
    const key = `${c.kind}:${c.identifier}:${Math.floor(c.start / 5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Merge/dedup de findings (categoria + start±5)
export function mergeFindings(...groups: AuditFinding[][]): AuditFinding[] {
  const all = groups.flat();
  const seen = new Map<string, AuditFinding>();
  for (const f of all) {
    const key = `${f.category}:${Math.floor(f.start / 5)}:${f.end - f.start}`;
    const prev = seen.get(key);
    if (!prev || f.confidence > prev.confidence) seen.set(key, f);
  }
  return Array.from(seen.values()).sort((a, b) => a.start - b.start);
}