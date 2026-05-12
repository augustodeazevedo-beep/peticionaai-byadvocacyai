import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { useVisualLawStore } from "@/stores/visualLaw";
import { Card } from "@/components/ui/card";
import { StreamingCursor } from "./StreamingCursor";

const DENSITY_CLASS: Record<string, string> = {
  enxuto: "leading-snug space-y-2 text-[14px]",
  padrao: "leading-relaxed space-y-3 text-[15px]",
  confortavel: "leading-loose space-y-4 text-[16px]",
};

export function DocumentViewer() {
  const content = useVisualLawStore((s) => s.documentContent);
  const config = useVisualLawStore((s) => s.documentConfig);
  const isStreaming = useVisualLawStore((s) => s.isGenerating);

  const blocks = useMemo(() => content.split(/\n\n+/), [content]);
  const densityClass = DENSITY_CLASS[config.density] ?? DENSITY_CLASS.padrao;

  return (
    <Card
      className="glass border-border/50 p-8 min-h-[60vh]"
      style={
        {
          fontFamily: config.fontFamily,
          ["--vl-primary" as string]: config.primaryColor,
        } as React.CSSProperties
      }
      aria-busy={isStreaming}
      aria-live="polite"
    >
      <article
        className={`prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-li:text-foreground/90 prose-headings:[color:var(--vl-primary)] ${densityClass}`}
      >
        {content.length === 0 && !isStreaming && (
          <p className="text-sm text-muted-foreground italic">
            Nenhum conteúdo ainda. Configure a sidebar e clique em "Gerar".
          </p>
        )}
        {blocks.map((b, i) => (
          <ReactMarkdown key={i}>{b}</ReactMarkdown>
        ))}
        {isStreaming && <StreamingCursor />}
      </article>
    </Card>
  );
}