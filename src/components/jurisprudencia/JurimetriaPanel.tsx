import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import type { Decision } from "@/lib/jurisprudencia.functions";
import { BarChart3 } from "lucide-react";

type Props = { decisions: Decision[]; total: number };

function topN(map: Map<string, number>, n: number) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export function JurimetriaPanel({ decisions, total }: Props) {
  const stats = useMemo(() => {
    const orgs = new Map<string, number>();
    const rels = new Map<string, number>();
    const years = new Map<string, number>();
    for (const d of decisions) {
      if (d.judging_body) orgs.set(d.judging_body, (orgs.get(d.judging_body) ?? 0) + 1);
      if (d.rapporteur) rels.set(d.rapporteur, (rels.get(d.rapporteur) ?? 0) + 1);
      const y = (d.judgment_date || d.publication_date || "").slice(0, 4);
      if (/^\d{4}$/.test(y)) years.set(y, (years.get(y) ?? 0) + 1);
    }
    return {
      orgs: topN(orgs, 6),
      rels: topN(rels, 6),
      years: [...years.entries()].sort((a, b) => Number(b[0]) - Number(a[0])).slice(0, 8),
    };
  }, [decisions]);

  const max = (rows: Array<[string, number]>) => rows.reduce((m, [, v]) => Math.max(m, v), 1);

  return (
    <Card className="border-border/50 bg-card/60 p-4 backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold">Jurimetria — página atual</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {decisions.length} de {total.toLocaleString("pt-BR")} resultados
        </span>
      </div>

      {decisions.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Execute uma busca para visualizar a jurimetria.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Distribution title="Por órgão julgador" rows={stats.orgs} max={max(stats.orgs)} />
          <Distribution title="Por relator" rows={stats.rels} max={max(stats.rels)} />
          <Distribution title="Por ano" rows={stats.years} max={max(stats.years)} />
        </div>
      )}
    </Card>
  );
}

function Distribution({
  title,
  rows,
  max,
}: {
  title: string;
  rows: Array<[string, number]>;
  max: number;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">—</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map(([label, count]) => (
            <li key={label} className="text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate" title={label}>
                  {label}
                </span>
                <span className="font-mono text-muted-foreground">{count}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary/40">
                <div
                  className="h-full bg-gradient-brand"
                  style={{ width: `${Math.max(6, (count / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}