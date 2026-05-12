import { useState } from "react";
import { useVisualLawStore } from "@/stores/visualLaw";
import { VersionCard } from "./VersionCard";
import { VersionDiffDialog } from "./VersionDiffDialog";

export function VersionsTimeline() {
  const versions = useVisualLawStore((s) => s.versions);
  const activeId = useVisualLawStore((s) => s.selectedVersionId);
  const select = useVisualLawStore((s) => s.selectVersion);
  const rollback = useVisualLawStore((s) => s.rollbackTo);
  const compareTargetId = useVisualLawStore((s) => s.compareTargetId);
  const setCompareTarget = useVisualLawStore((s) => s.setCompareTarget);
  const [open, setOpen] = useState(false);

  if (versions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Nenhuma versão gerada ainda. Cada geração cria uma nova entrada aqui.
      </p>
    );
  }

  const active = versions.find((v) => v.id === activeId) ?? null;
  const target = versions.find((v) => v.id === compareTargetId) ?? null;

  return (
    <>
    <div className="space-y-1.5 max-h-[420px] overflow-auto">
      {[...versions].reverse().map((v) => (
        <VersionCard
          key={v.id}
          version={v}
          isActive={v.id === activeId}
          onSelect={() => select(v.id)}
          onRollback={() => rollback(v.id)}
          onCompare={() => {
            setCompareTarget(v.id);
            setOpen(true);
          }}
          canCompare={v.id !== activeId}
        />
      ))}
    </div>
      <VersionDiffDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setCompareTarget(null);
        }}
        versionA={target}
        versionB={active}
      />
    </>
  );
}