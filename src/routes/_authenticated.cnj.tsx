import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { lookupCnjMetadata } from "@/lib/cnj.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ScrollText, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cnj")({
  head: () => ({ meta: [{ title: "Metadados CNJ — Peticiona.AI" }] }),
  component: CnjPage,
});

function CnjPage() {
  const lookup = useServerFn(lookupCnjMetadata);
  const [numero, setNumero] = useState("");
  const m = useMutation({
    mutationFn: (n: string) => lookup({ data: { numero: n } }),
  });

  const result = m.data;

  async function importToProject() {
    if (!result?.ok) return;
    const title = `${result.classe ?? "Processo"} ${result.numero}`.slice(0, 120);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("projects").insert({
      user_id: user.id,
      title,
      cnj_number: result.numero,
      area: result.classe ?? null,
      metadata: result as any,
    });
    if (error) toast.error(error.message);
    else toast.success("Projeto criado a partir do CNJ.");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center gap-3">
        <ScrollText className="h-6 w-6 text-accent" />
        <div>
          <h1 className="text-2xl font-semibold">Metadados CNJ</h1>
          <p className="text-sm text-muted-foreground">Consulte processos públicos no DataJud.</p>
        </div>
      </header>

      <Card className="glass border-border/50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="0000000-00.0000.0.00.0000"
            className="flex-1"
          />
          <Button
            onClick={() => m.mutate(numero)}
            disabled={m.isPending || numero.replace(/\D/g, "").length !== 20}
            className="bg-gradient-brand text-primary-foreground"
          >
            {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Consultar"}
          </Button>
        </div>
      </Card>

      {result && !result.ok && (
        <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{result.error}</Card>
      )}

      {result?.ok && (
        <Card className="glass space-y-4 border-border/50 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{result.tribunal}</p>
              <h2 className="text-lg font-semibold">{result.classe ?? "—"}</h2>
              <p className="text-sm text-muted-foreground">{result.numero}</p>
            </div>
            <Button variant="outline" size="sm" onClick={importToProject}>
              <Download className="mr-2 h-4 w-4" /> Importar para projeto
            </Button>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <Field label="Órgão julgador" value={result.orgaoJulgador} />
            <Field label="Grau" value={result.grau} />
            <Field label="Sistema" value={result.sistema} />
            <Field label="Data de ajuizamento" value={result.dataAjuizamento?.slice(0, 10)} />
          </div>

          {result.assuntos.length > 0 && (
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Assuntos</p>
              <div className="flex flex-wrap gap-1">
                {result.assuntos.map((a: string) => <Badge key={a} variant="secondary">{a}</Badge>)}
              </div>
            </div>
          )}

          {result.movimentos.length > 0 && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Últimas movimentações</p>
              <div className="space-y-1">
                {result.movimentos.map((mv: { nome?: string; data?: string }, i: number) => (
                  <div key={i} className="flex justify-between border-b border-border/30 py-1 text-xs">
                    <span className="truncate pr-3">{mv.nome}</span>
                    <span className="text-muted-foreground">{mv.data?.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p>{value || "—"}</p>
    </div>
  );
}