import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useVisualLawStore } from "@/stores/visualLaw";
import type { VLElementKey } from "@/types/visual-law";

const ELEMENTS: { key: VLElementKey; label: string }[] = [
  { key: "timeline", label: "Linha do tempo" },
  { key: "quadro_probatorio", label: "Quadro probatório" },
  { key: "sintese_executiva", label: "Síntese executiva" },
  { key: "blocos_jurisprudenciais", label: "Blocos jurisprudenciais" },
  { key: "fluxograma", label: "Fluxograma" },
  { key: "quadro_comparativo", label: "Quadro comparativo" },
  { key: "card_argumentativo", label: "Card argumentativo" },
  { key: "destaque_normativo", label: "Destaque normativo" },
  { key: "matriz_controversias", label: "Matriz de controvérsias" },
  { key: "pedidos_vinculados", label: "Pedidos vinculados" },
];

export function ElementsToggle() {
  const hidden = useVisualLawStore((s) => s.documentConfig.hiddenElements);
  const toggle = useVisualLawStore((s) => s.toggleElement);
  return (
    <div className="space-y-1.5">
      {ELEMENTS.map((el) => {
        const checked = !hidden.includes(el.key);
        return (
          <div key={el.key} className="flex items-center justify-between">
            <Label htmlFor={`vlai-${el.key}`} className="text-sm">{el.label}</Label>
            <Switch
              id={`vlai-${el.key}`}
              checked={checked}
              onCheckedChange={() => toggle(el.key)}
            />
          </div>
        );
      })}
    </div>
  );
}