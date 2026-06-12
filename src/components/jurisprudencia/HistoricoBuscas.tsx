import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { History, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  listBuscasRecentes,
  clearHistoricoJurisprudencia,
} from "@/lib/jurisprudencia.functions";
import { labelForCourt } from "@/lib/jurisprudenciaTribunais";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Item = {
  id: string;
  query: string;
  court: string | null;
  page: number;
  total_results: number | null;
  executed_at: string;
};

type Props = {
  onPick: (item: Item) => void;
};

export function HistoricoBuscas({ onPick }: Props) {
  const fetchList = useServerFn(listBuscasRecentes);
  const clearAll = useServerFn(clearHistoricoJurisprudencia);
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["jurisprudencia-historico"],
    queryFn: () => fetchList(),
    staleTime: 30_000,
  });

  async function onClear() {
    if (!confirm("Apagar todo o histórico de buscas?")) return;
    try {
      await clearAll();
      qc.invalidateQueries({ queryKey: ["jurisprudencia-historico"] });
      toast.success("Histórico limpo");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao limpar");
    }
  }

  return (
    <Card className="border-border/50 bg-card/60 p-4 backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <History className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold">Histórico</h2>
        {data.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="ml-auto h-7 gap-1 text-xs text-muted-foreground"
          >
            <Trash2 className="h-3 w-3" /> Limpar
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando…</p>
      ) : data.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Suas buscas recentes aparecerão aqui.
        </p>
      ) : (
        <ul className="space-y-1">
          {(data as Item[]).map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => onPick(it)}
                className="group flex w-full flex-col gap-0.5 rounded-md border border-transparent px-2 py-1.5 text-left transition hover:border-border/60 hover:bg-secondary/40"
              >
                <span className="flex items-center gap-1.5 text-xs">
                  <Search className="h-3 w-3 text-muted-foreground group-hover:text-accent" />
                  <span className="truncate font-medium">{it.query}</span>
                </span>
                <span className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>
                    {labelForCourt(it.court).split(" — ")[0]}
                    {typeof it.total_results === "number" ? ` · ${it.total_results} res.` : ""}
                  </span>
                  <span>
                    {formatDistanceToNow(new Date(it.executed_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}