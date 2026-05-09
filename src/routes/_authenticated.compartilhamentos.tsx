import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Share2, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/compartilhamentos")({
  head: () => ({ meta: [{ title: "Compartilhamentos — Peticiona.AI" }] }),
  component: SharesPage,
});

function slug() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

function SharesPage() {
  const qc = useQueryClient();
  const { data: pieces = [], isLoading } = useQuery({
    queryKey: ["pieces_all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pieces")
        .select("id,title,is_shared,public_slug,updated_at")
        .order("updated_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const toggle = useMutation({
    mutationFn: async (p: { id: string; share: boolean; public_slug: string | null }) => {
      const update: any = { is_shared: p.share };
      if (p.share && !p.public_slug) update.public_slug = slug();
      await supabase.from("pieces").update(update).eq("id", p.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pieces_all"] }),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-center gap-3">
        <Share2 className="h-6 w-6 text-accent" />
        <div>
          <h1 className="text-2xl font-semibold">Compartilhamentos</h1>
          <p className="text-sm text-muted-foreground">Gere links públicos read-only para suas peças.</p>
        </div>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      <div className="space-y-2">
        {pieces.map((p: any) => {
          const url = p.public_slug ? `${window.location.origin}/p/${p.public_slug}` : null;
          return (
            <Card key={p.id} className="glass flex items-center gap-3 border-border/50 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.title}</p>
                {p.is_shared && url && (
                  <p className="truncate text-xs text-muted-foreground">{url}</p>
                )}
              </div>
              {p.is_shared && url && (
                <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copiado"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              <Switch
                checked={p.is_shared}
                onCheckedChange={(v) => toggle.mutate({ id: p.id, share: v, public_slug: p.public_slug })}
              />
            </Card>
          );
        })}
        {!isLoading && pieces.length === 0 && (
          <Card className="border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
            Você ainda não tem peças.
          </Card>
        )}
      </div>
    </div>
  );
}