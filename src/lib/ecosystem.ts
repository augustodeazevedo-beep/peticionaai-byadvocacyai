import { Briefcase, FileText, GraduationCap, Scale, Target, Wallet, type LucideIcon } from "lucide-react";

export type EcosystemApp = {
  id: "prospect" | "inventaria" | "peticione" | "advoga" | "fin" | "study";
  name: string;
  tagline: string;
  url: string;
  icon: LucideIcon;
  current?: boolean;
};

export const ECOSYSTEM_APPS: EcosystemApp[] = [
  {
    id: "prospect",
    name: "Prospect.AI",
    tagline: "Captação inteligente de clientes",
    url: "https://prospectai-byadvocacyai.lovable.app",
    icon: Target,
  },
  {
    id: "inventaria",
    name: "Inventaria.AI",
    tagline: "Planejamento patrimonial e sucessório",
    url: "https://inventariaai.lovable.app",
    icon: Scale,
  },
  {
    id: "peticione",
    name: "Peticiona.AI",
    tagline: "Petições, minutas e contratos",
    url: "https://peticionaai-byadvocacyai.lovable.app",
    icon: FileText,
    current: true,
  },
  {
    id: "advoga",
    name: "Advoga.AI",
    tagline: "Gestão de processos e escritório",
    url: "https://advogaai-byadvocacy.lovable.app",
    icon: Briefcase,
  },
  {
    id: "fin",
    name: "Fin.AI",
    tagline: "Gestão financeira do escritório",
    url: "https://finai-byadvocacyia.lovable.app",
    icon: Wallet,
  },
  {
    id: "study",
    name: "Study.AI",
    tagline: "Estudo e formação jurídica com IA",
    url: "https://studyai-plataforma.lovable.app",
    icon: GraduationCap,
  },
];