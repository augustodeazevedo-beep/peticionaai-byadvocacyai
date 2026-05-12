import { Button } from "@/components/ui/button";
import { useVisualLawStore } from "@/stores/visualLaw";
import type { VLDensity } from "@/types/visual-law";

const OPTIONS: { id: VLDensity; label: string }[] = [
  { id: "enxuto", label: "Enxuto" },
  { id: "padrao", label: "Padrão" },
  { id: "confortavel", label: "Confortável" },
];

export function DensityPicker() {
  const density = useVisualLawStore((s) => s.documentConfig.density);
  const setConfig = useVisualLawStore((s) => s.setConfig);
  return (
    <div className="grid grid-cols-3 gap-1">
      {OPTIONS.map((o) => (
        <Button
          key={o.id}
          type="button"
          size="sm"
          variant={density === o.id ? "default" : "outline"}
          onClick={() => setConfig({ density: o.id })}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}