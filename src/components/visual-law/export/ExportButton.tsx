import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExportDialog } from "./ExportDialog";
import { useVisualLawStore } from "@/stores/visualLaw";

export function ExportButton({ pieceId, pieceTitle }: { pieceId: string; pieceTitle?: string }) {
  const [open, setOpen] = useState(false);
  const hasVersion = useVisualLawStore((s) => !!s.selectedVersionId);
  const isStreaming = useVisualLawStore((s) => s.isGenerating);
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-1"
        disabled={!hasVersion || isStreaming}
        onClick={() => setOpen(true)}
      >
        <Download className="h-3.5 w-3.5" />
        Exportar
      </Button>
      <ExportDialog open={open} onOpenChange={setOpen} pieceId={pieceId} pieceTitle={pieceTitle} />
    </>
  );
}
