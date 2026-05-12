import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { diffLines } from "@/lib/visual-law/diff";
import type { VLVersion } from "@/types/visual-law";

const DIRECTION_LABEL: Record<VLVersion["direction"], string> = {
  organizar: "Organizar",
  explicar: "Explicar",
  mais_visual: "Mais visual",
};

function formatTs(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

export function VersionDiffDialog({
  open,
  onOpenChange,
  versionA,
  versionB,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  versionA: VLVersion | null;
  versionB: VLVersion | null;
}) {
  const diff = useMemo(() => {
    if (!versionA || !versionB) return null;
    return diffLines(versionA.content, versionB.content);
  }, [versionA, versionB]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Comparar versões</DialogTitle>
          <DialogDescription>
            Linhas removidas (vermelho) vieram da versão anterior; adicionadas (verde) estão na versão ativa.
          </DialogDescription>
        </DialogHeader>

        {versionA && versionB && (
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1 rounded border border-border/50 px-3 py-2">
              <p className="font-medium">Versão anterior</p>
              <p className="text-muted-foreground">{formatTs(versionA.timestamp)}</p>
              <Badge variant="outline" className="text-[10px]">
                {DIRECTION_LABEL[versionA.direction]}
              </Badge>
            </div>
            <div className="space-y-1 rounded border border-primary/40 bg-primary/5 px-3 py-2">
              <p className="font-medium">Versão ativa</p>
              <p className="text-muted-foreground">{formatTs(versionB.timestamp)}</p>
              <Badge variant="outline" className="text-[10px]">
                {DIRECTION_LABEL[versionB.direction]}
              </Badge>
            </div>
          </div>
        )}

        {diff?.truncated && (
          <p className="text-xs text-amber-500">
            Documento muito grande para diff completo — exibindo amostra inicial.
          </p>
        )}

        <ScrollArea className="h-[60vh] rounded border border-border/50">
          <pre className="whitespace-pre-wrap break-words p-3 font-mono text-xs leading-5">
            {diff?.segments.map((seg, idx) => {
              if (seg.type === "equal") {
                return (
                  <span key={idx} className="text-muted-foreground">
                    {seg.lines.map((l, i) => (
                      <span key={i} className="block">
                        {"  "}
                        {l || " "}
                      </span>
                    ))}
                  </span>
                );
              }
              const isAdd = seg.type === "added";
              const cls = isAdd
                ? "bg-emerald-500/10 text-emerald-300"
                : "bg-red-500/10 text-red-300";
              const sign = isAdd ? "+ " : "- ";
              return (
                <span key={idx} className={cls}>
                  {seg.lines.map((l, i) => (
                    <span key={i} className="block">
                      {sign}
                      {l || " "}
                    </span>
                  ))}
                </span>
              );
            })}
            {!diff && (
              <span className="text-muted-foreground">
                Selecione uma versão para comparar.
              </span>
            )}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}