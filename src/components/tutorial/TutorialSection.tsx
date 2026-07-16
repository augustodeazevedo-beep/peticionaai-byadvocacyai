import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TutorialSection as TS } from "@/lib/tutorialSections";

type Props = { section: TS; index: number };

export function TutorialSection({ section, index }: Props) {
  const Icon = section.icon;
  return (
    <section
      id={section.id}
      className="scroll-mt-20 rounded-2xl border border-border/60 bg-card/40 p-6"
    >
      <header className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Módulo {String(index).padStart(2, "0")}
          </p>
          <h2 className="text-xl font-semibold leading-tight">{section.title}</h2>
          <p className="text-sm text-muted-foreground">{section.subtitle}</p>
        </div>
      </header>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-accent">O que é</h3>
          <p className="mt-2 text-sm text-muted-foreground">{section.whatIs}</p>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-accent">
            Por que importa
          </h3>
          <ul className="mt-2 space-y-1.5">
            {section.whyMatters.map((b) => (
              <li key={b} className="flex gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-accent">
            Como usar
          </h3>
          <ol className="mt-2 space-y-1.5">
            {section.howToUse.map((step, i) => (
              <li key={step} className="flex gap-2 text-sm text-muted-foreground">
                <span className="font-mono text-[10px] text-accent">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {section.cta && (
        <div className="mt-5 flex justify-end">
          <Button asChild size="sm" className="bg-gradient-brand text-primary-foreground">
            <Link to={section.cta.to}>
              {section.cta.label}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}