import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Download, TrendingUp, TrendingDown, DollarSign, CreditCard, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from "xlsx";
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import RevenueTrendChart from "./charts/RevenueTrendChart";
import ZoneComparisonChart from "./charts/ZoneComparisonChart";
import RevenueDistributionChart from "./charts/RevenueDistributionChart";
import { Skeleton } from "@/components/ui/skeleton";

interface ZoneData {
  zone: string;
  revenue: number;
  cashRevenue: number;
  cardRevenue: number;
  transactionCount: number;
}

interface DailyData {
  date: string;
  zones: Record<string, number>;
  totalRevenue: number;
}

type DateRange = "today" | "yesterday" | "7days" | "30days" | "thisMonth" | "lastMonth";

const AdvancedAnalytics = () => {
  const [dateRange, setDateRange] = useState<DateRange>("30days");
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [zoneData, setZoneData] = useState<ZoneData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalRevenue: 0,
    totalCash: 0,
    totalCard: 0,
    transactionCount: 0,
    growthPercentage: 0,
  });

  const zones = [
    { value: "all", label: "All Zones" },
    { value: "gym", label: "💪 Gym" },
    { value: "ladies_gym", label: "👩 Ladies Gym" },
    { value: "pt", label: "🏋️ PT" },
    { value: "crossfit", label: "🤸 CrossFit" },
    { value: "football_court", label: "⚽ Football Court" },
    { value: "football", label: "🎯 Football Academy" },
    { value: "football_student", label: "🎓 Football Student" },
    { value: "cafe", label: "☕ Cafe" },
    { value: "massage", label: "💆 Massage" },
    { value: "swimming", label: "🏊 Swimming" },
    { value: "paddle_court", label: "🎾 Paddle Court" },
  ];

  const getDateRangeValues = () => {
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
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, selectedZone]);

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

      // Process zone data
      const zoneMap = new Map<string, ZoneData>();
      const dailyMap = new Map<string, DailyData>();

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

        // Daily data
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
      const totalCash = filteredZoneData.reduce((sum, z) => sum + z.cashRevenue, 0);
      const totalCard = filteredZoneData.reduce((sum, z) => sum + z.cardRevenue, 0);
      const transactionCount = filteredZoneData.reduce((sum, z) => sum + z.transactionCount, 0);

      setTotalStats({
        totalRevenue,
        totalCash,
        totalCard,
        transactionCount,
        growthPercentage: 0, // TODO: Calculate vs previous period
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ["Zone Analytics Report"],
      ["Period", dateRange],
      ["Generated", format(new Date(), "yyyy-MM-dd HH:mm")],
      [],
      ["Zone", "Revenue", "Cash", "Card", "Transactions", "Avg Transaction"],
      ...zoneData.map((z) => [
        z.zone,
        z.revenue.toFixed(2),
        z.cashRevenue.toFixed(2),
        z.cardRevenue.toFixed(2),
        z.transactionCount,
        (z.revenue / z.transactionCount).toFixed(2),
      ]),
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    // Daily breakdown sheet
    const dailyHeaders = ["Date", ...Array.from(new Set(zoneData.map((z) => z.zone)))];
    const dailyRows = dailyData.map((day) => [
      day.date,
      ...dailyHeaders.slice(1).map((zone) => day.zones[zone] || 0),
    ]);
    const dailySheet = XLSX.utils.aoa_to_sheet([dailyHeaders, ...dailyRows]);
    XLSX.utils.book_append_sheet(wb, dailySheet, "Daily Breakdown");

    XLSX.writeFile(wb, `analytics-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const bestZone = zoneData.reduce(
    (best, zone) => (zone.revenue > best.revenue ? zone : best),
    { zone: "N/A", revenue: 0 } as ZoneData
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={dateRange === "today" ? "default" : "outline"}
            onClick={() => setDateRange("today")}
            size="sm"
          >
            Today
          </Button>
          <Button
            variant={dateRange === "yesterday" ? "default" : "outline"}
            onClick={() => setDateRange("yesterday")}
            size="sm"
          >
            Yesterday
          </Button>
          <Button
            variant={dateRange === "7days" ? "default" : "outline"}
            onClick={() => setDateRange("7days")}
            size="sm"
          >
            Last 7 Days
          </Button>
          <Button
            variant={dateRange === "30days" ? "default" : "outline"}
            onClick={() => setDateRange("30days")}
            size="sm"
          >
            Last 30 Days
          </Button>
          <Button
            variant={dateRange === "thisMonth" ? "default" : "outline"}
            onClick={() => setDateRange("thisMonth")}
            size="sm"
          >
            This Month
          </Button>
          <Button
            variant={dateRange === "lastMonth" ? "default" : "outline"}
            onClick={() => setDateRange("lastMonth")}
            size="sm"
          >
            Last Month
          </Button>
        </div>

        <div className="flex gap-2 items-center">
          <Select value={selectedZone} onValueChange={setSelectedZone}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select zone" />
            </SelectTrigger>
            <SelectContent>
              {zones.map((zone) => (
                <SelectItem key={zone.value} value={zone.value}>
                  {zone.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={exportToExcel} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">AED {totalStats.totalRevenue.toFixed(2)}</p>
              <div className="flex items-center mt-2 text-sm">
                {totalStats.growthPercentage >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={totalStats.growthPercentage >= 0 ? "text-green-500" : "text-red-500"}>
                  {totalStats.growthPercentage.toFixed(1)}%
                </span>
              </div>
            </div>
            <DollarSign className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Best Performing</p>
              <p className="text-2xl font-bold capitalize">{bestZone.zone.replace("_", " ")}</p>
              <p className="text-sm text-muted-foreground mt-2">AED {bestZone.revenue.toFixed(2)}</p>
            </div>
            <Activity className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold">{totalStats.transactionCount}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Avg: AED {(totalStats.totalRevenue / totalStats.transactionCount || 0).toFixed(2)}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Payment Split</p>
              <div className="mt-2">
                <p className="text-sm">💰 Cash: {((totalStats.totalCash / totalStats.totalRevenue) * 100 || 0).toFixed(1)}%</p>
                <p className="text-sm">💳 Card: {((totalStats.totalCard / totalStats.totalRevenue) * 100 || 0).toFixed(1)}%</p>
              </div>
            </div>
            <DollarSign className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trend">Revenue Trend</TabsTrigger>
          <TabsTrigger value="comparison">Zone Comparison</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="trend" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Revenue Trend Over Time</h3>
            <RevenueTrendChart data={dailyData} selectedZone={selectedZone} />
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Zone Revenue Comparison</h3>
            <ZoneComparisonChart data={zoneData} />
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Revenue Distribution by Zone</h3>
            <RevenueDistributionChart data={zoneData} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAnalytics;
