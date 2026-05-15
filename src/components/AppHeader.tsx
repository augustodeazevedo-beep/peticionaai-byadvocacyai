import { Link, useNavigate } from "@tanstack/react-router";
import { BrandLockup } from "./Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { LogOut, LayoutGrid, Check, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ECOSYSTEM_APPS } from "@/lib/ecosystem";

export function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 glass">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center transition-opacity hover:opacity-90">
          <BrandLockup size="md" variant="horizontal" />
        </Link>
        <div className="flex items-center gap-2">
          <AppsMenu />
          {user ? (
            <>
              <Button size="sm" className="bg-gradient-brand text-primary-foreground" asChild>
                <Link to="/dashboard">Acessar plataforma</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Sair"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
              >
                <LogOut className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Sair</span>
              </Button>
            </>
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
