import { BrandLockup } from "@/components/Logo";
import { PipelineDiagram } from "./PipelineDiagram";

export function TutorialHero() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-brand opacity-20 blur-3xl" />
      <div className="relative">
        <div className="mb-4 flex items-center gap-3">
          <BrandLockup size="sm" variant="horizontal" />
          <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-accent">
            Tutorial
          </span>
        </div>
        <h1 className="max-w-3xl text-2xl font-semibold leading-tight md:text-3xl">
          Como o <span className="text-gradient-brand">Peticiona.AI</span> trabalha por você
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Uma plataforma AI-native para redação técnica de peças jurídicas. Cada minuta atravessa
          um pipeline cognitivo de quatro etapas — do protocolo à auditoria — para entregar
          eficiência, segurança e qualidade em conformidade com a LGPD.
        </p>

        <div className="mt-6">
          <PipelineDiagram />
        </div>
      </div>
    </section>
  );
}