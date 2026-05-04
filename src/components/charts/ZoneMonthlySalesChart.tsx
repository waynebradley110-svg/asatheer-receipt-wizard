import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

const ZONES = [
  "gym",
  "ladies_gym",
  "pt",
  "crossfit",
  "football_court",
  "football",
  "football_student",
  "swimming",
  "paddle_court",
  "other",
] as const;

const ZONE_LABELS: Record<string, string> = {
  gym: "Gym",
  ladies_gym: "Ladies Gym",
  pt: "PT",
  crossfit: "CrossFit",
  football_court: "Football Court",
  football: "Football Academy",
  football_student: "Football Student",
  swimming: "Swimming",
  paddle_court: "Paddle Court",
  other: "Other",
};

// HSL palette using semantic-friendly hues
const ZONE_COLORS: Record<string, string> = {
  gym: "hsl(217, 91%, 60%)",
  ladies_gym: "hsl(330, 81%, 60%)",
  pt: "hsl(38, 92%, 50%)",
  crossfit: "hsl(0, 84%, 60%)",
  football_court: "hsl(142, 71%, 45%)",
  football: "hsl(160, 84%, 39%)",
  football_student: "hsl(190, 80%, 45%)",
  swimming: "hsl(199, 89%, 48%)",
  paddle_court: "hsl(280, 65%, 60%)",
  other: "hsl(220, 9%, 60%)",
};

interface MonthRow {
  month: string;
  [zone: string]: string | number;
}

export function ZoneMonthlySalesChart() {
  const [rows, setRows] = useState<MonthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<"stacked" | "line">("stacked");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: rawData } = await supabase
        .from("payment_receipts")
        .select("id, zone, amount, created_at, members(is_vip)");
      const data = (rawData || []).filter(shouldCountPayment);

      const map = new Map<string, MonthRow>();
      (data || []).forEach((p: any) => {
        const d = new Date(p.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!map.has(key)) {
          const row: MonthRow = { month: key };
          ZONES.forEach((z) => (row[z] = 0));
          map.set(key, row);
        }
        const row = map.get(key)!;
        row[p.zone] = (Number(row[p.zone]) || 0) + Number(p.amount || 0);
      });

      const sorted = Array.from(map.values()).sort((a, b) =>
        a.month.localeCompare(b.month)
      );
      setRows(sorted);
      setLoading(false);
    })();
  }, []);

  const formatted = useMemo(
    () =>
      rows.map((r) => {
        const [y, m] = r.month.split("-");
        const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(
          "en-US",
          { month: "short", year: "2-digit" }
        );
        return { ...r, label };
      }),
    [rows]
  );

  // Hide zones with zero total to keep legend clean
  const activeZones = useMemo(
    () =>
      ZONES.filter((z) =>
        formatted.some((r) => Number(r[z]) > 0)
      ),
    [formatted]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Monthly Sales by Zone</CardTitle>
              <p className="text-sm text-muted-foreground">
                All-time revenue per zone, grouped by month (excludes VIP)
              </p>
            </div>
          </div>
          <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)}>
            <TabsList>
              <TabsTrigger value="stacked">Stacked</TabsTrigger>
              <TabsTrigger value="line">Trend</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            Loading…
          </div>
        ) : formatted.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No sales data yet.
          </div>
        ) : (
          <div className="w-full h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "stacked" ? (
                <BarChart data={formatted} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                      ZONE_LABELS[name] || name,
                    ]}
                  />
                  <Legend formatter={(v) => ZONE_LABELS[v] || v} />
                  {activeZones.map((z) => (
                    <Bar key={z} dataKey={z} stackId="a" fill={ZONE_COLORS[z]} />
                  ))}
                </BarChart>
              ) : (
                <LineChart data={formatted} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                      ZONE_LABELS[name] || name,
                    ]}
                  />
                  <Legend formatter={(v) => ZONE_LABELS[v] || v} />
                  {activeZones.map((z) => (
                    <Line
                      key={z}
                      type="monotone"
                      dataKey={z}
                      stroke={ZONE_COLORS[z]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
