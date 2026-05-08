import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/integracoes")({
  head: () => ({ meta: [{ title: "Integrações — Admin" }] }),
  component: AdminIntegracoes,
});

type Setting = { key: string; value: string | null; description: string | null };

const KEY_ORDER = [
  "peticione_persona",
  "peticione_rules_format",
  "peticione_rules_citation",
  "peticione_rules_antihalucinacao",
  "peticione_structure",
  "peticione_checklist_final",
  "peticione_shadow_cabinet",
  "mike_endpoint",
  "mike_org",
  "mike_model",
];

function AdminIntegracoes() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

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
    </div>
  );
}