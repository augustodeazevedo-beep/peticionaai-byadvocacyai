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
