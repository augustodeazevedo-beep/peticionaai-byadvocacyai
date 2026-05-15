import { Briefcase, FileText, GraduationCap, Landmark, Scale, Wallet, type LucideIcon } from "lucide-react";

export type EcosystemApp = {
  id: "advocase" | "advoga" | "peticione" | "inventaria" | "fin" | "study";
  name: string;
  category: string;
  tagline: string;
  url: string;
  icon: LucideIcon;
  current?: boolean;
};

export const ECOSYSTEM_APPS: EcosystemApp[] = [
  {
    id: "advocase",
    name: "Advocase.AI",
    category: "CRM · SDR",
    tagline: "Capte, qualifique e converta clientes com inteligência preditiva.",
    url: "https://advocaseai-byadvocacyai.lovable.app",
    icon: Briefcase,
  },
  {
    id: "advoga",
    name: "Advoga.AI",
    category: "Gestão",
    tagline: "Processos, prazos e escritório operando em fluxo contínuo.",
    url: "https://advogaai-byadvocacyai.lovable.app",
    icon: Scale,
  },
  {
    id: "peticione",
    name: "Peticiona.AI",
    category: "Documental",
    tagline: "Petições, minutas e contratos gerados em minutos, sob seu padrão.",
    url: "https://peticionaai-byadvocacyai.lovable.app",
    icon: FileText,
    current: true,
  },
  {
    id: "inventaria",
    name: "Inventaria.AI",
    category: "Patrimonial",
    tagline: "Planejamento sucessório e patrimonial guiado por dados.",
    url: "https://inventariaai-byadvocacyai.lovable.app",
    icon: Landmark,
  },
  {
    id: "fin",
    name: "Fin.AI",
    category: "Financeiro",
    tagline: "Conciliação, honorários e fluxo de caixa em tempo real.",
    url: "https://finai-byadvocacyai.lovable.app",
    icon: Wallet,
  },
  {
    id: "study",
    name: "Study.AI",
    category: "Educação",
    tagline: "Estudos jurídicos personalizados com IA adaptativa.",
    url: "https://studyai-byadvocacyai.lovable.app",
    icon: GraduationCap,
  },
];