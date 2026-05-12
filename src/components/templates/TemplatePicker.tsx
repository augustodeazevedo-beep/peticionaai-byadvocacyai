import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { listTemplatesFor, type PieceTemplate } from "@/lib/pieceTemplates";
import { FileText, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Props = {
  area: string;
  pieceType: string;
  selectedId: string | null;
  onSelect: (template: PieceTemplate | null) => void;
};

export function TemplatePicker({ area, pieceType, selectedId, onSelect }: Props) {
  const { user } = useAuth();
  const { data: templates = [], isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["templates_for", user?.id, area, pieceType],
    queryFn: () => listTemplatesFor(user!.id, area, pieceType),
  });

  return (
    <Card className="glass border-border/50 p-6 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Modelo base</h2>
          <p className="text-xs text-muted-foreground">
            Reutilize estrutura, estilo e instruções de um modelo do escritório.
          </p>
        </div>
        <Link
          to="/biblioteca/modelos"
          className="text-xs text-primary hover:underline"
        >
          Gerenciar modelos
        </Link>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`text-left rounded-lg border p-3 transition ${
            !selectedId ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Sem modelo (gerar do zero)</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pipeline cognitivo decide a estrutura.
          </p>
        </button>

        {isLoading && (
          <div className="text-xs text-muted-foreground p-3">Carregando modelos...</div>
        )}

        {!isLoading && templates.length === 0 && (
          <div className="text-xs text-muted-foreground p-3 border border-dashed rounded-lg">
            Nenhum modelo cadastrado para esta área e tipo.
          </div>
        )}

        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t)}
            className={`text-left rounded-lg border p-3 transition ${
              selectedId === t.id ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium text-sm truncate">{t.name}</span>
              </div>
              {t.is_default && <Badge variant="secondary" className="text-[10px]">padrão</Badge>}
            </div>
            {t.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
              <span>Usos: {t.usage_count}</span>
              {t.tags?.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
              ))}
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}