import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface ZoneData {
  zone: string;
  revenue: number;
  cashRevenue: number;
  cardRevenue: number;
  transactionCount: number;
}

interface RevenueDistributionChartProps {
  data: ZoneData[];
}

const COLORS = [
  "#8b5cf6", // gym
  "#ec4899", // ladies_gym
  "#f59e0b", // pt
  "#10b981", // crossfit
  "#3b82f6", // football_court
  "#06b6d4", // football_academy
  "#f97316", // cafe
  "#a855f7", // massage
  "#14b8a6", // swimming
  "#84cc16", // paddle_court
];

const RevenueDistributionChart = ({ data }: RevenueDistributionChartProps) => {
  const totalRevenue = data.reduce((sum, zone) => sum + zone.revenue, 0);

  const chartData = data
    .map((zone) => ({
      name: zone.zone.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      value: zone.revenue,
      percentage: ((zone.revenue / totalRevenue) * 100).toFixed(1),
    }))
    .sort((a, b) => b.value - a.value);

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percentage,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

    if (parseFloat(percentage) < 5) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${percentage}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={150}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
          formatter={(value: number) => `AED ${value.toFixed(2)}`}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default RevenueDistributionChart;
