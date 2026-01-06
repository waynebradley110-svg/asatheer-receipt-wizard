import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, TrendingDown, Users, UserCheck, UserX, 
  Clock, Target, AlertTriangle, Calendar, Activity 
} from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface GrowthMetrics {
  memberGrowth: number;
  revenueGrowth: number;
  attendanceGrowth: number;
  retentionRate: number;
  churnRate: number;
  avgRevenuePerMember: number;
  peakHour: number;
  peakHourCount: number;
  atRiskMembers: number;
}

interface ServicePopularity {
  zone: string;
  count: number;
  percentage: number;
}

const EnhancedAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<GrowthMetrics>({
    memberGrowth: 0,
    revenueGrowth: 0,
    attendanceGrowth: 0,
    retentionRate: 0,
    churnRate: 0,
    avgRevenuePerMember: 0,
    peakHour: 0,
    peakHourCount: 0,
    atRiskMembers: 0,
  });
  const [servicePopularity, setServicePopularity] = useState<ServicePopularity[]>([]);

  useEffect(() => {
    fetchEnhancedMetrics();
  }, []);

  const fetchEnhancedMetrics = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const thisMonthStart = startOfMonth(today);
      const lastMonthStart = startOfMonth(subMonths(today, 1));
      const lastMonthEnd = endOfMonth(subMonths(today, 1));
      const weekAgo = subDays(today, 7);
      const twoWeeksAgo = subDays(today, 14);

      // Fetch members with services
      const { data: members } = await supabase
        .from("members")
        .select("*, member_services(*)");

      // Fetch this month's new members
      const { data: thisMonthMembers } = await supabase
        .from("members")
        .select("id")
        .gte("created_at", thisMonthStart.toISOString());

      // Fetch last month's new members
      const { data: lastMonthMembers } = await supabase
        .from("members")
        .select("id")
        .gte("created_at", lastMonthStart.toISOString())
        .lte("created_at", lastMonthEnd.toISOString());

      // Calculate member growth
      const thisMonthCount = thisMonthMembers?.length || 0;
      const lastMonthCount = lastMonthMembers?.length || 1;
      const memberGrowth = ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100;

      // Fetch payments for revenue growth
      const { data: thisMonthPayments } = await supabase
        .from("payment_receipts")
        .select("amount")
        .gte("created_at", thisMonthStart.toISOString());

      const { data: lastMonthPayments } = await supabase
        .from("payment_receipts")
        .select("amount")
        .gte("created_at", lastMonthStart.toISOString())
        .lte("created_at", lastMonthEnd.toISOString());

      const thisMonthRevenue = thisMonthPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const lastMonthRevenue = lastMonthPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 1;
      const revenueGrowth = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

      // Fetch attendance for growth and peak hours
      const { data: thisWeekAttendance } = await supabase
        .from("attendance")
        .select("*")
        .gte("check_in_time", weekAgo.toISOString());

      const { data: lastWeekAttendance } = await supabase
        .from("attendance")
        .select("*")
        .gte("check_in_time", twoWeeksAgo.toISOString())
        .lte("check_in_time", weekAgo.toISOString());

      const thisWeekCount = thisWeekAttendance?.length || 0;
      const lastWeekCount = lastWeekAttendance?.length || 1;
      const attendanceGrowth = ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;

      // Calculate peak hour
      const hourCounts: Record<number, number> = {};
      thisWeekAttendance?.forEach((att) => {
        const hour = new Date(att.check_in_time).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      let peakHour = 0;
      let peakHourCount = 0;
      Object.entries(hourCounts).forEach(([hour, count]) => {
        if (count > peakHourCount) {
          peakHour = parseInt(hour);
          peakHourCount = count;
        }
      });

      // Calculate retention and churn
      const activeMembers = members?.filter(m =>
        m.member_services?.some((s: any) =>
          new Date(s.expiry_date) >= new Date() && s.is_active
        )
      ) || [];

      const expiredMembers = members?.filter(m =>
        !m.member_services?.some((s: any) =>
          new Date(s.expiry_date) >= new Date() && s.is_active
        )
      ) || [];

      const totalMembers = members?.length || 1;
      const retentionRate = (activeMembers.length / totalMembers) * 100;
      const churnRate = (expiredMembers.length / totalMembers) * 100;

      // Calculate avg revenue per member
      const totalRevenue = thisMonthRevenue + lastMonthRevenue;
      const avgRevenuePerMember = totalRevenue / totalMembers;

      // Calculate at-risk members (low attendance + expiring soon)
      const sevenDaysFromNow = subDays(today, -7);
      const atRiskMembers = activeMembers.filter(m => {
        const expiringService = m.member_services?.find((s: any) => {
          const expiryDate = new Date(s.expiry_date);
          return expiryDate >= today && expiryDate <= sevenDaysFromNow && s.is_active;
        });
        return expiringService;
      }).length;

      // Calculate service popularity
      const serviceCounts: Record<string, number> = {};
      members?.forEach(m => {
        m.member_services?.forEach((s: any) => {
          if (s.is_active) {
            serviceCounts[s.zone] = (serviceCounts[s.zone] || 0) + 1;
          }
        });
      });

      const totalServices = Object.values(serviceCounts).reduce((sum, count) => sum + count, 0) || 1;
      const popularity = Object.entries(serviceCounts)
        .map(([zone, count]) => ({
          zone,
          count,
          percentage: (count / totalServices) * 100,
        }))
        .sort((a, b) => b.count - a.count);

      setMetrics({
        memberGrowth,
        revenueGrowth,
        attendanceGrowth,
        retentionRate,
        churnRate,
        avgRevenuePerMember,
        peakHour,
        peakHourCount,
        atRiskMembers,
      });

      setServicePopularity(popularity);
    } catch (error) {
      console.error("Error fetching enhanced metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return "12 AM";
    if (hour === 12) return "12 PM";
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
  };

  const getZoneLabel = (zone: string) => {
    const labels: Record<string, string> = {
      gym: "💪 Gym",
      ladies_gym: "👩 Ladies Gym",
      pt: "🏋️ PT",
      crossfit: "🤸 CrossFit",
      football_court: "⚽ Football Court",
      football_academy: "🎯 Football Academy",
      swimming: "🏊 Swimming",
      paddle_court: "🎾 Paddle Court",
    };
    return labels[zone] || zone;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-1/2 mb-4" />
              <div className="h-8 bg-muted rounded w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        Growth & Performance Metrics
      </h3>

      {/* Growth Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={cn(
          "border-l-4 stat-card-hover",
          metrics.memberGrowth >= 0 ? "border-l-accent" : "border-l-destructive"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Member Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {metrics.memberGrowth >= 0 ? (
                <TrendingUp className="h-5 w-5 text-accent" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
              <span className={cn(
                "text-2xl font-bold",
                metrics.memberGrowth >= 0 ? "text-accent" : "text-destructive"
              )}>
                {metrics.memberGrowth >= 0 ? "+" : ""}{metrics.memberGrowth.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">vs last month</p>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-l-4 stat-card-hover",
          metrics.revenueGrowth >= 0 ? "border-l-accent" : "border-l-destructive"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Revenue Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {metrics.revenueGrowth >= 0 ? (
                <TrendingUp className="h-5 w-5 text-accent" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
              <span className={cn(
                "text-2xl font-bold",
                metrics.revenueGrowth >= 0 ? "text-accent" : "text-destructive"
              )}>
                {metrics.revenueGrowth >= 0 ? "+" : ""}{metrics.revenueGrowth.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">vs last month</p>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-l-4 stat-card-hover",
          metrics.attendanceGrowth >= 0 ? "border-l-primary" : "border-l-destructive"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Attendance Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {metrics.attendanceGrowth >= 0 ? (
                <TrendingUp className="h-5 w-5 text-primary" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
              <span className={cn(
                "text-2xl font-bold",
                metrics.attendanceGrowth >= 0 ? "text-primary" : "text-destructive"
              )}>
                {metrics.attendanceGrowth >= 0 ? "+" : ""}{metrics.attendanceGrowth.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">vs last week</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary stat-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Peak Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-primary">
              {formatHour(metrics.peakHour)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.peakHourCount} check-ins this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Retention & Risk Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-accent stat-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Retention Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-accent">
              {metrics.retentionRate.toFixed(1)}%
            </span>
            <Progress 
              value={metrics.retentionRate} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive stat-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserX className="h-4 w-4" />
              Churn Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-destructive">
              {metrics.churnRate.toFixed(1)}%
            </span>
            <Progress 
              value={metrics.churnRate} 
              className="mt-2 h-2 [&>div]:bg-destructive"
            />
          </CardContent>
        </Card>

        <Card className={cn(
          "border-l-4 stat-card-hover",
          metrics.atRiskMembers > 0 ? "border-l-[hsl(var(--power))]" : "border-l-accent"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              At-Risk Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={cn(
              "text-3xl font-bold",
              metrics.atRiskMembers > 0 ? "text-[hsl(var(--power))]" : "text-accent"
            )}>
              {metrics.atRiskMembers}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              Expiring within 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Service Popularity */}
      <Card className="stat-card-hover">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Service Popularity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {servicePopularity.slice(0, 6).map((service, index) => (
              <div key={service.zone} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{getZoneLabel(service.zone)}</span>
                  <span className="text-muted-foreground">
                    {service.count} members ({service.percentage.toFixed(1)}%)
                  </span>
                </div>
                <Progress 
                  value={service.percentage} 
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Avg Revenue Per Member */}
      <Card className="border-l-4 border-l-accent stat-card-hover">
        <CardHeader>
          <CardTitle className="text-lg">Average Revenue Per Member</CardTitle>
        </CardHeader>
        <CardContent>
          <span className="text-4xl font-bold text-accent">
            AED {metrics.avgRevenuePerMember.toFixed(2)}
          </span>
          <p className="text-muted-foreground mt-2">
            Based on last 2 months of revenue data
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedAnalytics;
