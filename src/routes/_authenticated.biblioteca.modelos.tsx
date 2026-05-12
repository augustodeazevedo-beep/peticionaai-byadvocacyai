import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import {
  listTemplates,
  deleteTemplate,
  setDefault,
  upsertTemplate,
  PIECE_AREAS,
  PIECE_TYPES,
  areaLabel,
  pieceTypeLabel,
  type PieceTemplate,
} from "@/lib/pieceTemplates";
import { toast } from "sonner";
import { Plus, Copy, Trash2, Star, FileText, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/biblioteca/modelos")({
  head: () => ({ meta: [{ title: "Modelos de Peça — Peticiona.AI" }] }),
  component: ModelosLista,
});

function ModelosLista() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: templates = [], isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["templates", user?.id],
    queryFn: () => listTemplates(user!.id),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (areaFilter !== "all" && t.area !== areaFilter) return false;
      if (typeFilter !== "all" && t.piece_type !== typeFilter) return false;
      if (q && !`${t.name} ${t.description ?? ""} ${t.tags.join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [templates, search, areaFilter, typeFilter]);

  const grouped = useMemo(() => {
    const m = new Map<string, PieceTemplate[]>();
    filtered.forEach((t) => {
      const key = t.area;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(t);
    });
    return Array.from(m.entries());
  }, [filtered]);

  async function onDelete(t: PieceTemplate) {
    if (!confirm(`Excluir o modelo "${t.name}"?`)) return;
    try {
      await deleteTemplate(t.id);
      toast.success("Modelo excluído");
      qc.invalidateQueries({ queryKey: ["templates"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  async function onDuplicate(t: PieceTemplate) {
    if (!user) return;
    try {
      await upsertTemplate({
        user_id: user.id,
        name: `${t.name} (cópia)`,
        description: t.description ?? undefined,
        area: t.area,
        piece_type: t.piece_type,
        content_md: t.content_md,
        structure: t.structure,
        style_overrides: t.style_overrides,
        prompt_hints: t.prompt_hints ?? undefined,
        tags: t.tags,
        is_default: false,
      });
      toast.success("Modelo duplicado");
      qc.invalidateQueries({ queryKey: ["templates"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao duplicar");
    }
  }

  async function onSetDefault(t: PieceTemplate) {
    if (!user) return;
    try {
      await setDefault(user.id, t.area, t.piece_type, t.id);
      toast.success("Definido como padrão");
      qc.invalidateQueries({ queryKey: ["templates"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao definir padrão");
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Modelos de Peça</h1>
          <p className="text-muted-foreground">
            Biblioteca de modelos reutilizáveis por área e tipo de peça.
          </p>
        </div>
        <Button
          onClick={() => navigate({ to: "/biblioteca/modelos/$id", params: { id: "novo" } })}
          className="bg-gradient-brand text-primary-foreground"
        >
          <Plus className="h-4 w-4 mr-2" /> Novo modelo
        </Button>
      </div>

      <Card className="glass border-border/50 p-4 grid gap-3 md:grid-cols-3">
        <Input
          placeholder="Buscar por nome, descrição ou tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger><SelectValue placeholder="Área" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as áreas</SelectItem>
            {PIECE_AREAS.map((a) => (
              <SelectItem key={a.v} value={a.v}>{a.l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {PIECE_TYPES.map((p) => (
              <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {!isLoading && filtered.length === 0 && (
        <Card className="glass border-border/50 p-10 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Nenhum modelo encontrado.</p>
          <Button
            className="mt-4"
            onClick={() => navigate({ to: "/biblioteca/modelos/$id", params: { id: "novo" } })}
          >
            <Plus className="h-4 w-4 mr-2" /> Criar primeiro modelo
          </Button>
        </Card>
      )}

      {grouped.map(([area, items]) => (
        <div key={area} className="space-y-2">
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground">{areaLabel(area)}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((t) => (
              <Card key={t.id} className="glass border-border/50 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to="/biblioteca/modelos/$id"
                        params={{ id: t.id }}
                        className="font-semibold hover:underline truncate"
                      >
                        {t.name}
                      </Link>
                      {t.is_default && <Badge variant="secondary" className="text-[10px]">padrão</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {pieceTypeLabel(t.piece_type)} · usos: {t.usage_count}
                    </p>
                  </div>
                </div>
                {t.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {t.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/biblioteca/modelos/$id" params={{ id: t.id }}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onDuplicate(t)}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Duplicar
                  </Button>
                  {!t.is_default && (
                    <Button size="sm" variant="outline" onClick={() => onSetDefault(t)}>
                      <Star className="h-3.5 w-3.5 mr-1" /> Padrão
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(t)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}