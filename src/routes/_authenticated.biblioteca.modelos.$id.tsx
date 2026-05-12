import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  getTemplate,
  upsertTemplate,
  DEFAULT_STRUCTURE,
  type PieceTemplate,
} from "@/lib/pieceTemplates";
import { TemplateForm, type TemplateFormValue } from "@/components/templates/TemplateForm";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/biblioteca/modelos/$id")({
  head: () => ({ meta: [{ title: "Editor de Modelo — Peticiona.AI" }] }),
  component: ModeloEditor,
});

const EMPTY: TemplateFormValue = {
  name: "",
  description: "",
  area: "civel",
  piece_type: "peticao_inicial_civel",
  scope: "pessoal",
  content_md: "",
  structure: DEFAULT_STRUCTURE,
  style_overrides: {},
  prompt_hints: "",
  tags: [],
  is_default: false,
};

function toFormValue(t: PieceTemplate): TemplateFormValue {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    area: t.area,
    piece_type: t.piece_type,
    scope: t.scope,
    content_md: t.content_md,
    structure: t.structure ?? DEFAULT_STRUCTURE,
    style_overrides: t.style_overrides ?? {},
    prompt_hints: t.prompt_hints,
    tags: t.tags ?? [],
    is_default: t.is_default,
  };
}

function ModeloEditor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { id } = useParams({ from: "/_authenticated/biblioteca/modelos/$id" });
  const isNew = id === "novo";

  const [value, setValue] = useState<TemplateFormValue>(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    (async () => {
      try {
        const t = await getTemplate(id);
        if (!t) {
          toast.error("Modelo não encontrado");
          navigate({ to: "/biblioteca/modelos" });
          return;
        }
        if (!cancelled) setValue(toFormValue(t));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew, navigate]);

  async function onSubmit() {
    if (!user) return;
    if (!value.name.trim()) {
      toast.error("Informe um nome para o modelo");
      return;
    }
    setSaving(true);
    try {
      const saved = await upsertTemplate({
        id: value.id,
        user_id: user.id,
        name: value.name.trim(),
        description: value.description ?? undefined,
        area: value.area,
        piece_type: value.piece_type,
        scope: value.scope,
        content_md: value.content_md,
        structure: value.structure,
        style_overrides: value.style_overrides,
        prompt_hints: value.prompt_hints ?? undefined,
        tags: value.tags,
        is_default: value.is_default,
      });
      qc.invalidateQueries({ queryKey: ["templates"] });
      qc.invalidateQueries({ queryKey: ["templates_for"] });
      toast.success("Modelo salvo");
      navigate({ to: "/biblioteca/modelos/$id", params: { id: saved.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/biblioteca/modelos" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>
      <div>
        <h1 className="text-3xl font-bold">{isNew ? "Novo modelo" : "Editar modelo"}</h1>
        <p className="text-muted-foreground">
          Defina estrutura, conteúdo e estilo. Modelos podem ser selecionados ao gerar uma peça.
        </p>
      </div>

      <TemplateForm
        value={value}
        onChange={(p) => setValue((v) => ({ ...v, ...p }))}
        onSubmit={onSubmit}
        onCancel={() => navigate({ to: "/biblioteca/modelos" })}
        saving={saving}
      />
    </div>
  );
}