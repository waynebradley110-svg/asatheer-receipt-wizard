import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, Clock, CalendarCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExpiryReminders } from "@/components/ExpiryReminders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CafeSales } from "@/components/CafeSales";
import { FootballSales } from "@/components/FootballSales";
import { MassageSales } from "@/components/MassageSales";

const ReceptionistDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    todayAttendance: 0,
    expiringThisWeek: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));

    const { data: members } = await supabase
      .from("members")
      .select("*, member_services(*)");

    const { data: attendance } = await supabase
      .from("attendance")
      .select("id")
      .gte("check_in_time", startOfDay.toISOString());

    const activeMembersCount = members?.filter(m => 
      m.member_services?.some((s: any) => 
        new Date(s.expiry_date) >= new Date() && s.is_active
      )
    ).length || 0;

    const expiringCount = members?.filter(m =>
      m.member_services?.some((s: any) => {
        const expiryDate = new Date(s.expiry_date);
        return expiryDate >= today && expiryDate <= weekFromNow && s.is_active;
      })
    ).length || 0;

    setStats({
      totalMembers: members?.length || 0,
      activeMembers: activeMembersCount,
      todayAttendance: attendance?.length || 0,
      expiringThisWeek: expiringCount,
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
      description: "Currently active",
      trend: stats.totalMembers > 0 
        ? `${((stats.activeMembers / stats.totalMembers) * 100).toFixed(0)}% active`
        : null,
    },
    {
      title: "Today's Attendance",
      value: stats.todayAttendance,
      icon: Clock,
      colorScheme: "wellness",
      description: "Check-ins today",
    },
    {
      title: "Expiring This Week",
      value: stats.expiringThisWeek,
      icon: CalendarCheck,
      colorScheme: "power",
      description: "Needs renewal",
    },
  ];

  return (
    <div className="space-y-6 dashboard-section">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-accent/10 via-primary/5 to-transparent p-8 border border-border/50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 border-2 border-accent/20">
              <Users className="h-8 w-8 text-accent" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Reception Hub
              </h1>
              <p className="text-muted-foreground text-lg mt-1">
                Member services and attendance tracking
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button size="lg" className="bg-accent hover:bg-accent/90">
              <UserCheck className="mr-2 h-5 w-5" />
              Quick Check-in
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cafe">Cafe Sales</TabsTrigger>
          <TabsTrigger value="football">Football Court</TabsTrigger>
          <TabsTrigger value="massage">Massage</TabsTrigger>
        </TabsList>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat) => (
                <Card 
                  key={stat.title}
                  className={cn(
                    "stat-card-hover relative overflow-hidden",
                    "border-l-4",
                    stat.colorScheme === "energy" && "border-l-accent glow-green",
                    stat.colorScheme === "performance" && "border-l-primary glow-blue",
                    stat.colorScheme === "wellness" && "border-l-[hsl(var(--wellness))]",
                    stat.colorScheme === "power" && "border-l-[hsl(var(--power))] glow-orange"
                  )}
                >
                  <div 
                    className={cn(
                      "absolute top-0 right-0 w-32 h-32 opacity-5 blur-2xl rounded-full",
                      stat.colorScheme === "energy" && "bg-accent",
                      stat.colorScheme === "performance" && "bg-primary",
                      stat.colorScheme === "wellness" && "bg-[hsl(var(--wellness))]",
                      stat.colorScheme === "power" && "bg-[hsl(var(--power))]"
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
                        stat.colorScheme === "power" && "bg-[hsl(var(--power))]/10 text-[hsl(var(--power))]"
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

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Use the sidebar to access member registration, attendance tracking, and member management features.
                  </p>
                </CardContent>
              </Card>

              <ExpiryReminders />
            </div>
          </div>
        )}

        {activeTab === "cafe" && (
          <div className="space-y-4">
            <CafeSales />
          </div>
        )}

        {activeTab === "football" && (
          <div className="space-y-4">
            <FootballSales />
          </div>
        )}

        {activeTab === "massage" && (
          <div className="space-y-4">
            <MassageSales />
          </div>
        )}
      </Tabs>
    </div>
  );
};

export default ReceptionistDashboard;
