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
import { markdownToHtml } from "@/lib/markdown";
import { QuickCommandsPanel } from "@/components/pieces/QuickCommandsPanel";
import type { QuickCommand } from "@/lib/quickCommands";
import { useAIGovernance, DEFENSIVE_SYSTEM_PROMPT } from "@/lib/aiGovernance";
import {
  useJurisprudenciaContexto,
  buildJurisprudenciaContextBlock,
} from "@/stores/jurisprudenciaContexto";
import { useServerFn } from "@tanstack/react-start";
import { saveSelecaoJurisprudencia } from "@/lib/jurisprudencia.functions";

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
  const { prefs, appendDisclosure } = useAIGovernance();
  const jurisItens = useJurisprudenciaContexto((s) => s.itens);
  const clearJuris = useJurisprudenciaContexto((s) => s.clear);
  const saveSelecao = useServerFn(saveSelecaoJurisprudencia);

  function applyQuickCommand(cmd: QuickCommand) {
    setForm((f) => ({ ...f, ...cmd.defaults, title: f.title || cmd.defaults.title || cmd.label }));
    toast.success(`Comando ${cmd.slug} aplicado`);
  }

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
      const skipPersist = prefs.temporary_chats;
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
          prefs.defensive_mode ? `\n\n${DEFENSIVE_SYSTEM_PROMPT}\n\n` : "",
          buildJurisprudenciaContextBlock(jurisItens),
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

      const finalContent = appendDisclosure(result.content);
      const contentHtml = markdownToHtml(finalContent);
      const auditNotes =
        (result.intelligence?.audit as { operator_notes?: string[] } | undefined)?.operator_notes ?? [];

      await supabase
        .from("pieces")
        .update({
          status: "ready",
          content_text: finalContent,
          content_html: contentHtml,
          model_used: result.model_used,
          checklist: JSON.parse(JSON.stringify(result.intelligence ?? {})),
          observations: auditNotes.join("\n"),
        })
        .eq("id", piece.id);

      // Persistir seleções de jurisprudência ligadas à peça (auditoria).
      if (jurisItens.length > 0 && !skipPersist) {
        await Promise.all(
          jurisItens.map((d) =>
            saveSelecao({ data: { piece_id: piece.id, decision: d } }).catch((err) => {
              console.error("[jurisprudencia] falha ao salvar seleção", err);
            }),
          ),
        );
        clearJuris();
      }

      if (skipPersist) {
        // Chats temporários: remover a peça após a geração
        await supabase.from("pieces").delete().eq("id", piece.id);
      }

      if (template) {
        await incrementUsage(template.id).catch(() => {});
      }

      if (prefs.human_in_loop) {
        const ok = window.confirm(
          "Human-in-the-Loop ativo: confirme a revisão humana antes de visualizar a peça gerada.",
        );
        if (!ok) {
          toast.warning("Revisão pendente — peça mantida em rascunho.");
          return;
        }
      }
      toast.success("Peça gerada com sucesso!");
      if (!skipPersist) {
        navigate({ to: "/pecas/$id", params: { id: piece.id } });
      } else {
        toast.info("Modo Chat Temporário: a peça não foi salva no histórico.");
        navigate({ to: "/dashboard" });
      }
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
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold">Nova Peça</h1>
        <p className="text-muted-foreground">
          Pipeline cognitivo em 4 etapas: mapeamento dos autos → análise adversarial → redação → auditoria.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
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
        <aside className="hidden lg:block">
          <QuickCommandsPanel onSelect={applyQuickCommand} />
        </aside>
      </div>

      <PieceGenerationOverlay open={loading} steps={steps} draftPreview={draftPreview} />
    </div>
  );
}
