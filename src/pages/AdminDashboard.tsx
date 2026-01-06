import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, UserX, TrendingUp, DollarSign, Shield, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExpiryReminders } from "@/components/ExpiryReminders";
import { MembershipFreezeCard } from "@/components/MembershipFreezeCard";
import { UserManagement } from "@/components/UserManagement";
import { SystemSettings } from "@/components/SystemSettings";
import { FinancialCorrections } from "@/components/FinancialCorrections";
import { ZoneAnalysis } from "@/components/ZoneAnalysis";
import { ExcelBackup } from "@/components/ExcelBackup";
import { CafeSales } from "@/components/CafeSales";
import { FootballSales } from "@/components/FootballSales";
import { MassageSales } from "@/components/MassageSales";
import AdvancedAnalytics from "@/components/AdvancedAnalytics";
import EnhancedAnalytics from "@/components/EnhancedAnalytics";
import NotificationManager from "@/components/NotificationManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    expiredMembers: 0,
    newThisWeek: 0,
    totalCash: 0,
    totalCard: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { data: members } = await supabase
      .from("members")
      .select("*, member_services(*)");

    const { data: payments } = await supabase
      .from("payment_receipts")
      .select("amount, payment_method");

    const { data: newMembers } = await supabase
      .from("members")
      .select("id")
      .gte("created_at", weekAgo.toISOString());

    const activeMembersCount = members?.filter(m => 
      m.member_services?.some((s: any) => 
        new Date(s.expiry_date) >= new Date() && s.is_active
      )
    ).length || 0;

    const totalCash = payments?.filter(p => p.payment_method === 'cash')
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    const totalCard = payments?.filter(p => p.payment_method === 'card')
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    setStats({
      totalMembers: members?.length || 0,
      activeMembers: activeMembersCount,
      expiredMembers: (members?.length || 0) - activeMembersCount,
      newThisWeek: newMembers?.length || 0,
      totalCash,
      totalCard,
      totalRevenue: totalCash + totalCard,
    });
  };

  const statCards = [
    {
      title: "Total Members",
      value: stats.totalMembers,
      icon: Users,
      colorScheme: "performance",
      description: "All registered members",
    },
    {
      title: "Active Members",
      value: stats.activeMembers,
      icon: UserCheck,
      colorScheme: "energy",
      description: "Currently active subscriptions",
      trend: stats.totalMembers > 0 
        ? `${((stats.activeMembers / stats.totalMembers) * 100).toFixed(0)}% active`
        : null,
    },
    {
      title: "Expired Members",
      value: stats.expiredMembers,
      icon: UserX,
      colorScheme: "negative",
      description: "Expired subscriptions",
    },
    {
      title: "New This Week",
      value: stats.newThisWeek,
      icon: TrendingUp,
      colorScheme: "wellness",
      description: "Last 7 days",
    },
    {
      title: "Total Revenue",
      value: `AED ${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      colorScheme: "energy",
      description: "All-time earnings",
    },
  ];

  return (
    <div className="space-y-6 dashboard-section">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-accent/5 to-transparent p-8 border border-border/50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Admin Command Center
              </h1>
              <p className="text-muted-foreground text-lg mt-1">
                Complete system control and analytics
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Today's Check-ins</p>
              <p className="text-2xl font-bold text-primary">--</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card 
            key={stat.title}
            className={cn(
              "stat-card-hover relative overflow-hidden",
              "border-l-4",
              stat.colorScheme === "energy" && "border-l-accent glow-green",
              stat.colorScheme === "performance" && "border-l-primary glow-blue",
              stat.colorScheme === "wellness" && "border-l-[hsl(var(--wellness))]",
              stat.colorScheme === "power" && "border-l-[hsl(var(--power))] glow-orange",
              stat.colorScheme === "negative" && "border-l-destructive"
            )}
          >
            <div 
              className={cn(
                "absolute top-0 right-0 w-32 h-32 opacity-5 blur-2xl rounded-full",
                stat.colorScheme === "energy" && "bg-accent",
                stat.colorScheme === "performance" && "bg-primary",
                stat.colorScheme === "wellness" && "bg-[hsl(var(--wellness))]",
                stat.colorScheme === "power" && "bg-[hsl(var(--power))]",
                stat.colorScheme === "negative" && "bg-destructive"
              )}
            />
            
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div 
                className={cn(
                  "p-2 rounded-lg",
                  stat.colorScheme === "energy" && "bg-accent/10 text-accent",
                  stat.colorScheme === "performance" && "bg-primary/10 text-primary",
                  stat.colorScheme === "wellness" && "bg-[hsl(var(--wellness))]/10 text-[hsl(var(--wellness))]",
                  stat.colorScheme === "power" && "bg-[hsl(var(--power))]/10 text-[hsl(var(--power))]",
                  stat.colorScheme === "negative" && "bg-destructive/10 text-destructive"
                )}
              >
                <stat.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="stat-number text-3xl font-bold mb-1">
                {stat.value}
              </div>
              {stat.description && (
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              )}
              {stat.trend && (
                <p className="text-xs font-medium text-accent mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {stat.trend}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="stat-card-hover border-l-4 border-l-accent glow-green relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 blur-2xl rounded-full" />
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-muted-foreground font-medium">
                Cash Payments
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Physical currency transactions
              </p>
            </div>
            <div className="p-3 rounded-full bg-accent/10">
              <DollarSign className="h-6 w-6 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-number text-4xl font-bold text-accent mb-2">
              AED {stats.totalCash.toFixed(2)}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <p className="text-sm text-muted-foreground">
                {((stats.totalCash / stats.totalRevenue) * 100 || 0).toFixed(1)}% of revenue
              </p>
              <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${((stats.totalCash / stats.totalRevenue) * 100 || 0)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card-hover border-l-4 border-l-primary glow-blue relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl rounded-full" />
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-muted-foreground font-medium">
                Card Payments
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Digital payment transactions
              </p>
            </div>
            <div className="p-3 rounded-full bg-primary/10">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-number text-4xl font-bold text-primary mb-2">
              AED {stats.totalCard.toFixed(2)}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <p className="text-sm text-muted-foreground">
                {((stats.totalCard / stats.totalRevenue) * 100 || 0).toFixed(1)}% of total revenue
              </p>
              <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${((stats.totalCard / stats.totalRevenue) * 100 || 0)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-9 h-auto">
          <TabsTrigger value="overview" className="py-3">Overview</TabsTrigger>
          <TabsTrigger value="analytics" className="py-3">📊 Analytics</TabsTrigger>
          <TabsTrigger value="notifications" className="py-3">🔔 Notifications</TabsTrigger>
          <TabsTrigger value="cafe" className="py-3 data-[state=active]:bg-[hsl(var(--cafe))] data-[state=active]:text-[hsl(var(--cafe-foreground))]">
            ☕ Cafe
          </TabsTrigger>
          <TabsTrigger value="football" className="py-3 data-[state=active]:bg-[hsl(var(--football))] data-[state=active]:text-[hsl(var(--football-foreground))]">
            ⚽ Football
          </TabsTrigger>
          <TabsTrigger value="massage" className="py-3 data-[state=active]:bg-[hsl(var(--massage))] data-[state=active]:text-[hsl(var(--massage-foreground))]">
            💆 Massage
          </TabsTrigger>
          <TabsTrigger value="users" className="py-3">Users</TabsTrigger>
          <TabsTrigger value="corrections" className="py-3">Corrections</TabsTrigger>
          <TabsTrigger value="settings" className="py-3">Settings</TabsTrigger>
        </TabsList>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <ExpiryReminders />
              <MembershipFreezeCard />
            </div>
            <ZoneAnalysis />
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            <EnhancedAnalytics />
            <AdvancedAnalytics />
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-6">
            <NotificationManager />
          </div>
        )}

        {activeTab === "cafe" && (
          <div className="space-y-6">
            <CafeSales />
          </div>
        )}

        {activeTab === "football" && (
          <div className="space-y-6">
            <FootballSales />
          </div>
        )}

        {activeTab === "massage" && (
          <div className="space-y-6">
            <MassageSales />
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-6">
            <UserManagement />
          </div>
        )}

        {activeTab === "corrections" && (
          <div className="space-y-6">
            <FinancialCorrections />
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <SystemSettings />
              <ExcelBackup />
            </div>
          </div>
        )}
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
