import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DirectionPicker } from "./DirectionPicker";
import { DensityPicker } from "./DensityPicker";
import { AppearancePicker } from "./AppearancePicker";
import { ElementsToggle } from "./ElementsToggle";
import { RefinementPrompt } from "./RefinementPrompt";
import { VersionsTimeline } from "../versions/VersionsTimeline";
import { LegalAnalysisPanel } from "../legal/LegalAnalysisPanel";
import { useVisualLawStore, selectActiveVersion } from "@/stores/visualLaw";
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
  const active = useVisualLawStore(selectActiveVersion);
  const status = useVisualLawStore((s) => (active ? s.analysisStatus[active.id] : undefined));
  const issueCount =
    active?.validation && active?.risk
      ? active.validation.alegacoesSemProva.length +
        active.validation.tesesSemFundamento.length +
        active.validation.pedidosOrfaos.length +
        active.validation.placeholders.length +
        active.risk.fragilidadesProbatorias.length +
        active.risk.viciosFormais.length +
        active.risk.riscosImprocedencia.length +
        active.risk.argumentosAdversos.length
      : 0;
  return (
    <Card className="glass border-border/50 p-3 space-y-3">
      <RefinementPrompt value={prompt} onChange={setPrompt} onGenerate={onGenerate} />
      <Tabs defaultValue="direcao">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="direcao">Direção</TabsTrigger>
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
          <TabsTrigger value="elementos">Elementos</TabsTrigger>
          <TabsTrigger value="analise" className="gap-1">
            Análise
            {status === "running" ? (
              <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            ) : issueCount > 0 ? (
              <span className="ml-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px] px-1 leading-none py-0.5">
                {issueCount}
              </span>
            ) : null}
          </TabsTrigger>
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
        <TabsContent value="analise" className="mt-3">
          <LegalAnalysisPanel />
        </TabsContent>
        <TabsContent value="versoes" className="mt-3">
          <VersionsTimeline />
        </TabsContent>
      </Tabs>
    </Card>
  );
}