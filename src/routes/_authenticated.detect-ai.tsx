import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Play,
  Paperclip,
  Loader2,
  Clock,
  Settings2,
  Bug,
  Scale,
  Ghost,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  auditPasteText,
  listDetectAiChecks,
  type DetectAiCheckRow,
  type DetectAiCheckListItem,
} from "@/lib/audit.functions";
import type { AuditFinding } from "@/lib/audit/types";

export const Route = createFileRoute("/_authenticated/detect-ai")({
  head: () => ({
    meta: [
      { title: "Detect.AI — Auditoria de textos de IA" },
      {
        name: "description",
        content:
          "Auditoria cética de respostas geradas por IA: injeção de prompt, jailbreak, citações e jurisprudência falsas e alucinações.",
      },
    ],
  }),
  component: DetectAiPage,
});

const MAX = 30_000;

const CAT_LABEL: Record<AuditFinding["category"], string> = {
  prompt_injection: "Prompt injection",
  jailbreak: "Jailbreak",
  pii_leak: "PII exposta",
  fake_citation: "Citação suspeita",
  fake_jurisprudence: "Jurisprudência suspeita",
  hallucination: "Alucinação",
};
const CAT_ICON: Record<AuditFinding["category"], React.ComponentType<{ className?: string }>> = {
  prompt_injection: Bug,
  jailbreak: Bug,
  pii_leak: AlertTriangle,
  fake_citation: Scale,
  fake_jurisprudence: Scale,
  hallucination: Ghost,
};
const SEV_STYLE: Record<AuditFinding["severity"], string> = {
  low: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  medium: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  high: "bg-orange-500/10 text-orange-300 border-orange-500/30",
  critical: "bg-red-500/10 text-red-300 border-red-500/30",
};

function scoreColor(score: number) {
  if (score >= 85) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

function DetectAiPage() {
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DetectAiCheckRow | null>(null);
  const [history, setHistory] = useState<DetectAiCheckListItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const run = useServerFn(auditPasteText);
  const listFn = useServerFn(listDetectAiChecks);

  useEffect(() => {
    listFn()
      .then((rows) => setHistory(rows))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [listFn]);

  const len = text.length;
  const disabled = running || len === 0 || len > MAX;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const okExt = /\.(txt|md)$/i.test(f.name);
    if (!okExt) {
      toast.error("Envie um arquivo .txt ou .md");
      return;
    }
    const content = await f.text();
    if (content.length > MAX) {
      toast.error(`Arquivo excede ${MAX.toLocaleString("pt-BR")} caracteres`);
      return;
    }
    setText(content);
  }

  async function onRun() {
    if (disabled) return;
    setRunning(true);
    setResult(null);
    try {
      const row = await run({ data: { text } });
      setResult(row);
      // refresh history
      const rows = await listFn();
      setHistory(rows);
      toast.success("Verificação concluída");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao verificar");
    } finally {
      setRunning(false);
    }
  }

  const findings = (result?.findings ?? []).filter((f) => !f.dismissed);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <header className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/30">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Detect.AI</h1>
          <p className="text-sm text-muted-foreground">
            Auditoria cética de textos gerados por IA — antes de protocolar, revisar ou publicar.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/configuracoes/detect-ai">
            <Settings2 className="mr-2 h-4 w-4" /> Ajustar regras
          </Link>
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="glass border-border/50 p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Detect.AI</h2>
            <p className="text-sm text-muted-foreground">
              Cole a resposta gerada por IA (petição, parecer, análise, chat) e o Detect.AI aponta
              injeção de prompt, jailbreak, citação/jurisprudência falsa e alucinação — com trecho,
              severidade e correção sugerida.
            </p>
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            placeholder="Cole aqui o texto a auditar…"
            className="min-h-[380px] font-mono text-sm"
          />

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                className="hidden"
                onChange={handleFile}
              />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Paperclip className="mr-2 h-4 w-4" /> Anexar .txt / .md
              </Button>
            </div>
            <span
              className={`text-xs font-mono ${
                len > MAX ? "text-red-400" : "text-muted-foreground"
              }`}
            >
              {len.toLocaleString("pt-BR")} / {MAX.toLocaleString("pt-BR")}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              O texto é enviado ao motor de verificação do Detect.AI e persistido no seu histórico.
            </p>
            <Button
              onClick={onRun}
              disabled={disabled}
              className="bg-gradient-brand text-primary-foreground"
            >
              {running ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Iniciar verificação
            </Button>
          </div>

          {result && (
            <div className="space-y-3 pt-4 border-t border-border/40">
              <div className="flex items-center gap-3">
                <div
                  className={`h-14 w-14 rounded-full border-2 border-current flex items-center justify-center font-mono ${scoreColor(
                    result.score,
                  )}`}
                >
                  {result.score}
                </div>
                <div>
                  <div className="font-semibold">
                    {findings.length === 0
                      ? "Nenhum risco relevante detectado."
                      : `${findings.length} achado(s)`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    modelo {result.model ?? "—"}
                  </div>
                </div>
              </div>

              {findings.map((f) => {
                const Icon = CAT_ICON[f.category];
                return (
                  <Card key={f.id} className="glass border-border/50 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium">{CAT_LABEL[f.category]}</span>
                      <Badge variant="outline" className={SEV_STYLE[f.severity]}>
                        {f.severity}
                      </Badge>
                      {typeof f.confidence === "number" && (
                        <span className="text-[10px] text-muted-foreground">
                          conf. {Math.round(f.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    <blockquote className="text-xs italic border-l-2 border-border/60 pl-2 text-foreground/80">
                      “{f.snippet.length > 240 ? f.snippet.slice(0, 240) + "…" : f.snippet}”
                    </blockquote>
                    <p className="text-xs text-muted-foreground">{f.explanation}</p>
                    {f.suggested_fix && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Sugestão: </span>
                        <span className="font-mono">{f.suggested_fix}</span>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="glass border-border/50 p-5 space-y-3 h-fit">
          <div className="flex items-center gap-2 font-semibold">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Histórico recente
          </div>
          {loadingHistory ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : history.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nada verificado ainda. Suas 20 últimas verificações aparecem aqui.
            </p>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id}>
                  <button
                    onClick={() =>
                      setResult({
                        id: h.id,
                        user_id: "",
                        text_preview: h.text_preview,
                        score: h.score,
                        findings: h.findings,
                        model: h.model,
                        stages: null,
                        content_hash: null,
                        created_at: h.created_at,
                      })
                    }
                    className="w-full text-left rounded-md border border-border/40 p-2 hover:bg-muted/40 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-mono ${scoreColor(h.score)}`}>
                        {h.score}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(h.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate mt-1">
                      {h.text_preview.slice(0, 80) || "—"}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}