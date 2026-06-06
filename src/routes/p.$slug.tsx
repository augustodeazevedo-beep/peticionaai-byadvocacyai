import { createFileRoute, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { BrandLockup } from "@/components/Logo";
import { DocumentViewer } from "@/components/visual-law/viewer/DocumentViewer";
import type { VLDocumentConfig } from "@/types/visual-law";

export const Route = createFileRoute("/p/$slug")({
  head: () => ({ meta: [{ title: "Peça compartilhada — Peticiona.AI" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    vl: typeof s.vl === "string" ? s.vl : undefined,
  }),
  component: PublicPiece,
});

function PublicPiece() {
  const { slug } = useParams({ from: "/p/$slug" });
  const { vl: vlVersionId } = useSearch({ from: "/p/$slug" });
  const [piece, setPiece] = useState<any>(null);
  const [vlVersion, setVlVersion] = useState<{ content: string; config: VLDocumentConfig } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: pieceRow } = await supabase
        .from("public_shared_pieces" as any)
        .select("id,title,content_text,content_html,updated_at")
        .eq("public_slug", slug)
        .maybeSingle();
      if (cancelled) return;
      setPiece(pieceRow);
      if (pieceRow && vlVersionId) {
        const { data: v } = await supabase
          .from("public_shared_vl_versions" as any)
          .select("content,config")
          .eq("id", vlVersionId)
          .eq("piece_id", pieceRow.id)
          .maybeSingle();
        if (!cancelled && v) {
          const row = v as unknown as { content: string; config: VLDocumentConfig };
          setVlVersion({ content: row.content, config: row.config });
        }
      }
        setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, vlVersionId]);

  if (loading) return <div className="p-10 text-center text-muted-foreground">Carregando…</div>;
  if (!piece) return <div className="p-10 text-center text-muted-foreground">Peça não encontrada ou não compartilhada.</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 px-6 py-3 flex items-center justify-between">
        <BrandLockup size="sm" variant="horizontal" />
        <span className="text-xs text-muted-foreground">
          {vlVersion ? "Visual Law AI · versão pública" : "Documento compartilhado publicamente"}
        </span>
      </header>
      <main className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">{piece.title}</h1>
        {vlVersion ? (
          <DocumentViewer readOnlyContent={vlVersion.content} readOnlyConfig={vlVersion.config} />
        ) : (
        <article className="prose prose-invert max-w-none">
          <ReactMarkdown>{piece.content_text ?? ""}</ReactMarkdown>
        </article>
        )}
      </main>
    </div>
  );
}