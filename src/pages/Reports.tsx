import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Printer, CalendarIcon, TrendingUp, BarChart3, CreditCard, Banknote, Edit } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { PrintableSalesReport } from "@/components/PrintableSalesReport";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

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
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalCash: 0,
    totalCard: 0,
    totalOnline: 0,
  });
  const [reportType, setReportType] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [zoneSummaries, setZoneSummaries] = useState<ZoneSummary[]>([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [hasData, setHasData] = useState(true);
  const [dateRange, setDateRange] = useState({ start: new Date(), end: new Date() });
  
  // Admin-only editable fields
  const [headerNotes, setHeaderNotes] = useState("");
  const [footerNotes, setFooterNotes] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState("");

  // Zone display name mapping
  const getZoneDisplayName = (zone: string): string => {
    const zoneNames: Record<string, string> = {
      'gym': 'Gym',
      'crossfit': 'CrossFit',
      'football_student': 'Football Academy',
      'football_court': 'Football Court',
      'ladies_gym': 'Ladies Gym',
      'pt': 'Personal Training',
      'cafe': 'Cafe',
      'massage': 'Massage Services',
      'events': 'Custom Events'
    };
    return zoneNames[zone.toLowerCase()] || zone;
  };

  // Zone ordering for consistent display
  const zoneOrder = ['gym', 'crossfit', 'football_student', 'football_court', 'ladies_gym', 'pt', 'cafe', 'massage', 'events'];

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

    setDateRange({ start: startDate, end: endDate });

    // Format dates for PostgreSQL DATE comparison (more accurate than timestamp)
    const startDateStr = format(startDate, "yyyy-MM-dd");
    const endDateStr = format(endDate, "yyyy-MM-dd");

    // Fetch membership payments - using PostgreSQL DATE casting for accurate daily filtering
    let paymentsQuery = supabase
      .from("payment_receipts")
      .select(`
        *,
        members(full_name, notes)
      `);

    if (reportType === "daily") {
      // For daily reports, use exact date match (more accurate)
      paymentsQuery = paymentsQuery
        .gte("created_at", `${startDateStr}T00:00:00`)
        .lt("created_at", `${startDateStr}T23:59:59.999`);
    } else {
      // For monthly reports, use date range
      paymentsQuery = paymentsQuery
        .gte("created_at", `${startDateStr}T00:00:00`)
        .lte("created_at", `${endDateStr}T23:59:59.999`);
    }

    const { data: payments } = await paymentsQuery;

    // Fetch cafe sales using date comparison
    const { data: cafeSales } = await supabase
      .from("cafe_sales")
      .select("*")
      .gte("sale_date", startDateStr)
      .lte("sale_date", endDateStr);

    // Fetch football sales using date comparison
    const { data: footballSales } = await supabase
      .from("football_sales")
      .select("*")
      .gte("sale_date", startDateStr)
      .lte("sale_date", endDateStr);

    // Fetch massage sales using date comparison
    const { data: massageSales } = await supabase
      .from("massage_sales")
      .select("*")
      .gte("sale_date", startDateStr)
      .lte("sale_date", endDateStr);

    // Fetch event registrations using created_at (entry date) for accurate reporting
    const { data: eventRegistrations } = await supabase
      .from("event_registrations")
      .select("*")
      .gte("created_at", `${startDateStr}T00:00:00`)
      .lte("created_at", `${endDateStr}T23:59:59.999`);

    // Calculate totals from membership payments
    let totalCash = payments?.filter(p => p.payment_method === 'cash')
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    let totalCard = payments?.filter(p => p.payment_method === 'card')
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    const totalOnline = payments?.filter(p => p.payment_method === 'online')
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    // Add cafe sales to totals
    const cafeCash = cafeSales?.reduce((sum, s) => sum + Number(s.cash_amount || 0), 0) || 0;
    const cafeCard = cafeSales?.reduce((sum, s) => sum + Number(s.card_amount || 0), 0) || 0;

    // Add football sales to totals
    const footballCash = footballSales?.reduce((sum, s) => sum + Number(s.cash_amount || 0), 0) || 0;
    const footballCard = footballSales?.reduce((sum, s) => sum + Number(s.card_amount || 0), 0) || 0;

    // Add massage sales to totals
    const massageCash = massageSales?.reduce((sum, s) => sum + Number(s.cash_amount || 0), 0) || 0;
    const massageCard = massageSales?.reduce((sum, s) => sum + Number(s.card_amount || 0), 0) || 0;

    // Add event registration sales to totals
    const eventCash = eventRegistrations?.filter(e => e.payment_method === 'cash')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0;
    const eventCard = eventRegistrations?.filter(e => e.payment_method === 'card')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0;
    const eventOnline = eventRegistrations?.filter(e => e.payment_method === 'online')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0;

    totalCash += cafeCash + footballCash + massageCash + eventCash;
    totalCard += cafeCard + footballCard + massageCard + eventCard;
    // FIX: Add eventOnline to totalOnline for correct totals
    const finalOnline = totalOnline + eventOnline;

    setStats({ totalCash, totalCard, totalOnline: finalOnline });

    // Helper function to normalize zone names (map legacy 'football' to 'football_student')
    const normalizeZone = (zone: string): string => {
      const lowerZone = zone.toLowerCase();
      // Map 'football' to 'football_student' to avoid duplicates
      if (lowerZone === 'football') return 'football_student';
      return lowerZone;
    };

    // Group membership payments by zone with display names
    const zoneGroups: Record<string, ZoneSummary> = {};
    
    // Initialize ALL zones with zero values (membership + non-membership)
    const allZones = ['gym', 'crossfit', 'football_student', 'football_court', 'ladies_gym', 'pt', 'cafe', 'massage', 'events'];
    allZones.forEach(zone => {
      zoneGroups[zone] = {
        zone: getZoneDisplayName(zone),
        revenue: 0,
        cash: 0,
        card: 0,
        online: 0,
        salesCount: 0,
        transactions: [],
      };
    });

    // Add actual payment data to zones
    for (const payment of payments || []) {
      const zone = payment.zone || 'gym';
      const zoneLower = normalizeZone(zone);
      
      if (!zoneGroups[zoneLower]) {
        zoneGroups[zoneLower] = {
          zone: getZoneDisplayName(zoneLower),
          revenue: 0,
          cash: 0,
          card: 0,
          online: 0,
          salesCount: 0,
          transactions: [],
        };
      }
      
      zoneGroups[zoneLower].revenue += Number(payment.amount);
      zoneGroups[zoneLower].salesCount += 1;
      if (payment.payment_method === 'cash') zoneGroups[zoneLower].cash += Number(payment.amount);
      if (payment.payment_method === 'card') zoneGroups[zoneLower].card += Number(payment.amount);
      if (payment.payment_method === 'online') zoneGroups[zoneLower].online += Number(payment.amount);
      
      zoneGroups[zoneLower].transactions.push({
        ...payment,
        member_name: payment.members?.full_name,
        member_notes: payment.members?.notes,
      });
    }

    // Update cafe zone data with actual sales
    zoneGroups['cafe'].revenue = cafeCash + cafeCard;
    zoneGroups['cafe'].cash = cafeCash;
    zoneGroups['cafe'].card = cafeCard;
    zoneGroups['cafe'].salesCount = cafeSales?.length || 0;
    zoneGroups['cafe'].transactions = (cafeSales || []).map(sale => ({
      id: sale.id,
      member_id: sale.id,
      amount: sale.amount,
      payment_method: Number(sale.cash_amount) > 0 && Number(sale.card_amount) > 0 
        ? 'mixed' 
        : Number(sale.cash_amount) > 0 ? 'cash' : 'card',
      zone: 'cafe',
      subscription_plan: sale.item_description,
      created_at: sale.sale_date,
      cashier_name: sale.cashier_name,
      member_name: undefined,
      cash_amount: Number(sale.cash_amount || 0),
      card_amount: Number(sale.card_amount || 0),
      notes: sale.notes,
    }));

    // Update football_court zone data with actual sales (ADD to existing payment_receipts data)
    zoneGroups['football_court'].revenue += footballCash + footballCard;
    zoneGroups['football_court'].cash += footballCash;
    zoneGroups['football_court'].card += footballCard;
    zoneGroups['football_court'].salesCount += footballSales?.length || 0;
    zoneGroups['football_court'].transactions.push(...(footballSales || []).map(sale => ({
      id: sale.id,
      member_id: sale.id,
      amount: sale.total_amount,
      payment_method: Number(sale.cash_amount) > 0 && Number(sale.card_amount) > 0 
        ? 'mixed' 
        : Number(sale.cash_amount) > 0 ? 'cash' : 'card',
      zone: 'football_court',
      subscription_plan: sale.description,
      created_at: sale.sale_date,
      cashier_name: sale.cashier_name,
      member_name: undefined,
      cash_amount: Number(sale.cash_amount || 0),
      card_amount: Number(sale.card_amount || 0),
      notes: sale.notes,
    })));

    // Update massage zone data with actual sales
    zoneGroups['massage'].revenue = massageCash + massageCard;
    zoneGroups['massage'].cash = massageCash;
    zoneGroups['massage'].card = massageCard;
    zoneGroups['massage'].salesCount = massageSales?.length || 0;
    zoneGroups['massage'].transactions = (massageSales || []).map(sale => ({
      id: sale.id,
      member_id: sale.id,
      amount: sale.amount,
      payment_method: Number(sale.cash_amount) > 0 && Number(sale.card_amount) > 0 
        ? 'mixed' 
        : Number(sale.cash_amount) > 0 ? 'cash' : 'card',
      zone: 'massage',
      subscription_plan: sale.customer_name,
      created_at: sale.sale_date,
      cashier_name: sale.cashier_name,
      member_name: undefined,
      cash_amount: Number(sale.cash_amount || 0),
      card_amount: Number(sale.card_amount || 0),
      notes: sale.notes,
    }));

    // Update events zone data with actual event registrations
    zoneGroups['events'].revenue = eventCash + eventCard + eventOnline;
    zoneGroups['events'].cash = eventCash;
    zoneGroups['events'].card = eventCard;
    zoneGroups['events'].online = eventOnline;
    zoneGroups['events'].salesCount = eventRegistrations?.length || 0;
    zoneGroups['events'].transactions = (eventRegistrations || []).map(event => ({
      id: event.id,
      member_id: event.member_id,
      amount: event.amount,
      payment_method: event.payment_method,
      zone: 'events',
      subscription_plan: event.event_name,
      created_at: event.created_at,
      cashier_name: event.created_by,
      member_name: event.participant_name,
      cash_amount: event.payment_method === 'cash' ? Number(event.amount || 0) : 0,
      card_amount: event.payment_method === 'card' ? Number(event.amount || 0) : 0,
      notes: event.notes,
    }));

    // Sort zones by predefined order
    const sortedZoneSummaries = zoneOrder
      .map(zoneKey => zoneGroups[zoneKey])
      .filter(zone => zone !== undefined);

    setZoneSummaries(sortedZoneSummaries);
    
    // Check if there's any data
    const totalRevenue = totalCash + totalCard + totalOnline;
    const hasAnyData = totalRevenue > 0 || sortedZoneSummaries.some(z => z.salesCount > 0);
    setHasData(hasAnyData);
    
    // Show warning if no data found
    if (!hasAnyData) {
      toast({
        title: "No data found",
        description: `No sales records found for ${format(startDate, "MMMM dd, yyyy")}. All data is from October 2025 onwards.`,
        variant: "default",
      });
    }
  };

  const handlePrint = () => {
    setShowPrintPreview(true);
  };

  // Trigger print when preview is shown (with sufficient delay for rendering)
  useEffect(() => {
    if (showPrintPreview) {
      const timer = setTimeout(() => {
        window.print();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [showPrintPreview]);

  // Close preview after printing
  useEffect(() => {
    const handleAfterPrint = () => setShowPrintPreview(false);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  return (
    <div className="space-y-6 dashboard-section">
      <div className="no-print relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-accent/5 to-transparent p-8 border border-border/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20">
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Financial Reports
            </h1>
            <p className="text-muted-foreground text-lg mt-1">
              View sales and payment reports across all zones
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
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button onClick={handlePrint} className="ml-auto">
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
        </div>

        {/* Date Range Indicator */}
        <Alert>
          <CalendarIcon className="h-4 w-4" />
          <AlertDescription>
            Viewing {reportType === "daily" ? "Daily" : "Monthly"} Report for:{" "}
            <strong>{format(dateRange.start, "MMM dd, yyyy")}</strong>
            {reportType === "monthly" && (
              <> to <strong>{format(dateRange.end, "MMM dd, yyyy")}</strong></>
            )}
            {!hasData && (
              <span className="block mt-1 text-amber-600 dark:text-amber-500">
                ⚠️ No sales records found for this period. Data is available from October 22, 2025 onwards.
              </span>
            )}
          </AlertDescription>
        </Alert>

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

      {/* Print Preview Portal - renders outside #root for reliable printing */}
      {showPrintPreview && createPortal(
        <div className="fixed inset-0 z-[99999] bg-white overflow-auto print-portal">
          <div className="no-print sticky top-0 bg-white border-b p-4 flex justify-between items-center gap-4 flex-wrap">
            <span className="font-semibold">Print Preview</span>
            
            {/* Admin-only editing controls */}
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <Edit className="h-3 w-3 mr-1" />
                  Admin Edit Mode
                </Badge>
              </div>
            )}
            
            <Button variant="outline" onClick={() => setShowPrintPreview(false)}>
              Close Preview
            </Button>
          </div>
          
          {/* Admin Edit Panel */}
          {isAdmin && (
            <div className="no-print bg-muted/50 border-b p-4 space-y-4">
              <h3 className="font-semibold text-sm">Report Adjustments (Admin Only)</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="headerNotes">Header Notes</Label>
                  <Textarea 
                    id="headerNotes"
                    placeholder="Add notes to appear at the top of the report..."
                    value={headerNotes}
                    onChange={(e) => setHeaderNotes(e.target.value)}
                    className="h-20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="footerNotes">Footer Notes</Label>
                  <Textarea 
                    id="footerNotes"
                    placeholder="Add notes to appear at the bottom of the report..."
                    value={footerNotes}
                    onChange={(e) => setFooterNotes(e.target.value)}
                    className="h-20"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adjustmentAmount">Adjustment Amount (AED)</Label>
                  <Input 
                    id="adjustmentAmount"
                    type="number"
                    placeholder="0.00"
                    value={adjustmentAmount || ""}
                    onChange={(e) => setAdjustmentAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adjustmentReason">Adjustment Reason</Label>
                  <Input 
                    id="adjustmentReason"
                    placeholder="e.g., Refund, Correction, etc."
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
          
          <PrintableSalesReport
            startDate={reportType === "daily" ? selectedDate : startOfMonth(selectedDate)}
            endDate={reportType === "daily" ? selectedDate : endOfMonth(selectedDate)}
            zoneSummaries={zoneSummaries}
            totalRevenue={stats.totalCash + stats.totalCard + stats.totalOnline}
            totalCash={stats.totalCash}
            totalCard={stats.totalCard}
            totalOnline={stats.totalOnline}
            reportType={reportType}
            headerNotes={headerNotes}
            footerNotes={footerNotes}
            adjustment={adjustmentAmount !== 0 ? { amount: adjustmentAmount, reason: adjustmentReason } : undefined}
          />
        </div>,
        document.body
      )}
    </div>
  );
};

export default Reports;