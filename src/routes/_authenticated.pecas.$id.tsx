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
import { Download, FileDown, Save, RefreshCw, ArrowLeft, FileType, ChevronDown, Palette } from "lucide-react";
import { IntelligencePanel } from "@/components/pieces/IntelligencePanel";
import { OperatorNotesPanel } from "@/components/pieces/OperatorNotesPanel";
import { AuditPanel } from "@/components/pieces/AuditPanel";
import { PageMockup } from "@/components/pieces/PageMockup";
import { useAuth } from "@/lib/auth";
import { loadOfficeBrand, type OfficeBrand } from "@/lib/officeBrand";
import { assemblePiece, pieceContextFromInput } from "@/lib/pieceAssembler";
import { exportPiecePdfProtocolo, downloadBlob } from "@/services/pieces/exportPdfProtocolo";
import { markdownToHtml } from "@/lib/markdown";
import { runDetectAiGate, type GateResult, type GateTrigger } from "@/lib/detectai.functions";
import { DetectAiGateDialog } from "@/components/detectai/DetectAiGateDialog";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";

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
  checklist: unknown;
  observations: string | null;
};

function PieceEditor() {
  const { id } = useParams({ from: "/_authenticated/pecas/$id" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const [piece, setPiece] = useState<Piece | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingHtml, setExportingHtml] = useState(false);
  const [regen, setRegen] = useState(false);
  const [brand, setBrand] = useState<OfficeBrand | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [applyLetterhead, setApplyLetterhead] = useState(true);
  const runGate = useServerFn(runDetectAiGate);
  const [gateResult, setGateResult] = useState<GateResult | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateAction, setGateAction] = useState<null | (() => Promise<void> | void)>(null);
  const [gateLabel, setGateLabel] = useState("");
  const [finalizing, setFinalizing] = useState(false);

  async function withDetectAiGate(
    trigger: GateTrigger,
    actionLabel: string,
    proceed: () => Promise<void> | void,
    force = false,
  ): Promise<boolean> {
    if (!piece) return false;
    try {
      const r = await runGate({ data: { pieceId: piece.id, trigger, force } });
      setGateResult(r);
      if (r.blocked) {
        setGateLabel(actionLabel);
        setGateAction(() => proceed);
        setGateOpen(true);
        return false;
      }
      if (r.enforced) toast.success(`Detect.AI aprovou (score ${r.score})`);
      await proceed();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no Detect.AI");
      // não bloqueia ação se o gate falhar
      await proceed();
      return true;
    }
  }

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

  useEffect(() => {
    if (!user) return;
    loadOfficeBrand(user.id).then(setBrand).catch(() => setBrand(null));
  }, [user]);

  const assembledContent = (() => {
    if (!piece) return content;
    return assemblePiece(content, applyLetterhead ? brand : null, pieceContextFromInput(piece.input_data), {
      applyLetterhead,
      includeClosing: true,
      includeSignatureBlock: true,
    });
  })();

  async function save() {
    if (!piece) return;
    setSaving(true);
    const { error } = await supabase.from("pieces").update({ content_text: content, content_html: markdownToHtml(content) }).eq("id", piece.id);
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
      await supabase.from("pieces").update({ content_text: result.content, content_html: markdownToHtml(result.content), model_used: result.model_used }).eq("id", piece.id);
      toast.success("Peça regenerada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setRegen(false);
    }
  }

  async function doExport() {
    if (!piece) return;
    await withDetectAiGate("export_docx", "exportar DOCX", async () => {
    setExporting(true);
    try {
      // Salva conteúdo final (já com timbrado/assinatura)
      await supabase.from("pieces").update({ content_text: assembledContent, content_html: markdownToHtml(assembledContent) }).eq("id", piece.id);
      const r = await exportPieceDocx(piece.id);
      window.open(r.url, "_blank");
      toast.success("Documento .docx gerado");
      // Recoloca o conteúdo "limpo" no banco para edições futuras
      await supabase.from("pieces").update({ content_text: content, content_html: markdownToHtml(content) }).eq("id", piece.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setExporting(false);
    }
    });
  }

  async function doExportHtml() {
    if (!piece) return;
    await withDetectAiGate("export_html", "exportar HTML", async () => {
    setExportingHtml(true);
    try {
      // Salva antes para garantir que o HTML reflete o conteúdo atual
      await supabase.from("pieces").update({ content_text: content, content_html: markdownToHtml(content) }).eq("id", piece.id);
      await exportPieceHtml(piece.id);
      toast.success("Documento HTML baixado com sucesso");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar HTML");
    } finally {
      setExportingHtml(false);
    }
    });
  }

  async function doExportPdf() {
    if (!piece) return;
    await withDetectAiGate("export_pdf", "exportar PDF", async () => {
    setExportingPdf(true);
    try {
      const blob = await exportPiecePdfProtocolo(
        piece.title || "Peça",
        assembledContent,
        applyLetterhead ? brand : null,
      );
      const safe = (piece.title || "peca").toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 60);
      downloadBlob(blob, `${safe}.pdf`);
      toast.success("PDF gerado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar PDF");
    } finally {
      setExportingPdf(false);
    }
    });
  }

  async function doFinalize() {
    if (!piece) return;
    await withDetectAiGate("finalize", "marcar como final", async () => {
      setFinalizing(true);
      try {
        const { error } = await supabase
          .from("pieces")
          .update({ status: "ready" })
          .eq("id", piece.id);
        if (error) throw new Error(error.message);
        setPiece({ ...piece, status: "ready" });
        toast.success("Peça marcada como final");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao finalizar");
      } finally {
        setFinalizing(false);
      }
    });
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
            {brand?.firm_name ? (
              <label className="ml-2 flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={applyLetterhead} onChange={(e) => setApplyLetterhead(e.target.checked)} className="accent-primary" />
                Aplicar timbrado de <span className="font-medium text-foreground">{brand.firm_name}</span>
              </label>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={regenerate} disabled={regen}>
            <RefreshCw className={`mr-2 h-4 w-4 ${regen ? "animate-spin" : ""}`} /> Regenerar
          </Button>
          <Button variant="outline" onClick={save} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> Salvar
          </Button>
          {piece.status !== "ready" && piece.status !== "archived" && (
            <Button variant="outline" onClick={doFinalize} disabled={finalizing}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Finalizar
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-gradient-brand text-primary-foreground" disabled={exporting || exportingPdf || exportingHtml}>
                <Download className="mr-2 h-4 w-4" />
                {exporting || exportingPdf || exportingHtml ? "Exportando..." : "Exportar"}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={doExportPdf}>
                <FileType className="mr-2 h-4 w-4" /> PDF (pronto para protocolo)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={doExport}>
                <Download className="mr-2 h-4 w-4" /> DOCX
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={doExportHtml}>
                <FileDown className="mr-2 h-4 w-4" /> HTML
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DetectAiGateDialog
        result={gateResult}
        open={gateOpen}
        onOpenChange={setGateOpen}
        pieceId={piece.id}
        actionLabel={gateLabel}
        onOverride={async () => { if (gateAction) await gateAction(); }}
        onRerun={async () => {
          try {
            const r = await runGate({ data: { pieceId: piece.id, trigger: "manual", force: true } });
            setGateResult(r);
            if (!r.blocked) {
              setGateOpen(false);
              toast.success(`Detect.AI aprovou (score ${r.score})`);
              if (gateAction) await gateAction();
            }
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Erro");
          }
        }}
      />

      {!brand?.firm_name && (
        <Card className="glass border-border/50 p-3 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-accent" />
            Configure a <strong>Identidade do Escritório</strong> (logo, cores, assinatura) para gerar peças com papel timbrado.
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/configuracoes/identidade">Configurar agora</Link>
          </Button>
        </Card>
      )}

      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Editor</TabsTrigger>
          <TabsTrigger value="preview">Pré-visualização (A4)</TabsTrigger>
          <TabsTrigger value="markdown">Markdown</TabsTrigger>
          <TabsTrigger value="intel">Inteligência</TabsTrigger>
          <TabsTrigger value="audit">Detect.AI</TabsTrigger>
          <TabsTrigger value="notes">Notas</TabsTrigger>
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
          <Card className="glass border-border/50 p-4">
            <PageMockup content={assembledContent} brand={applyLetterhead ? brand : null} />
          </Card>
        </TabsContent>
        <TabsContent value="markdown">
          <Card className="glass border-border/50 p-8">
            <article className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-li:text-foreground/90">
              <ReactMarkdown>{content}</ReactMarkdown>
            </article>
          </Card>
        </TabsContent>
        <TabsContent value="intel">
          <IntelligencePanel intelligence={piece.checklist} />
        </TabsContent>
        <TabsContent value="audit">
          <AuditPanel
            pieceId={piece.id}
            contentText={content}
            onContentChange={setContent}
          />
        </TabsContent>
        <TabsContent value="notes">
          <OperatorNotesPanel notes={piece.observations} />
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
            pieceTitle={piece.title}
            onContentChange={setContent}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
