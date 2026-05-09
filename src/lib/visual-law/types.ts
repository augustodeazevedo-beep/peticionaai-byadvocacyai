export type VisualLawStyle = {
  template: "sem-template" | "minimal" | "editorial" | "corporate";
  font: "Helvetica" | "Times-Roman" | "Courier";
  color_palette: "neutra" | "personalizada" | "azul" | "verde" | "violeta";
  custom_primary?: string | null;
  custom_accent?: string | null;
  direction: "organizar" | "explicar" | "mais_visual";
  density: "enxuto" | "padrao" | "confortavel";
  extra_instructions?: string | null;
  elements: {
    capa?: boolean;
    sumario?: boolean;
    quadros?: boolean;
    timeline?: boolean;
    infograficos?: boolean;
    quoteCards?: boolean;
    numeracao?: boolean;
  };
};

export const DEFAULT_STYLE: VisualLawStyle = {
  template: "sem-template",
  font: "Helvetica",
  color_palette: "neutra",
  custom_primary: null,
  custom_accent: null,
  direction: "explicar",
  density: "padrao",
  extra_instructions: "",
  elements: {
    capa: true,
    sumario: false,
    quadros: true,
    timeline: true,
    infograficos: false,
    quoteCards: true,
    numeracao: true,
  },
};

export type Palette = { primary: string; accent: string; muted: string; bg: string; text: string };

export function resolvePalette(style: VisualLawStyle): Palette {
  if (style.color_palette === "personalizada") {
    return {
      primary: style.custom_primary || "#0f172a",
      accent: style.custom_accent || "#06b6d4",
      muted: "#64748b",
      bg: "#ffffff",
      text: "#0f172a",
    };
  }
  switch (style.color_palette) {
    case "azul":
      return { primary: "#1e3a8a", accent: "#3b82f6", muted: "#64748b", bg: "#ffffff", text: "#0f172a" };
    case "verde":
      return { primary: "#14532d", accent: "#10b981", muted: "#64748b", bg: "#ffffff", text: "#0f172a" };
    case "violeta":
      return { primary: "#4c1d95", accent: "#8b5cf6", muted: "#64748b", bg: "#ffffff", text: "#0f172a" };
    default:
      return { primary: "#0f172a", accent: "#475569", muted: "#64748b", bg: "#ffffff", text: "#0f172a" };
  }
}

export function densityToSizes(d: VisualLawStyle["density"]) {
  switch (d) {
    case "enxuto":
      return { base: 9.5, h1: 16, h2: 13, h3: 11, line: 1.35, gap: 6 };
    case "confortavel":
      return { base: 12, h1: 22, h2: 17, h3: 14, line: 1.7, gap: 12 };
    default:
      return { base: 11, h1: 19, h2: 15, h3: 12.5, line: 1.55, gap: 9 };
  }
}