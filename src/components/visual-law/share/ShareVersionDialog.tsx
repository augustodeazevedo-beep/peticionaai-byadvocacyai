import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Share2, Copy, Check, AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useVisualLawStore } from "@/stores/visualLaw";

function generateSlug() {
  return (
    Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)
  );
}

export function ShareVersionDialog({ pieceId }: { pieceId: string }) {
  const selectedVersionId = useVisualLawStore((s) => s.selectedVersionId);
  const versions = useVisualLawStore((s) => s.versions);
  const active = versions.find((v) => v.id === selectedVersionId) ?? null;

  const [open, setOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("pieces")
      .select("is_shared, public_slug")
      .eq("id", pieceId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          toast.error(error.message);
          return;
        }
        setShared(!!data?.is_shared);
        setSlug(data?.public_slug ?? null);
      })
      .then(() => setLoading(false));
  }, [open, pieceId]);

  async function toggle(value: boolean) {
    setLoading(true);
    const update: { is_shared: boolean; public_slug?: string } = { is_shared: value };
    if (value && !slug) update.public_slug = generateSlug();
    const { data, error } = await supabase
      .from("pieces")
      .update(update)
      .eq("id", pieceId)
      .select("is_shared, public_slug")
      .maybeSingle();
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setShared(!!data?.is_shared);
    setSlug(data?.public_slug ?? null);
    toast.success(value ? "Versão pública." : "Compartilhamento desativado.");
  }

  const url =
    shared && slug
      ? `${window.location.origin}/p/${slug}${active ? `?vl=${active.id}` : ""}`
      : "";

  const hasSensitive =
    !!active?.validation &&
    active.validation.placeholders.length + active.validation.alegacoesSemProva.length > 0;

  function copy() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={!active}>
          <Share2 className="h-3.5 w-3.5" />
          Compartilhar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar versão</DialogTitle>
          <DialogDescription>
            Gere um link público read-only para esta versão Visual Law.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded border border-border/50 px-3 py-2">
          <div className="text-sm">
            <p className="font-medium">Tornar pública</p>
            <p className="text-xs text-muted-foreground">
              Qualquer pessoa com o link poderá visualizar.
            </p>
          </div>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Switch checked={shared} onCheckedChange={toggle} />
          )}
        </div>

        {hasSensitive && shared && (
          <div className="flex items-start gap-2 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Esta versão contém placeholders ou alegações sem prova — revise antes de compartilhar.
            </span>
          </div>
        )}

        {url && (
          <div className="flex items-center gap-2">
            <Input readOnly value={url} className="text-xs" />
            <Button size="icon" variant="outline" onClick={copy} title="Copiar">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}