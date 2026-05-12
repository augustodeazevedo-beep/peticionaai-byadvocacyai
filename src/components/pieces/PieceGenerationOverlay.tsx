import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";
import type { CognitiveStep } from "@/lib/mikeClient";

export type StepState = "pending" | "running" | "done" | "degraded" | "error";

const STEP_LABELS: Record<CognitiveStep, string> = {
  cognitive: "Mapeando autos",
  adversarial: "Análise adversarial",
  draft: "Redigindo a peça",
  audit: "Auditoria final",
};

const ORDER: CognitiveStep[] = ["cognitive", "adversarial", "draft", "audit"];

type Props = {
  open: boolean;
  steps: Record<CognitiveStep, StepState>;
  draftPreview?: string;
  onCancel?: () => void;
};

export function PieceGenerationOverlay({ open, steps, draftPreview, onCancel }: Props) {
  if (!open) return null;
  const previewTail = (draftPreview ?? "").slice(-2400);

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass border border-border/50 rounded-2xl p-6 max-w-2xl w-full space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Sistema Operacional Jurídico Cognitivo</h3>
            <p className="text-sm text-muted-foreground">
              Pipeline em 4 etapas com controle antialucinação e auditoria interna.
            </p>
          </div>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
          )}
        </div>

        <ol className="space-y-2">
          {ORDER.map((step, i) => {
            const state = steps[step];
            return (
              <li key={step} className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full border border-border/60 flex items-center justify-center shrink-0">
                  {state === "running" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />
                  ) : state === "done" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : state === "degraded" ? (
                    <Check className="h-3.5 w-3.5 text-amber-400" />
                  ) : state === "error" ? (
                    <X className="h-3.5 w-3.5 text-red-400" />
                  ) : (
                    <span className="text-xs text-muted-foreground">{i + 1}</span>
                  )}
                </span>
                <span
                  className={
                    state === "pending"
                      ? "text-muted-foreground"
                      : state === "degraded"
                      ? "text-amber-300"
                      : "text-foreground"
                  }
                >
                  {STEP_LABELS[step]}
                  {state === "degraded" && (
                    <span className="ml-2 text-xs text-amber-400">(degradado — seguindo sem essa etapa)</span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>

        {previewTail && (
          <div className="border border-border/40 rounded-md p-3 bg-background/40 max-h-48 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              Prévia em streaming
            </p>
            <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 leading-relaxed">
              {previewTail}
            </pre>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
