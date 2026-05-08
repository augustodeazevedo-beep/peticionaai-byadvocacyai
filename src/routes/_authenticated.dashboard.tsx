import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilePlus, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Peticione.AI" }] }),
  component: Dashboard,
});

type Piece = {
  id: string;
  title: string;
  piece_type: string;
  status: string;
  created_at: string;
  updated_at: string;
};

function Dashboard() {
  const { user } = useAuth();
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("pieces")
      .select("id,title,piece_type,status,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        setPieces((data ?? []) as Piece[]);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Minhas peças</h1>
          <p className="text-muted-foreground">Gerencie suas petições e peças jurídicas.</p>
        </div>
        <Button asChild className="bg-gradient-brand text-primary-foreground">
          <Link to="/pecas/nova"><FilePlus className="mr-2 h-4 w-4" /> Nova peça</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : pieces.length === 0 ? (
        <Card className="glass border-border/50 p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nenhuma peça ainda</h2>
          <p className="text-muted-foreground mb-6">Comece criando sua primeira petição.</p>
          <Button asChild className="bg-gradient-brand text-primary-foreground">
            <Link to="/pecas/nova">Criar primeira peça</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pieces.map((p) => (
            <Link key={p.id} to="/pecas/$id" params={{ id: p.id }}>
              <Card className="glass border-border/50 p-5 hover:border-primary/50 transition cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <Badge variant="outline" className="text-xs">{p.status}</Badge>
                </div>
                <h3 className="font-semibold mb-1 line-clamp-2">{p.title}</h3>
                <p className="text-xs text-muted-foreground capitalize">{p.piece_type.replaceAll("_"," ")}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Atualizada {formatDistanceToNow(new Date(p.updated_at), { addSuffix: true, locale: ptBR })}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}