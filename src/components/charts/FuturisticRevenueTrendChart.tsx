import { useMemo } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
} from "recharts";
import { format } from "date-fns";

interface DailyData {
  date: string;
  zones: Record<string, number>;
  totalRevenue: number;
}

interface FuturisticRevenueTrendChartProps {
  data: DailyData[];
}

const FuturisticRevenueTrendChart = ({ data }: FuturisticRevenueTrendChartProps) => {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      date: format(new Date(item.date), "MMM dd"),
      revenue: item.totalRevenue,
      sales: Object.keys(item.zones).length > 0 
        ? Object.values(item.zones).reduce((sum, val) => sum + (val > 0 ? 1 : 0), 0) * 10 
        : 0,
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1f2e] border border-white/10 rounded-lg p-3 shadow-xl backdrop-blur-sm">
          <p className="text-white/60 text-xs mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
              {entry.name}: {entry.name === "Revenue" ? `AED ${entry.value.toFixed(0)}` : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(255,255,255,0.05)" 
            vertical={false}
          />
          
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            dy={10}
          />
          
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Bar 
            dataKey="sales" 
            fill="rgba(139, 92, 246, 0.3)"
            radius={[4, 4, 0, 0]}
            name="Sales Count"
          />
          
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="transparent"
            fill="url(#revenueGradient)"
          />
          
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#22D3EE"
            strokeWidth={3}
            dot={{
              fill: "#22D3EE",
              stroke: "#0B0F14",
              strokeWidth: 2,
              r: 4,
              filter: "url(#glow)",
            }}
            activeDot={{
              fill: "#22D3EE",
              stroke: "#22D3EE",
              strokeWidth: 4,
              r: 6,
              filter: "url(#glow)",
            }}
            name="Revenue"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FuturisticRevenueTrendChart;
