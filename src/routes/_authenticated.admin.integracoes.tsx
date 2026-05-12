import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { checkIsAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { DEFAULT_COGNITIVE_OS } from "@/lib/cognitiveOs";

export const Route = createFileRoute("/_authenticated/admin/integracoes")({
  head: () => ({ meta: [{ title: "Integrações — Admin" }] }),
  beforeLoad: async () => {
    try {
      const { isAdmin } = await checkIsAdmin();
      if (!isAdmin) throw redirect({ to: "/dashboard" });
    } catch (e) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminIntegracoes,
});

type Setting = { key: string; value: string | null; description: string | null };

const KEY_ORDER = [
  "peticiona_persona",
  "peticiona_rules_format",
  "peticiona_rules_citation",
  "peticiona_rules_antihalucinacao",
  "peticiona_structure",
  "peticiona_checklist_final",
  "peticiona_shadow_cabinet",
  "mike_endpoint",
  "mike_org",
  "mike_model",
];

function AdminIntegracoes() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [cogJson, setCogJson] = useState<string>("");
  const [cogMeta, setCogMeta] = useState<{ updated_at?: string; updated_by?: string | null }>({});
  const [cogSaving, setCogSaving] = useState(false);
  const [cogError, setCogError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Acesso restrito ao administrador");
      navigate({ to: "/dashboard" });
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("system_settings").select("*").then(({ data }) => {
      const map = new Map((data ?? []).map((s) => [s.key, s] as const));
      setSettings(KEY_ORDER.map((k) => map.get(k) ?? { key: k, value: "", description: null }));
      const cog = map.get("cognitive_os_config");
      if (cog?.value) {
        try {
          setCogJson(JSON.stringify(JSON.parse(cog.value), null, 2));
        } catch {
          setCogJson(cog.value);
        }
      } else {
        setCogJson(JSON.stringify(DEFAULT_COGNITIVE_OS, null, 2));
      }
      if (cog) {
        setCogMeta({
          updated_at: (cog as unknown as { updated_at?: string }).updated_at,
          updated_by: (cog as unknown as { updated_by?: string | null }).updated_by ?? null,
        });
      }
    });
  }, [isAdmin]);

  async function save(key: string, value: string) {
    setSaving(key);
    const { error } = await supabase.from("system_settings").upsert({ key, value }, { onConflict: "key" });
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success("Configuração salva");
  }

  if (!isAdmin) return null;

  function validateCog(): boolean {
    try {
      const parsed = JSON.parse(cogJson);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setCogError("JSON precisa ser um objeto.");
        return false;
      }
      const required = ["system_identity", "instruction_priority", "cognitive_protocol", "petition_structure"];
      const missing = required.filter((k) => !(k in parsed));
      if (missing.length) {
        setCogError(`Campos obrigatórios ausentes: ${missing.join(", ")}`);
        return false;
      }
      setCogError(null);
      return true;
    } catch (e) {
      setCogError(e instanceof Error ? e.message : "JSON inválido");
      return false;
    }
  }

  async function saveCog() {
    if (!validateCog()) {
      toast.error("JSON inválido. Corrija os erros antes de salvar.");
      return;
    }
    setCogSaving(true);
    const minified = JSON.stringify(JSON.parse(cogJson));
    const { error } = await supabase.from("system_settings").upsert(
      { key: "cognitive_os_config", value: minified, is_secret: false, description: "Configuração JSON do Sistema Operacional Jurídico Cognitivo" },
      { onConflict: "key" },
    );
    setCogSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Cognitive OS atualizado");
  }

  function restoreDefaultCog() {
    setCogJson(JSON.stringify(DEFAULT_COGNITIVE_OS, null, 2));
    setCogError(null);
  }

  function formatCog() {
    try {
      setCogJson(JSON.stringify(JSON.parse(cogJson), null, 2));
      setCogError(null);
    } catch (e) {
      setCogError(e instanceof Error ? e.message : "JSON inválido");
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Integrações</h1>
        <p className="text-muted-foreground">Configure persona, regras de redação e endpoint do Mike. Sem endpoint válido o sistema usa o fallback Lovable AI automaticamente.</p>
      </div>

      {settings.map((s, i) => {
        const isShort = s.key === "mike_endpoint" || s.key === "mike_org" || s.key === "mike_model";
        return (
          <Card key={s.key} className="glass border-border/50 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-mono text-sm text-primary">{s.key}</Label>
              <Button size="sm" variant="outline" onClick={() => save(s.key, s.value ?? "")} disabled={saving === s.key}>
                {saving === s.key ? "Salvando..." : "Salvar"}
              </Button>
            </div>
            {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
            {isShort ? (
              <Input value={s.value ?? ""} onChange={(e) => {
                const next = [...settings]; next[i] = { ...s, value: e.target.value }; setSettings(next);
              }} />
            ) : (
              <Textarea rows={6} value={s.value ?? ""} onChange={(e) => {
                const next = [...settings]; next[i] = { ...s, value: e.target.value }; setSettings(next);
              }} />
            )}
          </Card>
        );
      })}

      <Card className="glass border-border/50 p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <Label className="font-mono text-sm text-primary">cognitive_os_config</Label>
            <p className="text-xs text-muted-foreground">
              JSON do Sistema Operacional Jurídico Cognitivo (pipeline multi-etapas).
              {cogMeta.updated_at && (
                <> Última edição: {new Date(cogMeta.updated_at).toLocaleString("pt-BR")}.</>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={formatCog}>Formatar</Button>
            <Button size="sm" variant="ghost" onClick={validateCog}>Validar</Button>
            <Button size="sm" variant="outline" onClick={restoreDefaultCog}>Restaurar padrão</Button>
            <Button size="sm" onClick={saveCog} disabled={cogSaving} className="bg-gradient-brand text-primary-foreground">
              {cogSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
        <Textarea
          rows={24}
          value={cogJson}
          onChange={(e) => { setCogJson(e.target.value); if (cogError) setCogError(null); }}
          className="font-mono text-xs"
          spellCheck={false}
        />
        {cogError && (
          <p className="text-xs text-destructive">{cogError}</p>
        )}
      </Card>
    </div>
  );
}