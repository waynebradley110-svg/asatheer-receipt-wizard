import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DailyData {
  date: string;
  zones: Record<string, number>;
  totalRevenue: number;
}

interface RevenueTrendChartProps {
  data: DailyData[];
  selectedZone: string;
}

const ZONE_COLORS: Record<string, string> = {
  gym: "#8b5cf6",
  ladies_gym: "#ec4899",
  pt: "#f59e0b",
  crossfit: "#10b981",
  football_court: "#3b82f6",
  football_academy: "#06b6d4",
  cafe: "#f97316",
  massage: "#a855f7",
  swimming: "#14b8a6",
  paddle_court: "#84cc16",
};

const RevenueTrendChart = ({ data, selectedZone }: RevenueTrendChartProps) => {
  const chartData = data.map((day) => ({
    date: day.date,
    revenue: selectedZone === "all" ? day.totalRevenue : day.zones[selectedZone] || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="date" 
          className="text-xs"
          tickFormatter={(value) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }}
        />
        <YAxis className="text-xs" />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
          formatter={(value: number) => `AED ${value.toFixed(2)}`}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke={selectedZone === "all" ? "#8b5cf6" : ZONE_COLORS[selectedZone] || "#8b5cf6"}
          strokeWidth={2}
          dot={{ fill: selectedZone === "all" ? "#8b5cf6" : ZONE_COLORS[selectedZone] || "#8b5cf6", r: 4 }}
          activeDot={{ r: 6 }}
          name="Revenue (AED)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default RevenueTrendChart;
