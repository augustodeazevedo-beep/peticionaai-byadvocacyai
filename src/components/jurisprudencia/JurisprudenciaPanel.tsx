import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  searchJurisprudencia,
  type Decision,
  type SearchResponse,
} from "@/lib/jurisprudencia.functions";
import { TRIBUNAIS_JURISPRUDENCIA } from "@/lib/jurisprudenciaTribunais";
import {
  JurisprudenciaSearchBar,
  type SearchFormValue,
} from "./JurisprudenciaSearchBar";
import { DecisionCard } from "./DecisionCard";
import { JurimetriaPanel } from "./JurimetriaPanel";
import { HistoricoBuscas } from "./HistoricoBuscas";
import { LookupProcessoDialog } from "./LookupProcessoDialog";

type Props = {
  selectedIds?: Set<string>;
  onToggleSelect?: (d: Decision) => void;
  compact?: boolean;
};

const INITIAL: SearchFormValue = {
  q: "",
  court_id: TRIBUNAIS_JURISPRUDENCIA[0].id,
};

export function JurisprudenciaPanel({ selectedIds, onToggleSelect, compact }: Props) {
  const [form, setForm] = useState<SearchFormValue>(INITIAL);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<SearchResponse | null>(null);

  const searchFn = useServerFn(searchJurisprudencia);
  const mutation = useMutation({
    mutationFn: (vars: SearchFormValue & { page: number }) =>
      searchFn({ data: { ...vars, page: vars.page } }),
    onSuccess: (data) => setResult(data),
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Falha na busca"),
  });

  function doSearch(targetPage = 0) {
    if (!form.q.trim()) {
      toast.error("Digite um termo de busca");
      return;
    }
    setPage(targetPage);
    mutation.mutate({ ...form, page: targetPage });
  }

  function onPickHistorico(it: {
    query: string;
    court: string | null;
    page: number;
  }) {
    const next: SearchFormValue = {
      q: it.query,
      court_id: it.court ?? TRIBUNAIS_JURISPRUDENCIA[0].id,
    };
    setForm(next);
    setPage(it.page);
    mutation.mutate({ ...next, page: it.page });
  }

  const list = result?.data ?? [];

  return (
    <div className={compact ? "grid gap-4" : "grid gap-4 lg:grid-cols-[1fr_280px]"}>
      <div className="space-y-4">
        <JurisprudenciaSearchBar
          value={form}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          onSubmit={() => doSearch(0)}
          loading={mutation.isPending}
        />

        {!compact && (
          <div className="flex justify-end">
            <LookupProcessoDialog onPick={(d) => onToggleSelect?.(d)} />
          </div>
        )}

        {mutation.isError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{(mutation.error as Error)?.message ?? "Erro na busca."}</span>
          </div>
        )}

        {result && (
          <>
            <JurimetriaPanel decisions={list} total={result.total} />

            {list.length === 0 ? (
              <p className="rounded-lg border border-border/40 bg-card/40 p-6 text-center text-sm text-muted-foreground">
                Nenhuma decisão encontrada.
              </p>
            ) : (
              <div className="space-y-3">
                {list.map((d) => (
                  <DecisionCard
                    key={d.id}
                    decision={d}
                    selected={selectedIds?.has(d.id)}
                    onToggleSelect={onToggleSelect}
                    compact={compact}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => doSearch(Math.max(0, page - 1))}
                disabled={page === 0 || mutation.isPending}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                Página {page + 1}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => doSearch(page + 1)}
                disabled={mutation.isPending || list.length === 0}
                className="gap-1"
              >
                Próxima <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {mutation.isPending && !result && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-border/40 bg-card/40 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Consultando jurisprudência…
          </div>
        )}
      </div>

      {!compact && (
        <aside className="space-y-4">
          <HistoricoBuscas onPick={onPickHistorico} />
        </aside>
      )}
    </div>
  );
}