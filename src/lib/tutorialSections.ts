import {
  BookOpen,
  FilePlus,
  Sparkles,
  Library,
  ShieldCheck,
  Palette,
  Gavel,
  LayoutDashboard,
  Cpu,
  KeyRound,
  Plug,
  Rocket,
  type LucideIcon,
} from "lucide-react";

export type TutorialCTA = {
  label: string;
  to: string;
  params?: Record<string, string>;
};

export type TutorialSection = {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  whatIs: string;
  whyMatters: string[];
  howToUse: string[];
  cta?: TutorialCTA;
};

export const TUTORIAL_SECTIONS: TutorialSection[] = [
  {
    id: "logica-base",
    title: "Lógica base",
    subtitle: "O pipeline cognitivo que sustenta cada peça",
    icon: BookOpen,
    whatIs:
      "O Peticiona.AI é uma plataforma AI-native para redação técnica de peças jurídicas. Todo texto passa por um pipeline cognitivo em quatro etapas — Protocolo, Análise Adversarial, Redação e Auditoria — antes de chegar ao editor.",
    whyMatters: [
      "Reduz alucinação: cada citação e fundamento é submetido a checagens automáticas.",
      "Padrão ABNT e formatação pronta para protocolo por padrão.",
      "Zero-knowledge: dados sensíveis podem ser cifrados com chave mestra do usuário.",
    ],
    howToUse: [
      "Comece por Nova Peça e preencha o wizard com os fatos essenciais.",
      "Deixe o pipeline gerar a minuta e revise no editor com o painel de inteligência ao lado.",
      "Antes de exportar, o Detect.AI verifica riscos residuais.",
    ],
  },
  {
    id: "criacao",
    title: "Criação de peças",
    subtitle: "Wizard estratégico e seleção de modelo",
    icon: FilePlus,
    whatIs:
      "Um formulário guiado transforma o caso em contexto estruturado (partes, teses, pedidos, provas, jurisprudência) e alimenta o pipeline cognitivo.",
    whyMatters: [
      "Campos estratégicos capturam nuances que um chat livre perderia.",
      "Modelos reutilizáveis garantem consistência entre peças do mesmo tipo.",
      "Overlay de geração mostra cada etapa do raciocínio em tempo real.",
    ],
    howToUse: [
      "Selecione área e tipo de peça e, se quiser, um modelo da sua biblioteca.",
      "Preencha as seções estratégicas com os fatos e teses do caso.",
      "Gere e acompanhe o pipeline até a minuta ficar pronta no editor.",
    ],
    cta: { label: "Abrir Nova Peça", to: "/pecas/nova" },
  },
  {
    id: "editor",
    title: "Editor & Inteligência",
    subtitle: "Painéis contextuais e exportação profissional",
    icon: Sparkles,
    whatIs:
      "No editor de peça você tem o texto ao centro, o painel de Inteligência (análise adversarial, fundamentos, riscos) e as Notas do Operador ao lado, além de comandos rápidos de reescrita.",
    whyMatters: [
      "Comandos rápidos aceleram tarefas comuns: encurtar, formalizar, fortalecer tese.",
      "Exportação DOCX/PDF já sai com identidade do escritório e formato de protocolo.",
      "Notas do Operador preservam decisões estratégicas para revisões futuras.",
    ],
    howToUse: [
      "Abra qualquer peça pelo Dashboard ou pela busca lateral.",
      "Use o painel de Inteligência para revisar riscos e o de Notas para registrar decisões.",
      "Clique em Exportar quando estiver satisfeito — o Detect.AI validará antes.",
    ],
    cta: { label: "Ver Dashboard", to: "/dashboard" },
  },
  {
    id: "modelos",
    title: "Modelos de Peça",
    subtitle: "Biblioteca reutilizável com placeholders",
    icon: Library,
    whatIs:
      "Modelos são peças-referência com persona, regras e campos variáveis no formato {{placeholder}}. Você cria uma vez e reaproveita em qualquer novo processo.",
    whyMatters: [
      "Padroniza estilo e argumentação por área e tipo de peça.",
      "Acelera drasticamente a produção de peças recorrentes.",
      "Placeholders são preenchidos automaticamente a partir do wizard.",
    ],
    howToUse: [
      "Cadastre modelos com o texto-base e placeholders como {{cliente}} e {{autor}}.",
      "Ao criar uma peça, selecione o modelo no início do fluxo.",
      "Ajuste persona e regras específicas conforme necessidade.",
    ],
    cta: { label: "Abrir Biblioteca", to: "/biblioteca/modelos" },
  },
  {
    id: "detect-ai",
    title: "Detect.AI",
    subtitle: "Auditoria contra alucinação, jailbreak e citações falsas",
    icon: ShieldCheck,
    whatIs:
      "Ferramenta de detecção jurídica em quatro estágios — heurísticas, extração de citações, validação e auditor LLM — que retorna severidade, trecho e correção sugerida.",
    whyMatters: [
      "Bloqueia exportação quando encontra risco acima do limite configurado.",
      "Whitelist por cliente reduz falsos positivos em citações já aprovadas.",
      "Também disponível como página avulsa para auditar qualquer texto colado.",
    ],
    howToUse: [
      "Configure severidade de bloqueio em Configurações → Detect.AI.",
      "Cadastre citações pré-aprovadas na whitelist do escritório.",
      "Use a página do Detect.AI para auditar respostas de outros modelos.",
    ],
    cta: { label: "Abrir Detect.AI", to: "/detect-ai" },
  },
  {
    id: "identidade",
    title: "Identidade do Escritório",
    subtitle: "Brand kit e saída pronta para protocolo",
    icon: Palette,
    whatIs:
      "Cadastre logo, cores, cabeçalho e rodapé do escritório. As exportações DOCX/PDF aplicam essa identidade automaticamente, em formato pronto para protocolo.",
    whyMatters: [
      "Peças saem com a cara do escritório sem trabalho manual de diagramação.",
      "Ativos armazenados em bucket privado com URLs assinadas.",
      "Margens, fontes e espaçamentos seguem padrão ABNT.",
    ],
    howToUse: [
      "Envie logo e defina cores do escritório.",
      "Preencha cabeçalho e rodapé institucionais.",
      "Exporte qualquer peça e valide o resultado no preview A4.",
    ],
    cta: { label: "Configurar identidade", to: "/configuracoes/identidade" },
  },
  {
    id: "jurisprudencia",
    title: "Jurisprudência & CNJ",
    subtitle: "Busca de decisões, jurimetria e metadados oficiais",
    icon: Gavel,
    whatIs:
      "Módulo integrado à base pública do CNJ e a tribunais para buscar decisões, extrair metadados e alimentar o contexto do caso com jurisprudência real.",
    whyMatters: [
      "Reduz risco de citar julgado inexistente.",
      "Jurimetria dá noção quantitativa da tese antes de peticionar.",
      "Metadados do processo são preenchidos automaticamente no wizard.",
    ],
    howToUse: [
      "Busque por tese, órgão ou número de processo.",
      "Selecione decisões relevantes e envie ao contexto da peça.",
      "Use a aba Metadados CNJ para checar dados oficiais.",
    ],
    cta: { label: "Abrir Jurisprudência", to: "/jurisprudencia" },
  },
  {
    id: "workspace",
    title: "Workspace & Assistentes",
    subtitle: "Espaço de raciocínio com bibliotecários especializados",
    icon: Sparkles,
    whatIs:
      "O Workspace é o ambiente de conversa e estudo. Abas para histórico, documentos, modelos e referências. Bibliotecários são assistentes especializados por área.",
    whyMatters: [
      "Explore uma tese antes de comprometer com uma peça formal.",
      "Comandos rápidos aplicam habilidades jurídicas comuns em um clique.",
      "Otimizador de tokens mostra consumo estimado antes de rodar prompts caros.",
    ],
    howToUse: [
      "Abra o Workspace e escolha o bibliotecário adequado à matéria.",
      "Anexe documentos e referências pelas abas superiores.",
      "Use comandos rápidos para reescrever, resumir ou fortalecer trechos.",
    ],
    cta: { label: "Abrir Workspace", to: "/workspace" },
  },
  {
    id: "dashboard",
    title: "Governança & KPIs",
    subtitle: "Produção, uso e preferências de IA",
    icon: LayoutDashboard,
    whatIs:
      "Painel com KPIs de produção (peças, exportações, riscos detectados) e preferências de governança de IA por conta.",
    whyMatters: [
      "Visão clara do ritmo de produção do escritório.",
      "Preferências definem limites e políticas do agente por usuário.",
      "Ajuda a justificar ROI da plataforma internamente.",
    ],
    howToUse: [
      "Acompanhe KPIs no Dashboard semanalmente.",
      "Ajuste preferências de IA em Configurações → IA.",
      "Combine com Detect.AI para métricas de qualidade.",
    ],
    cta: { label: "Ver Dashboard", to: "/dashboard" },
  },
  {
    id: "seguranca",
    title: "Segurança & Chave Mestra",
    subtitle: "Zero-knowledge e certificado A1",
    icon: KeyRound,
    whatIs:
      "Defina uma passphrase mestra para cifrar dados sensíveis (como o certificado A1 para protocolo) com AES-256-GCM diretamente no navegador. A plataforma nunca vê a chave em claro.",
    whyMatters: [
      "Conformidade com LGPD por design.",
      "Certificados A1 ficam cifrados em repouso.",
      "Só você pode desbloquear os dados sigilosos.",
    ],
    howToUse: [
      "Cadastre sua passphrase em Configurações → Segurança.",
      "Faça upload do certificado A1 quando quiser protocolar.",
      "Guarde a passphrase com segurança — ela não pode ser recuperada.",
    ],
    cta: { label: "Configurar segurança", to: "/configuracoes/seguranca" },
  },
  {
    id: "ia",
    title: "Configurações de IA",
    subtitle: "Modelos, persona e limites",
    icon: Cpu,
    whatIs:
      "Escolha o comportamento padrão do agente: persona jurídica, tom, limites e políticas de recusa. Aplicado a todas as gerações do usuário.",
    whyMatters: [
      "Alinha a saída ao estilo do escritório.",
      "Evita retrabalho por tom inadequado.",
      "Convive com o Detect.AI para segurança de conteúdo.",
    ],
    howToUse: [
      "Abra Configurações → IA.",
      "Defina persona e políticas.",
      "Salve e teste em uma nova peça.",
    ],
    cta: { label: "Abrir Configurações de IA", to: "/configuracoes/ia" },
  },
  {
    id: "integracoes",
    title: "Integrações & MCP",
    subtitle: "Ecossistema Advocacy.AI e agentes externos",
    icon: Plug,
    whatIs:
      "O Peticiona.AI expõe um servidor MCP (Model Context Protocol) com 11 ferramentas para que assistentes externos leiam, criem e auditem peças, além de integrar com Advoga.AI e Inventaria.AI.",
    whyMatters: [
      "Automatize fluxos com seu agente preferido (Claude, ChatGPT, etc.).",
      "Compartilha contexto entre produtos do ecossistema Advocacy.AI.",
      "Todas as chamadas respeitam RLS por usuário.",
    ],
    howToUse: [
      "Conecte seu agente MCP com a URL do projeto.",
      "Use as ferramentas list/get/create/update/audit conforme o caso.",
      "Acompanhe execuções pelo Dashboard.",
    ],
  },
  {
    id: "proximos-passos",
    title: "Próximos passos",
    subtitle: "Checklist de onboarding",
    icon: Rocket,
    whatIs:
      "Um caminho curto para tirar o Peticiona.AI do zero à primeira peça protocolo-ready.",
    whyMatters: [
      "Ganho rápido: sua primeira peça em menos de 15 minutos.",
      "Configure uma vez, colha resultado em todas as peças seguintes.",
      "Prepara o terreno para automações via MCP.",
    ],
    howToUse: [
      "1. Configure identidade do escritório.",
      "2. Cadastre 1 ou 2 modelos que você mais usa.",
      "3. Crie sua primeira peça pelo wizard e exporte.",
    ],
    cta: { label: "Começar agora", to: "/pecas/nova" },
  },
];