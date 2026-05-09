import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Link2, Loader2, Plug, ShieldCheck } from "lucide-react";
import { getAdvogaConfig, pingAdvoga, saveAdvogaConfig } from "@/lib/advoga.functions";

export function AdvogaIntegrationCard() {
  const fetchCfg = useServerFn(getAdvogaConfig);
  const saveCfg = useServerFn(saveAdvogaConfig);
  const ping = useServerFn(pingAdvoga);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [outboundUrl, setOutboundUrl] = useState("");
  const [outboundSecret, setOutboundSecret] = useState("");
  const [inboundSecret, setInboundSecret] = useState("");
  const [autoSend, setAutoSend] = useState(false);
  const [outboundSecretSet, setOutboundSecretSet] = useState(false);
  const [inboundSecretSet, setInboundSecretSet] = useState(false);
  const [inboundUrl, setInboundUrl] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const cfg = await fetchCfg({ data: { origin: window.location.origin } });
        setOutboundUrl(cfg.outbound_url);
        setAutoSend(cfg.auto_send);
        setOutboundSecretSet(cfg.outbound_secret_set);
        setInboundSecretSet(cfg.inbound_secret_set);
        setInboundUrl(cfg.inbound_url);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha ao carregar integração");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchCfg]);

  async function onSave() {
    setSaving(true);
    try {
      await saveCfg({
        data: {
          outbound_url: outboundUrl,
          outbound_secret: outboundSecret || undefined,
          inbound_secret: inboundSecret || undefined,
          auto_send: autoSend,
        },
      });
      toast.success("Integração Advoga.AI salva.");
      if (outboundSecret) setOutboundSecretSet(true);
      if (inboundSecret) setInboundSecretSet(true);
      setOutboundSecret("");
      setInboundSecret("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function onTest() {
    setTesting(true);
    try {
      const r = await ping({ data: undefined });
      if (r.ok) toast.success(`Advoga.AI respondeu ${r.status} OK`);
      else toast.error(`Advoga.AI retornou ${r.status}: ${r.body.slice(0, 200)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no teste");
    } finally {
      setTesting(false);
    }
  }

  function copy(value: string) {
    navigator.clipboard.writeText(value).then(
      () => toast.success("Copiado"),
      () => toast.error("Não foi possível copiar"),
    );
  }

  if (loading) {
    return (
      <Card className="glass border-border/50 p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando integração Advoga.AI…
      </Card>
    );
  }

  return (
    <Card className="glass border-border/50 p-5 space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-accent">Ecossistema</p>
          <h2 className="font-semibold flex items-center gap-2">
            <Plug className="h-4 w-4" /> Advoga.AI
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Envie peças geradas e receba contexto de processos diretamente do Advoga.AI.
          </p>
        </div>
        <div className="flex flex-col gap-1 items-end text-[10px]">
          <Badge variant={outboundSecretSet ? "default" : "outline"}>
            <ShieldCheck className="h-3 w-3 mr-1" /> Saída {outboundSecretSet ? "configurada" : "pendente"}
          </Badge>
          <Badge variant={inboundSecretSet ? "default" : "outline"}>
            <ShieldCheck className="h-3 w-3 mr-1" /> Entrada {inboundSecretSet ? "configurada" : "pendente"}
          </Badge>
        </div>
      </header>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Saída — peças geradas → Advoga.AI</h3>
        <div>
          <Label className="text-xs">URL do webhook do Advoga.AI</Label>
          <Input
            value={outboundUrl}
            onChange={(e) => setOutboundUrl(e.target.value)}
            placeholder="https://advogaai-byadvocacy.lovable.app/api/public/peticione-document-generated"
          />
        </div>
        <div>
          <Label className="text-xs">Secret de saída (header x-webhook-secret)</Label>
          <Input
            type="password"
            value={outboundSecret}
            onChange={(e) => setOutboundSecret(e.target.value)}
            placeholder={outboundSecretSet ? "•••••••• (deixe em branco para manter)" : "Defina o mesmo valor configurado no Advoga.AI"}
          />
        </div>
        <div className="flex items-center justify-between rounded border border-border/50 px-3 py-2">
          <div>
            <p className="text-sm">Enviar automaticamente ao gerar PDF Visual Law</p>
            <p className="text-xs text-muted-foreground">
              Quando ativado, cada PDF gerado é enviado ao Advoga.AI em segundo plano.
            </p>
          </div>
          <Switch checked={autoSend} onCheckedChange={setAutoSend} />
        </div>
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onTest} disabled={testing} className="gap-2">
            {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
            Testar conexão
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Entrada — Advoga.AI → Peticione.AI</h3>
        <div>
          <Label className="text-xs">URL para configurar no Advoga.AI (process-context)</Label>
          <div className="flex gap-2 mt-1">
            <Input value={inboundUrl} readOnly className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={() => copy(inboundUrl)} title="Copiar">
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div>
          <Label className="text-xs">Secret de entrada (header x-webhook-secret esperado)</Label>
          <Input
            type="password"
            value={inboundSecret}
            onChange={(e) => setInboundSecret(e.target.value)}
            placeholder={inboundSecretSet ? "•••••••• (deixe em branco para manter)" : "Defina e use o mesmo valor no Advoga.AI"}
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving} className="bg-gradient-brand text-primary-foreground">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar integração
        </Button>
      </div>
    </Card>
  );
}