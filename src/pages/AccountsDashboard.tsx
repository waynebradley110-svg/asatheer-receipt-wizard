import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, TrendingDown, Receipt, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

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
      colorScheme: "energy",
      description: "All-time earnings",
    },
    {
      title: "Today's Revenue",
      value: `AED ${stats.todayRevenue.toFixed(2)}`,
      icon: TrendingUp,
      colorScheme: "performance",
      description: "Today's earnings",
    },
    {
      title: "Total Expenses",
      value: `AED ${stats.totalExpenses.toFixed(2)}`,
      icon: TrendingDown,
      colorScheme: "negative",
      description: "All-time costs",
    },
    {
      title: "Net Income",
      value: `AED ${stats.netIncome.toFixed(2)}`,
      icon: Receipt,
      colorScheme: stats.netIncome >= 0 ? "energy" : "negative",
      description: "Revenue - Expenses",
    },
  ];

  return (
    <div className="space-y-6 dashboard-section">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-accent/5 to-transparent p-8 border border-border/50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 border-2 border-accent/20">
              <DollarSign className="h-8 w-8 text-accent" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Financial Hub
              </h1>
              <p className="text-muted-foreground text-lg mt-1">
                Revenue tracking and financial reporting
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Net Income</p>
            <p className={cn(
              "text-3xl font-bold",
              stats.netIncome >= 0 ? "text-accent" : "text-destructive"
            )}>
              AED {stats.netIncome.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card 
            key={stat.title}
            className={cn(
              "stat-card-hover relative overflow-hidden",
              "border-l-4",
              stat.colorScheme === "energy" && "border-l-accent glow-green",
              stat.colorScheme === "performance" && "border-l-primary glow-blue",
              stat.colorScheme === "negative" && "border-l-destructive"
            )}
          >
            <div 
              className={cn(
                "absolute top-0 right-0 w-32 h-32 opacity-5 blur-2xl rounded-full",
                stat.colorScheme === "energy" && "bg-accent",
                stat.colorScheme === "performance" && "bg-primary",
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
                {((stats.totalCard / stats.totalRevenue) * 100 || 0).toFixed(1)}% of revenue
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
