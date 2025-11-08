import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Printer, Users, TrendingUp } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { PrintablePTReport } from "@/components/PrintablePTReport";

interface PTSession {
  id: string;
  member_name: string;
  phone_number: string;
  subscription_plan: string;
  amount: number;
  payment_method: string;
  created_at: string;
  start_date: string;
  expiry_date: string;
  member_notes?: string | null;
  service_notes?: string | null;
}

interface CoachSummary {
  coachName: string;
  totalAmount: number;
  sessionCount: number;
  sessions: PTSession[];
}

const PTReport = () => {
  const [reportType, setReportType] = useState<"daily" | "monthly">("monthly");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [coachSummaries, setCoachSummaries] = useState<CoachSummary[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCoaches: 0,
    totalSessions: 0,
  });

  useEffect(() => {
    fetchPTReports();
  }, [selectedDate, reportType]);

  const fetchPTReports = async () => {
    let startDate: Date;
    let endDate: Date;

    if (reportType === "daily") {
      startDate = startOfDay(selectedDate);
      endDate = endOfDay(selectedDate);
    } else {
      startDate = startOfMonth(selectedDate);
      endDate = endOfMonth(selectedDate);
    }

    // Format dates for accurate PostgreSQL comparison
    const startDateStr = format(startDate, "yyyy-MM-dd");
    const endDateStr = format(endDate, "yyyy-MM-dd");

    // Build query with timezone-aware date filtering
    let paymentsQuery = supabase
      .from("payment_receipts")
      .select(`
        *,
        members!inner(full_name, phone_number, notes),
        member_services!inner(
          coach_name,
          subscription_plan,
          start_date,
          expiry_date,
          notes
        )
      `)
      .eq("zone", "pt")
      .eq("member_services.zone", "pt");

    if (reportType === "daily") {
      paymentsQuery = paymentsQuery
        .gte("created_at", `${startDateStr}T00:00:00`)
        .lt("created_at", `${startDateStr}T23:59:59.999`);
    } else {
      paymentsQuery = paymentsQuery
        .gte("created_at", `${startDateStr}T00:00:00`)
        .lte("created_at", `${endDateStr}T23:59:59.999`);
    }

    const { data: ptPayments, error } = await paymentsQuery.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching PT payments:", error);
      return;
    }

    if (!ptPayments || ptPayments.length === 0) {
      setCoachSummaries([]);
      setStats({ totalRevenue: 0, totalCoaches: 0, totalSessions: 0 });
      return;
    }

    // Map payments directly to sessions (no additional fetches needed)
    const sessionsWithCoach: PTSession[] = ptPayments.map(payment => {
      const service = Array.isArray(payment.member_services) 
        ? payment.member_services[0] 
        : payment.member_services;
      
      return {
        id: payment.id,
        member_name: payment.members?.full_name || "Unknown",
        phone_number: payment.members?.phone_number || "",
        subscription_plan: service?.subscription_plan || "N/A",
        amount: Number(payment.amount),
        payment_method: payment.payment_method,
        created_at: payment.created_at,
        start_date: service?.start_date || "",
        expiry_date: service?.expiry_date || "",
        member_notes: payment.members?.notes,
        service_notes: service?.notes,
      };
    });

    // Group sessions by coach name
    const coachGroups: Record<string, CoachSummary> = {};

    for (const session of sessionsWithCoach) {
      // Get coach name directly from the already-fetched data
      const payment = ptPayments.find(p => p.id === session.id);
      const service = Array.isArray(payment?.member_services) 
        ? payment?.member_services[0] 
        : payment?.member_services;
      
      const coachName = service?.coach_name || "Unassigned";

      if (!coachGroups[coachName]) {
        coachGroups[coachName] = {
          coachName,
          totalAmount: 0,
          sessionCount: 0,
          sessions: [],
        };
      }

      coachGroups[coachName].totalAmount += session.amount;
      coachGroups[coachName].sessionCount += 1;
      coachGroups[coachName].sessions.push(session);
    }

    // Convert to array and sort by total amount (descending)
    const summaries = Object.values(coachGroups).sort(
      (a, b) => b.totalAmount - a.totalAmount
    );

    setCoachSummaries(summaries);

    // Calculate overall stats
    const totalRevenue = summaries.reduce((sum, coach) => sum + coach.totalAmount, 0);
    const totalCoaches = summaries.length;
    const totalSessions = summaries.reduce((sum, coach) => sum + coach.sessionCount, 0);

    setStats({ totalRevenue, totalCoaches, totalSessions });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h1 className="text-3xl font-bold">PT Coach Commission Report</h1>
        <p className="text-muted-foreground">Track individual PT sessions and coach commissions</p>
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
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Button onClick={handlePrint} className="ml-auto">
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total PT Revenue</CardTitle>
              <DollarSign className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                AED {stats.totalRevenue.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Number of Coaches</CardTitle>
              <Users className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">
                {stats.totalCoaches}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.totalSessions}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coach Breakdown Table */}
        {coachSummaries.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Coach Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {coachSummaries.map((coach) => (
                  <div key={coach.coachName} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Coach: {coach.coachName}</h3>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {coach.sessionCount} sessions
                        </div>
                        <div className="text-xl font-bold text-primary">
                          AED {coach.totalAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b">
                          <tr>
                            <th className="text-left p-2">Member</th>
                            <th className="text-left p-2">Plan</th>
                            <th className="text-right p-2">Amount</th>
                            <th className="text-left p-2">Date</th>
                            <th className="text-left p-2">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {coach.sessions.map((session) => (
                            <tr key={session.id} className="border-b">
                              <td className="p-2">{session.member_name}</td>
                              <td className="p-2">{session.subscription_plan.replace(/_/g, ' ')}</td>
                              <td className="p-2 text-right font-medium">
                                {session.amount.toFixed(2)}
                              </td>
                              <td className="p-2">
                                {format(new Date(session.created_at), "MMM dd, yyyy")}
                              </td>
                              <td className="p-2 text-xs">
                                {[session.member_notes, session.service_notes]
                                  .filter(Boolean)
                                  .join(' | ') || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No PT sessions found for the selected date range
            </CardContent>
          </Card>
        )}
      </div>

      {/* Printable Report */}
      <div className="print-only">
        <PrintablePTReport
          startDate={reportType === "daily" ? selectedDate : startOfMonth(selectedDate)}
          endDate={reportType === "daily" ? selectedDate : endOfMonth(selectedDate)}
          coachSummaries={coachSummaries}
          totalRevenue={stats.totalRevenue}
          totalCoaches={stats.totalCoaches}
          totalSessions={stats.totalSessions}
          reportType={reportType}
        />
      </div>
    </div>
  );
};

export default PTReport;