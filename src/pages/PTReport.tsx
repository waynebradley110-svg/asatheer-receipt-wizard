import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Printer, Users, TrendingUp, CalendarIcon, Activity, UserCheck, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { PrintablePTReport } from "@/components/PrintablePTReport";
import { Badge } from "@/components/ui/badge";

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
  coach_name?: string;
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
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCoaches: 0,
    totalSessions: 0,
  });

  useEffect(() => {
    fetchPTReports();
  }, [selectedDate, reportType]);

  const normalizeCoachName = (name: string): string => {
    if (!name) return "Unassigned";
    const cleaned = name.toLowerCase()
      .replace(/^coach\s+/i, '')
      .trim();
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };

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

    // Fetch PT payments with member and coach details
    const { data: ptPayments, error } = await supabase
      .from("payment_receipts")
      .select(`
        *,
        members!inner(full_name, phone_number, notes)
      `)
      .eq("zone", "pt")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching PT payments:", error);
      return;
    }

    if (!ptPayments || ptPayments.length === 0) {
      setCoachSummaries([]);
      setStats({ totalRevenue: 0, totalCoaches: 0, totalSessions: 0 });
      return;
    }

    // For each payment, fetch the corresponding member_service to get coach name
    const sessionsWithCoach: PTSession[] = [];
    
    for (const payment of ptPayments) {
      const { data: service } = await supabase
        .from("member_services")
        .select("coach_name, subscription_plan, start_date, expiry_date, notes")
        .eq("member_id", payment.member_id)
        .eq("zone", "pt")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

        sessionsWithCoach.push({
          id: payment.id,
          member_name: payment.members?.full_name || "Unknown",
          phone_number: payment.members?.phone_number || "",
          subscription_plan: service?.subscription_plan || payment.subscription_plan || "N/A",
          amount: Number(payment.amount),
          payment_method: payment.payment_method,
          created_at: payment.created_at,
          start_date: service?.start_date || "",
          expiry_date: service?.expiry_date || "",
          member_notes: payment.members?.notes,
          service_notes: service?.notes,
          coach_name: service?.coach_name,
        });
    }

    // Group sessions by normalized coach name
    const coachGroups: Record<string, CoachSummary> = {};

    for (const session of sessionsWithCoach) {
      const rawCoachName = session.coach_name || "Unassigned";
      const normalizedCoach = normalizeCoachName(rawCoachName);

      if (!coachGroups[normalizedCoach]) {
        coachGroups[normalizedCoach] = {
          coachName: normalizedCoach,
          totalAmount: 0,
          sessionCount: 0,
          sessions: [],
        };
      }

      coachGroups[normalizedCoach].totalAmount += session.amount;
      coachGroups[normalizedCoach].sessionCount += 1;
      coachGroups[normalizedCoach].sessions.push(session);
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
    setShowPrintPreview(true);
  };

  return (
    <div className="space-y-6 dashboard-section">
      <div className="no-print relative overflow-hidden rounded-xl bg-gradient-to-r from-accent/10 via-primary/5 to-transparent p-8 border border-border/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 border-2 border-accent/20">
            <UserCheck className="h-8 w-8 text-accent" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              PT Coach Commission Report
            </h1>
            <p className="text-muted-foreground text-lg mt-1">
              Track individual PT sessions and coach commissions
            </p>
          </div>
        </div>
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
          <Card className="border-l-4 border-l-primary/30 stat-card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total PT Revenue</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary stat-number">
                AED {stats.totalRevenue.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent/30 stat-card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Number of Coaches</CardTitle>
              <div className="p-2 rounded-lg bg-accent/10">
                <Users className="h-5 w-5 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent stat-number">
                {stats.totalCoaches}
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[hsl(var(--wellness))]/30 stat-card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <div className="p-2 rounded-lg bg-[hsl(var(--wellness))]/10">
                <Activity className="h-5 w-5 text-[hsl(var(--wellness))]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[hsl(var(--wellness))] stat-number">
                {stats.totalSessions}
              </div>
            </CardContent>
          </Card>
        </div>


      {/* Individual Coach Performance Cards */}
      {coachSummaries.filter(coach => coach.coachName !== "Unassigned").length > 0 && (
        <div className="no-print">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-semibold">Coach Performance Overview</h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            {coachSummaries
              .filter(coach => coach.coachName !== "Unassigned")
              .map((coach, index) => {
                const coachColors = [
                  { color: "accent", icon: "bg-accent/10", border: "border-l-accent", glow: "glow-green" },
                  { color: "primary", icon: "bg-primary/10", border: "border-l-primary", glow: "glow-blue" },
                  { color: "[hsl(var(--wellness))]", icon: "bg-[hsl(var(--wellness))]/10", border: "border-l-[hsl(var(--wellness))]", glow: "" },
                ];
                const style = coachColors[index % 3];
                
                return (
                  <Card 
                    key={coach.coachName}
                    className={cn(
                      "stat-card-hover relative overflow-hidden border-l-4",
                      style.border,
                      style.glow
                    )}
                  >
                    <div className={cn(
                      "absolute top-0 right-0 w-32 h-32 opacity-5 blur-2xl rounded-full",
                      `bg-${style.color}`
                    )} />
                    
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <div>
                        <CardTitle className="text-lg font-semibold">
                          🏋️ Coach {coach.coachName}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          Personal Trainer
                        </p>
                      </div>
                      <div className={cn("p-3 rounded-full", style.icon)}>
                        <UserCheck className={cn("h-6 w-6", `text-${style.color}`)} />
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                        <div className={cn(
                          "stat-number text-3xl font-bold",
                          `text-${style.color}`
                        )}>
                          AED {coach.totalAmount.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Sessions</span>
                        </div>
                        <span className="text-lg font-bold">{coach.sessionCount}</span>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Avg per session:</span>
                        <span className="font-semibold">
                          AED {(coach.totalAmount / coach.sessionCount).toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{coach.sessions.length} {coach.sessions.length === 1 ? 'client' : 'clients'}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* Separator */}
      {coachSummaries.filter(coach => coach.coachName !== "Unassigned").length > 0 && (
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      )}

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
                    <div className={cn(
                      "flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-lg border-l-4 -m-4 mb-4",
                      coach.coachName === "Unassigned" 
                        ? "bg-muted/30 border-l-muted-foreground/30" 
                        : "bg-accent/5 border-l-accent"
                    )}>
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "flex items-center justify-center w-12 h-12 rounded-full",
                          coach.coachName === "Unassigned" 
                            ? "bg-muted" 
                            : "bg-accent/10 border-2 border-accent/20"
                        )}>
                          <UserCheck className={cn(
                            "h-6 w-6",
                            coach.coachName === "Unassigned" ? "text-muted-foreground" : "text-accent"
                          )} />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold">
                            {coach.coachName === "Unassigned" ? "⚠️ Unassigned Sessions" : `🏋️ Coach ${coach.coachName}`}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {coach.sessionCount} {coach.sessionCount === 1 ? 'session' : 'sessions'} • {coach.sessions.length} {coach.sessions.length === 1 ? 'client' : 'clients'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Earnings</p>
                        <p className={cn(
                          "text-3xl font-bold",
                          coach.coachName === "Unassigned" ? "text-muted-foreground" : "text-accent"
                        )}>
                          AED {coach.totalAmount.toFixed(2)}
                        </p>
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

      {/* Print Preview Portal */}
      {showPrintPreview && createPortal(
        <div className="fixed inset-0 z-[99999] bg-white overflow-auto print-root">
          <div className="no-print sticky top-0 bg-white border-b p-4 flex justify-between items-center shadow-sm z-10">
            <span className="font-semibold text-lg text-foreground">PT Coach Commission Report Preview</span>
            <div className="flex gap-2">
              <Button onClick={() => window.print()} className="bg-accent hover:bg-accent/90">
                <Printer className="h-4 w-4 mr-2" />
                Print Now
              </Button>
              <Button variant="outline" onClick={() => setShowPrintPreview(false)}>
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
          <PrintablePTReport
            startDate={reportType === "daily" ? selectedDate : startOfMonth(selectedDate)}
            endDate={reportType === "daily" ? selectedDate : endOfMonth(selectedDate)}
            coachSummaries={coachSummaries}
            totalRevenue={stats.totalRevenue}
            totalCoaches={stats.totalCoaches}
            totalSessions={stats.totalSessions}
            reportType={reportType}
          />
        </div>,
        document.body
      )}
    </div>
  );
};

export default PTReport;