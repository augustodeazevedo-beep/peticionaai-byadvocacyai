import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { PieceIntelligence } from "@/lib/cognitiveOs";
import { AlertTriangle, Brain, Gavel, ShieldCheck } from "lucide-react";

type Props = { intelligence: unknown };

function isCognitivePayload(v: unknown): v is PieceIntelligence {
  return !!v && typeof v === "object" && !Array.isArray(v) &&
    ("cognitive" in v || "adversarial" in v || "audit" in v);
}

function List({ items, empty }: { items?: string[]; empty?: string }) {
  if (!items || items.length === 0) {
    return <p className="text-xs text-muted-foreground italic">{empty ?? "—"}</p>;
  }
  return (
    <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/90">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted-foreground min-w-[120px]">{label}:</span>
      <span className="text-foreground/90">{value}</span>
    </div>
  );
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ok: "secondary",
  alerta: "outline",
  critico: "destructive",
};

const RISK_LABEL: Record<string, string> = {
  baixo: "Risco baixo",
  medio: "Risco médio",
  alto: "Risco alto",
};

export function IntelligencePanel({ intelligence }: Props) {
  const data = useMemo<PieceIntelligence | null>(() => {
    if (isCognitivePayload(intelligence)) return intelligence;
    return null;
  }, [intelligence]);

  if (!data) {
    // Legacy / array de strings
    if (Array.isArray(intelligence) && intelligence.length > 0) {
      return (
        <Card className="glass border-border/50 p-5 space-y-2">
          <p className="text-xs text-muted-foreground">Peça gerada em modo legado — exibindo checklist simples.</p>
          <List items={intelligence as string[]} />
        </Card>
      );
    }
    return (
      <Card className="glass border-border/50 p-8 text-center space-y-2">
        <Brain className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">
          Nenhuma inteligência disponível. Regere a peça em modo Cognitive para popular esta aba.
        </p>
      </Card>
    );
  }

  const { cognitive, adversarial, audit } = data;
  const alerts = (audit?.checklist_final ?? []).filter((c) => c.status !== "ok").length +
    (audit?.lacunas?.length ?? 0) + (audit?.placeholders?.length ?? 0);

  return (
    <div className="space-y-4">
      {audit?.risco_geral && (
        <div className="flex items-center gap-2">
          <Badge variant={audit.risco_geral === "alto" ? "destructive" : audit.risco_geral === "medio" ? "outline" : "secondary"}>
            {RISK_LABEL[audit.risco_geral] ?? audit.risco_geral}
          </Badge>
          {alerts > 0 && (
            <Badge variant="outline" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> {alerts} alerta{alerts > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      )}

      <Accordion type="multiple" defaultValue={["cognitive", "adversarial", "audit"]} className="space-y-2">
        <AccordionItem value="cognitive" className="glass border-border/50 rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> Protocolo Cognitivo</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            {cognitive ? (
              <>
                <div className="grid gap-1">
                  <Field label="Rito" value={cognitive.rito} />
                  <Field label="Competência" value={cognitive.competencia} />
                  <Field label="Fase processual" value={cognitive.fase_processual} />
                </div>
                <Section title="Controvérsias"><List items={cognitive.controversias} empty="Nenhuma mapeada" /></Section>
                <Section title="Fatos incontroversos"><List items={cognitive.fatos_incontroversos} empty="—" /></Section>
                {cognitive.timeline && cognitive.timeline.length > 0 && (
                  <Section title="Linha do tempo">
                    <ul className="space-y-1 text-sm">
                      {cognitive.timeline.map((t, i) => (
                        <li key={i} className="flex gap-2">
                          {t.date && <span className="font-mono text-xs text-primary min-w-[90px]">{t.date}</span>}
                          <span className="text-foreground/90">{t.event}</span>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
                {cognitive.provas_classificadas && cognitive.provas_classificadas.length > 0 && (
                  <Section title="Provas classificadas">
                    <ul className="space-y-2 text-sm">
                      {cognitive.provas_classificadas.map((p, i) => (
                        <li key={i} className="flex flex-wrap items-start gap-2">
                          <Badge variant="outline" className="text-xs">{p.classification}</Badge>
                          <span className="text-foreground/90 flex-1">{p.description}</span>
                          {p.argument && <span className="text-xs text-muted-foreground">→ {p.argument}</span>}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
                <Section title="Riscos processuais"><List items={cognitive.riscos_processuais} /></Section>
                <Section title="Riscos recursais"><List items={cognitive.riscos_recursais} /></Section>
                <Section title="Teses principais"><List items={cognitive.teses_principais} /></Section>
                <Section title="Teses subsidiárias"><List items={cognitive.teses_subsidiarias} /></Section>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Etapa cognitiva não disponível.</p>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="adversarial" className="glass border-border/50 rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2"><Gavel className="h-4 w-4 text-primary" /> Análise Adversarial</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            {adversarial ? (
              <>
                <Section title="Argumentos contrários previstos"><List items={adversarial.argumentos_contrarios} /></Section>
                <Section title="Vulnerabilidades narrativas"><List items={adversarial.vulnerabilidades} /></Section>
                <Section title="Fragilidades probatórias"><List items={adversarial.fragilidades_probatorias} /></Section>
                <Section title="Antecipação de objeções do juízo"><List items={adversarial.antecipacao_juiz} /></Section>
                <Section title="Neutralizações sugeridas"><List items={adversarial.neutralizacoes} /></Section>
                <Section title="Riscos de improcedência"><List items={adversarial.riscos_improcedencia} /></Section>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Etapa adversarial não disponível.</p>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="audit" className="glass border-border/50 rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Auditoria interna</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            {audit ? (
              <>
                {audit.checklist_final && audit.checklist_final.length > 0 && (
                  <Section title="Checklist final">
                    <ul className="space-y-2 text-sm">
                      {audit.checklist_final.map((c, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Badge variant={STATUS_VARIANT[c.status] ?? "outline"} className="text-xs uppercase">{c.status}</Badge>
                          <div className="flex-1">
                            <div className="text-foreground/90">{c.item}</div>
                            {c.nota && <div className="text-xs text-muted-foreground">{c.nota}</div>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
                <Section title="Lacunas identificadas"><List items={audit.lacunas} empty="Nenhuma lacuna apontada" /></Section>
                <Section title="Placeholders pendentes"><List items={audit.placeholders} empty="Nenhum placeholder pendente" /></Section>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Auditoria não disponível.</p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}