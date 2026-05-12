import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Trash2, Loader2, History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import {
  listExports,
  getExportSignedUrl,
  deleteExport,
  type ExportEntry,
} from "@/services/visual-law/exportsHistory";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function ExportHistoryDialog({ pieceId }: { pieceId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ExportEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user?.id) return;
    setLoading(true);
    listExports(user.id, pieceId)
      .then(setEntries)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao listar exports"))
      .finally(() => setLoading(false));
  }, [open, user?.id, pieceId]);

  async function handleDownload(entry: ExportEntry) {
    try {
      setBusy(entry.path);
      const url = await getExportSignedUrl(entry.path);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar link");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(entry: ExportEntry) {
    if (!confirm(`Excluir "${entry.name}"?`)) return;
    try {
      setBusy(entry.path);
      await deleteExport(entry.path);
      setEntries((es) => es.filter((e) => e.path !== entry.path));
      toast.success("Export excluído.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-3.5 w-3.5" />
          Histórico
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Histórico de exports</DialogTitle>
          <DialogDescription>
            Arquivos PDF e DOCX exportados anteriormente para esta peça.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando…
          </div>
        ) : entries.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhum export encontrado. Use "Exportar" para gerar o primeiro.
          </p>
        ) : (
          <div className="divide-y divide-border/50 rounded border border-border/50">
            {entries.map((e) => (
              <div key={e.path} className="flex items-center gap-3 px-3 py-2 text-xs">
                <Badge variant="outline" className="uppercase">
                  {e.format}
                </Badge>
                <div className="flex-1 truncate">
                  <p className="truncate font-medium text-foreground">{e.name}</p>
                  <p className="text-muted-foreground tabular-nums">
                    {formatSize(e.sizeBytes)} · {new Date(e.updatedAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={busy === e.path}
                  onClick={() => handleDownload(e)}
                  title="Baixar"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  disabled={busy === e.path}
                  onClick={() => handleDelete(e)}
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}