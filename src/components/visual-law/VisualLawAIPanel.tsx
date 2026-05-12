import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SplitPane } from "./layout/SplitPane";
import { DocumentViewer } from "./viewer/DocumentViewer";
import { ConfigSidebar } from "./sidebar/ConfigSidebar";
import { StreamingIndicator } from "./loading/StreamingIndicator";
import { GenerationOverlay } from "./loading/GenerationOverlay";
import { ExportButton } from "./export/ExportButton";
import { ExportHistoryDialog } from "./export/ExportHistoryDialog";
import { ShareVersionDialog } from "./share/ShareVersionDialog";
import { useVisualLawStore } from "@/stores/visualLaw";
import { runGeneration } from "@/services/visual-law/generate";
import type { VLDirection, VLGeneratePayload } from "@/types/visual-law";
import { useLoadVersions } from "@/hooks/visual-law/useLoadVersions";
import { useAuth } from "@/lib/auth";

type Props = {
  pieceId: string;
  contentText: string;
  pieceType?: string;
  area?: string | null;
  pieceTitle?: string;
  onContentChange?: (text: string) => void;
};

export function VisualLawAIPanel(props: Props) {
  const initFromPiece = useVisualLawStore((s) => s.initFromPiece);
  const isStreaming = useVisualLawStore((s) => s.isGenerating);
  const cancel = useVisualLawStore((s) => s.cancelGeneration);
  const documentContent = useVisualLawStore((s) => s.documentContent);
  const config = useVisualLawStore((s) => s.documentConfig);
  const { user } = useAuth();
  useLoadVersions(props.pieceId);

  const [direction, setDirection] = useState<VLDirection>("organizar");
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    initFromPiece(props.pieceId, props.contentText, {
      pieceType: props.pieceType,
      area: props.area ?? null,
    });
  }, [props.pieceId, props.contentText, props.pieceType, props.area, initFromPiece]);

  useEffect(() => {
    if (!isStreaming) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isStreaming, cancel]);

  useEffect(() => {
    if (isStreaming) return;
    if (!props.onContentChange) return;
    if (!documentContent) return;
    props.onContentChange(documentContent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming]);

  function handleGenerate() {
    const payload: VLGeneratePayload = {
      currentContent: documentContent || props.contentText,
      density: config.density,
      direction,
      refinementPrompt: prompt.trim(),
      config,
      legalMetadata: {
        pieceType: props.pieceType,
        area: props.area ?? null,
      },
      hiddenElements: config.hiddenElements,
    };
    runGeneration(payload, user?.id ? { pieceId: props.pieceId, userId: user.id } : undefined).catch((e) =>
      toast.error(e instanceof Error ? e.message : "Falha na geração"),
    );
  }

  return (
    <div className="space-y-3">
      <GenerationOverlay />
      <div className="flex items-center justify-between gap-2">
        <StreamingIndicator />
        <div className="flex items-center gap-2">
          <ExportHistoryDialog pieceId={props.pieceId} />
          <ShareVersionDialog pieceId={props.pieceId} />
          <ExportButton pieceId={props.pieceId} pieceTitle={props.pieceTitle ?? props.pieceType} />
        </div>
      </div>
      <SplitPane
        left={<DocumentViewer />}
        right={
          <ConfigSidebar
            direction={direction}
            setDirection={setDirection}
            prompt={prompt}
            setPrompt={setPrompt}
            onGenerate={handleGenerate}
          />
        }
      />
    </div>
  );
}