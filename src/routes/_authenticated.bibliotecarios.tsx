import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import {
  listLibrarians, createLibrarian, deleteLibrarian,
  listLibrarianItems, listLibraryItems, addItemToLibrarian, removeItemFromLibrarian,
  countLibrarianItems,
  type Librarian, type LibraryItem,
} from "@/lib/library";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Users, Plus, Trash2, Power, Settings2, Check, Brain } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/stores/workspace";

export const Route = createFileRoute("/_authenticated/bibliotecarios")({
  head: () => ({ meta: [{ title: "Bibliotecários — Peticiona.AI" }] }),
  component: BibliotecariosPage,
});

function BibliotecariosPage() {
  const qc = useQueryClient();
  const { data: librarians = [], isLoading } = useQuery({
    queryKey: ["librarians"],
    queryFn: listLibrarians,
  });

  const counts = useQueries({
    queries: librarians.map((l) => ({
      queryKey: ["librarian_count", l.id],
      queryFn: () => countLibrarianItems(l.id),
    })),
  });

  const delMut = useMutation({
    mutationFn: deleteLibrarian,
    onSuccess: () => {
      toast.success("Bibliotecário removido.");
      qc.invalidateQueries({ queryKey: ["librarians"] });
    },
  });

  const addToContext = useWorkspace((s) => s.addContextItem);

  async function activate(l: Librarian) {
    const items = await listLibrarianItems(l.id);
    if (items.length === 0) {
      toast.info("Este bibliotecário está vazio.");
      return;
    }
    items.forEach((it) =>
      addToContext({
        id: it.id,
        type: "biblioteca_item",
        title: it.title,
        preview: it.description ?? undefined,
      }),
    );
    toast.success(`${items.length} item(ns) adicionados ao contexto via "${l.name}".`);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bibliotecários</h1>
          <p className="text-sm text-muted-foreground">
            Assistentes evoluídos: raciocínio jurídico especializado, regras de formatação, Visual Law e modelos do seu acervo.
          </p>
        </div>
        <NewLibrarianDialog onCreated={() => qc.invalidateQueries({ queryKey: ["librarians"] })} />
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : librarians.length === 0 ? (
        <Card className="glass border-dashed border-border/50 p-10 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-accent" />
          <p className="font-semibold">Nenhum bibliotecário ainda</p>
          <p className="text-sm text-muted-foreground">Crie um especialista por área de atuação ou tipo de peça.</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {librarians.map((l, i) => (
            <LibrarianCard
              key={l.id}
              l={l}
              count={counts[i]?.data ?? 0}
              onActivate={() => activate(l)}
              onDelete={() => delMut.mutate(l.id)}
              onChange={() => qc.invalidateQueries({ queryKey: ["librarian_count", l.id] })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LibrarianCard({
  l, count, onActivate, onDelete, onChange,
}: { l: Librarian; count: number; onActivate: () => void; onDelete: () => void; onChange: () => void }) {
  return (
    <Card className="glass flex flex-col gap-3 border-border/50 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold">{l.name}</p>
              <p className="text-xs text-muted-foreground">
                {count} item(ns) · {l.model_piece_ids?.length ?? 0} modelo(s)
              </p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {l.practice_area && <Badge variant="outline" className="text-[10px]">{l.practice_area}</Badge>}
            {l.piece_type && <Badge variant="outline" className="text-[10px]">{l.piece_type}</Badge>}
          </div>
          {l.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{l.description}</p>}
        </div>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2">
        <ManageItemsSheet librarian={l} onChange={onChange} />
        <Button size="sm" className="bg-gradient-brand text-primary-foreground" onClick={onActivate}>
          <Power className="mr-1 h-3 w-3" /> Ativar
        </Button>
      </div>
    </Card>
  );
}

function NewLibrarianDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [practiceArea, setPracticeArea] = useState("");
  const [pieceType, setPieceType] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [formatting, setFormatting] = useState("");
  const [vlTemplate, setVlTemplate] = useState("sem-template");
  const [vlPalette, setVlPalette] = useState("neutra");
  const [modelIds, setModelIds] = useState<string[]>([]);

  const { data: pieces = [] } = useQuery({
    enabled: open,
    queryKey: ["user_pieces_for_librarian"],
    queryFn: async () => {
      const { data } = await supabase.from("pieces").select("id,title,piece_type").order("updated_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const mut = useMutation({
    mutationFn: () => createLibrarian({
      name,
      description: description || undefined,
      practice_area: practiceArea || undefined,
      piece_type: pieceType || undefined,
      reasoning_prompt: reasoning || undefined,
      formatting_rules: formatting ? { instructions: formatting } : undefined,
      visual_law_defaults: { template: vlTemplate, color_palette: vlPalette },
      model_piece_ids: modelIds,
    }),
    onSuccess: () => {
      toast.success("Bibliotecário criado.");
      setOpen(false);
      setName(""); setDescription(""); setPracticeArea(""); setPieceType("");
      setReasoning(""); setFormatting(""); setModelIds([]);
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-brand text-primary-foreground"><Plus className="mr-1 h-4 w-4" /> Novo bibliotecário</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Novo bibliotecário</DialogTitle></DialogHeader>
        <Tabs defaultValue="identity" className="mt-2">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="identity">Identidade</TabsTrigger>
            <TabsTrigger value="reasoning">Raciocínio</TabsTrigger>
            <TabsTrigger value="formatting">Formatação</TabsTrigger>
            <TabsTrigger value="visual">Visual Law</TabsTrigger>
            <TabsTrigger value="models">Modelos</TabsTrigger>
          </TabsList>
          <TabsContent value="identity" className="space-y-3 pt-3">
            <div>
              <label className="text-xs text-muted-foreground">Nome *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Especialista em Consumidor" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Área de atuação</label>
                <Input value={practiceArea} onChange={(e) => setPracticeArea(e.target.value)} placeholder="Ex.: Direito do Consumidor" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tipo de peça</label>
                <Input value={pieceType} onChange={(e) => setPieceType(e.target.value)} placeholder="Ex.: Petição inicial" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Descrição</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
          </TabsContent>
          <TabsContent value="reasoning" className="space-y-2 pt-3">
            <label className="text-xs text-muted-foreground">Prompt de raciocínio jurídico especializado</label>
            <Textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              rows={8}
              placeholder="Ex.: Sempre estruturar a fundamentação em (i) requisitos legais, (ii) jurisprudência dominante do STJ, (iii) aplicação ao caso concreto..."
            />
          </TabsContent>
          <TabsContent value="formatting" className="space-y-2 pt-3">
            <label className="text-xs text-muted-foreground">Regras de formatação e estrutura</label>
            <Textarea
              value={formatting}
              onChange={(e) => setFormatting(e.target.value)}
              rows={8}
              placeholder="Ex.: Seções obrigatórias na ordem — Síntese fática; Direito; Pedidos. Citações em itálico. Numeração 1.1, 1.2..."
            />
          </TabsContent>
          <TabsContent value="visual" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Template padrão</label>
                <Input value={vlTemplate} onChange={(e) => setVlTemplate(e.target.value)} placeholder="minimal | editorial | corporate | sem-template" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Paleta padrão</label>
                <Input value={vlPalette} onChange={(e) => setVlPalette(e.target.value)} placeholder="neutra | brand | monocromatica" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Defaults aplicados ao gerar a versão Visual Law deste bibliotecário.
            </p>
          </TabsContent>
          <TabsContent value="models" className="space-y-2 pt-3">
            <p className="text-xs text-muted-foreground">Selecione peças do seu acervo para servirem de modelo (few-shot).</p>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border/40 p-2">
              {pieces.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma peça encontrada.</p>}
              {pieces.map((p: { id: string; title: string; piece_type: string }) => {
                const checked = modelIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setModelIds((s) => checked ? s.filter((x) => x !== p.id) : [...s, p.id])}
                    className={`flex w-full items-center justify-between rounded-md border p-2 text-left text-xs transition ${checked ? "border-primary/60 bg-secondary/60" : "border-border/40 hover:bg-secondary/40"}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.title}</p>
                      <p className="text-[10px] uppercase text-muted-foreground">{p.piece_type}</p>
                    </div>
                    {checked && <Check className="h-3 w-3 text-primary" />}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">{modelIds.length} selecionado(s).</p>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={!name || mut.isPending} className="bg-gradient-brand text-primary-foreground">
            {mut.isPending ? "Salvando..." : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManageItemsSheet({ librarian, onChange }: { librarian: Librarian; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: allItems = [] } = useQuery({
    queryKey: ["library_items_all"],
    queryFn: () => listLibraryItems(),
    enabled: open,
  });
  const { data: included = [] } = useQuery({
    queryKey: ["librarian_items", librarian.id],
    queryFn: () => listLibrarianItems(librarian.id),
    enabled: open,
  });
  const includedIds = new Set(included.map((i) => i.id));

  async function toggle(item: LibraryItem) {
    if (includedIds.has(item.id)) {
      await removeItemFromLibrarian(librarian.id, item.id);
    } else {
      await addItemToLibrarian(librarian.id, item.id);
    }
    qc.invalidateQueries({ queryKey: ["librarian_items", librarian.id] });
    onChange();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm"><Settings2 className="mr-1 h-3 w-3" /> Itens</Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader><SheetTitle>Itens — {librarian.name}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-2">
          {allItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item na biblioteca ainda.</p>
          ) : (
            allItems.map((it) => {
              const inn = includedIds.has(it.id);
              return (
                <button
                  key={it.id}
                  onClick={() => toggle(it)}
                  className={`flex w-full items-center justify-between rounded-md border p-2 text-left text-sm transition ${inn ? "border-primary/60 bg-secondary/60" : "border-border/40 hover:bg-secondary/40"}`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{it.title}</p>
                    <Badge variant="outline" className="mt-1 text-[10px] uppercase">{it.type}</Badge>
                  </div>
                  {inn && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}