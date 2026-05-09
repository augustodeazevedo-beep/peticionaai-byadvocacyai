import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppFooter } from "@/components/AppFooter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, LogOut, Settings, LayoutGrid, Check, ExternalLink } from "lucide-react";
import { ECOSYSTEM_APPS } from "@/lib/ecosystem";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border/40 bg-background/80 px-3 backdrop-blur">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <AppsMenu />
              <AccountMenu />
            </div>
          </header>
          <main className="flex-1 px-4 py-6">
            <Outlet />
          </main>
          <AppFooter />
        </div>
      </div>
    </SidebarProvider>
  );
}

function AccountMenu() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Menu className="h-4 w-4" />
          <span className="ml-2 hidden max-w-[180px] truncate sm:inline">{user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin && (
          <DropdownMenuItem onClick={() => navigate({ to: "/admin/integracoes" })}>
            <Settings className="mr-2 h-4 w-4" /> Integrações
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AppsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden sm:inline">Apps</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-2">
        <div className="px-2 pt-1 pb-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-accent">Ecossistema</p>
          <p className="text-sm font-semibold">
            Advocacy<span className="text-gradient-brand">.AI</span>
          </p>
        </div>
        <div className="space-y-1">
          {ECOSYSTEM_APPS.map((app) => {
            const Icon = app.icon;
            const content = (
              <div
                className={
                  "flex items-center gap-3 rounded-md px-2 py-2 transition-colors " +
                  (app.current
                    ? "bg-secondary/70 border border-accent/40"
                    : "hover:bg-secondary/50 border border-transparent")
                }
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <span className="truncate">
                      {app.name.replace(/\.AI$/, "")}
                      <span className="text-gradient-brand">.AI</span>
                    </span>
                    {app.current ? (
                      <Check className="h-3.5 w-3.5 text-accent" />
                    ) : (
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{app.tagline}</p>
                </div>
              </div>
            );
            return app.current ? (
              <div key={app.id}>{content}</div>
            ) : (
              <a
                key={app.id}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {content}
              </a>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}