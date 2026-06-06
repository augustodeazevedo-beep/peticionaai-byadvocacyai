import type { PieceFormData } from "@/lib/cognitiveOs";
import { Scale, Calculator, Mic, Clock, FileText, type LucideIcon } from "lucide-react";

export type QuickCommand = {
  slug: string;
  label: string;
  description: string;
  category: "Trabalhista" | "Cálculo" | "Processual";
  icon: LucideIcon;
  defaults: Partial<PieceFormData>;
};

export const QUICK_COMMANDS: QuickCommand[] = [
  {
    slug: "/contestacao-clt",
    label: "Contestação CLT",
    description:
      "Contestação trabalhista com preliminares + impugnação específica (Art. 341 CPC). Estrutura preparada para defesa de empregador ou empregado.",
    category: "Trabalhista",
    icon: Scale,
    defaults: {
      area: "trabalhista",
      piece_type: "contestacao",
      party_position: "reu",
      title: "Contestação Trabalhista",
      tribunal: "TRT",
      rito: "ordinario",
      fase_processual: "contestacao",
      contexto:
        "Elaborar contestação trabalhista com: (i) preliminares cabíveis (incompetência, prescrição bienal/quinquenal, inépcia, ilegitimidade); (ii) impugnação específica de todos os fatos articulados na inicial (Art. 341 CPC c/c Art. 769 CLT); (iii) prejudiciais de mérito; (iv) mérito propriamente dito com tese central e subsidiárias; (v) impugnação de documentos e protesto por provas.",
      teses_principais:
        "Impugnação específica de cada fato (Art. 341 CPC); inexistência de vínculo / pagamento das verbas / inaplicabilidade do dispositivo invocado; ausência de prova robusta pela parte autora (ônus do Art. 818 CLT).",
    },
  },
  {
    slug: "/liquidacao-adc58",
    label: "Liquidação ADC 58",
    description:
      "Cálculo de liquidação com IPCA-E na fase pré-judicial + SELIC a partir da citação, pós EC 113/21 e julgamento das ADCs 58 e 59 pelo STF.",
    category: "Cálculo",
    icon: Calculator,
    defaults: {
      area: "trabalhista",
      piece_type: "peticao_diversa",
      party_position: "autor",
      title: "Liquidação de Sentença — ADC 58/STF",
      rito: "execucao",
      fase_processual: "liquidacao",
      contexto:
        "Apresentar memória de cálculo para liquidação observando: (i) correção monetária por IPCA-E na fase pré-judicial; (ii) a partir da citação, aplicação da SELIC (que engloba juros e correção), conforme decidido pelo STF nas ADCs 58 e 59; (iii) a partir de 30/08/2024, observância da EC 113/21 (taxa SELIC). Detalhar período, índices aplicados mês a mês e totais por verba.",
      teses_principais:
        "Aplicação obrigatória do entendimento vinculante das ADCs 58/59 e da EC 113/21. Vedação de TR como indexador (declarada inconstitucional).",
    },
  },
  {
    slug: "/audiencia-resumo",
    label: "Resumo de Audiência",
    description:
      "Estrutura técnica para resumo de Audiência de Instrução e Julgamento (AIJ) a partir de transcrição/áudio. Captura depoimentos, controvérsias e impressões para estratégia.",
    category: "Processual",
    icon: Mic,
    defaults: {
      area: "civel",
      piece_type: "peticao_diversa",
      party_position: "autor",
      title: "Resumo de Audiência (AIJ)",
      fase_processual: "instrucao",
      contexto:
        "Gerar resumo executivo de Audiência de Instrução e Julgamento contendo: (i) identificação dos depoentes (partes, testemunhas, peritos); (ii) síntese objetiva de cada depoimento; (iii) contradições e confirmações relevantes; (iv) controvérsias remanescentes; (v) provas produzidas em audiência; (vi) estratégia recomendada para alegações finais. Anexar transcrição/áudio AIJ no contexto.",
      teses_principais:
        "Identificar admissões da parte contrária, vícios procedimentais, e fragilidades probatórias para subsidiar memoriais.",
    },
  },
  {
    slug: "/prazo-cpc",
    label: "Contagem de Prazos",
    description:
      "Cálculo de prazos processuais com dias úteis (Art. 219 CPC), prazo em dobro para Fazenda/MP/Defensoria (Art. 183) e litisconsortes com procuradores distintos (Art. 229 CPC).",
    category: "Processual",
    icon: Clock,
    defaults: {
      area: "civel",
      piece_type: "peticao_diversa",
      party_position: "autor",
      title: "Memorando — Contagem de Prazo Processual",
      contexto:
        "Calcular prazo processual considerando: (i) contagem em dias úteis (Art. 219 CPC); (ii) início no primeiro dia útil seguinte à intimação eficaz; (iii) prazo em dobro do Art. 183 CPC (Fazenda Pública, MP, Defensoria); (iv) prazo em dobro do Art. 229 CPC (litisconsortes com procuradores distintos, autos físicos); (v) suspensão em recesso forense (20/12 a 20/01) e feriados locais. Fornecer data limite com fundamentação artigo a artigo.",
      teses_principais:
        "Tempestividade fundamentada nos Arts. 219, 183 e 229 do CPC.",
    },
  },
  {
    slug: "/calc-rescisao",
    label: "Cálculo de Rescisão",
    description:
      "Memória de cálculo de rescisão contratual trabalhista: aviso prévio, 13º proporcional, férias + 1/3, FGTS + multa 40% e multa do Art. 477 CLT por atraso.",
    category: "Trabalhista",
    icon: FileText,
    defaults: {
      area: "trabalhista",
      piece_type: "peticao_diversa",
      party_position: "autor",
      title: "Cálculo de Verbas Rescisórias",
      tribunal: "TRT",
      contexto:
        "Apurar verbas rescisórias considerando: (i) modalidade de rescisão (dispensa sem justa causa, com justa causa, pedido de demissão, distrato, rescisão indireta); (ii) aviso prévio proporcional (Lei 12.506/11 — 30 dias + 3 dias por ano trabalhado, máximo 90); (iii) 13º salário proporcional; (iv) férias vencidas e proporcionais + 1/3 constitucional; (v) FGTS do mês + multa rescisória de 40%; (vi) multa do Art. 477 §8º CLT em caso de atraso no pagamento; (vii) guias TRCT e CD/SD quando aplicável.",
      teses_principais:
        "Aplicação da Lei 12.506/11 (aviso proporcional), Art. 477 CLT (prazo e multa) e Súmula 462 TST.",
    },
  },
];