import { createFileRoute } from "@tanstack/react-router";
import { Gavel } from "lucide-react";
import { JurisprudenciaPanel } from "@/components/jurisprudencia/JurisprudenciaPanel";
import { useJurisprudenciaContexto } from "@/stores/jurisprudenciaContexto";

export const Route = createFileRoute("/_authenticated/jurisprudencia")({
  head: () => ({
    meta: [
      { title: "Jurisprudência & Jurimetria — Peticiona.AI" },
      {
        name: "description",
        content:
          "Busque decisões reais nos tribunais brasileiros, visualize jurimetria e injete ementas literais no gerador de peças.",
      },
    ],
  }),
  component: JurisprudenciaPage,
});

function JurisprudenciaPage() {
  const itens = useJurisprudenciaContexto((s) => s.itens);
  const add = useJurisprudenciaContexto((s) => s.add);
  const remove = useJurisprudenciaContexto((s) => s.remove);
  const ids = new Set(itens.map((i) => i.id));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand">
          <Gavel className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Jurisprudência & Jurimetria</h1>
          <p className="text-sm text-muted-foreground">
            Decisões em tempo real via API oficial Jurisprudências.AI — selecione ementas para o
            gerador de peças citar <strong>literalmente</strong> (mecanismo antialucinação).
          </p>
          {itens.length > 0 && (
            <p className="mt-1 text-xs text-accent">
              {itens.length} decisão(ões) no contexto da próxima peça.
            </p>
          )}
        </div>
      </header>

      <JurisprudenciaPanel
        selectedIds={ids}
        onToggleSelect={(d) => (ids.has(d.id) ? remove(d.id) : add(d))}
      />
    </div>
  );
}