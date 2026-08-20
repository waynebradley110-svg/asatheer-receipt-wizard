import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { shouldCountPayment } from "@/lib/revenueFilter";
import { Banknote, Trophy } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface DayCash {
  date: string;
  memberships: number;
  cafe: number;
  football: number;
  massage: number;
  events: number;
  total: number;
}

const dayKey = (value: string) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

export function TopCashDaysChart() {
  const [days, setDays] = useState<DayCash[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [payments, cafe, football, massage, events] = await Promise.all([
        supabase
          .from("payment_receipts")
          .select("id, amount, payment_method, created_at, members(is_vip)"),
        supabase.from("cafe_sales").select("sale_date, cash_amount, amount, payment_method"),
        supabase.from("football_sales").select("sale_date, cash_amount"),
        supabase.from("massage_sales").select("sale_date, cash_amount"),
        supabase
          .from("event_registrations")
          .select("created_at, amount, payment_method"),
      ]);

      const map = new Map<string, DayCash>();
      const bucket = (key: string) => {
        if (!map.has(key)) {
          map.set(key, {
            date: key,
            memberships: 0,
            cafe: 0,
            football: 0,
            massage: 0,
            events: 0,
            total: 0,
          });
        }
        return map.get(key)!;
      };

      (payments.data || [])
        .filter(shouldCountPayment)
        .filter((p: any) => p.payment_method === "cash")
        .forEach((p: any) => {
          const row = bucket(dayKey(p.created_at));
          row.memberships += Number(p.amount || 0);
        });

      (cafe.data || []).forEach((s: any) => {
        const cash =
          s.cash_amount !== null && s.cash_amount !== undefined
            ? Number(s.cash_amount)
            : s.payment_method === "cash"
            ? Number(s.amount || 0)
            : 0;
        if (cash > 0) bucket(dayKey(s.sale_date)).cafe += cash;
      });

      (football.data || []).forEach((s: any) => {
        const cash = Number(s.cash_amount || 0);
        if (cash > 0) bucket(dayKey(s.sale_date)).football += cash;
      });

      (massage.data || []).forEach((s: any) => {
        const cash = Number(s.cash_amount || 0);
        if (cash > 0) bucket(dayKey(s.sale_date)).massage += cash;
      });

      (events.data || [])
        .filter((e: any) => e.payment_method === "cash")
        .forEach((e: any) => {
          bucket(dayKey(e.created_at)).events += Number(e.amount || 0);
        });

      const rows = Array.from(map.values()).map((r) => ({
        ...r,
        total: r.memberships + r.cafe + r.football + r.massage + r.events,
      }));

      setDays(rows.filter((r) => r.total > 0));
      setLoading(false);
    })();
  }, []);

  const topDays = useMemo(
    () => [...days].sort((a, b) => b.total - a.total).slice(0, 10),
    [days]
  );

  const best = topDays[0];

  const chartData = useMemo(
    () =>
      [...topDays].reverse().map((d) => ({
        ...d,
        label: new Date(d.date).toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "2-digit",
        }),
      })),
    [topDays]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Banknote className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Highest Cash Days</CardTitle>
            <p className="text-sm text-muted-foreground">
              Top 10 days by cash collected across all zones (excludes VIP)
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[360px] flex items-center justify-center text-muted-foreground">
            Loading…
          </div>
        ) : !best ? (
          <div className="h-[360px] flex items-center justify-center text-muted-foreground">
            No cash sales recorded yet.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
              <Trophy className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Highest cash day
                </p>
                <p className="text-lg font-semibold">
                  {new Date(best.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  — {best.total.toFixed(2)} AED
                </p>
              </div>
            </div>

            <div className="w-full h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                    formatter={(v: any, name: string) => [
                      `${Number(v).toFixed(2)} AED`,
                      name === "memberships"
                        ? "Memberships"
                        : name === "cafe"
                        ? "Cafe"
                        : name === "football"
                        ? "Football"
                        : name === "massage"
                        ? "Massage"
                        : "Events",
                    ]}
                  />
                  <Bar dataKey="memberships" stackId="cash" fill="hsl(var(--primary))" />
                  <Bar dataKey="cafe" stackId="cash" fill="hsl(38, 92%, 50%)" />
                  <Bar dataKey="football" stackId="cash" fill="hsl(142, 71%, 45%)" />
                  <Bar dataKey="massage" stackId="cash" fill="hsl(280, 65%, 60%)" />
                  <Bar dataKey="events" stackId="cash" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">#</th>
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Memberships</th>
                    <th className="py-2 pr-4 font-medium">Cafe</th>
                    <th className="py-2 pr-4 font-medium">Football</th>
                    <th className="py-2 pr-4 font-medium">Massage</th>
                    <th className="py-2 pr-4 font-medium">Events</th>
                    <th className="py-2 font-medium">Total Cash</th>
                  </tr>
                </thead>
                <tbody>
                  {topDays.map((d, i) => (
                    <tr key={d.date} className="border-t border-border">
                      <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                      <td className="py-2 pr-4">
                        {new Date(d.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "2-digit",
                        })}
                      </td>
                      <td className="py-2 pr-4">{d.memberships.toFixed(2)}</td>
                      <td className="py-2 pr-4">{d.cafe.toFixed(2)}</td>
                      <td className="py-2 pr-4">{d.football.toFixed(2)}</td>
                      <td className="py-2 pr-4">{d.massage.toFixed(2)}</td>
                      <td className="py-2 pr-4">{d.events.toFixed(2)}</td>
                      <td className="py-2 font-semibold">{d.total.toFixed(2)} AED</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
