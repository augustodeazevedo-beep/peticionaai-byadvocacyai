import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { BrandLockup } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Recuperar senha — Peticiona.AI" }] }),
  component: ResetPage,
});

function ResetPage() {
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash.includes("type=recovery")) setMode("update");
  }, []);

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Verifique seu e-mail para redefinir a senha.");
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada! Faça login novamente.");
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="glass w-full max-w-md p-8 border-border/50">
        <div className="flex flex-col items-center mb-6">
          <BrandLockup size="lg" variant="stacked" glow />
          <h1 className="mt-4 text-xl font-semibold">{mode === "request" ? "Recuperar senha" : "Definir nova senha"}</h1>
        </div>
        {mode === "request" ? (
          <form onSubmit={requestReset} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" className="w-full bg-gradient-brand text-primary-foreground" disabled={loading}>
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
          </form>
        ) : (
          <form onSubmit={updatePassword} className="space-y-4">
            <div>
              <Label htmlFor="new_password">Nova senha</Label>
              <Input id="new_password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full bg-gradient-brand text-primary-foreground" disabled={loading}>
              {loading ? "Salvando..." : "Atualizar senha"}
            </Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="text-primary hover:underline">Voltar ao login</Link>
        </p>
      </Card>
    </div>
  );
}