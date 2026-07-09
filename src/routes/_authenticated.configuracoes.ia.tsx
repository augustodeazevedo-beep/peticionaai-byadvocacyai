import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Cpu, KeyRound, ExternalLink, ShieldCheck, ShieldAlert, Gavel } from "lucide-react";
import { AdvogaIntegrationCard } from "@/components/integrations/AdvogaIntegrationCard";
import { InventariaIntegrationCard } from "@/components/integrations/InventariaIntegrationCard";
import { useAIGovernance } from "@/lib/aiGovernance";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getJurisprudenciaKeyStatus } from "@/lib/jurisprudencia.functions";
import { saveMikeIntegration } from "@/lib/mikeIntegration.functions";

export const Route = createFileRoute("/_authenticated/configuracoes/ia")({
  head: () => ({ meta: [{ title: "Configurações de IA — Peticiona.AI" }] }),
  component: ConfiguracoesIA,
});

type Integration = {
  endpoint: string;
  api_key_encrypted: string;
  model: string;
  monthly_token_cap: number | null;
  is_active: boolean;
};

function ConfiguracoesIA() {
  const { user, isAdmin } = useAuth();
  const { prefs, save: saveGov } = useAIGovernance();
  const jurisKeyStatus = useServerFn(getJurisprudenciaKeyStatus);
  const saveMike = useServerFn(saveMikeIntegration);
  const { data: jurisKey } = useQuery({
    queryKey: ["jurisprudencia-key-status"],
    queryFn: () => jurisKeyStatus(),
    staleTime: 60_000,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [usageMonth, setUsageMonth] = useState(0);
  const [recent, setRecent] = useState<Array<{ id: string; created_at: string; total_tokens: number; model: string | null; purpose: string | null }>>([]);
  const [form, setForm] = useState<Integration>({
    endpoint: "",
    api_key_encrypted: "",
    model: "",
    monthly_token_cap: null,
    is_active: true,
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_integrations")
        .select("endpoint, api_key_encrypted, model, monthly_token_cap, is_active")
        .eq("user_id", user.id)
        .eq("provider", "mike")
        .maybeSingle();
      if (data) {
        setForm({
          endpoint: data.endpoint ?? "",
          api_key_encrypted: "",
          model: data.model ?? "",
          monthly_token_cap: data.monthly_token_cap,
          is_active: data.is_active,
        });
        setHasKey(!!data.api_key_encrypted);
      }
      const since = new Date(); since.setDate(1); since.setHours(0,0,0,0);
      const { data: usage } = await supabase
        .from("token_usage")
        .select("total_tokens")
        .eq("user_id", user.id)
        .gte("created_at", since.toISOString());
      setUsageMonth((usage ?? []).reduce((a, r: { total_tokens: number }) => a + (r.total_tokens || 0), 0));
      const { data: recentRows } = await supabase
        .from("token_usage")
        .select("id, created_at, total_tokens, model, purpose")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setRecent((recentRows as any[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  async function save() {
    if (!user) return;
    if (!form.endpoint.trim()) return toast.error("Informe o endpoint do Mike.");
    setSaving(true);
    try {
      await saveMike({
        data: {
          endpoint: form.endpoint.trim(),
          model: form.model.trim() || null,
          monthly_token_cap: form.monthly_token_cap,
          is_active: form.is_active,
          api_key: form.api_key_encrypted.trim() || null,
        },
      });
      toast.success("Integração Mike salva.");
      if (form.api_key_encrypted.trim()) setHasKey(true);
      setForm((f) => ({ ...f, api_key_encrypted: "" }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar integração.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/60">
          <Cpu className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Configurações de IA</h1>
          <p className="text-sm text-muted-foreground">
            Use seu próprio endpoint Mike (open-source) e pague apenas o consumo de tokens.
          </p>
        </div>
      </header>

      <Card className="glass border-border/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-accent">Mike (BYOK)</p>
            <h2 className="font-semibold">Conexão com seu Mike</h2>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="active" className="text-xs text-muted-foreground">Ativa</Label>
            <Switch id="active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Endpoint (OpenAI-compatible)</Label>
            <Input
              placeholder="https://meu-mike.exemplo.com/v1/chat/completions"
              value={form.endpoint}
              onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
            />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <KeyRound className="h-3.5 w-3.5" /> API Key
              {hasKey && <span className="text-[10px] uppercase tracking-wide text-emerald-400">configurada</span>}
            </Label>
            <Input
              type="password"
              placeholder={hasKey ? "•••••••• (deixe em branco para manter)" : "sk-..."}
              value={form.api_key_encrypted}
              onChange={(e) => setForm({ ...form, api_key_encrypted: e.target.value })}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Criptografada no servidor com AES-256-GCM antes de ser armazenada. Nunca é devolvida ao navegador — para substituir, digite a nova chave.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Modelo padrão</Label>
              <Input
                placeholder="ex.: openai/gpt-4o-mini, anthropic/claude-3-5-sonnet"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </div>
            <div>
              <Label>Cota mensal de tokens (opcional)</Label>
              <Input
                type="number"
                min={0}
                placeholder="ex.: 2000000"
                value={form.monthly_token_cap ?? ""}
                onChange={(e) => setForm({ ...form, monthly_token_cap: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          </div>
          <Button onClick={save} disabled={saving} className="bg-gradient-brand text-primary-foreground">
            {saving ? "Salvando…" : "Salvar integração"}
          </Button>
        </div>
      </Card>

      <Card className="glass border-border/50 p-5">
        <p className="text-xs uppercase tracking-wide text-accent">Consumo este mês</p>
        <p className="mt-1 text-3xl font-semibold">{usageMonth.toLocaleString("pt-BR")} <span className="text-base font-normal text-muted-foreground">tokens</span></p>
        {form.monthly_token_cap ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Cota: {form.monthly_token_cap.toLocaleString("pt-BR")} ({Math.min(100, Math.round((usageMonth / form.monthly_token_cap) * 100))}%)
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Sem cota definida.</p>
        )}
      </Card>

      <Card className="glass border-border/50 p-5">
        <p className="text-xs uppercase tracking-wide text-accent">Sobre o Mike</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Mike é um runtime open-source compatível com a API OpenAI (<code className="font-mono">/v1/chat/completions</code>).
          Você pode auto-hospedar (Docker) e conectar qualquer provedor de modelos (OpenAI, Anthropic, Gemini, modelos locais).
          Assim, você paga somente os tokens consumidos no provedor escolhido.
        </p>
        <Button variant="outline" size="sm" asChild className="mt-3 gap-2">
          <a href="https://github.com/mike-ai" target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" /> Documentação Mike
          </a>
        </Button>
      </Card>

      <Card className="glass border-border/50 p-5">
        <p className="text-xs uppercase tracking-wide text-accent">Últimas chamadas</p>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma chamada registrada ainda.</p>
        ) : (
          <div className="mt-3 divide-y divide-border/40 text-sm">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-1.5">
                <span className="text-xs text-muted-foreground w-36">{new Date(r.created_at).toLocaleString("pt-BR")}</span>
                <span className="flex-1 truncate px-2">{r.purpose ?? "—"}</span>
                <span className="text-xs text-muted-foreground w-40 truncate text-right">{r.model ?? ""}</span>
                <span className="font-mono text-xs w-24 text-right">{(r.total_tokens || 0).toLocaleString("pt-BR")}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {isAdmin && <AdvogaIntegrationCard />}
      {isAdmin && <InventariaIntegrationCard />}

      <Card className="glass border-border/50 p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand">
            <Gavel className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-accent">Integração</p>
            <h2 className="font-semibold">Jurisprudências.AI</h2>
          </div>
          <span
            className={
              "ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-medium " +
              (jurisKey?.hasKey
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-amber-500/15 text-amber-300")
            }
          >
            {jurisKey?.hasKey ? "Chave configurada" : "Chave ausente"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Pesquisa estruturada de decisões dos tribunais brasileiros. A chave Bearer fica armazenada
          em segredo no servidor — nunca é exposta ao navegador. Quando configurada, a busca em
          tempo real e o gerador de peças passam a citar ementas literais (mecanismo antialucinação).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild className="gap-2">
            <a href="/jurisprudencia">
              <Gavel className="h-3.5 w-3.5" /> Abrir módulo
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-2">
            <a href="https://jurisprudencias.ai" target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Obter token
            </a>
          </Button>
        </div>
        {!jurisKey?.hasKey && (
          <p className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200/90">
            Para ativar, peça ao administrador para definir o segredo{" "}
            <code className="font-mono">JURISPRUDENCIAS_AI_API_KEY</code>.
          </p>
        )}
      </Card>

      <Card className="glass border-border/50 p-5">
        <div className="mb-4 flex items-center gap-3">
          {prefs.defensive_mode ? (
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-red-400" />
          )}
          <div>
            <p className="text-xs uppercase tracking-wide text-accent">Segurança e Governança</p>
            <h2 className="font-semibold">Proteções e supervisão de IA</h2>
          </div>
        </div>

        <div className="space-y-4">
          <GovToggle
            label="Modo Defensivo"
            description="Injeta instrução para a IA ignorar comandos ocultos em documentos enviados (mitigação de prompt injection — Nota Técnica 19/2026 CIJMG)."
            checked={prefs.defensive_mode}
            onChange={(v) => saveGov({ defensive_mode: v })}
          />
          <GovToggle
            label="Human-in-the-Loop"
            description="Exibe confirmação obrigatória de revisão humana antes de finalizar peças geradas por IA."
            checked={prefs.human_in_loop}
            onChange={(v) => saveGov({ human_in_loop: v })}
          />
          <GovToggle
            label="Chats Temporários"
            description="Não persiste o histórico da geração no banco (uso recomendado para informações sensíveis de clientes)."
            checked={prefs.temporary_chats}
            onChange={(v) => saveGov({ temporary_chats: v })}
          />
          <GovToggle
            label="Declaração de Uso de IA"
            description="Adiciona automaticamente ao rodapé de cada peça gerada uma frase declarando o uso de IA."
            checked={prefs.ai_disclosure_enabled}
            onChange={(v) => saveGov({ ai_disclosure_enabled: v })}
          />

          {prefs.ai_disclosure_enabled && (
            <div>
              <Label className="text-xs">Texto da declaração</Label>
              <Textarea
                value={prefs.ai_disclosure_text}
                onChange={(e) => saveGov({ ai_disclosure_text: e.target.value })}
                className="mt-1 min-h-[72px] text-sm"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Salvo automaticamente. Aparece como rodapé em peças exportadas.
              </p>
            </div>
          )}

          <p className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200/90">
            ⚠️ Modo Defensivo e Declaração são <strong>mitigações</strong> de risco. Não substituem a revisão técnica do advogado responsável.
          </p>
        </div>
      </Card>
    </div>
  );
}

function GovToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/40 p-3">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}