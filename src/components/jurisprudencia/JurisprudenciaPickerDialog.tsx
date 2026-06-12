import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollText } from "lucide-react";
import { useJurisprudenciaContexto } from "@/stores/jurisprudenciaContexto";
import { JurisprudenciaPanel } from "./JurisprudenciaPanel";

type Props = { trigger?: React.ReactNode };

export function JurisprudenciaPickerDialog({ trigger }: Props) {
  const itens = useJurisprudenciaContexto((s) => s.itens);
  const add = useJurisprudenciaContexto((s) => s.add);
  const remove = useJurisprudenciaContexto((s) => s.remove);
  const ids = new Set(itens.map((i) => i.id));

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="sm" className="gap-2">
            <ScrollText className="h-4 w-4" /> Buscar jurisprudência
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Jurisprudência — selecionar para esta peça</DialogTitle>
        </DialogHeader>
        <JurisprudenciaPanel
          compact
          selectedIds={ids}
          onToggleSelect={(d) => (ids.has(d.id) ? remove(d.id) : add(d))}
        />
      </DialogContent>
    </Dialog>
  );
}