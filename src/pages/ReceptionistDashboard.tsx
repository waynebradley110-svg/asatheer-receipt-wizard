import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, Clock, CalendarCheck } from "lucide-react";
import { ExpiryReminders } from "@/components/ExpiryReminders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CafeSales } from "@/components/CafeSales";

const ReceptionistDashboard = () => {
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
      color: "text-blue-600",
    },
    {
      title: "Active Members",
      value: stats.activeMembers,
      icon: UserCheck,
      color: "text-green-600",
    },
    {
      title: "Today's Attendance",
      value: stats.todayAttendance,
      icon: Clock,
      color: "text-purple-600",
    },
    {
      title: "Expiring This Week",
      value: stats.expiringThisWeek,
      icon: CalendarCheck,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Receptionist Dashboard</h1>
        <p className="text-muted-foreground">Member management and attendance tracking</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cafe">Cafe Sales</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
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
        </TabsContent>

        <TabsContent value="cafe">
          <CafeSales />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReceptionistDashboard;
