import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ProductionChart() {
  const { user } = useAuth();
  const [data, setData] = useState<{ day: string; total: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const since = startOfDay(subDays(new Date(), 6));
    supabase
      .from("pieces")
      .select("created_at")
      .eq("user_id", user.id)
      .gte("created_at", since.toISOString())
      .then(({ data: rows }) => {
        const buckets = new Map<string, number>();
        for (let i = 6; i >= 0; i--) {
          const d = subDays(new Date(), i);
          buckets.set(format(d, "yyyy-MM-dd"), 0);
        }
        for (const r of rows ?? []) {
          const k = format(new Date(r.created_at as string), "yyyy-MM-dd");
          buckets.set(k, (buckets.get(k) ?? 0) + 1);
        }
        setData(
          Array.from(buckets.entries()).map(([day, total]) => ({
            day: format(new Date(day), "EEE dd/MM", { locale: ptBR }),
            total,
          })),
        );
      });
  }, [user]);

  return (
    <Card className="glass border-border/50 p-4">
      <div className="mb-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-accent">Últimos 7 dias</p>
        <h3 className="text-sm font-semibold">Volume de peças geradas</h3>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="lineBrand" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--accent))" />
                <stop offset="100%" stopColor="hsl(var(--primary))" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="url(#lineBrand)"
              strokeWidth={2.5}
              dot={{ fill: "hsl(var(--accent))", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}