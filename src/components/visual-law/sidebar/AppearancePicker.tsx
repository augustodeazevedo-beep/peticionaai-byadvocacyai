import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVisualLawStore } from "@/stores/visualLaw";
import type { VLFontFamily } from "@/types/visual-law";

const FONTS: VLFontFamily[] = ["Helvetica", "Charter", "Playfair"];

export function AppearancePicker() {
  const config = useVisualLawStore((s) => s.documentConfig);
  const setConfig = useVisualLawStore((s) => s.setConfig);
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Fonte</Label>
        <div className="grid grid-cols-3 gap-1 mt-1">
          {FONTS.map((f) => (
            <Button
              key={f}
              type="button"
              size="sm"
              variant={config.fontFamily === f ? "default" : "outline"}
              onClick={() => setConfig({ fontFamily: f })}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs">Cor primária</Label>
        <Input
          type="color"
          value={config.primaryColor}
          onChange={(e) => setConfig({ primaryColor: e.target.value })}
          className="h-8 p-1 mt-1"
        />
      </div>
    </div>
  );
}