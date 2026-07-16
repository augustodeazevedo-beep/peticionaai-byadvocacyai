import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandLockup } from "@/components/Logo";

// Beta namespace not yet in @supabase/supabase-js types — local wrapper.
type OAuthDetails = {
  client?: { name?: string; redirect_uri?: string; scope?: string } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
  scope?: string | null;
};
type OAuthReply = { data: OAuthDetails | null; error: { message: string } | null };
type AuthOAuth = {
  getAuthorizationDetails: (id: string) => Promise<OAuthReply>;
  approveAuthorization: (id: string) => Promise<OAuthReply>;
  denyAuthorization: (id: string) => Promise<OAuthReply>;
};
const authOAuth = () =>
  (supabase.auth as unknown as { oauth: AuthOAuth }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/login", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await authOAuth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="glass p-6 max-w-md border-border/50">
        <h1 className="font-semibold mb-2">Não foi possível carregar a autorização</h1>
        <p className="text-sm text-muted-foreground">
          {String((error as Error)?.message ?? error)}
        </p>
      </Card>
    </div>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "um aplicativo";

  async function decide(approve: boolean) {
    setBusy(true);
    setErr(null);
    const { data, error } = approve
      ? await authOAuth().approveAuthorization(authorization_id)
      : await authOAuth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setErr(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setErr("O servidor de autorização não retornou uma URL de redirecionamento.");
      return;
    }
    window.location.href = target;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="glass w-full max-w-md p-8 border-border/50">
        <div className="flex flex-col items-center mb-6">
          <BrandLockup size="lg" variant="stacked" glow />
        </div>
        <h1 className="text-xl font-semibold mb-2">
          Conectar {clientName} à sua conta
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          Isto permite que <span className="font-medium">{clientName}</span> utilize as
          ferramentas do Peticiona.AI em seu nome — respeitando as suas permissões e
          o acesso RLS aos seus dados.
        </p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-6">
          <li>Listar e buscar as suas peças</li>
          <li>Ler o conteúdo de peças suas</li>
          <li>Listar seus modelos</li>
        </ul>
        {err && <p className="text-sm text-destructive mb-3" role="alert">{err}</p>}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={() => decide(false)}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-gradient-brand text-primary-foreground"
            disabled={busy}
            onClick={() => decide(true)}
          >
            {busy ? "Conectando..." : "Autorizar"}
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Isto não amplia permissões do seu usuário e não expõe dados de outros usuários.
        </p>
      </Card>
    </div>
  );
}