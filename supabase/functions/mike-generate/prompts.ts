// Prompt builders for the cognitive pipeline.
// Pure functions, no Deno imports — safe to test with deno test.

/* eslint-disable */
type AnyConfig = Record<string, any>;

const list = (arr: unknown): string =>
  Array.isArray(arr) ? arr.map((x) => `- ${x}`).join("\n") : "";

function block(title: string, body: string): string {
  if (!body || !body.trim()) return "";
  return `### ${title}\n${body.trim()}`;
}

/**
 * Persona dinâmica baseada na area da peça. Cai no civel se desconhecida.
 */
export function buildPersona(cfg: AnyConfig, area: string | null | undefined): string {
  const examples = cfg?.dynamic_persona_engine?.examples ?? {};
  const key = (area ?? "civel").toLowerCase();
  const persona = examples[key] ?? examples["civel"] ?? "Advogado generalista";
  const rules = cfg?.dynamic_persona_engine?.rules ?? [];
  return [
    `Atue como: **${persona}**.`,
    rules.length ? `Regras de adaptação:\n${list(rules)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Bloco do tribunal. Tenta match exato; se não houver, usa fallback genérico.
 */
export function buildTribunal(cfg: AnyConfig, tribunal: string | null | undefined): string {
  const profiles = cfg?.tribunal_adaptation_engine?.profiles ?? {};
  if (!tribunal) return "";
  const upper = tribunal.toUpperCase();
  // Tentar match exato ou começar-com (TJRS, TJSP, TRT2, etc).
  const key = Object.keys(profiles).find((k) => upper === k || upper.startsWith(k));
  if (!key) return `Tribunal indicado: ${tribunal}. Adapte estilo e foco a esse tribunal.`;
  const p = profiles[key];
  return `Tribunal: **${tribunal}** (perfil ${key}).\nEstilo: ${p.style}\nFoco:\n${list(p.focus)}`;
}

export function buildAntiHallucination(cfg: AnyConfig): string {
  const a = cfg?.anti_hallucination_protocol;
  if (!a?.enabled) return "";
  const rules = a.absolute_prohibitions ?? [];
  const fallbacks = a.fallback_rules ?? {};
  const fbList = Object.entries(fallbacks).map(([k, v]) => `- Quando ${k}: usar "${v}"`);
  return [
    "### Controle Antialucinação (PROIBIÇÕES ABSOLUTAS)",
    list(rules),
    fbList.length ? `\n**Fallbacks obrigatórios:**\n${fbList.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildEvidence(cfg: AnyConfig): string {
  const e = cfg?.evidence_engine;
  if (!e) return "";
  return [
    "### Engine de Provas",
    `Classificações: ${(e.classification ?? []).join(", ")}`,
    list(e.mandatory_rules ?? []),
    `Padrão de citação: ${(e.citation_pattern ?? []).join(" | ")}`,
  ].join("\n");
}

export function buildJurisprudence(cfg: AnyConfig): string {
  const j = cfg?.jurisprudence_engine;
  if (!j) return "";
  return [
    "### Engine de Jurisprudência",
    `Ordem de prioridade:\n${list(j.priority_order ?? [])}`,
    `Regras:\n${list(j.mandatory_rules ?? [])}`,
    `Quando faltar julgado, use literalmente: \`${j.fallback_message ?? "[INSERIR JURISPRUDÊNCIA]"}\``,
  ].join("\n");
}

export function buildNarrative(cfg: AnyConfig): string {
  return block("Engine Narrativa", list(cfg?.narrative_engine?.rules ?? []));
}

export function buildStructure(cfg: AnyConfig): string {
  const s = cfg?.petition_structure?.mandatory_sections ?? [];
  if (!s.length) return "";
  return `### Estrutura obrigatória da peça\n${s.map((x: string, i: number) => `${i + 1}. ${x}`).join("\n")}`;
}

export function buildFormatting(cfg: AnyConfig): string {
  const f = cfg?.formatting_rules;
  if (!f) return "";
  return [
    "### Formatação (markdown reflete a peça final)",
    `Fonte: ${f.font} ${f.font_size}pt, espaço ${f.line_spacing}, alinhamento ${f.alignment}.`,
    `Recuo de 1ª linha: ${f.first_line_indent}. Citação longa: ${f.long_quote_indent}, fonte ${f.long_quote_font_size}pt.`,
    `Hierarquia de títulos (markdown): # primário, ## secundário, ### subtítulo.`,
  ].join("\n");
}

export function buildCompliance(cfg: AnyConfig): string {
  return block("Compliance", list(cfg?.compliance_engine?.mandatory_rules ?? []));
}

export function buildPriority(cfg: AnyConfig): string {
  const p = cfg?.instruction_priority ?? [];
  if (!p.length) return "";
  return `### Prioridade de instruções (em conflito, vence o de cima)\n${p
    .map((x: string, i: number) => `${i + 1}. ${x}`)
    .join("\n")}`;
}

/* ===========================================================
 * System prompts por etapa
 * =========================================================== */

export function systemPromptCognitive(cfg: AnyConfig): string {
  const steps = cfg?.cognitive_protocol?.mandatory_steps ?? [];
  return [
    cfg?.system_identity?.purpose ?? "",
    buildPriority(cfg),
    buildAntiHallucination(cfg),
    "### Sua tarefa",
    "Aplique o Protocolo Cognitivo abaixo aos dados fornecidos pelo operador. Devolva um JSON estruturado via tool call. Não invente — se não houver evidência, indique explicitamente.",
    list(steps),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function systemPromptAdversarial(cfg: AnyConfig): string {
  const ins = cfg?.adversarial_analysis?.instructions ?? [];
  return [
    cfg?.system_identity?.purpose ?? "",
    buildAntiHallucination(cfg),
    "### Análise Adversarial",
    "Com base no mapeamento cognitivo já produzido, simule a parte contrária e o magistrado. Devolva JSON via tool call.",
    list(ins),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function systemPromptDraft(
  cfg: AnyConfig,
  area: string | null | undefined,
  tribunal: string | null | undefined,
): string {
  return [
    cfg?.system_identity?.purpose ?? "",
    buildPersona(cfg, area),
    buildTribunal(cfg, tribunal),
    buildPriority(cfg),
    buildAntiHallucination(cfg),
    buildEvidence(cfg),
    buildJurisprudence(cfg),
    buildNarrative(cfg),
    buildStructure(cfg),
    buildFormatting(cfg),
    buildCompliance(cfg),
    "### Saída",
    "Produza a peça processual completa em **Markdown**, pronta para revisão e exportação. Não inclua JSON nem comentários fora do texto da peça. Não anexe seções de checklist nem notas — isso será feito em etapa separada.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function systemPromptAudit(cfg: AnyConfig): string {
  const checklist = cfg?.internal_audit_engine?.checklist ?? [];
  const finalCk = cfg?.final_checklist ?? [];
  const noteItems = cfg?.operator_notes?.items ?? [];
  return [
    "Você é um auditor jurídico interno. Receba a peça redigida e o mapeamento cognitivo e produza a auditoria final.",
    `Checklist interno:\n${list(checklist)}`,
    `Checklist final (rastreabilidade):\n${list(finalCk)}`,
    `Itens das notas ao operador:\n${list(noteItems)}`,
    "Devolva JSON via tool call. Marque cada item do checklist com status ok|alerta|critico e nota curta.",
  ].join("\n\n");
}

/* ===========================================================
 * Tool schemas (function calling) — JSON Schema
 * =========================================================== */

export const cognitiveTool = {
  type: "function",
  function: {
    name: "register_cognitive_map",
    description: "Registra o mapeamento cognitivo dos autos.",
    parameters: {
      type: "object",
      properties: {
        rito: { type: "string" },
        competencia: { type: "string" },
        fase_processual: { type: "string" },
        controversias: { type: "array", items: { type: "string" } },
        fatos_incontroversos: { type: "array", items: { type: "string" } },
        timeline: {
          type: "array",
          items: {
            type: "object",
            properties: { date: { type: "string" }, event: { type: "string" } },
            required: ["event"],
          },
        },
        provas_classificadas: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              classification: { type: "string" },
              argument: { type: "string" },
            },
            required: ["description", "classification"],
          },
        },
        riscos_processuais: { type: "array", items: { type: "string" } },
        riscos_recursais: { type: "array", items: { type: "string" } },
        teses_principais: { type: "array", items: { type: "string" } },
        teses_subsidiarias: { type: "array", items: { type: "string" } },
      },
    },
  },
} as const;

export const adversarialTool = {
  type: "function",
  function: {
    name: "register_adversarial",
    description: "Registra a análise adversarial.",
    parameters: {
      type: "object",
      properties: {
        argumentos_contrarios: { type: "array", items: { type: "string" } },
        vulnerabilidades: { type: "array", items: { type: "string" } },
        fragilidades_probatorias: { type: "array", items: { type: "string" } },
        antecipacao_juiz: { type: "array", items: { type: "string" } },
        neutralizacoes: { type: "array", items: { type: "string" } },
        riscos_improcedencia: { type: "array", items: { type: "string" } },
      },
    },
  },
} as const;

export const auditTool = {
  type: "function",
  function: {
    name: "register_audit",
    description: "Registra a auditoria interna e notas ao operador.",
    parameters: {
      type: "object",
      properties: {
        checklist_final: {
          type: "array",
          items: {
            type: "object",
            properties: {
              item: { type: "string" },
              status: { type: "string", enum: ["ok", "alerta", "critico"] },
              nota: { type: "string" },
            },
            required: ["item", "status"],
          },
        },
        operator_notes: { type: "array", items: { type: "string" } },
        risco_geral: { type: "string", enum: ["baixo", "medio", "alto"] },
        lacunas: { type: "array", items: { type: "string" } },
        placeholders: { type: "array", items: { type: "string" } },
      },
    },
  },
} as const;
