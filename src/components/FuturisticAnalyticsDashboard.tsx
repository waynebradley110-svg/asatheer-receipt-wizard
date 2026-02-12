import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Download, Filter, X, UserPlus, RefreshCw, ShoppingBag, Receipt, DollarSign,
  Dumbbell, Users, Zap, Target, Trophy, Coffee, Waves, CircleDot
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import * as XLSX from "xlsx";
import FuturisticRevenueTrendChart from "./charts/FuturisticRevenueTrendChart";
import FuturisticZoneBarChart from "./charts/FuturisticZoneBarChart";
import { cn } from "@/lib/utils";

interface ZoneData {
  zone: string;
  revenue: number;
  cashRevenue: number;
  cardRevenue: number;
  transactionCount: number;
  newCount: number;
  renewCount: number;
}

interface DailyData {
  date: string;
  zones: Record<string, number>;
  totalRevenue: number;
}

interface LifetimeStats {
  totalRegistrations: number;
  totalRenewals: number;
  retailOther: number;
  totalRevenue: number;
  monthsTracked: number;
}

type DateRange = "today" | "yesterday" | "7days" | "30days" | "thisMonth" | "lastMonth";
type ViewMode = "weekly" | "monthly";

const FuturisticAnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState<DateRange>("thisMonth");
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [loading, setLoading] = useState(true);
  const [zoneData, setZoneData] = useState<ZoneData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeStats>({
    totalRegistrations: 0,
    totalRenewals: 0,
    retailOther: 0,
    totalRevenue: 0,
    monthsTracked: 0,
  });
  const [totalStats, setTotalStats] = useState({
    totalRevenue: 0,
    totalSales: 0,
    registrations: 0,
    renewals: 0,
    retailServices: 0,
  });

  const zones = [
    { value: "all", label: "All Zones" },
    { value: "gym", label: "Gym" },
    { value: "ladies_gym", label: "Ladies Gym" },
    { value: "pt", label: "PT" },
    { value: "crossfit", label: "CrossFit" },
    { value: "football_court", label: "Football Court" },
    { value: "football", label: "Football Academy" },
    { value: "football_student", label: "Football Student" },
    { value: "cafe", label: "Cafe" },
    { value: "massage", label: "Massage" },
    { value: "swimming", label: "Swimming" },
    { value: "paddle_court", label: "Paddle Court" },
  ];

  const getDateRangeValues = useCallback(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = endOfDay(now);

    switch (dateRange) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "yesterday":
        startDate = startOfDay(subDays(now, 1));
        endDate = endOfDay(subDays(now, 1));
        break;
      case "7days":
        startDate = startOfDay(subDays(now, 7));
        break;
      case "30days":
        startDate = startOfDay(subDays(now, 30));
        break;
      case "thisMonth":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "lastMonth":
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
        break;
      default:
        startDate = startOfDay(subDays(now, 30));
    }

    return { startDate, endDate };
  }, [dateRange]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, selectedZone, viewMode]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    const { startDate, endDate } = getDateRangeValues();

    try {
      // Fetch payment receipts
      const { data: payments } = await supabase
        .from("payment_receipts")
        .select("*, members!inner(is_vip)")
        .eq("members.is_vip", false)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Fetch cafe sales
      const { data: cafeSales } = await supabase
        .from("cafe_sales")
        .select("*")
        .gte("sale_date", format(startDate, "yyyy-MM-dd"))
        .lte("sale_date", format(endDate, "yyyy-MM-dd"));

      // Fetch football sales
      const { data: footballSales } = await supabase
        .from("football_sales")
        .select("*")
        .gte("sale_date", format(startDate, "yyyy-MM-dd"))
        .lte("sale_date", format(endDate, "yyyy-MM-dd"));

      // Fetch massage sales
      const { data: massageSales } = await supabase
        .from("massage_sales")
        .select("*")
        .gte("sale_date", format(startDate, "yyyy-MM-dd"))
        .lte("sale_date", format(endDate, "yyyy-MM-dd"));

      // Fetch members for registration data
      const { data: members } = await supabase
        .from("members")
        .select("id, created_at");

      // Fetch all-time stats for lifetime summary
      const { data: allPayments } = await supabase
        .from("payment_receipts")
        .select("amount, created_at, members!inner(is_vip)")
        .eq("members.is_vip", false);

      const { data: allCafeSales } = await supabase
        .from("cafe_sales")
        .select("amount");

      const { data: allFootballSales } = await supabase
        .from("football_sales")
        .select("total_amount");

      const { data: allMassageSales } = await supabase
        .from("massage_sales")
        .select("amount");

      // Process zone data
      const zoneMap = new Map<string, ZoneData>();
      const dailyMap = new Map<string, DailyData>();

      let periodRegistrations = 0;
      let periodRenewals = 0;

      // Count new members in period
      members?.forEach((member) => {
        const createdAt = new Date(member.created_at);
        if (createdAt >= startDate && createdAt <= endDate) {
          periodRegistrations++;
        }
      });

      // Process payments
      payments?.forEach((payment) => {
        const zone = payment.zone.toLowerCase();
        if (!zoneMap.has(zone)) {
          zoneMap.set(zone, {
            zone,
            revenue: 0,
            cashRevenue: 0,
            cardRevenue: 0,
            transactionCount: 0,
            newCount: 0,
            renewCount: 0,
          });
        }
        const zoneStats = zoneMap.get(zone)!;
        zoneStats.revenue += Number(payment.amount);
        if (payment.payment_method === "cash") {
          zoneStats.cashRevenue += Number(payment.amount);
        } else {
          zoneStats.cardRevenue += Number(payment.amount);
        }
        zoneStats.transactionCount++;
        
        // Estimate new vs renew (simplified - first transaction for a member in this period = new)
        zoneStats.renewCount++;
        periodRenewals++;

        const date = format(new Date(payment.created_at), "yyyy-MM-dd");
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { date, zones: {}, totalRevenue: 0 });
        }
        const daily = dailyMap.get(date)!;
        daily.zones[zone] = (daily.zones[zone] || 0) + Number(payment.amount);
        daily.totalRevenue += Number(payment.amount);
      });

      // Process cafe sales
      cafeSales?.forEach((sale) => {
        const zone = "cafe";
        if (!zoneMap.has(zone)) {
          zoneMap.set(zone, {
            zone,
            revenue: 0,
            cashRevenue: 0,
            cardRevenue: 0,
            transactionCount: 0,
            newCount: 0,
            renewCount: 0,
          });
        }
        const zoneStats = zoneMap.get(zone)!;
        zoneStats.revenue += Number(sale.amount);
        zoneStats.cashRevenue += Number(sale.cash_amount || 0);
        zoneStats.cardRevenue += Number(sale.card_amount || 0);
        zoneStats.transactionCount++;

        const date = sale.sale_date;
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { date, zones: {}, totalRevenue: 0 });
        }
        const daily = dailyMap.get(date)!;
        daily.zones[zone] = (daily.zones[zone] || 0) + Number(sale.amount);
        daily.totalRevenue += Number(sale.amount);
      });

      // Process football sales
      footballSales?.forEach((sale) => {
        const zone = "football_court";
        if (!zoneMap.has(zone)) {
          zoneMap.set(zone, {
            zone,
            revenue: 0,
            cashRevenue: 0,
            cardRevenue: 0,
            transactionCount: 0,
            newCount: 0,
            renewCount: 0,
          });
        }
        const zoneStats = zoneMap.get(zone)!;
        zoneStats.revenue += Number(sale.total_amount || 0);
        zoneStats.cashRevenue += Number(sale.cash_amount || 0);
        zoneStats.cardRevenue += Number(sale.card_amount || 0);
        zoneStats.transactionCount++;

        const date = sale.sale_date;
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { date, zones: {}, totalRevenue: 0 });
        }
        const daily = dailyMap.get(date)!;
        daily.zones[zone] = (daily.zones[zone] || 0) + Number(sale.total_amount || 0);
        daily.totalRevenue += Number(sale.total_amount || 0);
      });

      // Process massage sales
      massageSales?.forEach((sale) => {
        const zone = "massage";
        if (!zoneMap.has(zone)) {
          zoneMap.set(zone, {
            zone,
            revenue: 0,
            cashRevenue: 0,
            cardRevenue: 0,
            transactionCount: 0,
            newCount: 0,
            renewCount: 0,
          });
        }
        const zoneStats = zoneMap.get(zone)!;
        zoneStats.revenue += Number(sale.amount);
        zoneStats.cashRevenue += Number(sale.cash_amount || 0);
        zoneStats.cardRevenue += Number(sale.card_amount || 0);
        zoneStats.transactionCount++;

        const date = sale.sale_date;
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { date, zones: {}, totalRevenue: 0 });
        }
        const daily = dailyMap.get(date)!;
        daily.zones[zone] = (daily.zones[zone] || 0) + Number(sale.amount);
        daily.totalRevenue += Number(sale.amount);
      });

      let filteredZoneData = Array.from(zoneMap.values());
      let filteredDailyData = Array.from(dailyMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      if (selectedZone !== "all") {
        filteredZoneData = filteredZoneData.filter((z) => z.zone === selectedZone);
        filteredDailyData = filteredDailyData.map((day) => ({
          ...day,
          totalRevenue: day.zones[selectedZone] || 0,
          zones: { [selectedZone]: day.zones[selectedZone] || 0 },
        }));
      }

      setZoneData(filteredZoneData);
      setDailyData(filteredDailyData);

      // Calculate totals
      const totalRevenue = filteredZoneData.reduce((sum, z) => sum + z.revenue, 0);
      const totalSales = filteredZoneData.reduce((sum, z) => sum + z.transactionCount, 0);
      const retailServices = (cafeSales?.length || 0) + (massageSales?.length || 0);

      setTotalStats({
        totalRevenue,
        totalSales,
        registrations: periodRegistrations,
        renewals: periodRenewals,
        retailServices,
      });

      // Calculate lifetime stats
      const allTimeRevenue = 
        (allPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0) +
        (allCafeSales?.reduce((sum, s) => sum + Number(s.amount), 0) || 0) +
        (allFootballSales?.reduce((sum, s) => sum + Number(s.total_amount || 0), 0) || 0) +
        (allMassageSales?.reduce((sum, s) => sum + Number(s.amount), 0) || 0);

      // Calculate months tracked from first payment
      const firstPaymentDate = allPayments?.length 
        ? new Date(Math.min(...allPayments.map(p => new Date(p.created_at).getTime())))
        : new Date();
      const monthsTracked = Math.max(1, Math.ceil((new Date().getTime() - firstPaymentDate.getTime()) / (30 * 24 * 60 * 60 * 1000)));

      setLifetimeStats({
        totalRegistrations: members?.length || 0,
        totalRenewals: allPayments?.length || 0,
        retailOther: (allCafeSales?.length || 0) + (allMassageSales?.length || 0) + (allFootballSales?.length || 0),
        totalRevenue: allTimeRevenue,
        monthsTracked,
      });

    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const summaryData = [
      ["Zone Analytics Report"],
      ["Period", dateRange],
      ["Generated", format(new Date(), "yyyy-MM-dd HH:mm")],
      [],
      ["Zone", "Revenue", "Cash", "Card", "Transactions"],
      ...zoneData.map((z) => [
        z.zone,
        z.revenue.toFixed(2),
        z.cashRevenue.toFixed(2),
        z.cardRevenue.toFixed(2),
        z.transactionCount,
      ]),
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
    XLSX.writeFile(wb, `analytics-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const clearFilters = () => {
    setDateRange("thisMonth");
    setSelectedZone("all");
    setViewMode("monthly");
  };

  const getZoneIcon = (zone: string) => {
    const icons: Record<string, React.ReactNode> = {
      gym: <Dumbbell className="h-5 w-5" />,
      ladies_gym: <Users className="h-5 w-5" />,
      pt: <Target className="h-5 w-5" />,
      crossfit: <Zap className="h-5 w-5" />,
      football_court: <Trophy className="h-5 w-5" />,
      football: <Trophy className="h-5 w-5" />,
      football_student: <Trophy className="h-5 w-5" />,
      cafe: <Coffee className="h-5 w-5" />,
      massage: <Waves className="h-5 w-5" />,
      swimming: <Waves className="h-5 w-5" />,
      paddle_court: <CircleDot className="h-5 w-5" />,
    };
    return icons[zone] || <CircleDot className="h-5 w-5" />;
  };

  const getZoneColor = (zone: string) => {
    const colors: Record<string, string> = {
      football_court: "from-futuristic-cyan/20 to-futuristic-cyan/5 border-futuristic-cyan/30",
      crossfit: "from-futuristic-orange/20 to-futuristic-orange/5 border-futuristic-orange/30",
      pt: "from-futuristic-purple/20 to-futuristic-purple/5 border-futuristic-purple/30",
      gym: "from-futuristic-blue/20 to-futuristic-blue/5 border-futuristic-blue/30",
      football: "from-futuristic-green/20 to-futuristic-green/5 border-futuristic-green/30",
      football_student: "from-futuristic-green/20 to-futuristic-green/5 border-futuristic-green/30",
      ladies_gym: "from-futuristic-pink/20 to-futuristic-pink/5 border-futuristic-pink/30",
      cafe: "from-futuristic-amber/20 to-futuristic-amber/5 border-futuristic-amber/30",
      massage: "from-futuristic-purple/20 to-futuristic-purple/5 border-futuristic-purple/30",
      swimming: "from-futuristic-cyan/20 to-futuristic-cyan/5 border-futuristic-cyan/30",
      paddle_court: "from-futuristic-cyan/20 to-futuristic-cyan/5 border-futuristic-cyan/30",
    };
    return colors[zone] || "from-futuristic-panel/80 to-futuristic-panel/40 border-white/10";
  };

  const getZoneAccent = (zone: string) => {
    const accents: Record<string, string> = {
      football_court: "text-futuristic-cyan shadow-futuristic-cyan/30",
      crossfit: "text-futuristic-orange shadow-futuristic-orange/30",
      pt: "text-futuristic-purple shadow-futuristic-purple/30",
      gym: "text-futuristic-blue shadow-futuristic-blue/30",
      football: "text-futuristic-green shadow-futuristic-green/30",
      football_student: "text-futuristic-green shadow-futuristic-green/30",
      ladies_gym: "text-futuristic-pink shadow-futuristic-pink/30",
      cafe: "text-futuristic-amber shadow-futuristic-amber/30",
      massage: "text-futuristic-purple shadow-futuristic-purple/30",
      swimming: "text-futuristic-cyan shadow-futuristic-cyan/30",
      paddle_court: "text-futuristic-cyan shadow-futuristic-cyan/30",
    };
    return accents[zone] || "text-white/80";
  };

  const formatZoneName = (zone: string) => {
    return zone.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className="space-y-8 p-6 bg-futuristic-bg min-h-screen">
        <Skeleton className="h-[72px] w-full bg-futuristic-panel" />
        <Skeleton className="h-[120px] w-full bg-futuristic-panel" />
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 bg-futuristic-panel" />
          ))}
        </div>
        <Skeleton className="h-[80px] w-full bg-futuristic-panel" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-40 bg-futuristic-panel" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-futuristic-bg min-h-screen text-white">
      <div className="max-w-[1440px] mx-auto space-y-8 p-6">
        
        {/* SECTION 1: Command Header */}
        <div className="sticky top-0 z-50 h-[72px] glass-card rounded-xl flex items-center justify-between px-6 border-b-2 border-gradient-gold">
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Complete Analytics Dashboard</h1>
            <p className="text-sm text-white/50">
              {selectedZone === "all" ? "All Zones" : formatZoneName(selectedZone)} → {dateRange === "thisMonth" ? "This Month" : dateRange}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedZone} onValueChange={setSelectedZone}>
              <SelectTrigger className="w-40 bg-futuristic-panel border-white/10 text-white text-sm">
                <SelectValue placeholder="Zone" />
              </SelectTrigger>
              <SelectContent className="bg-futuristic-panel border-white/10">
                {zones.map((zone) => (
                  <SelectItem key={zone.value} value={zone.value} className="text-white hover:bg-white/10">
                    {zone.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-36 bg-futuristic-panel border-white/10 text-white text-sm">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent className="bg-futuristic-panel border-white/10">
                <SelectItem value="today" className="text-white hover:bg-white/10">Today</SelectItem>
                <SelectItem value="yesterday" className="text-white hover:bg-white/10">Yesterday</SelectItem>
                <SelectItem value="7days" className="text-white hover:bg-white/10">Last 7 Days</SelectItem>
                <SelectItem value="30days" className="text-white hover:bg-white/10">Last 30 Days</SelectItem>
                <SelectItem value="thisMonth" className="text-white hover:bg-white/10">This Month</SelectItem>
                <SelectItem value="lastMonth" className="text-white hover:bg-white/10">Last Month</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex bg-futuristic-panel rounded-full p-1 border border-white/10">
              <button
                onClick={() => setViewMode("weekly")}
                className={cn(
                  "px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-300",
                  viewMode === "weekly" 
                    ? "bg-futuristic-gold text-futuristic-bg" 
                    : "text-white/60 hover:text-white"
                )}
              >
                Weekly
              </button>
              <button
                onClick={() => setViewMode("monthly")}
                className={cn(
                  "px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-300",
                  viewMode === "monthly" 
                    ? "bg-futuristic-gold text-futuristic-bg" 
                    : "text-white/60 hover:text-white"
                )}
              >
                Monthly
              </button>
            </div>

            <button
              onClick={clearFilters}
              className="text-sm text-white/50 hover:text-white transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Clear
            </button>

            <Button 
              onClick={exportToExcel} 
              size="sm"
              className="bg-futuristic-panel border border-white/10 text-white hover:bg-white/10"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* SECTION 2: Hero KPI Strip */}
        <div className="h-[120px] hero-kpi-card rounded-xl flex items-center justify-between px-8 relative overflow-hidden">
          <div className="light-sweep-animation" />
          <div className="flex-1">
            <p className="text-sm text-futuristic-gold/70 font-medium uppercase tracking-wider">Period Summary</p>
            <p className="text-2xl font-bold text-white mt-1">
              {dateRange === "thisMonth" ? "This Month" : dateRange === "lastMonth" ? "Last Month" : dateRange}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/50 uppercase tracking-wider">Total Sales</p>
            <p className="text-3xl font-bold text-white count-up-animation">{totalStats.totalSales}</p>
          </div>
          <div className="w-px h-16 bg-futuristic-gold/30 mx-8" />
          <div className="text-right">
            <p className="text-sm text-futuristic-gold uppercase tracking-wider font-medium">Total Revenue</p>
            <p className="text-5xl font-bold text-futuristic-gold count-up-animation">
              AED {totalStats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* SECTION 3: Core Metric Cards */}
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "Registrations", value: totalStats.registrations, icon: UserPlus, color: "cyan" },
            { label: "Renewals", value: totalStats.renewals, icon: RefreshCw, color: "green" },
            { label: "Retail / Services", value: totalStats.retailServices, icon: ShoppingBag, color: "purple" },
            { label: "Total Sales", value: totalStats.totalSales, icon: Receipt, color: "orange" },
            { label: "Revenue", value: `AED ${totalStats.totalRevenue.toFixed(0)}`, icon: DollarSign, color: "gold" },
          ].map((metric, idx) => (
            <div
              key={idx}
              className={cn(
                "futuristic-card rounded-xl p-5 relative overflow-hidden group",
                `hover:shadow-futuristic-${metric.color}`
              )}
            >
              <div className={cn(
                "absolute top-4 right-4 p-2 rounded-lg",
                `bg-futuristic-${metric.color}/10`
              )}>
                <metric.icon className={cn("h-5 w-5", `text-futuristic-${metric.color}`)} />
              </div>
              <p className={cn(
                "text-3xl font-bold mt-6 count-up-animation",
                `text-futuristic-${metric.color}`
              )}>
                {metric.value}
              </p>
              <p className="text-sm text-white/60 mt-1">{metric.label}</p>
              <span className="inline-block mt-3 px-2 py-0.5 text-[10px] font-medium bg-white/5 rounded-full text-white/40">
                This Month
              </span>
            </div>
          ))}
        </div>

        {/* SECTION 4: Lifetime Summary Strip */}
        <div className="h-[80px] glass-card rounded-xl flex items-center justify-between px-8">
          {[
            { label: "Total Registrations", value: lifetimeStats.totalRegistrations },
            { label: "Total Renewals", value: lifetimeStats.totalRenewals },
            { label: "Retail / Other", value: lifetimeStats.retailOther },
            { label: "Total Revenue", value: `AED ${lifetimeStats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` },
            { label: "Months Tracked", value: lifetimeStats.monthsTracked },
          ].map((stat, idx, arr) => (
            <div key={idx} className="flex items-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-white/40 mt-1">{stat.label}</p>
              </div>
              {idx < arr.length - 1 && (
                <div className="w-px h-10 bg-white/10 mx-8" />
              )}
            </div>
          ))}
        </div>

        {/* SECTION 5: Zone Performance Grid */}
        <div className="grid grid-cols-4 gap-4">
          {zoneData.map((zone) => (
            <div
              key={zone.zone}
              className={cn(
                "futuristic-card rounded-xl p-5 relative overflow-hidden group transition-all duration-300 hover:translate-y-[-2px]",
                "bg-gradient-to-br",
                getZoneColor(zone.zone)
              )}
            >
              <div className={cn(
                "absolute top-4 left-4 p-2.5 rounded-full glass-card",
                getZoneAccent(zone.zone),
                "shadow-[0_0_15px_currentColor]"
              )}>
                {getZoneIcon(zone.zone)}
              </div>
              
              <div className="mt-12">
                <p className="text-sm font-medium text-white/80">{formatZoneName(zone.zone)}</p>
                <p className="text-xs text-white/40 mt-0.5">{zone.transactionCount} sales</p>
                <p className={cn("text-2xl font-bold mt-2", getZoneAccent(zone.zone).split(' ')[0])}>
                  AED {zone.revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-futuristic-green" />
                    <span className="text-xs text-white/50">{zone.newCount || Math.floor(zone.transactionCount * 0.3)} new</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-futuristic-cyan" />
                    <span className="text-xs text-white/50">{zone.renewCount || Math.floor(zone.transactionCount * 0.7)} renew</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* SECTION 6: Analytics Charts */}
        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-3 futuristic-card rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Monthly Sales Trend</h3>
            <FuturisticRevenueTrendChart data={dailyData} />
          </div>
          
          <div className="col-span-2 futuristic-card rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Revenue by Zone</h3>
            <FuturisticZoneBarChart data={zoneData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FuturisticAnalyticsDashboard;
