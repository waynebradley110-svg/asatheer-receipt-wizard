import { useMemo } from "react";

interface ZoneData {
  zone: string;
  revenue: number;
  cashRevenue: number;
  cardRevenue: number;
  transactionCount: number;
}

interface FuturisticZoneBarChartProps {
  data: ZoneData[];
}

const FuturisticZoneBarChart = ({ data }: FuturisticZoneBarChartProps) => {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.revenue - a.revenue);
  }, [data]);

  const maxRevenue = useMemo(() => {
    return Math.max(...data.map((d) => d.revenue), 1);
  }, [data]);

  const totalRevenue = useMemo(() => {
    return data.reduce((sum, d) => sum + d.revenue, 0);
  }, [data]);

  const getZoneColor = (zone: string): string => {
    const colors: Record<string, string> = {
      football_court: "#22D3EE",
      crossfit: "#F97316",
      pt: "#8B5CF6",
      gym: "#3B82F6",
      football: "#22C55E",
      football_student: "#22C55E",
      ladies_gym: "#EC4899",
      cafe: "#F59E0B",
      massage: "#8B5CF6",
      swimming: "#22D3EE",
      paddle_court: "#22D3EE",
    };
    return colors[zone] || "#6B7280";
  };

  const formatZoneName = (zone: string) => {
    return zone.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="space-y-3 h-[300px] overflow-y-auto scrollbar-hide">
      {sortedData.map((zone, index) => {
        const percentage = totalRevenue > 0 ? (zone.revenue / totalRevenue) * 100 : 0;
        const barWidth = maxRevenue > 0 ? (zone.revenue / maxRevenue) * 100 : 0;
        const color = getZoneColor(zone.zone);
        
        return (
          <div key={zone.zone} className="group">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span 
                  className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]"
                  style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}40` }}
                />
                <span className="text-sm text-white/70 group-hover:text-white transition-colors">
                  {formatZoneName(zone.zone)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-white">
                  AED {zone.revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-xs text-white/40 w-12 text-right">
                  {percentage.toFixed(1)}%
                </span>
              </div>
            </div>
            
            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: color,
                  boxShadow: `0 0 12px ${color}60`,
                }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full opacity-50 blur-sm"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
      
      {sortedData.length === 0 && (
        <div className="flex items-center justify-center h-full text-white/40">
          No data available
        </div>
      )}
    </div>
  );
};

export default FuturisticZoneBarChart;
