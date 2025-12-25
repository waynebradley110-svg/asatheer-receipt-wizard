import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Trash2, FileDown, Printer, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { PrintableFootballReport } from "./PrintableFootballReport";
import html2canvas from "html2canvas";

interface FootballSale {
  id: string;
  sale_date: string;
  description: string;
  total_amount: number;
  cash_amount: number;
  card_amount: number;
  cashier_name: string | null;
  notes: string | null;
  created_at: string;
}

export function FootballSales() {
  const [sales, setSales] = useState<FootballSale[]>([]);
  const [formData, setFormData] = useState({
    description: "",
    cash_amount: "",
    card_amount: "",
    cashier_name: "",
    notes: "",
    sale_date: format(new Date(), "yyyy-MM-dd"),
  });
  const [dailyTotals, setDailyTotals] = useState({ cash: 0, card: 0, total: 0 });
  const [deletingSale, setDeletingSale] = useState<string | null>(null);
  const { isAdmin } = useAuth();
  
  // Date filter state
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [showPrintView, setShowPrintView] = useState(false);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from("football_sales")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast.error("Failed to load football sales");
      return;
    }

    setSales(data || []);
    calculateDailyTotals(data || []);
  };

  const calculateDailyTotals = (salesData: FootballSale[]) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const todaySales = salesData.filter(s => s.sale_date === today);
    
    const cash = todaySales.reduce((sum, s) => sum + Number(s.cash_amount || 0), 0);
    const card = todaySales.reduce((sum, s) => sum + Number(s.card_amount || 0), 0);

    setDailyTotals({ cash, card, total: cash + card });
  };

  // Filtered sales based on date range
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const saleDate = parseISO(sale.sale_date);
      return isWithinInterval(saleDate, { start: dateRange.from, end: dateRange.to });
    });
  }, [sales, dateRange]);

  // Calculate totals for filtered sales
  const filteredTotals = useMemo(() => {
    const cash = filteredSales.reduce((sum, s) => sum + Number(s.cash_amount || 0), 0);
    const card = filteredSales.reduce((sum, s) => sum + Number(s.card_amount || 0), 0);
    return { cash, card, total: cash + card };
  }, [filteredSales]);

  const handleExportPDF = async () => {
    const element = document.getElementById('football-print-report');
    if (!element) {
      toast.error("Report not ready");
      return;
    }

    try {
      toast.loading("Generating PDF...");
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `football-sales-${format(dateRange.from, 'yyyy-MM-dd')}-to-${format(dateRange.to, 'yyyy-MM-dd')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.dismiss();
      toast.success("Report exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.dismiss();
      toast.error("Failed to export report");
    }
  };

  const handlePrint = () => {
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
      setShowPrintView(false);
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cashAmount = parseFloat(formData.cash_amount || "0");
    const cardAmount = parseFloat(formData.card_amount || "0");

    if (!formData.description.trim()) {
      toast.error("Please enter description");
      return;
    }

    if (cashAmount === 0 && cardAmount === 0) {
      toast.error("Please enter at least cash or card amount");
      return;
    }

    try {
      console.log("[FOOTBALL SALES] Starting submission at", new Date().toISOString());
      console.log("[FOOTBALL SALES] Component: FootballSales.tsx");
      console.log("[FOOTBALL SALES] Target table: football_sales");
      
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast.error("Authentication required. Please log in.");
        console.error("[FOOTBALL SALES] Auth error:", authError);
        return;
      }

      console.log("[FOOTBALL SALES] User authenticated:", user.email);

      const totalAmount = cashAmount + cardAmount;

      const saleData = {
        description: formData.description.trim(),
        cash_amount: cashAmount,
        card_amount: cardAmount,
        cashier_name: formData.cashier_name?.trim() || null,
        notes: formData.notes?.trim() || null,
        sale_date: formData.sale_date,
        created_by: user.email || "system",
      };

      console.log("[FOOTBALL SALES] Inserting into football_sales table:", saleData);

      const { error } = await supabase.from("football_sales").insert(saleData as any);

      if (error) {
        console.error("[FOOTBALL SALES] ❌ Database error:", error);
        throw error;
      }

      console.log("[FOOTBALL SALES] ✅ Sale recorded successfully to football_sales table");
      toast.success("⚽ Football court sale recorded successfully!");
      setFormData({
        description: "",
        cash_amount: "",
        card_amount: "",
        cashier_name: formData.cashier_name,
        notes: "",
        sale_date: format(new Date(), "yyyy-MM-dd"),
      });
      fetchSales();
    } catch (error) {
      console.error("Error recording sale:", error);
      toast.error("Failed to record sale. Please try again.");
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    try {
      const { error } = await supabase
        .from('football_sales')
        .delete()
        .eq('id', saleId);
      
      if (error) throw error;
      
      toast.success("Sale deleted successfully");
      fetchSales();
      setDeletingSale(null);
    } catch (error) {
      console.error('Error deleting sale:', error);
      toast.error("Failed to delete sale");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-[hsl(var(--football-light))] border-[hsl(var(--football))]">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--football))]">
                <Trophy className="h-6 w-6 text-[hsl(var(--football-foreground))]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">⚽ Football Court Sales</h2>
                <p className="text-muted-foreground">Record football court rentals and tournament entries</p>
              </div>
            </div>
            <div className="flex items-center gap-2 no-print">
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Daily Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Cash</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dailyTotals.cash.toFixed(2)} AED
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Card</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {dailyTotals.card.toFixed(2)} AED
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {dailyTotals.total.toFixed(2)} AED
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Sale Form */}
      <Card className="border-[hsl(var(--football))]/30 bg-[hsl(var(--football-light))]/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[hsl(var(--football))]" />
            Record New Football Court Sale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sale_date">Date *</Label>
                <Input
                  id="sale_date"
                  type="date"
                  value={formData.sale_date}
                  onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Court Rental - 2 hours, Tournament Entry"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cash_amount">Cash Amount (AED)</Label>
                <Input
                  id="cash_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cash_amount}
                  onChange={(e) => setFormData({ ...formData, cash_amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="card_amount">Card Amount (AED)</Label>
                <Input
                  id="card_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.card_amount}
                  onChange={(e) => setFormData({ ...formData, card_amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>Total Amount</Label>
                <div className="text-2xl font-bold text-primary">
                  {(parseFloat(formData.cash_amount || "0") + parseFloat(formData.card_amount || "0")).toFixed(2)} AED
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cashier_name">Cashier Name</Label>
                <Input
                  id="cashier_name"
                  value={formData.cashier_name}
                  onChange={(e) => setFormData({ ...formData, cashier_name: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-[hsl(var(--football))] hover:bg-[hsl(var(--football))]/90 text-[hsl(var(--football-foreground))]">
              <Trophy className="h-4 w-4 mr-2" />
              Record Football Court Sale
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sales History */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Sales History</CardTitle>
            <div className="flex items-center gap-2 no-print">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to });
                      } else if (range?.from) {
                        setDateRange({ from: range.from, to: range.from });
                      }
                    }}
                    numberOfMonths={2}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Cash</TableHead>
                <TableHead>Card</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Notes</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{format(new Date(sale.sale_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{sale.description}</TableCell>
                  <TableCell className="font-semibold text-green-600">
                    {Number(sale.cash_amount || 0).toFixed(2)} AED
                  </TableCell>
                  <TableCell className="font-semibold text-blue-600">
                    {Number(sale.card_amount || 0).toFixed(2)} AED
                  </TableCell>
                  <TableCell className="font-semibold">
                    {Number(sale.total_amount).toFixed(2)} AED
                  </TableCell>
                  <TableCell>{sale.cashier_name || "-"}</TableCell>
                  <TableCell>{sale.notes || "-"}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Sale</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this sale record? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteSale(sale.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filteredSales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No sales recorded for the selected period
                  </TableCell>
                </TableRow>
              )}
              {/* Totals Row */}
              {filteredSales.length > 0 && (
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={2}>Period Total ({filteredSales.length} sales)</TableCell>
                  <TableCell className="text-green-600">{filteredTotals.cash.toFixed(2)} AED</TableCell>
                  <TableCell className="text-blue-600">{filteredTotals.card.toFixed(2)} AED</TableCell>
                  <TableCell>{filteredTotals.total.toFixed(2)} AED</TableCell>
                  <TableCell colSpan={isAdmin ? 3 : 2}></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Hidden Print View */}
      {showPrintView && (
        <div id="football-print-report" className="fixed inset-0 bg-white z-50 overflow-auto">
          <PrintableFootballReport
            startDate={dateRange.from}
            endDate={dateRange.to}
            sales={filteredSales}
            totalCash={filteredTotals.cash}
            totalCard={filteredTotals.card}
            totalRevenue={filteredTotals.total}
          />
        </div>
      )}

      {/* Hidden element for PDF export */}
      <div id="football-print-report" className="hidden">
        <PrintableFootballReport
          startDate={dateRange.from}
          endDate={dateRange.to}
          sales={filteredSales}
          totalCash={filteredTotals.cash}
          totalCard={filteredTotals.card}
          totalRevenue={filteredTotals.total}
        />
      </div>
    </div>
  );
}
