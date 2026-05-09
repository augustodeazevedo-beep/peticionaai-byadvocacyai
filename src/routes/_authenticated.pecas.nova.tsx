import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { generatePiece } from "@/lib/mikeClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pecas/nova")({
  head: () => ({ meta: [{ title: "Nova Peça — Peticiona.AI" }] }),
  component: NovaPeca,
});

function NovaPeca() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    area: "civel",
    juizo: "",
    autor: "",
    autor_qualificacao: "",
    reu: "",
    reu_qualificacao: "",
    fatos: "",
    fundamentos: "",
    pedidos: "",
    valor_causa: "",
    provas: "",
    contexto: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      // Cria peça em estado generating
      const { data: piece, error: insErr } = await supabase
        .from("pieces")
        .insert({
          user_id: user.id,
          title: form.title || `Petição Inicial — ${form.autor || "Sem título"}`,
          piece_type: "peticao_inicial_civel",
          area: form.area,
          status: "generating",
          input_data: form,
        })
        .select()
        .single();
      if (insErr) throw insErr;

      const result = await generatePiece({
        piece_type: "peticao_inicial_civel",
        area: form.area,
        fields: form,
        context: form.contexto,
      });

      await supabase
        .from("pieces")
        .update({
          status: "ready",
          content_text: result.content,
          content_html: result.content,
          model_used: result.model_used,
        })
        .eq("id", piece.id);

      toast.success("Peça gerada com sucesso!");
      navigate({ to: "/pecas/$id", params: { id: piece.id } });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Erro ao gerar peça");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nova Peça</h1>
        <p className="text-muted-foreground">Petição Inicial Cível — preencha os campos abaixo. A IA produzirá a peça com base nas regras configuradas.</p>
      </div>

      <form onSubmit={onGenerate} className="space-y-6">
        <Card className="glass border-border/50 p-6 space-y-4">
          <h2 className="font-semibold">Identificação</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Título da peça</Label>
              <Input value={form.title} onChange={set("title")} placeholder="Ex.: Ação de Cobrança - Fulano vs Beltrano" />
            </div>
            <div>
              <Label>Área</Label>
              <Select value={form.area} onValueChange={(v) => setForm({ ...form, area: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="civel">Cível</SelectItem>
                  <SelectItem value="consumidor">Consumidor</SelectItem>
                  <SelectItem value="familia">Família</SelectItem>
                  <SelectItem value="trabalhista">Trabalhista</SelectItem>
                  <SelectItem value="previdenciario">Previdenciário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Juízo competente</Label>
              <Input value={form.juizo} onChange={set("juizo")} placeholder="Ex.: Juízo da 1ª Vara Cível da Comarca de Porto Alegre/RS" />
            </div>
          </div>
        </Card>

        <Card className="glass border-border/50 p-6 space-y-4">
          <h2 className="font-semibold">Partes</h2>
          <div className="space-y-3">
            <Input value={form.autor} onChange={set("autor")} placeholder="Nome do autor" />
            <Textarea value={form.autor_qualificacao} onChange={set("autor_qualificacao")} placeholder="Qualificação completa do autor (nacionalidade, estado civil, profissão, RG, CPF, endereço…)" rows={3} />
            <Input value={form.reu} onChange={set("reu")} placeholder="Nome do réu" />
            <Textarea value={form.reu_qualificacao} onChange={set("reu_qualificacao")} placeholder="Qualificação completa do réu" rows={3} />
          </div>
        </Card>

        <Card className="glass border-border/50 p-6 space-y-4">
          <h2 className="font-semibold">Conteúdo jurídico</h2>
          <div>
            <Label>Dos fatos</Label>
            <Textarea value={form.fatos} onChange={set("fatos")} rows={5} placeholder="Narre os fatos de forma clara e cronológica..." required />
          </div>
          <div>
            <Label>Fundamentação (teses, dispositivos legais, súmulas que devem ser exploradas)</Label>
            <Textarea value={form.fundamentos} onChange={set("fundamentos")} rows={4} placeholder="Indique a base legal, princípios, súmulas e teses..." />
          </div>
          <div>
            <Label>Pedidos</Label>
            <Textarea value={form.pedidos} onChange={set("pedidos")} rows={4} placeholder="Liste os pedidos certos e determinados..." required />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Valor da causa</Label>
              <Input value={form.valor_causa} onChange={set("valor_causa")} placeholder="R$ 10.000,00" />
            </div>
            <div>
              <Label>Provas pretendidas</Label>
              <Input value={form.provas} onChange={set("provas")} placeholder="Documental, testemunhal, pericial..." />
            </div>
          </div>
          <div>
            <Label>Contexto adicional / observações</Label>
            <Textarea value={form.contexto} onChange={set("contexto")} rows={3} placeholder="Informações extras úteis para a redação." />
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/dashboard" })}>Cancelar</Button>
          <Button type="submit" disabled={loading} className="bg-gradient-brand text-primary-foreground">
            <Sparkles className="mr-2 h-4 w-4" /> {loading ? "Gerando peça..." : "Gerar peça com IA"}
          </Button>
        </div>
      </form>
    </div>
  );
}