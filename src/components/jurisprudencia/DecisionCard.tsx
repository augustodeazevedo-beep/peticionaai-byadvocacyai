import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Plus, Check, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import type { Decision } from "@/lib/jurisprudencia.functions";
import { labelForCourt } from "@/lib/jurisprudenciaTribunais";

type Props = {
  decision: Decision;
  selected?: boolean;
  onToggleSelect?: (d: Decision) => void;
  compact?: boolean;
};

export function DecisionCard({ decision, selected, onToggleSelect, compact }: Props) {
  const [open, setOpen] = useState(false);
  const d = decision;
  const ementa = (d.syllabus || "").trim();
  const isLong = ementa.length > 320;
  const visible = open || !isLong ? ementa : ementa.slice(0, 320) + "…";

  async function copyEmenta() {
    try {
      await navigator.clipboard.writeText(ementa);
      toast.success("Ementa copiada");
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <Card className="border-border/50 bg-card/60 p-4 backdrop-blur transition hover:border-accent/40">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-accent/40 bg-accent/10 text-accent">
              {labelForCourt(d.court).split(" — ")[0]}
            </Badge>
            {d.decision_type && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {d.decision_type}
              </Badge>
            )}
            {d.process_number && (
              <span className="font-mono text-xs text-muted-foreground">
                {d.process_number}
              </span>
            )}
          </div>
          <div className="mt-1.5 grid grid-cols-1 gap-x-4 gap-y-0.5 text-xs text-muted-foreground sm:grid-cols-2">
            {d.judging_body && <span>Órgão: <span className="text-foreground/80">{d.judging_body}</span></span>}
            {d.rapporteur && <span>Relator: <span className="text-foreground/80">{d.rapporteur}</span></span>}
            {d.judgment_date && <span>Julgamento: <span className="text-foreground/80">{d.judgment_date}</span></span>}
            {d.publication_date && <span>Publicação: <span className="text-foreground/80">{d.publication_date}</span></span>}
          </div>
        </div>
      </div>

      <p
        className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90"
        aria-expanded={open}
      >
        {visible || <span className="italic text-muted-foreground">Sem ementa disponível.</span>}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isLong && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen((o) => !o)}
            className="gap-1 text-xs"
            aria-expanded={open}
          >
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {open ? "Ver menos" : "Ver mais"}
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={copyEmenta} className="gap-1 text-xs">
          <Copy className="h-3.5 w-3.5" /> Copiar ementa
        </Button>
        {d.url && (
          <Button type="button" variant="outline" size="sm" asChild className="gap-1 text-xs">
            <a href={d.url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Tribunal
            </a>
          </Button>
        )}
        {onToggleSelect && (
          <Button
            type="button"
            size="sm"
            onClick={() => onToggleSelect(d)}
            className={
              selected
                ? "ml-auto gap-1 text-xs bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                : "ml-auto gap-1 text-xs bg-gradient-brand text-primary-foreground"
            }
          >
            {selected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {compact ? (selected ? "Selecionada" : "Selecionar") : selected ? "No contexto da peça" : "Adicionar ao contexto"}
          </Button>
        )}
      </div>
    </Card>
  );
}