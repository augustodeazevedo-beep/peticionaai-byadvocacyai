import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Save, RotateCcw, Users } from "lucide-react";
import {
  getDetectAiPrefs,
  saveDetectAiPrefs,
  resetDetectAiPrefs,
  DEFAULT_PREFS,
  RULE_KEYS,
  type DetectAiPrefs,
  type BlockThreshold,
} from "@/lib/detectai.functions";
import type { AuditCategory, AuditSeverity } from "@/lib/audit/types";

export const Route = createFileRoute("/_authenticated/configuracoes/detect-ai")({
  head: () => ({ meta: [{ title: "Detect.AI — Configurações" }] }),
  component: DetectAiConfigPage,
});

const CATEGORY_LABEL: Record<AuditCategory, string> = {
  prompt_injection: "Prompt injection",
  jailbreak: "Jailbreak / bypass ético",
  pii_leak: "Vazamento de PII (CPF/RG)",
  fake_citation: "Leis / artigos citados inexistentes",
  fake_jurisprudence: "Súmulas e precedentes inexistentes",
  hallucination: "Alucinação (auditor LLM)",
};

function DetectAiConfigPage() {
  const load = useServerFn(getDetectAiPrefs);
  const save = useServerFn(saveDetectAiPrefs);
  const reset = useServerFn(resetDetectAiPrefs);
  const [prefs, setPrefs] = useState<DetectAiPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allowlistText, setAllowlistText] = useState("");

  useEffect(() => {
    load()
      .then((p) => {
        setPrefs(p);
        setAllowlistText((p.allowlist_patterns ?? []).join("\n"));
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, [load]);

  if (loading || !prefs) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const update = (patch: Partial<DetectAiPrefs>) =>
    setPrefs((p) => (p ? { ...p, ...patch } : p));

  async function onSave() {
    if (!prefs) return;
    const patterns = allowlistText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const p of patterns) {
      try { new RegExp(p); } catch { toast.error(`Regex inválida: ${p}`); return; }
    }
    setSaving(true);
    try {
      await save({ data: { ...prefs, allowlist_patterns: patterns } });
      toast.success("Preferências do Detect.AI salvas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function onReset() {
    if (!confirm("Restaurar padrões do Detect.AI?")) return;
    setSaving(true);
    try {
      await reset();
      setPrefs(DEFAULT_PREFS);
      setAllowlistText("");
      toast.success("Preferências restauradas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <header className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Detect.AI</h1>
          <p className="text-sm text-muted-foreground">
            Ajuste o nível de bloqueio e quais tipos de risco devem ser validados nas suas peças.
          </p>
        </div>
      </header>

      <Card className="glass p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Bloqueio</h2>
            <p className="text-xs text-muted-foreground">Severidade mínima que impede finalizar/exportar.</p>
          </div>
          <Select
            value={prefs.block_threshold}
            onValueChange={(v) => update({ block_threshold: v as BlockThreshold })}
          >
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Nunca bloquear</SelectItem>
              <SelectItem value="low">Low (mais rígido)</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High (recomendado)</SelectItem>
              <SelectItem value="critical">Critical (só extremos)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="ef">Verificar ao <strong>finalizar</strong> peça</Label>
          <Switch
            id="ef"
            checked={prefs.enforce_on_finalize}
            onCheckedChange={(v) => update({ enforce_on_finalize: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="ex">Verificar ao <strong>exportar</strong> (DOCX/PDF/HTML)</Label>
          <Switch
            id="ex"
            checked={prefs.enforce_on_export}
            onCheckedChange={(v) => update({ enforce_on_export: v })}
          />
        </div>
      </Card>

      <Card className="glass p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Auditor LLM (Stage D)</h2>
            <p className="text-xs text-muted-foreground">
              Detecta alucinações e contradições — consome tokens do Lovable AI.
            </p>
          </div>
          <Switch
            checked={prefs.llm_auditor_enabled}
            onCheckedChange={(v) => update({ llm_auditor_enabled: v })}
          />
        </div>
      </Card>

      <Card className="glass p-5 space-y-2">
        <h2 className="font-semibold">Detectores por tipo de risco</h2>
        <p className="text-xs text-muted-foreground mb-2">
          Ative/desative e defina a severidade padrão de cada detector.
        </p>
        <div className="divide-y divide-border/60">
          {RULE_KEYS.map((key) => {
            const rule = prefs.rules[key] ?? { enabled: true, severity: "medium" };
            return (
              <div key={key} className="flex items-center justify-between gap-3 py-3">
                <div className="flex-1">
                  <div className="text-sm font-medium">{CATEGORY_LABEL[key]}</div>
                  <div className="text-xs text-muted-foreground">{key}</div>
                </div>
                <Select
                  value={rule.severity}
                  disabled={!rule.enabled}
                  onValueChange={(v) =>
                    update({
                      rules: {
                        ...prefs.rules,
                        [key]: { ...rule, severity: v as AuditSeverity },
                      },
                    })
                  }
                >
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">low</SelectItem>
                    <SelectItem value="medium">medium</SelectItem>
                    <SelectItem value="high">high</SelectItem>
                    <SelectItem value="critical">critical</SelectItem>
                  </SelectContent>
                </Select>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(v) =>
                    update({
                      rules: { ...prefs.rules, [key]: { ...rule, enabled: v } },
                    })
                  }
                />
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="glass p-5 space-y-2">
        <h2 className="font-semibold">Allowlist (suprimir falso-positivo)</h2>
        <p className="text-xs text-muted-foreground">
          Uma expressão regular por linha. Findings cujo trecho casar são silenciosamente descartados.
        </p>
        <Textarea
          value={allowlistText}
          onChange={(e) => setAllowlistText(e.target.value)}
          rows={5}
          placeholder={"exemplo:\nCPF meramente ilustrativo\n^Súmula\\s+13\\s+STF$"}
          className="font-mono text-xs"
        />
      </Card>

      <Card className="glass p-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" /> Whitelist por cliente
          </h2>
          <p className="text-xs text-muted-foreground">
            Aprove citações e trechos específicos por cliente do escritório e
            reduza falsos positivos nas auditorias das peças desse caso.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/configuracoes/detect-ai-whitelist">Gerenciar</Link>
        </Button>
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onReset} disabled={saving}>
          <RotateCcw className="mr-2 h-4 w-4" /> Restaurar padrões
        </Button>
        <Button onClick={onSave} disabled={saving} className="bg-gradient-brand text-primary-foreground">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}