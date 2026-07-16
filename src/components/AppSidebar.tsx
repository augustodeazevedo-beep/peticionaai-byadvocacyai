import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { BrandLockup, BrandMark } from "./Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Share2,
  ScrollText,
  ListChecks,
  Search,
  Sparkles as SparklesIcon,
  Users,
  Cpu,
  LogOut,
  LayoutDashboard,
  FilePlus,
  Sparkles,
  FolderKanban,
  Palette,
  Library,
  ShieldCheck,
  Gavel,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const MAIN = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Nova Peça", url: "/pecas/nova", icon: FilePlus },
  { title: "Jurisprudência", url: "/jurisprudencia", icon: Gavel },
  { title: "Modelos de Peça", url: "/biblioteca/modelos", icon: Library },
  { title: "Assistentes", url: "/assistentes", icon: SparklesIcon },
  { title: "Bibliotecários", url: "/bibliotecarios", icon: Users },
  { title: "Detect.AI", url: "/detect-ai", icon: ShieldCheck },
  { title: "Identidade do Escritório", url: "/configuracoes/identidade", icon: Palette },
  { title: "Configurações de IA", url: "/configuracoes/ia", icon: Cpu },
  { title: "Segurança & Chave Mestra", url: "/configuracoes/seguranca", icon: ShieldCheck },
] as const;

const SHORTCUTS = [
  { title: "Compartilhamentos", url: "/compartilhamentos", icon: Share2 },
  { title: "Metadados CNJ", url: "/cnj", icon: ScrollText },
  { title: "Histórico de Lote", url: "/historico-lote", icon: ListChecks },
] as const;

function useDebounced<T>(value: T, delay = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);

  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  const { data: projects = [] } = useQuery({
    enabled: !!user,
    queryKey: ["sidebar_projects", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id,title")
        .order("updated_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: history = [] } = useQuery({
    enabled: !!user,
    queryKey: ["sidebar_history", user?.id, debounced],
    queryFn: async () => {
      let q = supabase
        .from("workspaces")
        .select("id,title,updated_at")
        .order("updated_at", { ascending: false })
        .limit(30);
      if (debounced.trim()) q = q.ilike("title", `%${debounced.trim()}%`);
      const { data } = await q;
      return data ?? [];
    },
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border/40">
        <div className="flex flex-col items-center px-2 py-2">
          <Link to="/" className="flex flex-col items-center gap-1">
            {collapsed ? (
              <BrandMark size={28} />
            ) : (
              <>
                <BrandLockup size="sm" variant="horizontal" />
                <span className="text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
                  By Advocacy.AI
                </span>
              </>
            )}
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <Button
              size={collapsed ? "icon" : "default"}
              className="w-full bg-gradient-brand text-primary-foreground"
              onClick={() => navigate({ to: "/workspace" })}
              title="Nova minuta"
            >
              <Plus className="h-4 w-4" />
              {!collapsed && <span className="ml-2">Nova minuta</span>}
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Principal</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {MAIN.map((it) => (
                <SidebarMenuItem key={it.url}>
                  <SidebarMenuButton asChild isActive={isActive(it.url)} tooltip={it.title}>
                    <Link to={it.url}>
                      <it.icon className="h-4 w-4" />
                      <span>{it.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Atalhos</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {SHORTCUTS.map((it) => (
                <SidebarMenuItem key={it.url}>
                  <SidebarMenuButton asChild isActive={isActive(it.url)} tooltip={it.title}>
                    <Link to={it.url}>
                      <it.icon className="h-4 w-4" />
                      <span>{it.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <SidebarGroup>
            <SidebarGroupContent className="px-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar no histórico..."
                  className="h-8 pl-7 text-xs"
                />
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!collapsed && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              <span className="flex items-center gap-1"><FolderKanban className="h-3 w-3" /> Projetos</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projects.length === 0 && (
                  <p className="px-3 py-1 text-[11px] text-muted-foreground">Nenhum projeto ainda.</p>
                )}
                {projects.map((p) => (
                  <SidebarMenuItem key={p.id}>
                    <SidebarMenuButton size="sm" onClick={() => navigate({ to: "/dashboard" })}>
                      <span className="truncate">{p.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!collapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>Histórico</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {history.length === 0 && (
                  <p className="px-3 py-1 text-[11px] text-muted-foreground">
                    Suas conversas aparecerão aqui assim que você começar a conversar.
                  </p>
                )}
                {history.map((w: any) => (
                  <SidebarMenuItem key={w.id}>
                    <SidebarMenuButton size="sm" onClick={() => navigate({ to: "/workspace" })}>
                      <Sparkles className="h-3 w-3 text-accent" />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-xs">{w.title}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(w.updated_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" tooltip="Sair" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}