import { Brain, Swords, PenLine, ShieldCheck } from "lucide-react";

const STAGES = [
  {
    icon: Brain,
    title: "Protocolo Cognitivo",
    desc: "Estrutura o caso: fatos, teses, pedidos e provas.",
  },
  {
    icon: Swords,
    title: "Análise Adversarial",
    desc: "Antecipa contra-argumentos e riscos processuais.",
  },
  {
    icon: PenLine,
    title: "Redação Técnica",
    desc: "Gera a peça em padrão ABNT com persona jurídica sênior.",
  },
  {
    icon: ShieldCheck,
    title: "Auditoria Detect.AI",
    desc: "Valida citações, jurisprudência e riscos de alucinação.",
  },
];

export function PipelineDiagram() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {STAGES.map((s, i) => {
        const Icon = s.icon;
        return (
          <div
            key={s.title}
            className="relative rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                Etapa {i + 1}
              </span>
            </div>
            <h3 className="text-sm font-semibold">{s.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
          </div>
        );
      })}
    </div>
  );
}