import { Card } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import { ClipboardList } from "lucide-react";

export function OperatorNotesPanel({ notes }: { notes: string | null | undefined }) {
  if (!notes || !notes.trim()) {
    return (
      <Card className="glass border-border/50 p-8 text-center space-y-2">
        <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">
          Sem notas do operador. As notas são geradas automaticamente pela auditoria interna.
        </p>
      </Card>
    );
  }
  return (
    <Card className="glass border-border/50 p-6">
      <article className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-li:text-foreground/90 text-sm">
        <ReactMarkdown>{notes}</ReactMarkdown>
      </article>
    </Card>
  );
}