import { useVisualLawStore } from "@/stores/visualLaw";
import type { VLDirection } from "@/types/visual-law";
import { useState, useEffect } from "react";

const OPTIONS: { id: VLDirection; title: string; desc: string }[] = [
  { id: "organizar", title: "Organizar", desc: "Mantém o texto, melhora estrutura e títulos." },
  { id: "explicar", title: "Explicar", desc: "Reescreve trechos densos com clareza didática." },
  { id: "mais_visual", title: "Mais visual", desc: "Insere quadros, timelines e destaques jurídicos." },
];

export function DirectionPicker({
  value,
  onChange,
}: {
  value: VLDirection;
  onChange: (v: VLDirection) => void;
}) {
  return (
    <div className="space-y-2">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`w-full text-left rounded border px-3 py-2 transition-colors ${
            value === o.id ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
          }`}
        >
          <p className="text-sm font-medium">{o.title}</p>
          <p className="text-xs text-muted-foreground">{o.desc}</p>
        </button>
      ))}
    </div>
  );
}

// re-export connector for convenience
export function DirectionPickerConnected() {
  // local state for direction since it isn't on documentConfig
  const [direction, setDirection] = useState<VLDirection>("organizar");
  useEffect(() => void useVisualLawStore.subscribe(() => {}), []);
  return <DirectionPicker value={direction} onChange={setDirection} />;
}