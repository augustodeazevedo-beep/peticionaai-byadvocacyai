import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { exportPieceDocx, exportPieceHtml, generatePiece } from "@/lib/mikeClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VisualLawPanel } from "@/components/visual-law/VisualLawPanel";
import { VisualLawAIPanel } from "@/components/visual-law/VisualLawAIPanel";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Download, FileDown, Save, RefreshCw, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pecas/$id")({
  head: () => ({ meta: [{ title: "Editor de Peça — Peticiona.AI" }] }),
  component: PieceEditor,
});

type Piece = {
  id: string;
  title: string;
  piece_type: string;
  area: string | null;
  status: string;
  content_text: string | null;
  input_data: Record<string, unknown>;
  model_used: string | null;
};

function PieceEditor() {
  const { id } = useParams({ from: "/_authenticated/pecas/$id" });
  const navigate = useNavigate();
  const [piece, setPiece] = useState<Piece | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingHtml, setExportingHtml] = useState(false);
  const [regen, setRegen] = useState(false);

  useEffect(() => {
    supabase.from("pieces").select("*").eq("id", id).single().then(({ data, error }) => {
      if (error || !data) {
        toast.error("Peça não encontrada");
        navigate({ to: "/dashboard" });
        return;
      }
      setPiece(data as Piece);
      setContent((data as Piece).content_text ?? "");
    });
  }, [id, navigate]);

  async function save() {
    if (!piece) return;
    setSaving(true);
    const { error } = await supabase.from("pieces").update({ content_text: content, content_html: content }).eq("id", piece.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
  }

  async function regenerate() {
    if (!piece) return;
    setRegen(true);
    try {
      const result = await generatePiece({
        piece_type: piece.piece_type,
        area: piece.area ?? undefined,
        fields: piece.input_data ?? {},
      });
      setContent(result.content);
      await supabase.from("pieces").update({ content_text: result.content, content_html: result.content, model_used: result.model_used }).eq("id", piece.id);
      toast.success("Peça regenerada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setRegen(false);
    }
  }

  async function doExport() {
    if (!piece) return;
    setExporting(true);
    try {
      // Salva antes
      await supabase.from("pieces").update({ content_text: content, content_html: content }).eq("id", piece.id);
      const r = await exportPieceDocx(piece.id);
      window.open(r.url, "_blank");
      toast.success("Documento .docx gerado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setExporting(false);
    }
  }

  async function doExportHtml() {
    if (!piece) return;
    setExportingHtml(true);
    try {
      // Salva antes para garantir que o HTML reflete o conteúdo atual
      await supabase.from("pieces").update({ content_text: content, content_html: content }).eq("id", piece.id);
      await exportPieceHtml(piece.id);
      toast.success("Documento HTML baixado com sucesso");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar HTML");
    } finally {
      setExportingHtml(false);
    }
  }

  if (!piece) return <p className="text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard" })} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <h1 className="text-2xl font-bold">{piece.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{piece.status}</Badge>
            <span className="text-xs text-muted-foreground">Modelo: {piece.model_used ?? "—"}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={regenerate} disabled={regen}>
            <RefreshCw className={`mr-2 h-4 w-4 ${regen ? "animate-spin" : ""}`} /> Regenerar
          </Button>
          <Button variant="outline" onClick={save} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> Salvar
          </Button>
          <Button variant="outline" onClick={doExportHtml} disabled={exportingHtml}>
            <FileDown className="mr-2 h-4 w-4" /> {exportingHtml ? "Exportando..." : "⬇ Exportar HTML"}
          </Button>
          <Button onClick={doExport} disabled={exporting} className="bg-gradient-brand text-primary-foreground">
            <Download className="mr-2 h-4 w-4" /> {exporting ? "Gerando..." : "Exportar .docx"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Editor</TabsTrigger>
          <TabsTrigger value="preview">Visualização</TabsTrigger>
          <TabsTrigger value="visual">Visual Law</TabsTrigger>
          <TabsTrigger value="visual-ai">Visual Law AI (beta)</TabsTrigger>
        </TabsList>
        <TabsContent value="edit">
          <Card className="glass border-border/50 p-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={32}
              className="font-mono text-sm resize-y border-0 focus-visible:ring-0"
            />
          </Card>
        </TabsContent>
        <TabsContent value="preview">
          <Card className="glass border-border/50 p-8">
            <article className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-li:text-foreground/90">
              <ReactMarkdown>{content}</ReactMarkdown>
            </article>
          </Card>
        </TabsContent>
        <TabsContent value="visual">
          <VisualLawPanel
            pieceId={piece.id}
            title={piece.title}
            contentText={content}
            pieceType={piece.piece_type}
            area={piece.area}
            inputData={piece.input_data}
            onContentChange={setContent}
          />
        </TabsContent>
        <TabsContent value="visual-ai">
          <VisualLawAIPanel
            pieceId={piece.id}
            contentText={content}
            pieceType={piece.piece_type}
            area={piece.area}
            onContentChange={setContent}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
