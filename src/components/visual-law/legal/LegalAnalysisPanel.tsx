import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useVisualLawStore, selectActiveVersion } from "@/stores/visualLaw";
import type { VLLegalValidation, VLRiskAnalysis } from "@/types/visual-law";

const VALIDATION_LABELS: Record<keyof VLLegalValidation, string> = {
  alegacoesSemProva: "Alegações sem prova",
  tesesSemFundamento: "Teses sem fundamento",
  pedidosOrfaos: "Pedidos órfãos",
  placeholders: "Placeholders pendentes",
};

const RISK_LABELS: Record<keyof VLRiskAnalysis, string> = {
  fragilidadesProbatorias: "Fragilidades probatórias",
  viciosFormais: "Vícios formais",
  riscosImprocedencia: "Riscos de improcedência",
  argumentosAdversos: "Argumentos adversos prováveis",
};

function IssueList({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium">{title}</p>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          Nenhum apontamento
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">{title}</p>
        <Badge variant="outline" className="text-[10px] h-4">{items.length}</Badge>
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-1.5 text-[11px] leading-snug text-muted-foreground">
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LegalAnalysisPanel() {
  const active = useVisualLawStore(selectActiveVersion);
  const status = useVisualLawStore((s) =>
    active ? s.analysisStatus[active.id] : undefined,
  );
  const errorMsg = useVisualLawStore((s) =>
    active ? s.analysisError[active.id] : undefined,
  );

  const summary = useMemo(() => {
    if (!active?.validation || !active?.risk) return null;
    const v = active.validation;
    const r = active.risk;
    const total =
      v.alegacoesSemProva.length +
      v.tesesSemFundamento.length +
      v.pedidosOrfaos.length +
      v.placeholders.length +
      r.fragilidadesProbatorias.length +
      r.viciosFormais.length +
      r.riscosImprocedencia.length +
      r.argumentosAdversos.length;
    return total;
  }, [active]);

  if (!active) {
    return (
      <p className="text-xs text-muted-foreground">
        Gere uma versão para iniciar a análise jurídica automática.
      </p>
    );
  }

  if (status === "running") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Auditando documento…
        </div>
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-destructive">
          {errorMsg ?? "Falha ao analisar a versão."}
        </p>
        <Button size="sm" variant="outline" disabled className="gap-1">
          <RefreshCw className="h-3 w-3" /> Tentar novamente
        </Button>
        <p className="text-[10px] text-muted-foreground">
          A próxima geração tentará uma nova análise automaticamente.
        </p>
      </div>
    );
  }

  if (!active.validation || !active.risk) {
    return (
      <p className="text-xs text-muted-foreground">
        Análise ainda não disponível para esta versão.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-primary" />
        <p className="text-xs font-medium">
          {summary === 0 ? "Sem apontamentos críticos" : `${summary} apontamento(s) identificados`}
        </p>
      </div>

      <section className="space-y-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Validação Jurídica
        </p>
        <div className="space-y-2">
          {(Object.keys(VALIDATION_LABELS) as (keyof VLLegalValidation)[]).map((key) => (
            <IssueList key={key} title={VALIDATION_LABELS[key]} items={active.validation![key]} />
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Análise de Risco
        </p>
        <div className="space-y-2">
          {(Object.keys(RISK_LABELS) as (keyof VLRiskAnalysis)[]).map((key) => (
            <IssueList key={key} title={RISK_LABELS[key]} items={active.risk![key]} />
          ))}
        </div>
      </section>
    </div>
  );
}
