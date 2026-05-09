import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listLibraryItems,
  createLibraryItem,
  deleteLibraryItem,
  toggleFavorite,
  type LibraryItemType,
  type LibraryItem,
} from "@/lib/library";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  BookOpen, FileText, Gavel, Scale, Layers, Mic2, Type, Globe, Search, Star, Trash2, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/stores/workspace";

export const Route = createFileRoute("/_authenticated/assistentes")({
  head: () => ({ meta: [{ title: "Biblioteca — Peticiona.AI" }] }),
  component: BibliotecaPage,
});

const TYPE_META: Record<LibraryItemType, { label: string; icon: typeof BookOpen }> = {
  prompt: { label: "Prompt", icon: Type },
  documento: { label: "Documento", icon: FileText },
  legislacao: { label: "Legislação", icon: Scale },
  jurisprudencia: { label: "Jurisprudência", icon: Gavel },
  modelo: { label: "Modelo", icon: Layers },
  podcast: { label: "Podcast", icon: Mic2 },
  diagrama: { label: "Diagrama", icon: Layers },
  referencia_web: { label: "Referência Web", icon: Globe },
};

const TYPES = Object.keys(TYPE_META) as LibraryItemType[];

function BibliotecaPage() {
  const qc = useQueryClient();
  const [type, setType] = useState<LibraryItemType | "all">("all");
  const [search, setSearch] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["library_items", type, search],
    queryFn: () => listLibraryItems({
      type: type === "all" ? undefined : type,
      search: search || undefined,
    }),
  });

  const addToContext = useWorkspace((s) => s.addContextItem);

  const favMut = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) => toggleFavorite(id, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library_items"] }),
  });
  const delMut = useMutation({
    mutationFn: deleteLibraryItem,
    onSuccess: () => {
      toast.success("Item removido.");
      qc.invalidateQueries({ queryKey: ["library_items"] });
    },
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Biblioteca</h1>
          <p className="text-sm text-muted-foreground">
            Prompts, documentos, modelos, legislações e referências reutilizáveis.
          </p>
        </div>
        <NewItemDialog onCreated={() => qc.invalidateQueries({ queryKey: ["library_items"] })} />
      </header>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar na biblioteca..." className="pl-9" />
        </div>
        <Select value={type} onValueChange={(v) => setType(v as LibraryItemType | "all")}>
          <SelectTrigger className="md:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>{TYPE_META[t].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <Card className="glass border-dashed border-border/50 p-10 text-center">
          <BookOpen className="mx-auto mb-3 h-8 w-8 text-accent" />
          <p className="font-semibold">Sua biblioteca está vazia</p>
          <p className="text-sm text-muted-foreground">Adicione seu primeiro prompt, modelo ou referência.</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onToggleFav={() => favMut.mutate({ id: item.id, value: !item.is_favorite })}
              onDelete={() => delMut.mutate(item.id)}
              onAddToContext={() => {
                addToContext({
                  id: item.id,
                  type: "biblioteca_item",
                  title: item.title,
                  preview: item.description ?? item.content_text?.slice(0, 100) ?? undefined,
                });
                toast.success("Adicionado ao contexto do workspace.");
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemCard({
  item, onToggleFav, onDelete, onAddToContext,
}: { item: LibraryItem; onToggleFav: () => void; onDelete: () => void; onAddToContext: () => void }) {
  const meta = TYPE_META[item.type];
  const Icon = meta.icon;
  return (
    <Card className="glass flex flex-col gap-3 border-border/50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/60">
          <Icon className="h-4 w-4 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold">{item.title}</p>
            <Badge variant="outline" className="text-[10px] uppercase">{meta.label}</Badge>
          </div>
          {item.description && <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>}
        </div>
        <Button variant="ghost" size="icon" onClick={onToggleFav}>
          <Star className={`h-4 w-4 ${item.is_favorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
        </Button>
      </div>
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
        </div>
      )}
      <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-2">
        <Button variant="outline" size="sm" onClick={onAddToContext}>
          <Plus className="mr-1 h-3 w-3" /> Adicionar ao contexto
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </Card>
  );
}

function NewItemDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<LibraryItemType>("prompt");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const tags = useMemo(() => tagsInput.split(",").map((s) => s.trim()).filter(Boolean), [tagsInput]);

  const mut = useMutation({
    mutationFn: () => createLibraryItem({
      type, title, description: description || undefined,
      content_text: content || undefined,
      source_url: url || undefined,
      tags,
    }),
    onSuccess: () => {
      toast.success("Item adicionado à biblioteca.");
      setOpen(false);
      setTitle(""); setDescription(""); setContent(""); setUrl(""); setTagsInput("");
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-brand text-primary-foreground"><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Adicionar à biblioteca</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Tipo</label>
            <Select value={type} onValueChange={(v) => setType(v as LibraryItemType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_META[t].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Título *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Prompt para contestação trabalhista" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Descrição</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descrição" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Conteúdo</label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="Texto do prompt, ementa, ou trecho do documento..." />
          </div>
          {(type === "referencia_web" || type === "jurisprudencia" || type === "legislacao") && (
            <div>
              <label className="text-xs text-muted-foreground">URL da fonte</label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Tags (separadas por vírgula)</label>
            <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="trabalhista, contestação" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={!title || mut.isPending} className="bg-gradient-brand text-primary-foreground">
            {mut.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}