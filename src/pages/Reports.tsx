import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Printer } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { PrintableSalesReport } from "@/components/PrintableSalesReport";

interface ZoneSummary {
  zone: string;
  revenue: number;
  cash: number;
  card: number;
  online: number;
  salesCount: number;
  transactions: any[];
}

const Reports = () => {
  const [stats, setStats] = useState({
    totalCash: 0,
    totalCard: 0,
    totalOnline: 0,
  });
  const [reportType, setReportType] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [zoneSummaries, setZoneSummaries] = useState<ZoneSummary[]>([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [selectedDate, reportType]);

  const fetchReports = async () => {
    let startDate: Date;
    let endDate: Date;

    if (reportType === "daily") {
      startDate = startOfDay(selectedDate);
      endDate = endOfDay(selectedDate);
    } else {
      startDate = startOfMonth(selectedDate);
      endDate = endOfMonth(selectedDate);
    }

    const { data: payments } = await supabase
      .from("payment_receipts")
      .select("*, members(full_name)")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    const totalCash = payments?.filter(p => p.payment_method === 'cash')
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    const totalCard = payments?.filter(p => p.payment_method === 'card')
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    const totalOnline = payments?.filter(p => p.payment_method === 'online')
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    setStats({ totalCash, totalCard, totalOnline });

    // Group by zone
    const zoneGroups = payments?.reduce((acc, payment) => {
      const zone = payment.zone || 'Unknown';
      if (!acc[zone]) {
        acc[zone] = {
          zone,
          revenue: 0,
          cash: 0,
          card: 0,
          online: 0,
          salesCount: 0,
          transactions: [],
        };
      }
      acc[zone].revenue += Number(payment.amount);
      acc[zone].salesCount += 1;
      if (payment.payment_method === 'cash') acc[zone].cash += Number(payment.amount);
      if (payment.payment_method === 'card') acc[zone].card += Number(payment.amount);
      if (payment.payment_method === 'online') acc[zone].online += Number(payment.amount);
      acc[zone].transactions.push({
        ...payment,
        member_name: payment.members?.full_name,
      });
      return acc;
    }, {} as Record<string, ZoneSummary>) || {};

    setZoneSummaries(Object.values(zoneGroups));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h1 className="text-3xl font-bold">Financial Reports</h1>
        <p className="text-muted-foreground">View sales and payment reports</p>
      </div>

      <div className="no-print space-y-4">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex gap-2">
            <Button
              variant={reportType === "daily" ? "default" : "outline"}
              onClick={() => setReportType("daily")}
            >
              Daily Report
            </Button>
            <Button
              variant={reportType === "monthly" ? "default" : "outline"}
              onClick={() => setReportType("monthly")}
            >
              Monthly Report
            </Button>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
              />
            </PopoverContent>
          </Popover>

          <Button onClick={handlePrint} className="ml-auto">
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
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

      {/* Printable Report */}
      <div className="print-only">
        <PrintableSalesReport
          startDate={reportType === "daily" ? selectedDate : startOfMonth(selectedDate)}
          endDate={reportType === "daily" ? selectedDate : endOfMonth(selectedDate)}
          zoneSummaries={zoneSummaries}
          totalRevenue={stats.totalCash + stats.totalCard + stats.totalOnline}
          totalCash={stats.totalCash}
          totalCard={stats.totalCard}
          totalOnline={stats.totalOnline}
          reportType={reportType}
        />
      </div>
    </div>
  );
};

export default Reports;