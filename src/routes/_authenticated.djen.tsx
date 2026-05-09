import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { searchDjenCommunications } from "@/lib/djen.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Megaphone, FilePlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/djen")({
  head: () => ({ meta: [{ title: "Comunicações DJEN — Peticiona.AI" }] }),
  component: DjenPage,
});

function DjenPage() {
  const search = useServerFn(searchDjenCommunications);
  const navigate = useNavigate();
  const [oab, setOab] = useState("");
  const [uf, setUf] = useState("");
  const [nome, setNome] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");

  const m = useMutation({
    mutationFn: () => search({ data: {
      numeroOab: oab || undefined,
      ufOab: uf || undefined,
      nomeParte: nome || undefined,
      dataInicio: inicio || undefined,
      dataFim: fim || undefined,
      pagina: 1,
    }}),
  });

  const data = m.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center gap-3">
        <Megaphone className="h-6 w-6 text-accent" />
        <div>
          <h1 className="text-2xl font-semibold">Comunicações DJEN</h1>
          <p className="text-sm text-muted-foreground">Diário da Justiça Eletrônico Nacional — comunicações e intimações.</p>
        </div>
      </header>

      <Card className="glass border-border/50 p-5">
        <div className="grid gap-3 sm:grid-cols-5">
          <Input value={oab} onChange={(e) => setOab(e.target.value)} placeholder="Nº OAB" />
          <Input value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} maxLength={2} placeholder="UF" />
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da parte" className="sm:col-span-3" />
          <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          <Button
            onClick={() => m.mutate()}
            disabled={m.isPending || (!oab && !nome)}
            className="sm:col-span-3 bg-gradient-brand text-primary-foreground"
          >
            {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
          </Button>
        </div>
      </Card>

      {data && !data.ok && (
        <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{data.error}</Card>
      )}

      {data?.ok && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{data.items.length} comunicação(ões)</p>
          {data.items.length === 0 && (
            <Card className="border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
              Nenhuma comunicação encontrada para os filtros informados.
            </Card>
          )}
          {data.items.map((it: any) => (
            <Card key={it.id} className="glass space-y-2 border-border/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{it.tribunal} · {it.tipoComunicacao}</p>
                  <p className="font-medium">{it.numeroProcesso ?? "—"}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate({ to: "/workspace" })}>
                  <FilePlus className="mr-2 h-3.5 w-3.5" /> Criar minuta
                </Button>
              </div>
              <p className="line-clamp-3 text-sm text-muted-foreground">{it.texto}</p>
              <p className="text-[10px] text-muted-foreground">Disponibilizado em {it.dataDisponibilizacao?.slice(0, 10)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}