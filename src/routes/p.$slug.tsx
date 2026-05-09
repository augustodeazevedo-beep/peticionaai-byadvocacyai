import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { BrandLockup } from "@/components/Logo";

export const Route = createFileRoute("/p/$slug")({
  head: () => ({ meta: [{ title: "Peça compartilhada — Peticiona.AI" }] }),
  component: PublicPiece,
});

function PublicPiece() {
  const { slug } = useParams({ from: "/p/$slug" });
  const [piece, setPiece] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("pieces")
      .select("title,content_text,content_html,updated_at")
      .eq("public_slug", slug)
      .eq("is_shared", true)
      .maybeSingle()
      .then(({ data }) => {
        setPiece(data);
        setLoading(false);
      });
  }, [slug]);

  if (loading) return <div className="p-10 text-center text-muted-foreground">Carregando…</div>;
  if (!piece) return <div className="p-10 text-center text-muted-foreground">Peça não encontrada ou não compartilhada.</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 px-6 py-3 flex items-center justify-between">
        <BrandLockup size="sm" variant="horizontal" />
        <span className="text-xs text-muted-foreground">Documento compartilhado publicamente</span>
      </header>
      <main className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">{piece.title}</h1>
        <article className="prose prose-invert max-w-none">
          <ReactMarkdown>{piece.content_text ?? ""}</ReactMarkdown>
        </article>
      </main>
    </div>
  );
}