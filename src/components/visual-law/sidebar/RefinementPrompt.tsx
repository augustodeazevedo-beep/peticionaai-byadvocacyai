import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sparkles, Square } from "lucide-react";
import { useVisualLawStore } from "@/stores/visualLaw";

export function RefinementPrompt({
  value,
  onChange,
  onGenerate,
}: {
  value: string;
  onChange: (v: string) => void;
  onGenerate: () => void;
}) {
  const isStreaming = useVisualLawStore((s) => s.isGenerating);
  const cancel = useVisualLawStore((s) => s.cancelGeneration);
  return (
    <div className="space-y-2">
      <Label className="text-xs">Instruções de refinamento</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder='Ex.: "Adicione timeline dos fatos e destaque os requisitos do art. 300 CPC."'
        rows={3}
        disabled={isStreaming}
      />
      {isStreaming ? (
        <Button type="button" variant="outline" className="w-full" onClick={() => cancel()}>
          <Square className="h-4 w-4 mr-2" />
          Cancelar geração
        </Button>
      ) : (
        <Button
          type="button"
          className="w-full bg-gradient-brand text-primary-foreground"
          onClick={onGenerate}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Gerar
        </Button>
      )}
    </div>
  );
}