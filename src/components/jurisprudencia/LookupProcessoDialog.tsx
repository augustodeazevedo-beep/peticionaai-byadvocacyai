import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileSearch, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { lookupDecision, type Decision } from "@/lib/jurisprudencia.functions";
import { TRIBUNAIS_JURISPRUDENCIA } from "@/lib/jurisprudenciaTribunais";
import { DecisionCard } from "./DecisionCard";

type Props = {
  onPick?: (d: Decision) => void;
};

export function LookupProcessoDialog({ onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [court, setCourt] = useState(TRIBUNAIS_JURISPRUDENCIA[0].id);
  const [n, setN] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Decision | null>(null);
  const run = useServerFn(lookupDecision);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!n.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const d = await run({ data: { court_id: court, n: n.trim() } });
      setResult(d);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na consulta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileSearch className="h-4 w-4" /> Consultar por nº processo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Consultar decisão pelo número do processo</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[200px_1fr_auto]">
            <div>
              <Label className="text-xs">Tribunal</Label>
              <Select value={court} onValueChange={setCourt}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIBUNAIS_JURISPRUDENCIA.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.id.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Número do processo</Label>
              <Input value={n} onChange={(e) => setN(e.target.value)} placeholder="0000000-00.0000.0.00.0000" />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={loading || !n.trim()} className="bg-gradient-brand text-primary-foreground">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Consultar"}
              </Button>
            </div>
          </div>
        </form>
        {result && (
          <div className="pt-2">
            <DecisionCard decision={result} onToggleSelect={onPick} compact />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}