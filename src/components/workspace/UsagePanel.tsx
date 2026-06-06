import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/stores/workspace";
import {
  estimateTokens,
  TOKEN_LIMIT,
  tokenStatus,
  pdfFileToMarkdown,
} from "@/lib/tokenEstimate";
import { FilePlus2, FileUp, Plug, Loader2 } from "lucide-react";

const MSG_WARN_THRESHOLD = 20;

export function UsagePanel() {
  const { user } = useAuth();
  const instructions = useWorkspace((s) => s.instructions);
  const contextItems = useWorkspace((s) => s.contextItems);
  const reset = useWorkspace((s) => s.reset);
  const addContextItem = useWorkspace((s) => s.addContextItem);

  const messageCount = contextItems.length;
  const usedTokens = useMemo(() => {
    let t = estimateTokens(instructions);
    for (const c of contextItems) t += estimateTokens(c.preview ?? c.title);
    return t;
  }, [instructions, contextItems]);

  const ratio = Math.min(1, usedTokens / TOKEN_LIMIT);
  const status = tokenStatus(usedTokens);

  const warned = useRef(false);
  useEffect(() => {
    if (messageCount > MSG_WARN_THRESHOLD && !warned.current) {
      warned.current = true;
      toast.info(
        "Dica: Inicie um novo chat para economizar tokens e manter a qualidade das respostas.",
        { duration: 6000 },
      );
    }
    if (messageCount <= MSG_WARN_THRESHOLD) warned.current = false;
  }, [messageCount]);

  const [integrations, setIntegrations] = useState<
    Array<{ id: string; provider: string; is_active: boolean }>
  >([]);
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_integrations")
      .select("id, provider, is_active")
      .eq("user_id", user.id)
      .then(({ data }) => setIntegrations((data ?? []) as typeof integrations));
  }, [user]);

  async function toggleIntegration(id: string, current: boolean) {
    setIntegrations((arr) =>
      arr.map((i) => (i.id === id ? { ...i, is_active: !current } : i)),
    );
    await supabase.from("user_integrations").update({ is_active: !current }).eq("id", id);
  }

  const [converting, setConverting] = useState(false);
  async function onPdfPick(file: File) {
    setConverting(true);
    try {
      const md = await pdfFileToMarkdown(file);
      const savedTokens = Math.max(0, estimateTokens(`PDF ${file.name}`) * 8);
      addContextItem({
        id: `pdf-md-${Date.now()}`,
        type: "documento",
        title: file.name.replace(/\.pdf$/i, "") + ".md",
        preview: md,
      });
      toast.success(
        `PDF convertido para Markdown (${md.length.toLocaleString("pt-BR")} chars). ` +
          `Economia estimada de ~${savedTokens.toLocaleString("pt-BR")} tokens.`,
      );
    } catch (e) {
      console.error(e);
      toast.error("Falha ao converter PDF. Tente outro arquivo.");
    } finally {
      setConverting(false);
    }
  }

  function onNewChat() {
    reset();
    toast.success("Novo chat iniciado.");
  }

  const ringColor =
    status === "critical"
      ? "text-red-400"
      : status === "warn"
        ? "text-amber-400"
        : "text-accent";

  const C = 2 * Math.PI * 38; // raio 38
  const dash = C * (1 - ratio);

  return (
    <Card className="glass border-border/50 p-4 space-y-4 sticky top-20">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-accent">Controle de uso</p>
        <h3 className="text-sm font-semibold">Tokens da conversa</h3>
      </div>

      <div className="flex items-center gap-4">
        <svg width="92" height="92" viewBox="0 0 92 92" className="-rotate-90">
          <circle cx="46" cy="46" r="38" stroke="currentColor" strokeWidth="6" fill="none" className="text-border" />
          <circle
            cx="46"
            cy="46"
            r="38"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            strokeDasharray={C}
            strokeDashoffset={dash}
            strokeLinecap="round"
            className={`${ringColor} transition-all`}
          />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-semibold tabular-nums">
            {Math.round(ratio * 100)}
            <span className="text-sm text-muted-foreground">%</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {usedTokens.toLocaleString("pt-BR")} / {TOKEN_LIMIT.toLocaleString("pt-BR")} tokens
          </p>
          <p className="text-[10px] text-muted-foreground">{messageCount} itens no contexto</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onNewChat}>
          <FilePlus2 className="h-3.5 w-3.5" /> Novo chat
        </Button>
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            disabled={converting}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPdfPick(f);
              e.currentTarget.value = "";
            }}
          />
          <span className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent/10">
            {converting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileUp className="h-3.5 w-3.5" />
            )}
            PDF → MD
          </span>
        </label>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          <Plug className="h-3 w-3" /> MCPs ativos
        </p>
        {integrations.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma integração configurada.</p>
        ) : (
          <div className="space-y-1">
            {integrations.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between rounded-md border border-border/40 bg-card/40 px-2 py-1.5 text-xs"
              >
                <span className="capitalize">{i.provider}</span>
                <button
                  type="button"
                  onClick={() => toggleIntegration(i.id, i.is_active)}
                  className={
                    "h-5 px-2 rounded text-[10px] font-semibold uppercase tracking-wide " +
                    (i.is_active
                      ? "bg-accent/20 text-accent"
                      : "bg-muted text-muted-foreground")
                  }
                >
                  {i.is_active ? "Ativo" : "Off"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}