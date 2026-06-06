import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck, ShieldAlert, KeyRound, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  getEncryptionStatus,
  setEncryptionPassphrase,
  verifyEncryptionPassphrase,
} from "@/lib/encryption.functions";

export const Route = createFileRoute("/_authenticated/configuracoes/seguranca")({
  head: () => ({ meta: [{ title: "Segurança & Chave Mestra — Peticiona.AI" }] }),
  component: ConfiguracoesSeguranca,
});

function ConfiguracoesSeguranca() {
  const qc = useQueryClient();
  const statusFn = useServerFn(getEncryptionStatus);
  const setFn = useServerFn(setEncryptionPassphrase);
  const verifyFn = useServerFn(verifyEncryptionPassphrase);

  const { data: status, isLoading } = useQuery({
    queryKey: ["encryption_status"],
    queryFn: () => statusFn({}),
  });

  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [hint, setHint] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [show, setShow] = useState(false);

  const [testPass, setTestPass] = useState("");

  const setMutation = useMutation({
    mutationFn: (input: { passphrase: string; hint?: string; confirmReset?: boolean }) =>
      setFn({ data: input }),
    onSuccess: (r) => {
      toast.success(r.reset ? "Senha-mestra redefinida. Cadastre seus certificados novamente." : "Senha-mestra configurada.");
      setPassphrase("");
      setConfirm("");
      setConfirmReset(false);
      qc.invalidateQueries({ queryKey: ["encryption_status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyMutation = useMutation({
    mutationFn: (p: string) => verifyFn({ data: { passphrase: p } }),
    onSuccess: (r) => {
      if (r.ok) toast.success("Senha-mestra confere ✔");
      else toast.error("Senha incorreta.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const configured = !!status?.configured;
  const canSubmit =
    passphrase.length >= 12 && passphrase === confirm && (!configured || confirmReset);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <KeyRound className="w-7 h-7 text-primary" />
          Segurança & Chave Mestra
        </h1>
        <p className="text-muted-foreground">
          Defina uma <strong>senha-mestra pessoal</strong> usada para criptografar seus certificados digitais
          (A1/.pfx) e dados sensíveis de protocolo. Ela <strong>nunca</strong> é armazenada em nossos
          servidores — somente você consegue desbloquear seus dados.
        </p>
      </header>

      <Card className="glass border-border/50 p-5">
        <div className="flex items-center gap-3">
          {configured ? (
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          ) : (
            <ShieldAlert className="w-6 h-6 text-amber-400" />
          )}
          <div className="flex-1">
            <p className="font-medium">
              {isLoading
                ? "Verificando..."
                : configured
                  ? "Chave mestra configurada"
                  : "Nenhuma chave mestra configurada"}
            </p>
            {configured && status?.hint && (
              <p className="text-xs text-muted-foreground">Dica: {status.hint}</p>
            )}
            {configured && status?.updated_at && (
              <p className="text-xs text-muted-foreground">
                Última atualização: {new Date(status.updated_at).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        </div>
      </Card>

      {configured && (
        <Card className="glass border-border/50 p-5 space-y-3">
          <div>
            <Label className="text-sm">Testar senha-mestra atual</Label>
            <p className="text-xs text-muted-foreground">
              Confira se sua senha está correta antes de tentar assinar uma peça.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              type="password"
              value={testPass}
              onChange={(e) => setTestPass(e.target.value)}
              placeholder="Digite a senha-mestra atual"
              autoComplete="current-password"
            />
            <Button
              variant="outline"
              disabled={testPass.length < 12 || verifyMutation.isPending}
              onClick={() => verifyMutation.mutate(testPass)}
            >
              {verifyMutation.isPending ? "Verificando..." : "Testar"}
            </Button>
          </div>
        </Card>
      )}

      <Card className="glass border-border/50 p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">
            {configured ? "Redefinir senha-mestra" : "Definir senha-mestra"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Mínimo 12 caracteres. Use uma frase memorável e única.
          </p>
        </div>

        {configured && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção — perda de dados ao redefinir</AlertTitle>
            <AlertDescription>
              Como nunca armazenamos sua senha original, não há como descriptografar
              certificados antigos. Ao redefinir, <strong>todos os seus certificados digitais
              serão apagados</strong> e precisarão ser recadastrados.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label>Senha-mestra</Label>
          <div className="flex gap-2">
            <Input
              type={show ? "text" : "password"}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              autoComplete="new-password"
              placeholder="Mínimo 12 caracteres"
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => setShow((s) => !s)}>
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Confirme a senha</Label>
          <Input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          {confirm.length > 0 && confirm !== passphrase && (
            <p className="text-xs text-destructive">As senhas não conferem.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Dica (opcional, visível apenas para você)</Label>
          <Input
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            maxLength={120}
            placeholder="Ex.: frase do meu livro favorito + ano do TCC"
          />
        </div>

        {configured && (
          <label className="flex items-start gap-3 cursor-pointer">
            <Switch checked={confirmReset} onCheckedChange={setConfirmReset} />
            <span className="text-sm">
              Entendo que <strong>todos os certificados digitais serão apagados</strong> ao
              redefinir a senha-mestra.
            </span>
          </label>
        )}

        <div className="flex justify-end">
          <Button
            disabled={!canSubmit || setMutation.isPending}
            onClick={() =>
              setMutation.mutate({
                passphrase,
                hint: hint || undefined,
                confirmReset,
              })
            }
            className="bg-gradient-brand text-primary-foreground"
          >
            {setMutation.isPending
              ? "Salvando..."
              : configured
                ? "Redefinir senha-mestra"
                : "Definir senha-mestra"}
          </Button>
        </div>
      </Card>

      <Card className="glass border-border/50 p-5 space-y-2 text-sm text-muted-foreground">
        <h3 className="text-foreground font-medium flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" /> Como funciona
        </h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Sua senha é convertida em chave AES-256 via PBKDF2 (SHA-256, 210 mil iterações).</li>
          <li>Armazenamos apenas o <em>salt</em> e um verificador irreversível — nunca a senha.</li>
          <li>Cada certificado A1 é criptografado individualmente com sua chave derivada.</li>
          <li>Em cada protocolo você digita a senha; ela só vive em memória durante a assinatura.</li>
          <li>Se você perder a senha, não conseguimos recuperá-la — guarde-a em local seguro.</li>
        </ul>
      </Card>
    </div>
  );
}