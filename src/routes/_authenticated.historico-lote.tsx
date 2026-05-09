import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Trash2, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/historico-lote")({
  head: () => ({ meta: [{ title: "Histórico de Lote — Peticiona.AI" }] }),
  component: HistoricoLote,
});

function HistoricoLote() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: pieces = [], isLoading } = useQuery({
    queryKey: ["historico-lote", search, status],
    queryFn: async () => {
      let q = supabase.from("pieces").select("id,title,status,piece_type,updated_at").order("updated_at", { ascending: false }).limit(200);
      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
      if (status !== "all") q = q.eq("status", status as any);
      const { data } = await q;
      return data ?? [];
    },
  });

  useEffect(() => setSelected(new Set()), [search, status]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Excluir ${selected.size} peça(s)?`)) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from("pieces").delete().in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} peça(s) excluída(s)`);
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["historico-lote"] });
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Histórico de Lote</h1>
        <p className="text-sm text-muted-foreground">Todas as peças geradas, com filtros e ações em massa.</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Input placeholder="Buscar por título..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-border bg-background px-2 text-sm">
          <option value="all">Todos status</option>
          <option value="draft">Rascunho</option>
          <option value="ready">Pronta</option>
          <option value="archived">Arquivada</option>
        </select>
        <div className="flex-1" />
        <Button variant="destructive" disabled={selected.size === 0} onClick={bulkDelete}>
          <Trash2 className="h-4 w-4 mr-2" /> Excluir ({selected.size})
        </Button>
      </div>
      <Card className="glass border-border/50 p-2">
        {isLoading ? (
          <p className="p-3 text-sm text-muted-foreground">Carregando…</p>
        ) : pieces.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">Nenhuma peça encontrada.</p>
        ) : (
          <div className="divide-y divide-border/40">
            {pieces.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 px-2 py-2 text-sm">
                <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                <FileText className="h-4 w-4 text-muted-foreground" />
                <Link to="/pecas/$id" params={{ id: p.id }} className="flex-1 truncate hover:underline">
                  {p.title}
                </Link>
                <Badge variant="outline">{p.piece_type}</Badge>
                <Badge>{p.status}</Badge>
                <span className="text-xs text-muted-foreground w-32 text-right">
                  {new Date(p.updated_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}