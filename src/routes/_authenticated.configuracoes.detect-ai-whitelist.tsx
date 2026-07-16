import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  ArrowLeft,
  Users,
} from "lucide-react";
import {
  listDetectAiWhitelist,
  saveDetectAiWhitelist,
  deleteDetectAiWhitelist,
  WHITELIST_CATEGORIES,
  type WhitelistEntry,
  type WhitelistScope,
} from "@/lib/detectaiWhitelist.functions";
import type { AuditCategory } from "@/lib/audit/types";

export const Route = createFileRoute(
  "/_authenticated/configuracoes/detect-ai-whitelist",
)({
  head: () => ({ meta: [{ title: "Whitelist do Detect.AI" }] }),
  component: WhitelistPage,
});

const SCOPE_LABEL: Record<WhitelistScope, string> = {
  text: "Texto literal",
  regex: "Regex",
  citation: "Citação",
};
const CATEGORY_LABEL: Record<AuditCategory, string> = {
  prompt_injection: "Prompt injection",
  jailbreak: "Jailbreak",
  pii_leak: "PII",
  fake_citation: "Lei/artigo inexistente",
  fake_jurisprudence: "Súmula/precedente inexistente",
  hallucination: "Alucinação",
};

type FormState = {
  id?: string;
  client_name: string;
  scope: WhitelistScope;
  pattern: string;
  category: AuditCategory | "";
  notes: string;
};

const EMPTY: FormState = {
  client_name: "",
  scope: "citation",
  pattern: "",
  category: "",
  notes: "",
};

function WhitelistPage() {
  const list = useServerFn(listDetectAiWhitelist);
  const save = useServerFn(saveDetectAiWhitelist);
  const del = useServerFn(deleteDetectAiWhitelist);
  const [rows, setRows] = useState<WhitelistEntry[] | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterClient, setFilterClient] = useState<string>("__all__");

  async function refresh() {
    try {
      const data = await list();
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clients = useMemo(() => {
    const s = new Set<string>();
    (rows ?? []).forEach((r) => r.client_name && s.add(r.client_name));
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (filterClient === "__all__") return rows;
    if (filterClient === "__global__") return rows.filter((r) => !r.client_name);
    return rows.filter((r) => r.client_name === filterClient);
  }, [rows, filterClient]);

  function openNew() {
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(r: WhitelistEntry) {
    setForm({
      id: r.id,
      client_name: r.client_name ?? "",
      scope: r.scope,
      pattern: r.pattern,
      category: r.category ?? "",
      notes: r.notes ?? "",
    });
    setOpen(true);
  }

  async function onSave() {
    if (!form.pattern.trim()) {
      toast.error("Informe o texto/regex/citação.");
      return;
    }
    if (form.scope === "regex") {
      try {
        new RegExp(form.pattern);
      } catch {
        toast.error("Regex inválida.");
        return;
      }
    }
    setSaving(true);
    try {
      await save({
        data: {
          id: form.id,
          client_name: form.client_name.trim() || null,
          scope: form.scope,
          pattern: form.pattern.trim(),
          category: (form.category || null) as AuditCategory | null,
          notes: form.notes.trim() || null,
        },
      });
      toast.success(form.id ? "Entrada atualizada" : "Entrada criada");
      setOpen(false);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Remover esta entrada da whitelist?")) return;
    try {
      await del({ data: { id } });
      toast.success("Removida");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover");
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Whitelist Detect.AI</h1>
            <p className="text-sm text-muted-foreground">
              Citações e trechos pré-aprovados pelo escritório — o Detect.AI
              deixa de sinalizá-los como risco. Regras podem valer para todos
              os casos ou para um cliente específico.
            </p>
          </div>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/configuracoes/detect-ai">
            <ArrowLeft className="mr-2 h-4 w-4" /> Preferências
          </Link>
        </Button>
      </header>

      <Card className="glass p-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm">Filtrar por cliente</Label>
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              <SelectItem value="__global__">Globais (sem cliente)</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={openNew}
              className="bg-gradient-brand text-primary-foreground"
            >
              <Plus className="mr-2 h-4 w-4" /> Nova entrada
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {form.id ? "Editar entrada" : "Nova entrada"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Cliente (opcional)</Label>
                <Input
                  value={form.client_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, client_name: e.target.value }))
                  }
                  placeholder="Vazio = vale para todos os casos"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Deve coincidir com o nome do autor/cliente informado ao gerar
                  a peça.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Escopo</Label>
                  <Select
                    value={form.scope}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, scope: v as WhitelistScope }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="citation">Citação</SelectItem>
                      <SelectItem value="text">Texto literal</SelectItem>
                      <SelectItem value="regex">Regex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo de risco</Label>
                  <Select
                    value={form.category || "__any__"}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        category: v === "__any__" ? "" : (v as AuditCategory),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">Qualquer</SelectItem>
                      {WHITELIST_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORY_LABEL[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>
                  {form.scope === "regex"
                    ? "Expressão regular"
                    : form.scope === "citation"
                    ? "Identificador / citação"
                    : "Texto"}
                </Label>
                <Textarea
                  value={form.pattern}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pattern: e.target.value }))
                  }
                  rows={3}
                  className="font-mono text-xs"
                  placeholder={
                    form.scope === "regex"
                      ? "^Súmula\\s+54\\s+STJ$"
                      : form.scope === "citation"
                      ? "Súmula 54 do STJ"
                      : "Cláusula padrão do contrato XPTO"
                  }
                />
              </div>

              <div>
                <Label>Notas (opcional)</Label>
                <Input
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="Motivo da aprovação, contexto, etc."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={onSave}
                disabled={saving}
                className="bg-gradient-brand text-primary-foreground"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>

      {rows === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="glass p-10 text-center text-sm text-muted-foreground">
          Nenhuma entrada de whitelist ainda. Crie a primeira para reduzir
          falsos positivos do Detect.AI.
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.id} className="glass p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{SCOPE_LABEL[r.scope]}</Badge>
                  {r.category && (
                    <Badge variant="outline">{CATEGORY_LABEL[r.category]}</Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={r.client_name ? "" : "opacity-70"}
                  >
                    {r.client_name ? `Cliente: ${r.client_name}` : "Global"}
                  </Badge>
                </div>
                <div className="text-sm font-mono break-all">{r.pattern}</div>
                {r.notes && (
                  <div className="text-xs text-muted-foreground">{r.notes}</div>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => openEdit(r)}
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(r.id)}
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
