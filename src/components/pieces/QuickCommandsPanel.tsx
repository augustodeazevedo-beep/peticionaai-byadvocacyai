import { useMemo, useState } from "react";
import { Search, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { QUICK_COMMANDS, type QuickCommand } from "@/lib/quickCommands";

export function QuickCommandsPanel({
  onSelect,
}: {
  onSelect: (cmd: QuickCommand) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return QUICK_COMMANDS;
    return QUICK_COMMANDS.filter(
      (c) =>
        c.slug.toLowerCase().includes(term) ||
        c.label.toLowerCase().includes(term) ||
        c.description.toLowerCase().includes(term) ||
        c.category.toLowerCase().includes(term),
    );
  }, [q]);

  return (
    <Card className="glass border-border/50 p-4 sticky top-20">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground">
          <Zap className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Comandos Rápidos</h3>
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Skills Jurídicas
          </p>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar comando..."
          className="h-8 pl-7 text-xs"
        />
      </div>

      <TooltipProvider delayDuration={250}>
        <div className="space-y-1.5">
          {filtered.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              Nenhum comando encontrado.
            </p>
          )}
          {filtered.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <Tooltip key={cmd.slug}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onSelect(cmd)}
                    className="group w-full rounded-lg border border-border/60 bg-card/40 p-2.5 text-left transition hover:border-accent/50 hover:bg-secondary/50"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-secondary/70 group-hover:bg-accent/20">
                        <Icon className="h-3.5 w-3.5 text-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <code className="font-mono text-[11px] text-accent">{cmd.slug}</code>
                        </div>
                        <p className="mt-0.5 truncate text-xs font-medium">{cmd.label}</p>
                        <Badge
                          variant="outline"
                          className="mt-1 h-4 px-1.5 text-[9px] uppercase tracking-wide"
                        >
                          {cmd.category}
                        </Badge>
                      </div>
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p className="text-xs">{cmd.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </Card>
  );
}