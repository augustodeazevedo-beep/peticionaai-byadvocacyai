// deno-lint-ignore-file no-explicit-any

export interface VLAnalyzePayload {
  content: string;
  direction: "organizar" | "explicar" | "mais_visual";
  legalMetadata: {
    pieceType?: string;
    area?: string | null;
    citations?: { source: string; locator?: string }[];
  };
}

export function buildSystemPrompt(): string {
  return [
    "Você é um auditor jurídico sênior especializado em peças processuais brasileiras.",
    "Sua tarefa é AUDITAR o documento fornecido sob duas óticas: VALIDAÇÃO JURÍDICA e ANÁLISE DE RISCO.",
    "Não reescreva o documento. Não faça sugestões estilísticas. Apenas identifique problemas concretos.",
    "Seja específico, técnico e conciso. Cada item de lista deve ser uma frase curta e acionável (máx. 240 caracteres).",
    "Se não houver apontamentos para uma categoria, retorne array vazio — nunca invente problemas.",
    "Responda EXCLUSIVAMENTE no formato JSON do schema solicitado, sem comentários ou texto fora do JSON.",
  ].join(" ");
}

export function buildUserPrompt(payload: VLAnalyzePayload): string {
  const { content, direction, legalMetadata } = payload;
  const meta = [
    legalMetadata.pieceType ? `Tipo de peça: ${legalMetadata.pieceType}` : null,
    legalMetadata.area ? `Área: ${legalMetadata.area}` : null,
    `Direção da última geração: ${direction}`,
  ].filter(Boolean).join("\n");

  return [
    "Audite o documento abaixo e retorne JSON com EXATAMENTE estas chaves no nível raiz:",
    "validation: { alegacoesSemProva: string[], tesesSemFundamento: string[], pedidosOrfaos: string[], placeholders: string[] }",
    "risk: { fragilidadesProbatorias: string[], viciosFormais: string[], riscosImprocedencia: string[], argumentosAdversos: string[] }",
    "",
    "Definições:",
    "- alegacoesSemProva: fatos afirmados sem indicação de prova nos autos.",
    "- tesesSemFundamento: teses jurídicas sem citação de norma, doutrina ou jurisprudência.",
    "- pedidosOrfaos: pedidos sem causa de pedir clara ou sem fundamento que os sustente.",
    "- placeholders: marcadores não preenchidos como [NOME], XXX, lacunas óbvias.",
    "- fragilidadesProbatorias: provas frágeis, indiretas ou contestáveis.",
    "- viciosFormais: erros formais (legitimidade, competência, prazo, requisitos da inicial).",
    "- riscosImprocedencia: pontos que tornam o pedido vulnerável a improcedência.",
    "- argumentosAdversos: contra-argumentos prováveis da parte contrária.",
    "",
    "Contexto:",
    meta,
    "",
    "DOCUMENTO:",
    "<<<",
    content,
    ">>>",
  ].join("\n");
}
