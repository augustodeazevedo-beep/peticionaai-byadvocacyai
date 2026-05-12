import { useVisualLawStore } from "@/stores/visualLaw";
import { VersionCard } from "./VersionCard";

export function VersionsTimeline() {
  const versions = useVisualLawStore((s) => s.versions);
  const activeId = useVisualLawStore((s) => s.selectedVersionId);
  const select = useVisualLawStore((s) => s.selectVersion);
  const rollback = useVisualLawStore((s) => s.rollbackTo);

  if (versions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Nenhuma versão gerada ainda. Cada geração cria uma nova entrada aqui.
      </p>
    );
  }

  return (
    <div className="space-y-1.5 max-h-[420px] overflow-auto">
      {[...versions].reverse().map((v) => (
        <VersionCard
          key={v.id}
          version={v}
          isActive={v.id === activeId}
          onSelect={() => select(v.id)}
          onRollback={() => rollback(v.id)}
        />
      ))}
    </div>
  );
}