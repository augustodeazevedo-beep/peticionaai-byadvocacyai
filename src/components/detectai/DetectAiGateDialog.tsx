import { useState } from "react";
import { AlertTriangle, ShieldCheck, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GateResult } from "@/lib/detectai.functions";

const SEV_COLORS: Record<string, string> = {
  low: "bg-blue-500/15 text-blue-200 border-blue-500/30",
  medium: "bg-amber-500/15 text-amber-200 border-amber-500/30",
  high: "bg-orange-500/15 text-orange-200 border-orange-500/30",
  critical: "bg-red-500/15 text-red-200 border-red-500/30",
};

export type DetectAiGateDialogProps = {
  result: GateResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** ação executada quando o usuário decide ignorar o bloqueio */
  onOverride: () => Promise<void> | void;
  /** ação executada quando o usuário quer rerodar a verificação (bypass cache) */
  onRerun: () => Promise<void> | void;
  actionLabel: string;
  pieceId: string;
};

export function DetectAiGateDialog({
  result,
  open,
  onOpenChange,
  onOverride,
  onRerun,
  actionLabel,
  pieceId,
}: DetectAiGateDialogProps) {
  const [busy, setBusy] = useState(false);
  const [ack, setAck] = useState(false);
  if (!result) return null;

  const critical = result.blocking.slice(0, 6);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            Detect.AI encontrou riscos nesta peça
          </DialogTitle>
          <DialogDescription>
            {result.blocking.length} achado(s) com severidade ≥ <strong>{result.threshold}</strong>.
            Ajuste o texto ou aceite o risco antes de prosseguir com <strong>{actionLabel}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <div>Score atual: <strong>{result.score}</strong>/100</div>
            {result.llm_skipped && (
              <div className="text-xs text-muted-foreground">
                Auditor LLM desligado — só heurísticas + validação de citações rodaram.
              </div>
            )}
          </div>
        </div>

        <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {critical.map((f) => (
            <li key={f.id} className="rounded-md border border-border/60 bg-background/60 p-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge className={SEV_COLORS[f.severity] ?? ""} variant="outline">
                  {f.severity}
                </Badge>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {f.category.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-1 text-foreground/90">{f.explanation}</p>
              {f.snippet && (
                <blockquote className="mt-1 border-l-2 border-border/60 pl-2 text-xs italic text-muted-foreground">
                  {f.snippet.slice(0, 200)}
                </blockquote>
              )}
            </li>
          ))}
          {result.blocking.length > critical.length && (
            <li className="text-xs text-muted-foreground">
              + {result.blocking.length - critical.length} outros achados ocultos.
            </li>
          )}
        </ul>

        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="mt-0.5 accent-primary"
          />
          Estou ciente dos riscos e assumo a responsabilidade profissional por prosseguir mesmo assim.
        </label>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/pecas/$id" params={{ id: pieceId }} search={{ tab: "audit" } as never}>
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Abrir Detect.AI
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try { await onRerun(); } finally { setBusy(false); }
              }}
            >
              {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Rodar de novo
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!ack || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onOverride();
                  onOpenChange(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Prosseguir mesmo assim
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}