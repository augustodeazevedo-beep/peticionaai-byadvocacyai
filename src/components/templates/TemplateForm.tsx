import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PIECE_AREAS,
  PIECE_TYPES,
  PLACEHOLDERS,
  DEFAULT_STRUCTURE,
  type PieceTemplate,
  type TemplateStructure,
  type TemplateStyleOverrides,
} from "@/lib/pieceTemplates";

export type TemplateFormValue = Omit<PieceTemplate, "id" | "user_id" | "created_at" | "updated_at" | "usage_count" | "last_used_at"> & {
  id?: string;
};

const STRUCTURE_LABELS: Record<keyof TemplateStructure, string> = {
  enderecamento: "Endereçamento",
  qualificacao: "Qualificação das partes",
  fatos: "Síntese dos fatos",
  fundamentos: "Fundamentos jurídicos",
  pedidos: "Pedidos",
  valor_causa: "Valor da causa",
  fechamento: "Fechamento (P. deferimento)",
  assinatura: "Bloco de assinatura",
};

type Props = {
  value: TemplateFormValue;
  onChange: (patch: Partial<TemplateFormValue>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  saving?: boolean;
};

export function TemplateForm({ value, onChange, onSubmit, onCancel, saving }: Props) {
  const [tagInput, setTagInput] = useState("");

  const setStructure = (k: keyof TemplateStructure, v: boolean) =>
    onChange({ structure: { ...(value.structure ?? DEFAULT_STRUCTURE), [k]: v } });

  const setStyle = (patch: Partial<TemplateStyleOverrides>) =>
    onChange({ style_overrides: { ...(value.style_overrides ?? {}), ...patch } });

  function insertPlaceholder(p: string) {
    onChange({ content_md: (value.content_md ?? "") + p });
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    if ((value.tags ?? []).includes(t)) return;
    onChange({ tags: [...(value.tags ?? []), t] });
    setTagInput("");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <Tabs defaultValue="id">
        <TabsList>
          <TabsTrigger value="id">Identificação</TabsTrigger>
          <TabsTrigger value="struct">Estrutura</TabsTrigger>
          <TabsTrigger value="content">Conteúdo</TabsTrigger>
          <TabsTrigger value="style">Estilo</TabsTrigger>
          <TabsTrigger value="prompt">Prompt</TabsTrigger>
        </TabsList>

        <TabsContent value="id">
          <Card className="glass border-border/50 p-6 space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={value.name}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="Ex.: Inicial Cobrança Padrão"
                required
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={value.description ?? ""}
                onChange={(e) => onChange({ description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Área</Label>
                <Select value={value.area} onValueChange={(v) => onChange({ area: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PIECE_AREAS.map((a) => (
                      <SelectItem key={a.v} value={a.v}>{a.l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de peça</Label>
                <Select value={value.piece_type} onValueChange={(v) => onChange({ piece_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PIECE_TYPES.map((p) => (
                      <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Adicionar tag e Enter"
                />
                <Button type="button" variant="outline" onClick={addTag}>Adicionar</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {(value.tags ?? []).map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => onChange({ tags: (value.tags ?? []).filter((x) => x !== t) })}
                  >
                    {t} ×
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={value.is_default}
                onCheckedChange={(v) => onChange({ is_default: v })}
              />
              <Label className="!m-0">Marcar como modelo padrão para esta área e tipo</Label>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="struct">
          <Card className="glass border-border/50 p-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Selecione as seções que esse modelo deve garantir na peça final. O assembler usa isso como contrato mínimo.
            </p>
            {(Object.keys(STRUCTURE_LABELS) as (keyof TemplateStructure)[]).map((k) => (
              <div key={k} className="flex items-center gap-2">
                <Switch
                  checked={value.structure?.[k] ?? DEFAULT_STRUCTURE[k] ?? false}
                  onCheckedChange={(v) => setStructure(k, v)}
                />
                <Label className="!m-0">{STRUCTURE_LABELS[k]}</Label>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card className="glass border-border/50 p-6 space-y-3">
            <div className="flex flex-wrap gap-1">
              {PLACEHOLDERS.map((p) => (
                <Badge
                  key={p.k}
                  variant="outline"
                  className="cursor-pointer"
                  title={p.l}
                  onClick={() => insertPlaceholder(p.k)}
                >
                  {p.k}
                </Badge>
              ))}
            </div>
            <Textarea
              value={value.content_md}
              onChange={(e) => onChange({ content_md: e.target.value })}
              rows={20}
              className="font-mono text-sm"
              placeholder={"# {{cliente}} vs {{reu}}\n\nEXCELENTÍSSIMO(A)... {{juizo}}\n\n**DOS FATOS**\n\n{{fatos}}\n\n**DOS PEDIDOS**\n\n{{pedidos}}"}
            />
          </Card>
        </TabsContent>

        <TabsContent value="style">
          <Card className="glass border-border/50 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={value.style_overrides?.numberParagraphs ?? false}
                onCheckedChange={(v) => setStyle({ numberParagraphs: v })}
              />
              <Label className="!m-0">Numerar parágrafos do corpo</Label>
            </div>
            <div>
              <Label>Texto de fechamento</Label>
              <Input
                value={value.style_overrides?.closing_text ?? ""}
                onChange={(e) => setStyle({ closing_text: e.target.value })}
                placeholder="Nestes termos, pede deferimento."
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Fonte preferida</Label>
                <Input
                  value={value.style_overrides?.font_family ?? ""}
                  onChange={(e) => setStyle({ font_family: e.target.value })}
                  placeholder="Arial / Times New Roman"
                />
              </div>
              <div>
                <Label>Tom</Label>
                <Select
                  value={value.style_overrides?.tone ?? "formal"}
                  onValueChange={(v) => setStyle({ tone: v as TemplateStyleOverrides["tone"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                    <SelectItem value="didatico">Didático</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="prompt">
          <Card className="glass border-border/50 p-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Instruções adicionais injetadas no pipeline cognitivo para este modelo.
            </p>
            <Textarea
              value={value.prompt_hints ?? ""}
              onChange={(e) => onChange({ prompt_hints: e.target.value })}
              rows={10}
              placeholder="Ex.: priorizar tese de prescrição; sempre incluir tutela antecipada; citar Súmula 297 do STJ quando aplicável."
            />
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving} className="bg-gradient-brand text-primary-foreground">
          {saving ? "Salvando..." : "Salvar modelo"}
        </Button>
      </div>
    </form>
  );
}