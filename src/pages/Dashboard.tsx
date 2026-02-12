import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import AdminDashboard from "./AdminDashboard";
import ReceptionistDashboard from "./ReceptionistDashboard";
import AccountsDashboard from "./AccountsDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, UserX, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const { isAdmin, isReceptionist, isAccounts, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Role-based dashboard rendering
  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isReceptionist) {
    return <ReceptionistDashboard />;
  }

  if (isAccounts) {
    return <AccountsDashboard />;
  }

  // Default dashboard for users without specific roles
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome to Asatheer Sports Academy</h1>
        <p className="text-muted-foreground">Dashboard</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Please contact an administrator to assign you a role for access to dashboard features.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const LegacyDashboard = () => {
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    expiredMembers: 0,
    newThisWeek: 0,
    totalCash: 0,
    totalCard: 0,
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
      .select("amount, payment_method, members!inner(is_vip)")
      .eq("members.is_vip", false);

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
    });
  };

  const statCards = [
    {
      title: "Total Members",
      value: stats.totalMembers,
      icon: Users,
      color: "text-primary",
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
      color: "text-destructive",
    },
    {
      title: "New This Week",
      value: stats.newThisWeek,
      icon: TrendingUp,
      color: "text-accent",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">Welcome to Asatheer Sports Academy</p>
      </div>

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
            <div className="text-3xl font-bold text-primary">
              AED {stats.totalCard.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
export { LegacyDashboard };