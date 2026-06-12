import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import type {
  EvidenceClassification,
  EvidenceItem,
  PieceFormData,
} from "@/lib/cognitiveOs";
import { useJurisprudenciaContexto } from "@/stores/jurisprudenciaContexto";
import { JurisprudenciaPickerDialog } from "@/components/jurisprudencia/JurisprudenciaPickerDialog";
import { Gavel, X } from "lucide-react";

const PIECE_TYPES = [
  { v: "peticao_inicial_civel", l: "Petição Inicial — Cível" },
  { v: "contestacao", l: "Contestação" },
  { v: "replica", l: "Réplica" },
  { v: "recurso_apelacao", l: "Apelação" },
  { v: "embargos_declaracao", l: "Embargos de Declaração" },
  { v: "agravo_instrumento", l: "Agravo de Instrumento" },
  { v: "mandado_seguranca", l: "Mandado de Segurança" },
  { v: "habeas_corpus", l: "Habeas Corpus" },
  { v: "memoriais", l: "Memoriais" },
  { v: "manifestacao", l: "Manifestação" },
];

const TRIBUNALS = ["", "STF", "STJ", "TJRS", "TJSP", "TJRJ", "TJMG", "TRF1", "TRF2", "TRF3", "TRF4", "TRT", "JEC", "Outro"];
const RITOS = ["", "Comum", "Sumaríssimo", "JEC", "Especial", "Execução", "Cautelar"];
const FASES = ["", "Pré-processual", "Conhecimento", "Saneamento", "Instrução", "Sentença", "Recursal", "Cumprimento de sentença"];
const INSTANCIAS = ["", "1ª instância", "2ª instância", "Superior", "Suprema"];

const EVIDENCE_LABELS: Record<EvidenceClassification, string> = {
  robusta: "Robusta",
  suficiente: "Suficiente",
  fragil: "Frágil",
  isolada: "Isolada",
  contraditoria: "Contraditória",
  dependente: "Dependente",
};

const EVIDENCE_TONE: Record<EvidenceClassification, string> = {
  robusta: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  suficiente: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  fragil: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  isolada: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  contraditoria: "bg-red-500/15 text-red-300 border-red-500/30",
  dependente: "bg-violet-500/15 text-violet-300 border-violet-500/30",
};

type Props = {
  form: PieceFormData;
  onChange: (patch: Partial<PieceFormData>) => void;
};

export function PieceFormSections({ form, onChange }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const jurisItens = useJurisprudenciaContexto((s) => s.itens);
  const removeJuris = useJurisprudenciaContexto((s) => s.remove);
  const clearJuris = useJurisprudenciaContexto((s) => s.clear);

  const setField =
    <K extends keyof PieceFormData>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ [k]: e.target.value } as Pick<PieceFormData, K>);

  function addEvidence() {
    onChange({
      evidences: [...form.evidences, { description: "", classification: "suficiente" }],
    });
  }
  function updateEvidence(i: number, patch: Partial<EvidenceItem>) {
    const next = form.evidences.slice();
    next[i] = { ...next[i], ...patch };
    onChange({ evidences: next });
  }
  function removeEvidence(i: number) {
    onChange({ evidences: form.evidences.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="space-y-6">
      {/* IDENTIFICAÇÃO */}
      <Card className="glass border-border/50 p-6 space-y-4">
        <h2 className="font-semibold">Identificação</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Título da peça</Label>
            <Input value={form.title} onChange={setField("title")} placeholder="Ex.: Ação de Cobrança - Fulano vs Beltrano" />
          </div>
          <div>
            <Label>Tipo de peça</Label>
            <Select value={form.piece_type} onValueChange={(v) => onChange({ piece_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PIECE_TYPES.map((p) => (
                  <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Área</Label>
            <Select value={form.area} onValueChange={(v) => onChange({ area: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="civel">Cível</SelectItem>
                <SelectItem value="consumidor">Consumidor</SelectItem>
                <SelectItem value="familia">Família</SelectItem>
                <SelectItem value="trabalhista">Trabalhista</SelectItem>
                <SelectItem value="previdenciario">Previdenciário</SelectItem>
                <SelectItem value="tributario">Tributário</SelectItem>
                <SelectItem value="empresarial">Empresarial</SelectItem>
                <SelectItem value="administrativo">Administrativo</SelectItem>
                <SelectItem value="penal">Penal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Posição da parte</Label>
            <Select value={form.party_position} onValueChange={(v) => onChange({ party_position: v as PieceFormData["party_position"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="autor">Autor / Requerente</SelectItem>
                <SelectItem value="reu">Réu / Requerido</SelectItem>
                <SelectItem value="terceiro">Terceiro interessado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Juízo competente</Label>
            <Input value={form.juizo} onChange={setField("juizo")} placeholder="Ex.: 1ª Vara Cível da Comarca de Porto Alegre/RS" />
          </div>
        </div>
      </Card>

      {/* TRIBUNAL & RITO */}
      <Card className="glass border-border/50 p-6 space-y-4">
        <h2 className="font-semibold">Tribunal & Rito</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <Label>Tribunal</Label>
            <Select value={form.tribunal} onValueChange={(v) => onChange({ tribunal: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {TRIBUNALS.filter(Boolean).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Instância</Label>
            <Select value={form.instancia} onValueChange={(v) => onChange({ instancia: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {INSTANCIAS.filter(Boolean).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Rito</Label>
            <Select value={form.rito} onValueChange={(v) => onChange({ rito: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {RITOS.filter(Boolean).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fase processual</Label>
            <Select value={form.fase_processual} onValueChange={(v) => onChange({ fase_processual: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {FASES.filter(Boolean).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* PARTES */}
      <Card className="glass border-border/50 p-6 space-y-4">
        <h2 className="font-semibold">Partes</h2>
        <div className="space-y-3">
          <Input value={form.autor} onChange={setField("autor")} placeholder="Nome do autor / requerente" />
          <Textarea value={form.autor_qualificacao} onChange={setField("autor_qualificacao")} placeholder="Qualificação completa do autor (nacionalidade, estado civil, profissão, RG, CPF, endereço…)" rows={3} />
          <Input value={form.reu} onChange={setField("reu")} placeholder="Nome do réu / requerido" />
          <Textarea value={form.reu_qualificacao} onChange={setField("reu_qualificacao")} placeholder="Qualificação completa do réu" rows={3} />
        </div>
      </Card>

      {/* FATOS & PROVAS */}
      <Card className="glass border-border/50 p-6 space-y-4">
        <h2 className="font-semibold">Fatos & Provas</h2>
        <div>
          <Label>Dos fatos</Label>
          <Textarea value={form.fatos} onChange={setField("fatos")} rows={5} placeholder="Narre os fatos de forma clara e cronológica…" required />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Provas (classificadas)</Label>
            <Button type="button" size="sm" variant="outline" onClick={addEvidence}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
            </Button>
          </div>
          {form.evidences.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Liste cada prova relevante e classifique-a — isso alimenta o controle antialucinação.
            </p>
          )}
          <div className="space-y-2">
            {form.evidences.map((ev, i) => (
              <div key={i} className="flex gap-2 items-start">
                <Input
                  className="flex-1"
                  value={ev.description}
                  onChange={(e) => updateEvidence(i, { description: e.target.value })}
                  placeholder={`Prova #${i + 1} — ex.: Contrato de prestação de serviços (doc. 03)`}
                />
                <Select
                  value={ev.classification}
                  onValueChange={(v) => updateEvidence(i, { classification: v as EvidenceClassification })}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(EVIDENCE_LABELS) as EvidenceClassification[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        <Badge variant="outline" className={EVIDENCE_TONE[k]}>
                          {EVIDENCE_LABELS[k]}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" size="icon" variant="ghost" onClick={() => removeEvidence(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>Provas pretendidas (texto livre)</Label>
          <Input value={form.provas_text} onChange={setField("provas_text")} placeholder="Ex.: documental, testemunhal, pericial técnica em engenharia…" />
        </div>
      </Card>

      {/* ESTRATÉGIA AVANÇADA (collapsible) */}
      <Card className="glass border-border/50 p-6 space-y-4">
        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="font-semibold">Estratégia avançada (opcional)</h2>
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showAdvanced && (
          <div className="space-y-3 pt-2">
            <div>
              <Label>Controvérsias conhecidas</Label>
              <Textarea rows={2} value={form.controversias} onChange={setField("controversias")} placeholder="Pontos em que a parte contrária já se manifestou ou que sabidamente serão impugnados." />
            </div>
            <div>
              <Label>Teses principais</Label>
              <Textarea rows={2} value={form.teses_principais} onChange={setField("teses_principais")} placeholder="Eixos argumentativos centrais." />
            </div>
            <div>
              <Label>Teses subsidiárias</Label>
              <Textarea rows={2} value={form.teses_subsidiarias} onChange={setField("teses_subsidiarias")} placeholder="Plano B caso a tese principal não vingue." />
            </div>
            <div>
              <Label>Riscos identificados</Label>
              <Textarea rows={2} value={form.riscos} onChange={setField("riscos")} placeholder="Riscos processuais, recursais, probatórios." />
            </div>
            <div>
              <Label>Jurisprudência preferida</Label>
              <Textarea rows={2} value={form.jurisprudencia_preferida} onChange={setField("jurisprudencia_preferida")} placeholder="Súmulas, repetitivos, precedentes do tribunal competente que devem ser explorados." />
            </div>
          </div>
        )}
      </Card>

      {/* CONTEÚDO JURÍDICO */}
      <Card className="glass border-border/50 p-6 space-y-4">
        <h2 className="font-semibold">Fundamentos & Pedidos</h2>
        <div>
          <Label>Fundamentação (dispositivos legais, princípios, súmulas)</Label>
          <Textarea value={form.fundamentos} onChange={setField("fundamentos")} rows={4} placeholder="Indique a base legal e princípios que devem ser explorados." />
        </div>
        <div>
          <Label>Pedidos</Label>
          <Textarea value={form.pedidos} onChange={setField("pedidos")} rows={4} placeholder="Liste os pedidos certos e determinados…" required />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Valor da causa</Label>
            <Input value={form.valor_causa} onChange={setField("valor_causa")} placeholder="R$ 10.000,00" />
          </div>
        </div>
        <div>
          <Label>Contexto adicional / observações</Label>
          <Textarea value={form.contexto} onChange={setField("contexto")} rows={3} placeholder="Informações extras úteis para a redação." />
        </div>
      </Card>

      {/* JURISPRUDÊNCIA SELECIONADA */}
      <Card className="glass border-border/50 p-6 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Gavel className="h-4 w-4 text-accent" />
            <h2 className="font-semibold">Jurisprudência para esta peça</h2>
            {jurisItens.length > 0 && (
              <Badge variant="outline" className="border-accent/40 bg-accent/10 text-accent">
                {jurisItens.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {jurisItens.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={clearJuris} className="text-xs">
                Limpar
              </Button>
            )}
            <JurisprudenciaPickerDialog />
          </div>
        </div>
        {jurisItens.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhuma decisão selecionada. As ementas escolhidas serão citadas <strong>literalmente</strong> pelo gerador (antialucinação).
          </p>
        ) : (
          <ul className="space-y-2">
            {jurisItens.map((d) => (
              <li
                key={d.id}
                className="flex items-start gap-2 rounded-lg border border-border/50 bg-card/40 p-2"
              >
                <div className="min-w-0 flex-1 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5 font-medium">
                    <span className="text-accent">{(d.court || "").toUpperCase()}</span>
                    {d.process_number && <span className="font-mono text-muted-foreground">{d.process_number}</span>}
                    {d.rapporteur && <span className="text-muted-foreground">— Rel. {d.rapporteur}</span>}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-muted-foreground">{d.syllabus}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => removeJuris(d.id)}
                  aria-label="Remover"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
