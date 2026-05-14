import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { BrandLockup } from "@/components/Logo";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Criar conta — Peticiona.AI" },
      { name: "description", content: "Crie sua conta Peticiona.AI e comece a redigir peças jurídicas em padrão ABNT com IA." },
      { property: "og:title", content: "Criar conta — Peticiona.AI" },
      { property: "og:description", content: "Crie sua conta Peticiona.AI e comece a redigir peças jurídicas em padrão ABNT com IA." },
      { property: "og:url", content: "https://peticionaai-byadvocacyai.lovable.app/signup" },
    ],
    links: [{ rel: "canonical", href: "https://peticionaai-byadvocacyai.lovable.app/signup" }],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Você já pode acessar.");
    navigate({ to: "/dashboard" });
  }

  async function googleSignIn() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (result.error) toast.error(String(result.error));
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="glass w-full max-w-md p-8 border-border/50">
        <div className="flex flex-col items-center mb-6">
          <BrandLockup size="lg" variant="stacked" glow />
          <h1 className="mt-4 text-2xl font-semibold">Criar conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">Comece a redigir suas peças com IA</p>
        </div>
        <Button variant="outline" className="w-full" onClick={googleSignIn}>
          Continuar com Google
        </Button>
        <div className="my-6 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="full_name">Nome completo</Label>
            <Input id="full_name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full bg-gradient-brand text-primary-foreground" disabled={loading}>
            {loading ? "Criando..." : "Criar conta"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link>
        </p>
      </Card>
    </div>
  );
}