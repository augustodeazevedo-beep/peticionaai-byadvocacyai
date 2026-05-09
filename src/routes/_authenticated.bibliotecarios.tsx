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
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold">{l.name}</p>
              <p className="text-xs text-muted-foreground">{count} item(ns)</p>
            </div>
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
  const mut = useMutation({
    mutationFn: () => createLibrarian({ name, description: description || undefined }),
    onSuccess: () => {
      toast.success("Bibliotecário criado.");
      setOpen(false); setName(""); setDescription("");
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-brand text-primary-foreground"><Plus className="mr-1 h-4 w-4" /> Novo bibliotecário</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo bibliotecário</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Nome *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Direito do Consumidor" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Descrição</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
        </div>
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