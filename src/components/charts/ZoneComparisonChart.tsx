import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ZoneData {
  zone: string;
  revenue: number;
  cashRevenue: number;
  cardRevenue: number;
  transactionCount: number;
}

interface ZoneComparisonChartProps {
  data: ZoneData[];
}

const ZoneComparisonChart = ({ data }: ZoneComparisonChartProps) => {
  const chartData = data
    .map((zone) => ({
      zone: zone.zone.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      cash: zone.cashRevenue,
      card: zone.cardRevenue,
      total: zone.revenue,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis type="number" className="text-xs" />
        <YAxis 
          type="category" 
          dataKey="zone" 
          width={120}
          className="text-xs"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
          formatter={(value: number) => `AED ${value.toFixed(2)}`}
        />
        <Legend />
        <Bar dataKey="cash" stackId="a" fill="#10b981" name="Cash (AED)" />
        <Bar dataKey="card" stackId="a" fill="#3b82f6" name="Card (AED)" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ZoneComparisonChart;
