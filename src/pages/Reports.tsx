import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign } from "lucide-react";

const Reports = () => {
  const [stats, setStats] = useState({
    totalCash: 0,
    totalCard: 0,
    totalOnline: 0,
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    const { data: payments } = await supabase
      .from("payment_receipts")
      .select("amount, payment_method");

    const totalCash = payments?.filter(p => p.payment_method === 'cash')
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    const totalCard = payments?.filter(p => p.payment_method === 'card')
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    const totalOnline = payments?.filter(p => p.payment_method === 'online')
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    setStats({ totalCash, totalCard, totalOnline });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financial Reports</h1>
        <p className="text-muted-foreground">View sales and payment reports</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cash Payments</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              AED {stats.totalCash.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Card Payments</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              AED {stats.totalCard.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Online Payments</CardTitle>
            <DollarSign className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              AED {stats.totalOnline.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            AED {(stats.totalCash + stats.totalCard + stats.totalOnline).toFixed(2)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;