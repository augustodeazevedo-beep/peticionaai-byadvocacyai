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

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Peticiona.AI" },
      { name: "description", content: "Acesse sua conta Peticiona.AI para redigir e gerenciar peças jurídicas com IA." },
      { property: "og:title", content: "Entrar — Peticiona.AI" },
      { property: "og:description", content: "Acesse sua conta Peticiona.AI para redigir e gerenciar peças jurídicas com IA." },
      { property: "og:url", content: "https://peticionaai-byadvocacyai.lovable.app/login" },
    ],
    links: [{ rel: "canonical", href: "https://peticionaai-byadvocacyai.lovable.app/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo(a) de volta!");
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
          <h1 className="mt-4 text-2xl font-semibold">Entrar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Bem-vindo(a) de volta</p>
        </div>
        <Button variant="outline" className="w-full" onClick={googleSignIn}>
          Continuar com Google
        </Button>
        <div className="my-6 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full bg-gradient-brand text-primary-foreground" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <div className="mt-6 flex justify-between text-sm">
          <Link to="/reset-password" className="text-muted-foreground hover:text-foreground">Esqueci a senha</Link>
          <Link to="/signup" className="text-primary hover:underline">Criar conta</Link>
        </div>
      </Card>
    </div>
  );
}