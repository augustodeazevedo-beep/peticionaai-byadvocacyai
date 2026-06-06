import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  FileText,
  Clock,
  TrendingUp,
  TrendingDown,
  Share2,
  Layers,
  Minus,
  ListChecks,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Kpis = {
  today: number;
  yesterday: number;
  avgGenSec: number | null;
  topTemplates: { name: string; count: number }[];
  sharedCount: number;
  recentBatches: { id: string; status: string | null; created_at: string; provider: string | null }[];
};

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function KpiCards() {
  const { user } = useAuth();
  const [k, setK] = useState<Kpis | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today0 = startOfDay();
      const yesterday0 = new Date(today0);
      yesterday0.setDate(yesterday0.getDate() - 1);

      const [todayRes, yestRes, recentReady, templatesAgg, sharedRes, batchesRes] = await Promise.all([
        supabase
          .from("pieces")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", today0.toISOString()),
        supabase
          .from("pieces")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", yesterday0.toISOString())
          .lt("created_at", today0.toISOString()),
        supabase
          .from("pieces")
          .select("created_at, updated_at")
          .eq("user_id", user.id)
          .eq("status", "ready")
          .order("updated_at", { ascending: false })
          .limit(50),
        supabase
          .from("pieces")
          .select("template_id, piece_templates(name)")
          .eq("user_id", user.id)
          .not("template_id", "is", null)
          .limit(500),
        supabase
          .from("pieces")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_shared", true),
        supabase
          .from("integration_logs")
          .select("id, status, created_at, provider")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const durations =
        (recentReady.data ?? [])
          .map((r: { created_at: string; updated_at: string }) => {
            const a = new Date(r.created_at).getTime();
            const b = new Date(r.updated_at).getTime();
            return (b - a) / 1000;
          })
          .filter((s) => s > 0 && s < 60 * 30);
      const avgGenSec = durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;

      const counts = new Map<string, { name: string; count: number }>();
      for (const row of (templatesAgg.data ?? []) as Array<{
        template_id: string;
        piece_templates: { name: string } | { name: string }[] | null;
      }>) {
        const pt = Array.isArray(row.piece_templates) ? row.piece_templates[0] : row.piece_templates;
        const name = pt?.name ?? "Sem nome";
        const cur = counts.get(row.template_id);
        if (cur) cur.count += 1;
        else counts.set(row.template_id, { name, count: 1 });
      }
      const topTemplates = Array.from(counts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      setK({
        today: todayRes.count ?? 0,
        yesterday: yestRes.count ?? 0,
        avgGenSec,
        topTemplates,
        sharedCount: sharedRes.count ?? 0,
        recentBatches: (batchesRes.data ?? []) as Kpis["recentBatches"],
      });
    })();
  }, [user]);

  if (!k) {
    return (
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="glass h-24 animate-pulse border-border/50" />
        ))}
      </div>
    );
  }

  const delta = k.today - k.yesterday;
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor = delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-muted-foreground";

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          icon={<FileText className="h-4 w-4" />}
          label="Peças geradas hoje"
          value={k.today.toString()}
          extra={
            <span className={`inline-flex items-center gap-1 text-xs ${trendColor}`}>
              <TrendIcon className="h-3 w-3" />
              {delta > 0 ? "+" : ""}
              {delta} vs ontem
            </span>
          }
        />
        <KpiTile
          icon={<Clock className="h-4 w-4" />}
          label="Tempo médio de geração"
          value={k.avgGenSec != null ? `${k.avgGenSec}s` : "—"}
          extra={<span className="text-xs text-muted-foreground">últimas 50 peças</span>}
        />
        <KpiTile
          icon={<Share2 className="h-4 w-4" />}
          label="Peças compartilhadas"
          value={k.sharedCount.toString()}
          extra={<span className="text-xs text-muted-foreground">links públicos ativos</span>}
        />
        <KpiTile
          icon={<Layers className="h-4 w-4" />}
          label="Modelos mais usados"
          value={k.topTemplates[0]?.name ?? "—"}
          extra={
            <div className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
              {k.topTemplates.slice(1, 3).map((t) => (
                <p key={t.name} className="truncate">
                  {t.name} <span className="tabular-nums">({t.count})</span>
                </p>
              ))}
              {k.topTemplates.length === 0 && <p>Nenhum modelo usado ainda.</p>}
            </div>
          }
        />
      </div>

      <Card className="glass border-border/50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold">Histórico em lote</h3>
          <span className="text-xs text-muted-foreground">últimas 5 execuções</span>
        </div>
        {k.recentBatches.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma execução em lote registrada.</p>
        ) : (
          <div className="divide-y divide-border/40 text-sm">
            {k.recentBatches.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-1.5">
                <span className="truncate text-xs">{b.provider ?? "—"}</span>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " +
                    (b.status === "success" || b.status === "ok"
                      ? "bg-emerald-500/10 text-emerald-300"
                      : b.status === "error" || b.status === "failed"
                        ? "bg-red-500/10 text-red-300"
                        : "bg-muted text-muted-foreground")
                  }
                >
                  {b.status ?? "—"}
                </span>
                <span className="w-32 text-right text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(b.created_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function KpiTile({
  icon,
  label,
  value,
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  extra?: React.ReactNode;
}) {
  return (
    <Card className="glass border-border/50 p-4">
      <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        <span className="text-accent">{icon}</span>
        {label}
      </div>
      <p className="truncate text-xl font-semibold">{value}</p>
      {extra}
    </Card>
  );
}