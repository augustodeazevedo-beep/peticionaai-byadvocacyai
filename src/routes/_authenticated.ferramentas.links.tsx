import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Star, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ferramentas/links")({
  head: () => ({ meta: [{ title: "Links Úteis — Peticione.AI" }] }),
  component: Links,
});

type Link = { id: string; category: string; title: string; url: string; description: string | null; display_order: number };

function Links() {
  const { user } = useAuth();
  const [links, setLinks] = useState<Link[]>([]);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("useful_links").select("*").eq("is_active", true).order("category").order("display_order").then(({ data }) => {
      setLinks((data ?? []) as Link[]);
    });
    if (user) {
      supabase.from("user_link_favorites").select("link_id").then(({ data }) => {
        setFavs(new Set(((data ?? []) as { link_id: string }[]).map((r) => r.link_id)));
      });
    }
  }, [user]);

  async function toggleFav(id: string) {
    if (!user) return;
    if (favs.has(id)) {
      await supabase.from("user_link_favorites").delete().eq("user_id", user.id).eq("link_id", id);
      const n = new Set(favs); n.delete(id); setFavs(n);
    } else {
      await supabase.from("user_link_favorites").insert({ user_id: user.id, link_id: id });
      const n = new Set(favs); n.add(id); setFavs(n);
    }
  }

  const filtered = useMemo(() => {
    if (!q) return links;
    const lower = q.toLowerCase();
    return links.filter((l) => l.title.toLowerCase().includes(lower) || l.category.toLowerCase().includes(lower) || (l.description ?? "").toLowerCase().includes(lower));
  }, [links, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, Link[]>();
    for (const l of filtered) {
      if (!map.has(l.category)) map.set(l.category, []);
      map.get(l.category)!.push(l);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const favLinks = links.filter((l) => favs.has(l.id));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Links Úteis</h1>
        <p className="text-muted-foreground">Acesso rápido aos serviços que você usa todo dia.</p>
      </div>
      <Input placeholder="Buscar links..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />

      {favLinks.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Star className="h-4 w-4 fill-primary text-primary" /> Favoritos</h2>
          <LinkGrid items={favLinks} favs={favs} onToggle={toggleFav} />
        </section>
      )}

      {grouped.map(([cat, items]) => (
        <section key={cat}>
          <h2 className="text-lg font-semibold mb-3">{cat}</h2>
          <LinkGrid items={items} favs={favs} onToggle={toggleFav} />
        </section>
      ))}
    </div>
  );
}

function LinkGrid({ items, favs, onToggle }: { items: Link[]; favs: Set<string>; onToggle: (id: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((l) => (
        <Card key={l.id} className="glass border-border/50 p-4 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary inline-flex items-center gap-1">
              {l.title} <ExternalLink className="h-3 w-3" />
            </a>
            {l.description && <p className="text-xs text-muted-foreground mt-1">{l.description}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={() => onToggle(l.id)} aria-label="Favoritar">
            <Star className={`h-4 w-4 ${favs.has(l.id) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </Button>
        </Card>
      ))}
    </div>
  );
}