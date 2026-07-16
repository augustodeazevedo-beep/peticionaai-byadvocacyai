import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { TutorialSection } from "@/lib/tutorialSections";

type Props = { sections: TutorialSection[] };

export function TutorialSidebar({ sections }: Props) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0.01 },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="Sumário do tutorial" className="sticky top-16">
      <p className="mb-2 px-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
        Sumário
      </p>
      <ol className="space-y-0.5">
        {sections.map((s, idx) => {
          const isActive = active === s.id;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                  isActive
                    ? "bg-secondary/70 text-foreground"
                    : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px]",
                    isActive
                      ? "bg-gradient-brand text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {idx + 1}
                </span>
                <span className="truncate">{s.title}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}