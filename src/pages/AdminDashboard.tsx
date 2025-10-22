import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, UserX, TrendingUp, DollarSign, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExpiryReminders } from "@/components/ExpiryReminders";

const AdminDashboard = () => {
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
      color: "text-blue-600",
    },
    {
      title: "Active Members",
      value: stats.activeMembers,
      icon: UserCheck,
      color: "text-green-600",
    },
    {
      title: "Expired Members",
      value: stats.expiredMembers,
      icon: UserX,
      color: "text-red-600",
    },
    {
      title: "New This Week",
      value: stats.newThisWeek,
      icon: TrendingUp,
      color: "text-purple-600",
    },
    {
      title: "Total Revenue",
      value: `AED ${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Full system overview and control</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cash Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              AED {stats.totalCash.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Card Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              AED {stats.totalCard.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Admin Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              As an admin, you have full access to all system features including user management, financial reports, and system configuration.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => toast.info("User management coming soon")}>
                Manage Users
              </Button>
              <Button variant="outline" onClick={() => toast.info("System settings coming soon")}>
                System Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        <ExpiryReminders />
      </div>
    </div>
  );
};

export default AdminDashboard;
