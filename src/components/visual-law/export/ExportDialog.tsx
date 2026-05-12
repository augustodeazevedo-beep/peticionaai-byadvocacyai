import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useVisualLawStore, selectActiveVersion } from "@/stores/visualLaw";
import { useAuth } from "@/lib/auth";
import { exportVersionToPdf } from "@/services/visual-law/exportPdf";
import { exportVersionToDocx } from "@/services/visual-law/exportDocx";
import { uploadExport } from "@/services/visual-law/storage";

type Format = "pdf" | "docx";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportDialog({
  open,
  onOpenChange,
  pieceId,
  pieceTitle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pieceId: string;
  pieceTitle?: string;
}) {
  const active = useVisualLawStore(selectActiveVersion);
  const { user } = useAuth();
  const [format, setFormat] = useState<Format>("pdf");
  const [includeAnalysis, setIncludeAnalysis] = useState(false);
  const [busy, setBusy] = useState(false);

  const hasAnalysis = !!active?.validation && !!active?.risk;

  async function handleExport() {
    if (!active) return;
    setBusy(true);
    try {
      const opts = {
        title: pieceTitle,
        includeAnalysis: includeAnalysis && hasAnalysis,
      };
      const blob =
        format === "pdf"
          ? await exportVersionToPdf(active, opts)
          : await exportVersionToDocx(active, opts);
      const safeTitle = (pieceTitle || "documento").replace(/[^\w\-]+/g, "_").slice(0, 40);
      const stamp = new Date(active.timestamp).toISOString().slice(0, 10);
      triggerDownload(blob, `${safeTitle}-${stamp}.${format}`);
      // upload em background
      if (user?.id) {
        void uploadExport(blob, format, user.id, pieceId, active.id);
      }
      toast.success(`Exportado em ${format.toUpperCase()}.`);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Falha ao exportar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar versão</DialogTitle>
          <DialogDescription>
            Baixe a versão ativa preservando fonte, cor e estrutura.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Formato</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as Format)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="fmt-pdf" />
                <Label htmlFor="fmt-pdf" className="cursor-pointer">PDF (.pdf)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="docx" id="fmt-docx" />
                <Label htmlFor="fmt-docx" className="cursor-pointer">Word (.docx)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="incl-analysis"
              checked={includeAnalysis}
              disabled={!hasAnalysis}
              onCheckedChange={(v) => setIncludeAnalysis(!!v)}
            />
            <Label
              htmlFor="incl-analysis"
              className={`cursor-pointer text-sm ${!hasAnalysis ? "text-muted-foreground" : ""}`}
            >
              Incluir apêndice com análise jurídica
              {!hasAnalysis && " (indisponível)"}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={busy || !active} className="gap-1">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
