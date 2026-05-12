import { useVisualLawStore } from "@/stores/visualLaw";
import { Loader2 } from "lucide-react";

export function StreamingIndicator() {
  const isStreaming = useVisualLawStore((s) => s.isGenerating);
  const buffer = useVisualLawStore((s) => s.streamBuffer);
  const error = useVisualLawStore((s) => s.generationError);

  if (error) {
    return (
      <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        {error}
      </div>
    );
  }
  if (!isStreaming) return null;
  return (
    <div className="flex items-center gap-2 rounded border border-border/50 bg-card/50 px-3 py-2 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" />
      <span>Gerando... {buffer.length} caracteres recebidos</span>
    </div>
  );
}