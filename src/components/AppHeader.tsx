import { Link, useNavigate } from "@tanstack/react-router";
import { BrandLockup } from "./Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard, FilePlus, Link2, Settings, LogOut, Menu, Sparkles, BookOpen, Users, Cpu, LayoutGrid, Check, ExternalLink } from "lucide-react";
import { ECOSYSTEM_APPS } from "@/lib/ecosystem";

export function AppHeader() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 glass">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center transition-opacity hover:opacity-90">
            <BrandLockup size="md" variant="horizontal" />
          </Link>
          {user && (
            <nav className="hidden items-center gap-1 md:flex">
              <Link to="/workspace" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground" activeProps={{ className: "rounded-md px-3 py-1.5 text-sm text-foreground bg-secondary" }}>
                Workspace
              </Link>
              <Link to="/assistentes" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground" activeProps={{ className: "rounded-md px-3 py-1.5 text-sm text-foreground bg-secondary" }}>
                Assistentes
              </Link>
              <Link to="/dashboard" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground" activeProps={{ className: "rounded-md px-3 py-1.5 text-sm text-foreground bg-secondary" }}>
                Dashboard
              </Link>
              <Link to="/pecas/nova" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground" activeProps={{ className: "rounded-md px-3 py-1.5 text-sm text-foreground bg-secondary" }}>
                Nova Peça
              </Link>
              <Link to="/ferramentas/links" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground" activeProps={{ className: "rounded-md px-3 py-1.5 text-sm text-foreground bg-secondary" }}>
                Ferramentas
              </Link>
              {isAdmin && (
                <Link to="/admin/integracoes" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground" activeProps={{ className: "rounded-md px-3 py-1.5 text-sm text-foreground bg-secondary" }}>
                  Admin
                </Link>
              )}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-2">
          {user && (
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
          )}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="h-4 w-4" />
                  <span className="ml-2 hidden max-w-[160px] truncate sm:inline">{user.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/workspace" })}>
                  <Sparkles className="mr-2 h-4 w-4" /> Workspace
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/assistentes" })}>
                  <BookOpen className="mr-2 h-4 w-4" /> Assistentes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/bibliotecarios" })}>
                  <Users className="mr-2 h-4 w-4" /> Bibliotecários
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/pecas/nova" })}>
                  <FilePlus className="mr-2 h-4 w-4" /> Nova Peça
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/ferramentas/links" })}>
                  <Link2 className="mr-2 h-4 w-4" /> Links Úteis
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/configuracoes/ia" })}>
                  <Cpu className="mr-2 h-4 w-4" /> Configurações de IA
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate({ to: "/admin/integracoes" })}>
                    <Settings className="mr-2 h-4 w-4" /> Integrações
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Entrar</Link>
              </Button>
              <Button size="sm" className="bg-gradient-brand text-primary-foreground" asChild>
                <Link to="/signup">Criar conta</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}