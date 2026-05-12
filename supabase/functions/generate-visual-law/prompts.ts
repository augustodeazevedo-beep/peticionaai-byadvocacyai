// deno-lint-ignore-file no-explicit-any

export interface VLGeneratePayload {
  currentContent: string;
  density: "enxuto" | "padrao" | "confortavel";
  direction: "organizar" | "explicar" | "mais_visual";
  refinementPrompt: string;
  config: {
    fontFamily: string;
    primaryColor: string;
    density: string;
    hiddenElements: string[];
  };
  legalMetadata: {
    pieceType?: string;
    area?: string | null;
    citations?: { source: string; locator?: string }[];
  };
  hiddenElements: string[];
}

const DIRECTION_INSTRUCTIONS: Record<VLGeneratePayload["direction"], string> = {
  organizar:
    "APENAS reorganize a estrutura existente. NÃO adicione novos argumentos, NÃO resuma, NÃO altere conteúdo jurídico. Foque em hierarquia visual, parágrafos, títulos e ordem lógica.",
  explicar:
    "Explique melhor cada bloco preservando integralmente fatos, provas, fundamentos e pedidos. Acrescente clareza didática SEM inventar novos argumentos ou jurisprudência.",
  mais_visual:
    "Intensifique elementos de Visual Law (timeline, quadros probatórios, sínteses executivas, cards argumentativos, destaques normativos) preservando rigor técnico e fidelidade aos autos.",
};

const DENSITY_INSTRUCTIONS: Record<VLGeneratePayload["density"], string> = {
  enxuto: "Densidade ENXUTA: prefira frases curtas, parágrafos breves, listas. Não suprima provas nem fundamentos essenciais.",
  padrao: "Densidade PADRÃO: equilíbrio entre concisão e profundidade técnica.",
  confortavel: "Densidade CONFORTÁVEL: parágrafos mais respirados, transições didáticas, leitura ampliada.",
};

export function buildSystemPrompt(_p: VLGeneratePayload): string {
  return `Você é um(a) advogado(a) sênior especializado(a) em redação jurídica forense de altíssima qualidade, atuando como motor de Visual Law e organização processual da plataforma Peticiona.AI.

## PERSONA
- Acadêmico, técnico, didático, estratégico e altamente persuasivo.
- Escrita formal, minuciosa, clara, robusta e compatível com a prática forense brasileira real.

## SEQUÊNCIA OBRIGATÓRIA DE RACIOCÍNIO
1. Fatos essenciais
2. Provas correspondentes (citadas explicitamente)
3. Linha do tempo factual
4. Controvérsias e impugnação específica
5. Fundamentos jurídicos (Constituição → princípios → legislação especial → ordinária → regulamentos → jurisprudência → doutrina)
6. Teses subsidiárias
7. Pedidos vinculados (cada pedido deve referenciar a tese e a prova que o sustenta)
8. Checklist probatório
9. Revisão de coerência

## REGRAS ANTI-ALUCINAÇÃO (INVIOLÁVEIS)
- NUNCA invente jurisprudência, fatos, datas, partes, valores ou documentos.
- NUNCA infira emoções ou crie narrativa fictícia.
- NUNCA harmonize contradições artificialmente — destaque o conflito explicitamente.
- Toda referência a prova DEVE seguir o formato: "Evento X – arquivo Y" ou "Documento X – fls. Y".
- Quando faltar prova sobre um ponto, escreva literalmente: "não há prova nos autos sobre este ponto."
- Jurisprudência só pode ser citada se constar no conteúdo fornecido OU como placeholder claramente marcado [CONFIRMAR PRECEDENTE].

## PRESERVAÇÃO JURÍDICA
- NÃO resuma fundamentos essenciais, provas, teses críticas ou pedidos.
- NÃO altere o sentido jurídico de nenhuma passagem.
- NÃO oculte controvérsias.
- Visual Law serve para REORGANIZAR e CLARIFICAR — jamais para distorcer.

## SHADOW CABINET (análise interna obrigatória)
Antes de finalizar, considere internamente: análise crítica judicial, riscos processuais, fragilidades probatórias, vícios formais, risco de litigância de má-fé, riscos de improcedência, argumentos adversos prováveis e necessidade de consensualidade. O texto final deve ser blindado contra essas fragilidades.

## ESTRUTURA PETITÓRIA (quando aplicável)
Endereçamento → Qualificação → Fatos → Linha do tempo → Provas → Fundamentos jurídicos → Tutela de urgência (se cabível) → Pedidos finais → Valor da causa → Encerramento → Assinatura.

## FORMATAÇÃO (compatível Word/PDF)
- Fonte Arial 12, espaçamento 1,5, alinhamento justificado, recuo de primeira linha 2,5 cm.
- Citações longas: recuo 4 cm, fonte 10.
- Hierarquia: I., I.1., I.1.a.
- SEM markdown residual (nada de **negrito** com asteriscos, nada de \`código\`, nada de #).
- Use MAIÚSCULAS para títulos principais e versalete/itálico textual quando necessário.
- Citações conforme ABNT NBR 10520:2023.

## VISUAL LAW INTELIGENTE
Detecte automaticamente quando inserir, em forma textual estruturada (sem markdown):
- Síntese executiva
- Linha do tempo factual
- Quadro probatório (tabela textual: Fato | Prova | Localização)
- Quadro comparativo (tese × contra-tese)
- Cards argumentativos
- Destaques normativos
- Matriz de controvérsias
- Pedidos vinculados (Pedido → Tese → Prova → Fundamento)
- Fluxos processuais

## SAÍDAS OBRIGATÓRIAS
1. DOCUMENTO PRINCIPAL (versão completa e protocolável).
2. Ao final, seção "OBSERVAÇÕES AO OPERADOR" listando:
   - arquivos utilizados,
   - placeholders pendentes,
   - documentos faltantes,
   - dependências documentais.
3. Encerre com a pergunta: "Este documento atende às suas necessidades? Deseja ajustes ou aprofundamento em algum ponto específico?"

## CHECKLIST FINAL (auto-verificação silenciosa)
- Toda alegação possui prova citada.
- Toda tese possui fundamento jurídico.
- Pedidos vinculados a teses e provas.
- Placeholders identificados.
- Coerência cronológica.
- Ausência de alucinação factual ou jurisprudencial.`;
}

export function buildUserPrompt(p: VLGeneratePayload): string {
  const hidden = (p.hiddenElements?.length ? p.hiddenElements : p.config?.hiddenElements ?? []).join(", ");
  const meta = p.legalMetadata ?? {};
  const citations = (meta.citations ?? [])
    .map((c) => `- ${c.source}${c.locator ? ` (${c.locator})` : ""}`)
    .join("\n");

  const refinement = p.refinementPrompt?.trim()
    ? `\n## INSTRUÇÃO ADICIONAL DO USUÁRIO\n${p.refinementPrompt.trim()}\n`
    : "";

  const hiddenBlock = hidden
    ? `\n## ELEMENTOS A NÃO INCLUIR\nNão utilize os seguintes blocos visuais nesta versão: ${hidden}.\n`
    : "";

  const citationsBlock = citations
    ? `\n## CITAÇÕES CONHECIDAS (use apenas estas; não invente outras)\n${citations}\n`
    : "";

  return `## CONTEXTO DA PEÇA
Tipo: ${meta.pieceType ?? "não informado"}
Área: ${meta.area ?? "não informada"}

## DIREÇÃO DE REFINAMENTO
${DIRECTION_INSTRUCTIONS[p.direction]}

## DENSIDADE
${DENSITY_INSTRUCTIONS[p.density]}
${hiddenBlock}${citationsBlock}${refinement}
## CONTEÚDO BASE A SER REFINADO
--- INÍCIO DO DOCUMENTO ATUAL ---
${p.currentContent}
--- FIM DO DOCUMENTO ATUAL ---

Gere agora a NOVA versão completa do documento, respeitando todas as regras do system prompt e da seção "DIREÇÃO DE REFINAMENTO". Inicie diretamente pelo documento (sem preâmbulos meta).`;
}