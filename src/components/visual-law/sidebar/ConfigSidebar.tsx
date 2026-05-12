import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DirectionPicker } from "./DirectionPicker";
import { DensityPicker } from "./DensityPicker";
import { AppearancePicker } from "./AppearancePicker";
import { ElementsToggle } from "./ElementsToggle";
import { RefinementPrompt } from "./RefinementPrompt";
import { VersionsTimeline } from "../versions/VersionsTimeline";
import type { VLDirection } from "@/types/visual-law";

export function ConfigSidebar({
  direction,
  setDirection,
  prompt,
  setPrompt,
  onGenerate,
}: {
  direction: VLDirection;
  setDirection: (d: VLDirection) => void;
  prompt: string;
  setPrompt: (v: string) => void;
  onGenerate: () => void;
}) {
  return (
    <Card className="glass border-border/50 p-3 space-y-3">
      <RefinementPrompt value={prompt} onChange={setPrompt} onGenerate={onGenerate} />
      <Tabs defaultValue="direcao">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="direcao">Direção</TabsTrigger>
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
          <TabsTrigger value="elementos">Elementos</TabsTrigger>
          <TabsTrigger value="versoes">Versões</TabsTrigger>
        </TabsList>
        <TabsContent value="direcao" className="mt-3 space-y-3">
          <DirectionPicker value={direction} onChange={setDirection} />
          <div>
            <p className="text-xs mb-1 text-muted-foreground">Densidade</p>
            <DensityPicker />
          </div>
        </TabsContent>
        <TabsContent value="aparencia" className="mt-3">
          <AppearancePicker />
        </TabsContent>
        <TabsContent value="elementos" className="mt-3">
          <ElementsToggle />
        </TabsContent>
        <TabsContent value="versoes" className="mt-3">
          <VersionsTimeline />
        </TabsContent>
      </Tabs>
    </Card>
  );
}