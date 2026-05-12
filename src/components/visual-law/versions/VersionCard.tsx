import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, RotateCcw } from "lucide-react";
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
}: {
  version: VLVersion;
  isActive: boolean;
  onSelect: () => void;
  onRollback: () => void;
}) {
  return (
    <div
      className={`rounded border px-2 py-2 text-xs space-y-1 ${
        isActive ? "border-primary bg-primary/5" : "border-border/50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate">{new Date(version.timestamp).toLocaleString("pt-BR")}</span>
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {DIRECTION_LABEL[version.direction]}
        </Badge>
      </div>
      {version.prompt && (
        <p className="text-muted-foreground line-clamp-2">{version.prompt}</p>
      )}
      <div className="flex gap-1 justify-end">
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