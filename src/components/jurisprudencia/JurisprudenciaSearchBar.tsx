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
import { Search, Loader2 } from "lucide-react";
import { TRIBUNAIS_JURISPRUDENCIA } from "@/lib/jurisprudenciaTribunais";

export type SearchFormValue = {
  q: string;
  court_id: string;
  pub_from?: string;
  pub_to?: string;
  trial_from?: string;
  trial_to?: string;
};

type Props = {
  value: SearchFormValue;
  onChange: (patch: Partial<SearchFormValue>) => void;
  onSubmit: () => void;
  loading?: boolean;
};

export function JurisprudenciaSearchBar({ value, onChange, onSubmit, loading }: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur"
    >
      <div className="grid gap-3 md:grid-cols-[1fr_240px_auto]">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Termo de busca
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={value.q}
              onChange={(e) => onChange({ q: e.target.value })}
              placeholder='ex.: "dano moral" OR prejuízo  •  dano -material  •  habeas corpus tráfico'
              className="h-11 pl-9"
              autoFocus
            />
          </div>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Tribunal
          </Label>
          <Select value={value.court_id} onValueChange={(v) => onChange({ court_id: v })}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {TRIBUNAIS_JURISPRUDENCIA.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            type="submit"
            disabled={loading || !value.q.trim()}
            className="h-11 w-full gap-2 bg-gradient-brand text-primary-foreground md:w-auto"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Buscar
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DateField label="Publicação ≥" value={value.pub_from} onChange={(v) => onChange({ pub_from: v })} />
        <DateField label="Publicação ≤" value={value.pub_to} onChange={(v) => onChange({ pub_to: v })} />
        <DateField label="Julgamento ≥" value={value.trial_from} onChange={(v) => onChange({ trial_from: v })} />
        <DateField label="Julgamento ≤" value={value.trial_to} onChange={(v) => onChange({ trial_to: v })} />
      </div>

      <p className="text-[11px] text-muted-foreground">
        Sintaxe: <code className="font-mono">termo1 termo2</code> = AND ·{" "}
        <code className="font-mono">"frase exata"</code> · <code className="font-mono">a OR b</code>{" "}
        (OR em maiúsculas) · <code className="font-mono">-excluir</code>. Acentos são normalizados.
      </p>
    </form>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div>
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="h-9"
      />
    </div>
  );
}