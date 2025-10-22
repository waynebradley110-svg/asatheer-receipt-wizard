import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, TrendingDown, Receipt } from "lucide-react";

const AccountsDashboard = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCash: 0,
    totalCard: 0,
    totalExpenses: 0,
    netIncome: 0,
    todayRevenue: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));

    const { data: payments } = await supabase
      .from("payment_receipts")
      .select("amount, payment_method, created_at");

    const { data: expenses } = await supabase
      .from("expenses")
      .select("amount");

    const totalCash = payments?.filter(p => p.payment_method === 'cash')
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    const totalCard = payments?.filter(p => p.payment_method === 'card')
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    const totalRevenue = totalCash + totalCard;

    const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    const todayRevenue = payments?.filter(p => 
      new Date(p.created_at) >= startOfDay
    ).reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    setStats({
      totalRevenue,
      totalCash,
      totalCard,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      todayRevenue,
    });
  };

  const statCards = [
    {
      title: "Total Revenue",
      value: `AED ${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Today's Revenue",
      value: `AED ${stats.todayRevenue.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-blue-600",
    },
    {
      title: "Total Expenses",
      value: `AED ${stats.totalExpenses.toFixed(2)}`,
      icon: TrendingDown,
      color: "text-red-600",
    },
    {
      title: "Net Income",
      value: `AED ${stats.netIncome.toFixed(2)}`,
      icon: Receipt,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Accounts Dashboard</h1>
        <p className="text-muted-foreground">Financial overview and reporting</p>
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
            <CardTitle>Cash Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              AED {stats.totalCash.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {((stats.totalCash / stats.totalRevenue) * 100 || 0).toFixed(1)}% of total revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Card Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              AED {stats.totalCard.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {((stats.totalCard / stats.totalRevenue) * 100 || 0).toFixed(1)}% of total revenue
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Financial Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Access detailed financial reports, expense tracking, and payment history through the Reports and Expenses sections in the sidebar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountsDashboard;
