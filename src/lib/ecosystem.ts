import { Briefcase, FileText, Scale, Wallet, type LucideIcon } from "lucide-react";

export type EcosystemApp = {
  id: "inventaria" | "peticione" | "advoga" | "fin";
  name: string;
  tagline: string;
  url: string;
  icon: LucideIcon;
  current?: boolean;
};

// Stable Lovable URLs (project--{id}.lovable.app) never break on rename.
export const ECOSYSTEM_APPS: EcosystemApp[] = [
  {
    id: "inventaria",
    name: "Inventaria.AI",
    tagline: "Planejamento patrimonial e sucessório",
    url: "https://project--3d5018fd-106f-43cc-8551-99851a671c0e.lovable.app",
    icon: Scale,
  },
  {
    id: "peticione",
    name: "Peticiona.AI",
    tagline: "Petições, minutas e contratos",
    url: "https://project--f24689d9-a0bb-45f5-9ec2-db0693486e13.lovable.app",
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
    url: "https://project--baeca359-2d19-4855-87bc-8f4f0de7344d.lovable.app",
    icon: Wallet,
  },
];