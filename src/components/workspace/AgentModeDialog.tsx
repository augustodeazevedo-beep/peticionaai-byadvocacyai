import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useWorkspace, type ThinkingLevel, type Verbosity } from "@/stores/workspace";
import { Brain, MessageCircleQuestion, FileSearch, Gavel, BookOpen, Box, Calculator, FileCheck2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg border border-border/60 bg-card/40 p-1">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            "rounded-md py-1.5 text-xs font-medium transition",
            value === o.v ? "bg-gradient-brand text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ icon: Icon, label, hint, checked, onChange }: { icon: typeof Brain; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/40 bg-card/30 p-3">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 text-accent" />
        <div>
          <p className="text-sm font-medium">{label}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function AgentModeDialog({ open, onOpenChange }: Props) {
  const thinking = useWorkspace((s) => s.thinking);
  const setField = useWorkspace((s) => s.setField);
  const agent = useWorkspace((s) => s.agent);
  const setAgent = useWorkspace((s) => s.setAgent);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-gradient-brand">Modo Agêntico</span>
            <span className="text-sm font-normal text-muted-foreground">Como o agente trabalha</span>
          </DialogTitle>
          <DialogDescription>Ajuste pesquisas, interação e parâmetros de geração.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="space-y-3 rounded-xl border border-border/40 bg-card/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Fase 1 · Planejamento</p>
            <div>
              <Label className="mb-2 flex items-center gap-2 text-sm"><Brain className="h-4 w-4" /> Pensamento</Label>
              <Segmented<ThinkingLevel>
                value={thinking}
                onChange={(v) => setField("thinking", v)}
                options={[
                  { v: "baixo", label: "Baixo" },
                  { v: "medio", label: "Médio" },
                  { v: "alto", label: "Alto" },
                ]}
              />
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-border/40 bg-card/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Fases 2 · 3 · Interação</p>
            <Toggle icon={MessageCircleQuestion} label="Ativar perguntas" hint="Pede esclarecimentos em pontos de decisão" checked={agent.ask_questions} onChange={(v) => setAgent({ ask_questions: v })} />
            <Toggle icon={FileCheck2} label="Aprovar roteiro" hint="Aprova o plano automaticamente após espera" checked={agent.approve_outline} onChange={(v) => setAgent({ approve_outline: v })} />
          </section>

          <section className="space-y-3 rounded-xl border border-border/40 bg-card/30 p-4 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Fase 4 · Pesquisas</p>
            <div className="grid gap-3 md:grid-cols-2">
              <Toggle icon={FileSearch} label="Referência rastreável" hint="Rastreia a origem de cada informação" checked={agent.traceable_references} onChange={(v) => setAgent({ traceable_references: v })} />
              <Toggle icon={Gavel} label="Jurisprudência" hint="Busca decisões judiciais relevantes" checked={agent.use_jurisprudence} onChange={(v) => setAgent({ use_jurisprudence: v })} />
              <Toggle icon={BookOpen} label="Legislação" hint="Busca leis e normas aplicáveis" checked={agent.use_legislation} onChange={(v) => setAgent({ use_legislation: v })} />
              <Toggle icon={Box} label="Modelos" hint="Peças e modelos de referência" checked={agent.use_models} onChange={(v) => setAgent({ use_models: v })} />
              <Toggle icon={Calculator} label="Contadoria" hint="Cálculos judiciais e financeiros" checked={agent.use_calculator} onChange={(v) => setAgent({ use_calculator: v })} />
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-border/40 bg-card/30 p-4 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Fase 5 · Redação</p>
            <Label className="text-sm">Verbosidade</Label>
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-border/60 bg-card/40 p-1">
              {(["curto", "longo"] as Verbosity[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAgent({ verbosity: v })}
                  className={cn(
                    "rounded-md py-1.5 text-xs font-medium transition capitalize",
                    agent.verbosity === v ? "bg-gradient-brand text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}