import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Cpu, KeyRound, ExternalLink } from "lucide-react";
import { AdvogaIntegrationCard } from "@/components/integrations/AdvogaIntegrationCard";
import { InventariaIntegrationCard } from "@/components/integrations/InventariaIntegrationCard";

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
    const base = {
      user_id: user.id,
      provider: "mike",
      endpoint: form.endpoint.trim(),
      model: form.model.trim() || null,
      monthly_token_cap: form.monthly_token_cap,
      is_active: form.is_active,
    };
    const payload = form.api_key_encrypted.trim()
      ? { ...base, api_key_encrypted: form.api_key_encrypted.trim() }
      : base;
    const { error } = await supabase.from("user_integrations").upsert(payload, { onConflict: "user_id,provider" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Integração Mike salva.");
    setHasKey(true);
    setForm((f) => ({ ...f, api_key_encrypted: "" }));
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
              Armazenada com RLS estrita; apenas você vê. Nunca exposta ao navegador depois de salva.
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
    </div>
  );
}