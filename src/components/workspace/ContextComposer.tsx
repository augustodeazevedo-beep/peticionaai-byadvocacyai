import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useWorkspace, type ThinkingLevel } from "@/stores/workspace";
import { AgentModeDialog } from "./AgentModeDialog";
import { Sparkles, Mic, Settings2, AlertCircle, User, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const THINKING_LABEL: Record<ThinkingLevel, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
};

export function ContextComposer() {
  const instructions = useWorkspace((s) => s.instructions);
  const setField = useWorkspace((s) => s.setField);
  const mode = useWorkspace((s) => s.mode);
  const thinking = useWorkspace((s) => s.thinking);
  const contextItems = useWorkspace((s) => s.contextItems);
  const [agentOpen, setAgentOpen] = useState(false);

  const cycleThinking = () => {
    const order: ThinkingLevel[] = ["baixo", "medio", "alto"];
    const next = order[(order.indexOf(thinking) + 1) % order.length];
    setField("thinking", next);
  };

  const onGenerate = () => {
    if (!instructions.trim()) {
      toast.error("Escreva uma instrução para o Peticiona.AI antes de gerar.");
      return;
    }
    toast.info("Geração agêntica chega na Fase 5 do roadmap. Por ora, use Nova Peça.");
  };

  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur">
        <Textarea
          value={instructions}
          onChange={(e) => setField("instructions", e.target.value)}
          placeholder="Instruções ao Peticiona.AI para geração da peça…"
          className="min-h-[88px] resize-y border-0 bg-transparent text-sm focus-visible:ring-0"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Digite <kbd className="rounded bg-secondary px-1 py-0.5 font-mono text-[10px]">/</kbd> para prompts e{" "}
          <kbd className="rounded bg-secondary px-1 py-0.5 font-mono text-[10px]">@</kbd> para assistentes e bibliotecários
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
          <Button variant="outline" size="sm" className="gap-2">
            <User className="h-3.5 w-3.5" /> Perfil
          </Button>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-card/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setField("mode", "padrao")}
                className={cn(
                  "rounded-md px-2.5 py-1 transition",
                  mode === "padrao" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Padrão
              </button>
              <button
                type="button"
                onClick={() => setField("mode", "agentico")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition",
                  mode === "agentico" ? "bg-gradient-brand text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Agêntico <span className="ml-1 rounded bg-accent/20 px-1 text-[9px] uppercase text-accent">beta</span>
              </button>
            </div>

            <Button variant="outline" size="sm" className="gap-2" onClick={() => setAgentOpen(true)} title="Configurar modo agêntico">
              <Settings2 className="h-3.5 w-3.5" />
            </Button>

            <Button variant="outline" size="sm" className="gap-2" onClick={cycleThinking} title="Nível de pensamento">
              <BarChart3 className="h-3.5 w-3.5" /> {THINKING_LABEL[thinking]}
            </Button>

            <div
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs",
                contextItems.length === 0
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  : "border-accent/30 bg-accent/10 text-accent",
              )}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              {contextItems.length === 0 ? "Sem contexto" : `${contextItems.length} no contexto`}
            </div>

            <Button variant="outline" size="icon" className="h-8 w-8" title="Microfone (em breve)">
              <Mic className="h-3.5 w-3.5" />
            </Button>

            <Button size="sm" className="gap-2 bg-gradient-brand text-primary-foreground" onClick={onGenerate}>
              <Sparkles className="h-3.5 w-3.5" /> Gerar
            </Button>
          </div>
        </div>
      </div>

      <AgentModeDialog open={agentOpen} onOpenChange={setAgentOpen} />
    </>
  );
}