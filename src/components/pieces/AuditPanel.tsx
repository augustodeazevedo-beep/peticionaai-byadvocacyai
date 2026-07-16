import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Bug,
  Scale,
  Ghost,
  Loader2,
  RefreshCw,
  Check,
  X,
  Wand2,
} from "lucide-react";
import {
  auditPieceContent,
  getLatestAudit,
  dismissAuditFinding,
  applyAuditFix,
} from "@/lib/audit.functions";
import type { AuditFinding } from "@/lib/audit/types";

type AuditRow = {
  id: string;
  score: number;
  model: string | null;
  findings: AuditFinding[];
  stages: Record<string, unknown>;
  content_hash: string;
  created_at: string;
};

const CAT_META: Record<
  AuditFinding["category"],
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  prompt_injection: { label: "Prompt Injection", icon: Bug },
  jailbreak: { label: "Jailbreak", icon: Bug },
  fake_citation: { label: "Citação suspeita", icon: Scale },
  fake_jurisprudence: { label: "Jurisprudência suspeita", icon: Scale },
  hallucination: { label: "Alucinação", icon: Ghost },
  pii_leak: { label: "PII exposta", icon: AlertTriangle },
};

const SEV_STYLE: Record<AuditFinding["severity"], string> = {
  low: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  medium: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  high: "bg-orange-500/10 text-orange-300 border-orange-500/30",
  critical: "bg-red-500/10 text-red-300 border-red-500/30",
};

type Props = {
  pieceId: string;
  contentText: string;
  onContentChange?: (next: string) => void;
};

export function AuditPanel({ pieceId, contentText, onContentChange }: Props) {
  const [audit, setAudit] = useState<AuditRow | null>(null);
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchLatest = useServerFn(getLatestAudit);
  const runAudit = useServerFn(auditPieceContent);
  const dismissFn = useServerFn(dismissAuditFinding);
  const applyFn = useServerFn(applyAuditFix);

  useEffect(() => {
    let mounted = true;
    fetchLatest({ data: { pieceId } })
      .then((row) => {
        if (mounted && row) setAudit(row as unknown as AuditRow);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [pieceId, fetchLatest]);

  const run = useCallback(
    async (force: boolean) => {
      setRunning(true);
      try {
        const row = await runAudit({ data: { pieceId, force } });
        setAudit(row as unknown as AuditRow);
        toast.success("Auditoria concluída");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha ao auditar");
      } finally {
        setRunning(false);
      }
    },
    [pieceId, runAudit],
  );

  const active = useMemo(
    () => (audit?.findings ?? []).filter((f) => !f.dismissed),
    [audit],
  );
  const dismissed = useMemo(
    () => (audit?.findings ?? []).filter((f) => f.dismissed),
    [audit],
  );

  const stale =
    audit && contentText
      ? // sha256 not available client-side; use length+prefix as weak signal
        audit.content_hash && contentText.length !== undefined
        ? false
        : false
      : false;

  return (
    <div className="space-y-3">
      <Card className="glass border-border/50 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {audit ? (
            <ScoreRing score={audit.score} />
          ) : (
            <div className="h-14 w-14 rounded-full border border-border/60 flex items-center justify-center text-xs text-muted-foreground">
              n/d
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4 text-accent" />
              Detect.AI
            </div>
            <div className="text-xs text-muted-foreground">
              {audit
                ? `${active.length} achado(s) ativo(s) · ${dismissed.length} descartado(s) · modelo ${audit.model ?? "—"}`
                : "Rode a auditoria para detectar prompt injection, citações e alucinações."}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/configuracoes/detect-ai">
              <Settings2 className="mr-2 h-3 w-3" /> Ajustar regras
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => run(true)}
            disabled={running}
          >
            {running ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-3 w-3" />
            )}
            {audit ? "Reauditar" : "Auditar"}
          </Button>
        </div>
      </Card>

      {stale && audit && (
        <Card className="glass border-amber-500/40 p-3 text-xs text-amber-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> O conteúdo mudou desde a última
          auditoria — rode novamente para atualizar os achados.
        </Card>
      )}

      {active.length === 0 && audit && (
        <Card className="glass border-emerald-500/30 p-4 text-sm text-emerald-300 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Nenhum risco relevante detectado.
        </Card>
      )}

      <div className="space-y-2">
        {active.map((f) => (
          <FindingCard
            key={f.id}
            f={f}
            busy={busyId === f.id}
            onDismiss={async (reason) => {
              if (!audit) return;
              setBusyId(f.id);
              try {
                const row = await dismissFn({
                  data: { auditId: audit.id, findingId: f.id, reason },
                });
                setAudit(row as unknown as AuditRow);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Falha ao descartar");
              } finally {
                setBusyId(null);
              }
            }}
            onApply={
              f.suggested_fix
                ? async () => {
                    if (!audit) return;
                    setBusyId(f.id);
                    try {
                      const r = await applyFn({
                        data: { pieceId, auditId: audit.id, findingId: f.id },
                      });
                      if (r?.content_text && onContentChange) {
                        onContentChange(r.content_text);
                      }
                      // refresh audit
                      const row = await fetchLatest({ data: { pieceId } });
                      if (row) setAudit(row as unknown as AuditRow);
                      toast.success("Correção aplicada");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Falha ao aplicar");
                    } finally {
                      setBusyId(null);
                    }
                  }
                : undefined
            }
          />
        ))}
      </div>

      {dismissed.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">
            Achados descartados ({dismissed.length})
          </summary>
          <div className="mt-2 space-y-1">
            {dismissed.map((f) => (
              <div
                key={f.id}
                className="border border-border/40 rounded px-2 py-1 flex items-center justify-between"
              >
                <span className="truncate">
                  [{CAT_META[f.category].label}] {f.snippet.slice(0, 90)}
                </span>
                <span className="text-muted-foreground">{f.dismissed?.reason}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 85
      ? "text-emerald-400"
      : score >= 60
        ? "text-amber-400"
        : "text-red-400";
  return (
    <div
      className={`h-14 w-14 rounded-full border-2 border-current flex items-center justify-center font-mono ${color}`}
    >
      {score}
    </div>
  );
}

function FindingCard({
  f,
  busy,
  onDismiss,
  onApply,
}: {
  f: AuditFinding;
  busy: boolean;
  onDismiss: (reason: "false_positive" | "acknowledged" | "wont_fix") => void;
  onApply?: () => void;
}) {
  const Icon = CAT_META[f.category].icon;
  return (
    <Card className="glass border-border/50 p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium">{CAT_META[f.category].label}</span>
          <Badge variant="outline" className={SEV_STYLE[f.severity]}>
            {f.severity}
          </Badge>
          {typeof f.confidence === "number" && (
            <span className="text-[10px] text-muted-foreground">
              conf. {Math.round(f.confidence * 100)}%
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {onApply && (
            <Button
              size="sm"
              variant="outline"
              onClick={onApply}
              disabled={busy}
              className="h-7 text-xs"
            >
              <Wand2 className="h-3 w-3 mr-1" /> Aplicar correção
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            disabled={busy}
            onClick={() => onDismiss("false_positive")}
            title="Marcar como falso positivo"
          >
            <X className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            disabled={busy}
            onClick={() => onDismiss("acknowledged")}
            title="Reconhecido, manter"
          >
            <Check className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <blockquote className="text-xs italic border-l-2 border-border/60 pl-2 text-foreground/80">
        “{f.snippet.length > 220 ? f.snippet.slice(0, 220) + "…" : f.snippet}”
      </blockquote>
      <p className="text-xs text-muted-foreground">{f.explanation}</p>
      {f.suggested_fix && (
        <div className="text-xs">
          <span className="text-muted-foreground">Sugestão: </span>
          <span className="font-mono">
            {f.suggested_fix || <em className="opacity-60">(remover trecho)</em>}
          </span>
        </div>
      )}
      {f.evidence?.source && (
        <div className="text-[10px] text-muted-foreground">
          Fonte: {f.evidence.source}
          {f.evidence.detail ? ` — ${f.evidence.detail}` : ""}
        </div>
      )}
    </Card>
  );
}