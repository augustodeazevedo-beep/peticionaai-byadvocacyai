import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles,
  Wand2,
  Layers,
  Type as TypeIcon,
  Palette as PaletteIcon,
  History,
  Download,
  RefreshCw,
  RotateCcw,
  Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { sendPieceToAdvoga } from "@/lib/advoga.functions";
import { sendPieceToInventaria } from "@/lib/inventaria.functions";
import { useAuth } from "@/lib/auth";
import { generatePiece } from "@/lib/mikeClient";
import {
  fetchVisualLawStyle,
  upsertVisualLawStyle,
  generateVisualLawPdf,
  downloadVersionPdf,
} from "@/lib/visual-law/client";
import { DEFAULT_STYLE, type VisualLawStyle } from "@/lib/visual-law/types";

type Props = {
  pieceId: string;
  title: string;
  contentText: string;
  authorOrCase?: string;
  pieceType?: string;
  area?: string | null;
  inputData?: Record<string, unknown>;
  onContentChange?: (text: string) => void;
};

const FONTS: VisualLawStyle["font"][] = ["Helvetica", "Times-Roman", "Courier"];
const PALETTES: { id: VisualLawStyle["color_palette"]; label: string; sample: string[] }[] = [
  { id: "neutra", label: "Neutra", sample: ["#0f172a", "#475569"] },
  { id: "azul", label: "Azul institucional", sample: ["#1e3a8a", "#3b82f6"] },
  { id: "verde", label: "Verde", sample: ["#14532d", "#10b981"] },
  { id: "violeta", label: "Violeta", sample: ["#4c1d95", "#8b5cf6"] },
  { id: "personalizada", label: "Personalizada", sample: ["#000", "#888"] },
];
const DENSITIES: VisualLawStyle["density"][] = ["enxuto", "padrao", "confortavel"];
const DIRECTIONS: { id: VisualLawStyle["direction"]; title: string; desc: string }[] = [
  { id: "organizar", title: "Só organizar", desc: "Mantém o texto, melhora títulos e estrutura." },
  { id: "explicar", title: "Explicar melhor", desc: "Reescreve trechos densos com clareza didática." },
  { id: "mais_visual", title: "Mais visual", desc: "Insere quadros, timelines e quote-cards quando útil." },
];
const ELEMENTS: { key: keyof VisualLawStyle["elements"]; label: string }[] = [
  { key: "capa", label: "Capa" },
  { key: "sumario", label: "Sumário" },
  { key: "quadros", label: "Quadros destaque" },
  { key: "timeline", label: "Linha do tempo" },
  { key: "infograficos", label: "Infográficos" },
  { key: "quoteCards", label: "Citações em quote-cards" },
  { key: "numeracao", label: "Numeração de páginas" },
];

export function VisualLawPanel(props: Props) {
  const { user } = useAuth();
  const [style, setStyle] = useState<VisualLawStyle>(DEFAULT_STYLE);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingInventaria, setSendingInventaria] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const sendToAdvoga = useServerFn(sendPieceToAdvoga);
  const sendToInventaria = useServerFn(sendPieceToInventaria);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await fetchVisualLawStyle(props.pieceId);
      if (alive) {
        setStyle(s);
        setLoading(false);
      }
      const { data } = await supabase
        .from("piece_visual_versions" as any)
        .select("*")
        .eq("piece_id", props.pieceId)
        .order("created_at", { ascending: false });
      if (alive) setVersions((data as any[]) ?? []);
    })();
    return () => {
      alive = false;
    };
  }, [props.pieceId]);

  // debounced upsert
  useEffect(() => {
    if (loading || !user) return;
    const t = setTimeout(() => {
      upsertVisualLawStyle(props.pieceId, user.id, style).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [style, loading, user, props.pieceId]);

  const set = <K extends keyof VisualLawStyle>(k: K, v: VisualLawStyle[K]) =>
    setStyle((s) => ({ ...s, [k]: v }));
  const setEl = (k: keyof VisualLawStyle["elements"], v: boolean) =>
    setStyle((s) => ({ ...s, elements: { ...s.elements, [k]: v } }));

  async function regenerateText() {
    if (!user) return;
    setRegenerating(true);
    try {
      const directionPrompt =
        style.direction === "organizar"
          ? "Reorganize o texto da peça mantendo o conteúdo. Acrescente títulos markdown (#, ##, ###) onde adequado. Não mude o teor jurídico."
          : style.direction === "explicar"
          ? "Reescreva trechos densos com linguagem clara e didática, mantendo a tese. Use títulos markdown e parágrafos curtos."
          : "Reorganize com forte apelo visual. Use marcações [QUADRO title=\"...\"]...[/QUADRO] para sínteses, [TIMELINE]... [/TIMELINE] para linha do tempo (uma por linha), [QUOTE]...[/QUOTE] para citações de jurisprudência. Mantenha a tese.";
      const extra = style.extra_instructions ? `\n\nInstruções extras: ${style.extra_instructions}` : "";
      const res = await generatePiece({
        piece_type: props.pieceType ?? "peticao",
        area: props.area ?? undefined,
        fields: { ...(props.inputData ?? {}), original_text: props.contentText },
        context: directionPrompt + extra,
      });
      await supabase
        .from("pieces")
        .update({ content_text: res.content, content_html: res.content })
        .eq("id", props.pieceId);
      props.onContentChange?.(res.content);
      toast.success("Texto reorganizado pelo Mike");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao regerar");
    } finally {
      setRegenerating(false);
    }
  }

  async function generatePdf() {
    if (!user) return;
    setGenerating(true);
    try {
      const r = await generateVisualLawPdf({
        pieceId: props.pieceId,
        userId: user.id,
        title: props.title,
        authorOrCase: props.authorOrCase,
        contentText: props.contentText,
        style,
      });
      window.open(r.url, "_blank");
      const { data } = await supabase
        .from("piece_visual_versions" as any)
        .select("*")
        .eq("piece_id", props.pieceId)
        .order("created_at", { ascending: false });
      setVersions((data as any[]) ?? []);
      toast.success("PDF Visual Law gerado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar PDF");
    } finally {
      setGenerating(false);
    }
  }

  async function sendNow() {
    setSending(true);
    try {
      const res = await sendToAdvoga({ data: { pieceId: props.pieceId } });
      if (res.ok) toast.success(`Enviado ao Advoga.AI (HTTP ${res.status})`);
      else toast.error(`Advoga.AI retornou ${res.status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar");
    } finally {
      setSending(false);
    }
  }

  async function sendNowInventaria() {
    setSendingInventaria(true);
    try {
      const res = await sendToInventaria({ data: { pieceId: props.pieceId } });
      if (res.ok) toast.success(`Enviado ao Inventaria.AI (HTTP ${res.status})`);
      else toast.error(`Inventaria.AI retornou ${res.status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar");
    } finally {
      setSendingInventaria(false);
    }
  }

  async function restoreVersion(v: any) {
    setStyle({ ...DEFAULT_STYLE, ...(v.style_snapshot ?? {}) });
    toast.success("Estilo restaurado");
  }

  async function downloadVersion(v: any) {
    if (!v.pdf_storage_path) return;
    const url = await downloadVersionPdf(v.pdf_storage_path);
    if (url) window.open(url, "_blank");
  }

  if (loading) return <p className="text-muted-foreground text-sm">Carregando estilos…</p>;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="glass border-border/50 p-6 space-y-6">
        <div>
          <Badge variant="outline" className="mb-2">
            <Sparkles className="h-3 w-3 mr-1" /> Antes de gerar
          </Badge>
          <h2 className="text-xl font-semibold">Revise o formato antes de transformar a peça</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configurações carregadas do seu último uso. Ajuste e gere o PDF estilizado.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <QuickCard icon={<Layers className="h-4 w-4" />} title="Template" value={style.template} />
          <QuickCard icon={<TypeIcon className="h-4 w-4" />} title="Fonte" value={style.font} />
          <QuickCard icon={<Wand2 className="h-4 w-4" />} title="Direção" value={DIRECTIONS.find((d) => d.id === style.direction)?.title ?? ""} />
          <QuickCard icon={<PaletteIcon className="h-4 w-4" />} title="Paleta" value={PALETTES.find((p) => p.id === style.color_palette)?.label ?? ""} />
        </div>
        <div>
          <Label className="text-xs">Instruções visuais (opcional)</Label>
          <Textarea
            value={style.extra_instructions ?? ""}
            onChange={(e) => set("extra_instructions", e.target.value)}
            placeholder="Ex.: destaque os requisitos do art. 300 em quadro; use timeline para os fatos."
            rows={3}
            className="mt-1"
          />
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" onClick={regenerateText} disabled={regenerating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? "animate-spin" : ""}`} />
            Regerar texto (Mike)
          </Button>
          <Button variant="outline" onClick={sendNow} disabled={sending}>
            <Send className={`h-4 w-4 mr-2 ${sending ? "animate-pulse" : ""}`} />
            Enviar ao Advoga.AI
          </Button>
          <Button variant="outline" onClick={sendNowInventaria} disabled={sendingInventaria}>
            <Send className={`h-4 w-4 mr-2 ${sendingInventaria ? "animate-pulse" : ""}`} />
            Enviar ao Inventaria.AI
          </Button>
          <Button onClick={generatePdf} disabled={generating} className="bg-gradient-brand text-primary-foreground">
            <Download className="h-4 w-4 mr-2" /> {generating ? "Gerando..." : "Gerar Visual Law"}
          </Button>
        </div>
      </Card>

      <Card className="glass border-border/50 p-3">
        <Tabs defaultValue="aparencia">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="aparencia">Aparência</TabsTrigger>
            <TabsTrigger value="direcao">Direção</TabsTrigger>
            <TabsTrigger value="elementos">Elementos</TabsTrigger>
            <TabsTrigger value="versoes">Versões</TabsTrigger>
          </TabsList>

          <TabsContent value="aparencia" className="space-y-4 mt-3">
            <div>
              <Label className="text-xs">Fonte</Label>
              <div className="grid grid-cols-3 gap-1 mt-1">
                {FONTS.map((f) => (
                  <Button
                    key={f}
                    type="button"
                    size="sm"
                    variant={style.font === f ? "default" : "outline"}
                    onClick={() => set("font", f)}
                  >
                    {f}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Paleta</Label>
              <div className="space-y-1 mt-1">
                {PALETTES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => set("color_palette", p.id)}
                    className={`w-full flex items-center gap-2 rounded border px-2 py-1.5 text-left text-xs ${
                      style.color_palette === p.id ? "border-primary bg-primary/5" : "border-border/50"
                    }`}
                  >
                    <span className="flex">
                      {p.sample.map((c) => (
                        <span key={c} style={{ background: c }} className="h-4 w-4 rounded-full -ml-1 border border-background" />
                      ))}
                    </span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
              {style.color_palette === "personalizada" && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <Label className="text-[11px]">Primária</Label>
                    <Input type="color" value={style.custom_primary ?? "#0f172a"} onChange={(e) => set("custom_primary", e.target.value)} className="h-8 p-1" />
                  </div>
                  <div>
                    <Label className="text-[11px]">Acento</Label>
                    <Input type="color" value={style.custom_accent ?? "#06b6d4"} onChange={(e) => set("custom_accent", e.target.value)} className="h-8 p-1" />
                  </div>
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs">Densidade</Label>
              <div className="grid grid-cols-3 gap-1 mt-1">
                {DENSITIES.map((d) => (
                  <Button key={d} type="button" size="sm" variant={style.density === d ? "default" : "outline"} onClick={() => set("density", d)}>
                    {d}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="direcao" className="space-y-2 mt-3">
            {DIRECTIONS.map((d) => (
              <button
                key={d.id}
                onClick={() => set("direction", d.id)}
                className={`w-full text-left rounded border px-3 py-2 ${
                  style.direction === d.id ? "border-primary bg-primary/5" : "border-border/50"
                }`}
              >
                <p className="text-sm font-medium">{d.title}</p>
                <p className="text-xs text-muted-foreground">{d.desc}</p>
              </button>
            ))}
          </TabsContent>

          <TabsContent value="elementos" className="space-y-2 mt-3">
            {ELEMENTS.map((el) => (
              <div key={el.key} className="flex items-center justify-between">
                <Label htmlFor={`el-${el.key}`} className="text-sm">{el.label}</Label>
                <Switch
                  id={`el-${el.key}`}
                  checked={!!style.elements[el.key]}
                  onCheckedChange={(v) => setEl(el.key, v)}
                />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="versoes" className="space-y-2 mt-3">
            {versions.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma versão gerada ainda.</p>}
            {versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded border border-border/50 px-2 py-1.5 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <History className="h-3 w-3" />
                  <span className="truncate">{new Date(v.created_at).toLocaleString("pt-BR")}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => restoreVersion(v)} title="Restaurar estilo">
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => downloadVersion(v)} title="Baixar PDF" disabled={!v.pdf_storage_path}>
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

function QuickCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="rounded border border-border/50 px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{title}</span>
      </div>
      <p className="text-sm font-medium mt-1 truncate capitalize">{value}</p>
    </div>
  );
}