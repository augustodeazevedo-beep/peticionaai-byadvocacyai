import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, RotateCcw, ShieldAlert, ShieldCheck, Loader2, GitCompare } from "lucide-react";
import { useVisualLawStore } from "@/stores/visualLaw";
import type { VLVersion } from "@/types/visual-law";

const DIRECTION_LABEL: Record<VLVersion["direction"], string> = {
  organizar: "Organizar",
  explicar: "Explicar",
  mais_visual: "Mais visual",
};

export function VersionCard({
  version,
  isActive,
  onSelect,
  onRollback,
  onCompare,
  canCompare,
}: {
  version: VLVersion;
  isActive: boolean;
  onSelect: () => void;
  onRollback: () => void;
  onCompare?: () => void;
  canCompare?: boolean;
}) {
  const status = useVisualLawStore((s) => s.analysisStatus[version.id]);
  const issueCount =
    version.validation && version.risk
      ? version.validation.alegacoesSemProva.length +
        version.validation.tesesSemFundamento.length +
        version.validation.pedidosOrfaos.length +
        version.validation.placeholders.length +
        version.risk.fragilidadesProbatorias.length +
        version.risk.viciosFormais.length +
        version.risk.riscosImprocedencia.length +
        version.risk.argumentosAdversos.length
      : 0;
  return (
    <div
      className={`rounded border px-2 py-2 text-xs space-y-1 ${
        isActive ? "border-primary bg-primary/5" : "border-border/50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 truncate">
          {status === "running" ? (
            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
          ) : status === "done" && issueCount > 0 ? (
            <ShieldAlert className="h-3 w-3 shrink-0 text-amber-500" />
          ) : status === "done" ? (
            <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-500" />
          ) : null}
          <span className="truncate">{new Date(version.timestamp).toLocaleString("pt-BR")}</span>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {DIRECTION_LABEL[version.direction]}
        </Badge>
      </div>
      {version.prompt && (
        <p className="text-muted-foreground line-clamp-2">{version.prompt}</p>
      )}
      <div className="flex gap-1 justify-end">
        {onCompare && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={onCompare}
            disabled={!canCompare}
            title={canCompare ? "Comparar com a versão ativa" : "Selecione outra versão para comparar"}
          >
            <GitCompare className="h-3 w-3" />
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onSelect} title="Visualizar">
          <Eye className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onRollback} title="Restaurar">
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}