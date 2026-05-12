import { useVisualLawStore } from "@/stores/visualLaw";
import type { VLVersion } from "@/types/visual-law";

export interface UseVisualLawVersionsResult {
  versions: VLVersion[];
  active: VLVersion | null;
  select: (id: string) => void;
  rollback: (id: string) => void;
}

export function useVisualLawVersions(): UseVisualLawVersionsResult {
  const versions = useVisualLawStore((s) => s.versions);
  const selectedId = useVisualLawStore((s) => s.selectedVersionId);
  const select = useVisualLawStore((s) => s.selectVersion);
  const rollback = useVisualLawStore((s) => s.rollbackTo);
  const active = versions.find((v) => v.id === selectedId) ?? null;
  return { versions, active, select, rollback };
}