import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { generatePieceCognitive, type CognitiveStep } from "@/lib/mikeClient";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { PieceFormSections } from "@/components/pieces/PieceFormSections";
import {
  PieceGenerationOverlay,
  type StepState,
} from "@/components/pieces/PieceGenerationOverlay";
import type { PieceFormData } from "@/lib/cognitiveOs";
import { TemplatePicker } from "@/components/templates/TemplatePicker";
import { incrementUsage, renderTemplate, type PieceTemplate } from "@/lib/pieceTemplates";

/**
 * Converte Markdown simples para HTML.
 * Usa expressões regulares para os padrões mais comuns em peças jurídicas:
 * headings, negrito, itálico, listas e parágrafos.
 * Se o projeto adicionar `marked` ao package.json, substitua esta função por:
 *   import { marked } from 'marked';
 *   const markdownToHtml = (md: string) => marked(md);
 */
function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inList = false;

  for (const raw of lines) {
    let line = raw;

    // Headings
    if (/^######\s/.test(line)) { line = `<h6>${line.slice(7)}</h6>`; }
    else if (/^#####\s/.test(line)) { line = `<h5>${line.slice(6)}</h5>`; }
    else if (/^####\s/.test(line)) { line = `<h4>${line.slice(5)}</h4>`; }
    else if (/^###\s/.test(line)) { line = `<h3>${line.slice(4)}</h3>`; }
    else if (/^##\s/.test(line)) { line = `<h2>${line.slice(3)}</h2>`; }
    else if (/^#\s/.test(line)) { line = `<h1>${line.slice(2)}</h1>`; }
    // Unordered list items
    else if (/^[-*+]\s/.test(line)) {
      if (!inList) { html.push("<ul>"); inList = true; }
      // Apply inline formatting then wrap
      line = applyInline(line.slice(2));
      html.push(`<li>${line}</li>`);
      continue;
    }
    // Ordered list items
    else if (/^\d+\.\s/.test(line)) {
      if (!inList) { html.push("<ol>"); inList = true; }
      line = applyInline(line.replace(/^\d+\.\s/, ""));
      html.push(`<li>${line}</li>`);
      continue;
    }
    else {
      // Close any open list
      if (inList) {
        html.push(html[html.length - 1]?.startsWith("<li") ? "</ul>" : "</ol>");
        inList = false;
      }
      // Horizontal rule
      if (/^---+$/.test(line.trim())) {
        html.push("<hr />");
        continue;
      }
      // Empty line → paragraph break
      if (line.trim() === "") {
        html.push("<br />");
        continue;
      }
      line = applyInline(line);
      html.push(`<p>${line}</p>`);
      continue;
    }

    // Close list if heading or hr was hit mid-list
    if (inList) { html.push("</ul>"); inList = false; }
    html.push(line);
  }

  if (inList) html.push("</ul>");
  return html.join("\n");
}

function applyInline(text: string): string {
  return text
    // Bold+italic
    .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
    // Bold
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

export const Route = createFileRoute("/_authenticated/pecas/nova")({
  head: () => ({ meta: [{ title: "Nova Peça — Peticiona.AI" }] }),
  component: NovaPeca,
});

const INITIAL: PieceFormData = {
  title: "",
  area: "civel",
  piece_type: "peticao_inicial_civel",
  party_position: "autor",
  tribunal: "",
  instancia: "",
  rito: "",
  fase_processual: "",
  juizo: "",
  autor: "",
  autor_qualificacao: "",
  reu: "",
  reu_qualificacao: "",
  fatos: "",
  fundamentos: "",
  pedidos: "",
  valor_causa: "",
  provas_text: "",
  evidences: [],
  controversias: "",
  teses_principais: "",
  teses_subsidiarias: "",
  riscos: "",
  jurisprudencia_preferida: "",
  contexto: "",
};

const STEP_INITIAL: Record<CognitiveStep, StepState> = {
  cognitive: "pending",
  adversarial: "pending",
  draft: "pending",
  audit: "pending",
};

function NovaPeca() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<PieceFormData>(INITIAL);
  const [steps, setSteps] = useState<Record<CognitiveStep, StepState>>(STEP_INITIAL);
  const [draftPreview, setDraftPreview] = useState("");
  const [template, setTemplate] = useState<PieceTemplate | null>(null);

  function onSelectTemplate(t: PieceTemplate | null) {
    setTemplate(t);
    if (!t) return;
    // Pré-preenche o título quando vazio
    setForm((f) => ({
      ...f,
      title: f.title || t.name,
    }));
    toast.success(`Modelo "${t.name}" selecionado`);
  }

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.fatos.trim() || !form.pedidos.trim()) {
      toast.error("Preencha ao menos os fatos e os pedidos.");
      return;
    }
    setLoading(true);
    setSteps({ ...STEP_INITIAL });
    setDraftPreview("");
    try {
      const { data: piece, error: insErr } = await supabase
        .from("pieces")
        .insert({
          user_id: user.id,
          title: form.title || `Petição Inicial — ${form.autor || "Sem título"}`,
          piece_type: form.piece_type,
          area: form.area,
          status: "generating",
          input_data: form,
          template_id: template?.id ?? null,
        })
        .select()
        .single();
      if (insErr) throw insErr;

      const result = await generatePieceCognitive({
        piece_type: form.piece_type,
        area: form.area,
        fields: form,
        context: [
          form.contexto || "",
          template?.prompt_hints ? `\n\n[INSTRUÇÕES DO MODELO "${template.name}"]\n${template.prompt_hints}` : "",
          template?.content_md
            ? `\n\n[ESQUELETO BASE DO MODELO]\n${renderTemplate(template.content_md, {
                cliente: form.autor,
                cliente_qualificacao: form.autor_qualificacao,
                reu: form.reu,
                reu_qualificacao: form.reu_qualificacao,
                juizo: form.juizo,
                tribunal: form.tribunal,
                fatos: form.fatos,
                fundamentos: form.fundamentos,
                pedidos: form.pedidos,
                valor_causa: form.valor_causa,
              })}`
            : "",
        ].filter(Boolean).join(""),
        party_position: form.party_position,
        tribunal: form.tribunal || undefined,
        instancia: form.instancia || undefined,
        rito: form.rito || undefined,
        fase_processual: form.fase_processual || undefined,
        piece_id: piece.id,
      }, {
        onStepStart: (s) => setSteps((p) => ({ ...p, [s]: "running" })),
        onStepDone: (s, _d, degraded) =>
          setSteps((p) => ({ ...p, [s]: degraded ? "degraded" : "done" })),
        onDelta: (t) => setDraftPreview((prev) => prev + t),
      });

      const contentHtml = markdownToHtml(result.content);
      const auditNotes =
        (result.intelligence?.audit as { operator_notes?: string[] } | undefined)?.operator_notes ?? [];

      await supabase
        .from("pieces")
        .update({
          status: "ready",
          content_text: result.content,
          content_html: contentHtml,
          model_used: result.model_used,
          checklist: JSON.parse(JSON.stringify(result.intelligence ?? {})),
          observations: auditNotes.join("\n"),
        })
        .eq("id", piece.id);

      if (template) {
        await incrementUsage(template.id).catch(() => {});
      }

      toast.success("Peça gerada com sucesso!");
      navigate({ to: "/pecas/$id", params: { id: piece.id } });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Erro ao gerar peça");
      setSteps((p) => {
        const next = { ...p };
        (Object.keys(next) as CognitiveStep[]).forEach((k) => {
          if (next[k] === "running") next[k] = "error";
        });
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nova Peça</h1>
        <p className="text-muted-foreground">
          Pipeline cognitivo em 4 etapas: mapeamento dos autos → análise adversarial → redação → auditoria.
        </p>
      </div>

      <form onSubmit={onGenerate} className="space-y-6">
        <TemplatePicker
          area={form.area}
          pieceType={form.piece_type}
          selectedId={template?.id ?? null}
          onSelect={onSelectTemplate}
        />
        <PieceFormSections
          form={form}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/dashboard" })}>Cancelar</Button>
          <Button type="submit" disabled={loading} className="bg-gradient-brand text-primary-foreground">
            <Sparkles className="mr-2 h-4 w-4" /> {loading ? "Gerando peça..." : "Gerar peça com IA"}
          </Button>
        </div>
      </form>

      <PieceGenerationOverlay open={loading} steps={steps} draftPreview={draftPreview} />
    </div>
  );
}
