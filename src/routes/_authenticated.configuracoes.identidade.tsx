import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  brandWithDefaults,
  FONT_OPTIONS,
  loadOfficeBrand,
  saveOfficeBrand,
  type OfficeBrand,
  type LetterheadLayout,
} from "@/lib/officeBrand";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { LogoUploader } from "@/components/brand/LogoUploader";
import { toast } from "sonner";
import { Save, Palette } from "lucide-react";

export const Route = createFileRoute("/_authenticated/configuracoes/identidade")({
  head: () => ({ meta: [{ title: "Identidade do Escritório — Peticiona.AI" }] }),
  component: IdentidadePage,
});

function IdentidadePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<OfficeBrand>(brandWithDefaults(null));

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const data = await loadOfficeBrand(user.id);
        setForm(brandWithDefaults(data));
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  async function onSave() {
    if (!user) return;
    setSaving(true);
    try {
      const { user_id: _u, ...patch } = form;
      void _u;
      await saveOfficeBrand(user.id, patch);
      toast.success("Identidade do escritório salva.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof OfficeBrand>(k: K, v: OfficeBrand[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  if (loading) return <p className="text-muted-foreground">Carregando…</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Palette className="h-7 w-7" /> Identidade do Escritório
        </h1>
        <p className="text-muted-foreground">
          Aplica logo, cores, fonte e bloco de assinatura nas peças exportadas em PDF e DOCX.
        </p>
      </div>

      <Card className="glass border-border/50 p-6 space-y-6">
        <div className="space-y-2">
          <Label>Logo do escritório</Label>
          <LogoUploader
            userId={user!.id}
            value={form.logo_url}
            onChange={(url) => set("logo_url", url)}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Razão social / Nome do escritório">
            <Input value={form.firm_name ?? ""} onChange={(e) => set("firm_name", e.target.value)} />
          </Field>
          <Field label="Inscrição OAB / Sociedade">
            <Input value={form.oab_registration ?? ""} onChange={(e) => set("oab_registration", e.target.value)} placeholder="OAB/UF 12.345-S" />
          </Field>
          <Field label="Endereço">
            <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
          </Field>
          <Field label="Telefone">
            <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="E-mail">
            <Input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Website">
            <Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
          </Field>
          <Field label="Cidade padrão (assinatura)">
            <Input value={form.default_city ?? ""} onChange={(e) => set("default_city", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card className="glass border-border/50 p-6 space-y-6">
        <h2 className="font-semibold">Aparência</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Cor primária">
            <ColorInput value={form.primary_color ?? "#283753"} onChange={(v) => set("primary_color", v)} />
          </Field>
          <Field label="Cor secundária">
            <ColorInput value={form.secondary_color ?? "#6E59A5"} onChange={(v) => set("secondary_color", v)} />
          </Field>
          <Field label="Fonte">
            <Select value={form.font_family ?? "Arial"} onValueChange={(v) => set("font_family", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
            <div>
              <Label className="text-sm">Aplicar papel timbrado</Label>
              <p className="text-[11px] text-muted-foreground">Cabeçalho com logo + dados em todas as páginas.</p>
            </div>
            <Switch checked={form.letterhead_enabled} onCheckedChange={(v) => set("letterhead_enabled", v)} />
          </div>
          <Field label="Layout do timbrado">
            <Select value={form.letterhead_layout} onValueChange={(v) => set("letterhead_layout", v as LetterheadLayout)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="topo">Topo (logo + dados)</SelectItem>
                <SelectItem value="lateral">Lateral (logo + dados à esquerda)</SelectItem>
                <SelectItem value="rodape">Apenas rodapé</SelectItem>
                <SelectItem value="minimal">Minimalista (apenas logo)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="glass border-border/50 p-6 space-y-6">
        <h2 className="font-semibold">Fechamento e assinatura</h2>
        <Field label="Fechamento padrão">
          <Input value={form.closing_text ?? ""} onChange={(e) => set("closing_text", e.target.value)} />
        </Field>
        <Field label="Bloco de assinatura (uma linha por linha — nome, OAB, e-mail...)">
          <Textarea
            rows={6}
            value={form.signature_block ?? ""}
            onChange={(e) => set("signature_block", e.target.value)}
            placeholder={"Augusto de Azevedo\nOAB/UF 00.000\nadvogado@dominio.com"}
            className="font-mono text-sm"
          />
        </Field>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving} className="bg-gradient-brand text-primary-foreground">
          <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando..." : "Salvar identidade"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 items-center">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 rounded border border-border/50 bg-transparent cursor-pointer"
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
    </div>
  );
}