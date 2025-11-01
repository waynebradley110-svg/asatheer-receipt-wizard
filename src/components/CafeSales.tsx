import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Coffee, DollarSign, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";

interface CafeSale {
  id: string;
  sale_date: string;
  item_description: string;
  amount: number;
  cash_amount: number;
  card_amount: number;
  cashier_name: string | null;
  notes: string | null;
  created_at: string;
}

export function CafeSales() {
  const [sales, setSales] = useState<CafeSale[]>([]);
  const [formData, setFormData] = useState({
    item_description: "",
    cash_amount: "",
    card_amount: "",
    cashier_name: "",
    notes: "",
    sale_date: format(new Date(), "yyyy-MM-dd"),
  });
  const [dailyTotals, setDailyTotals] = useState({ cash: 0, card: 0, total: 0 });
  const [deletingSale, setDeletingSale] = useState<string | null>(null);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from("cafe_sales")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast.error("Failed to load cafe sales");
      return;
    }

    setSales(data || []);
    calculateDailyTotals(data || []);
  };

  const calculateDailyTotals = (salesData: CafeSale[]) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const todaySales = salesData.filter(s => s.sale_date === today);
    
    const cash = todaySales.reduce((sum, s) => sum + Number(s.cash_amount || 0), 0);
    const card = todaySales.reduce((sum, s) => sum + Number(s.card_amount || 0), 0);

    setDailyTotals({ cash, card, total: cash + card });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cashAmount = parseFloat(formData.cash_amount || "0");
    const cardAmount = parseFloat(formData.card_amount || "0");

    if (!formData.item_description.trim()) {
      toast.error("Please enter item description");
      return;
    }

    if (cashAmount === 0 && cardAmount === 0) {
      toast.error("Please enter at least cash or card amount");
      return;
    }

    const loadingToast = toast.loading("Recording cafe sale...");

    try {
      console.log("[CAFE SALES] Starting submission at", new Date().toISOString());
      console.log("[CAFE SALES] Component: CafeSales.tsx");
      console.log("[CAFE SALES] Target table: cafe_sales");
      
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast.dismiss(loadingToast);
        toast.error("Authentication required. Please log in.");
        console.error("[CAFE SALES] Auth error:", authError);
        return;
      }

      console.log("[CAFE SALES] User authenticated:", user.email);

      const saleData = {
        sale_date: formData.sale_date,
        item_description: formData.item_description.trim(),
        amount: cashAmount + cardAmount,
        cash_amount: cashAmount,
        card_amount: cardAmount,
        cashier_name: formData.cashier_name?.trim() || null,
        notes: formData.notes?.trim() || null,
        created_by: user.email || "system",
        payment_method: cashAmount > 0 && cardAmount > 0 ? "mixed" : (cashAmount > 0 ? "cash" : "card")
      };

      // Defensive validation: warn about suspicious descriptions
      const description = formData.item_description.toLowerCase();
      if (description.includes('football') || description.includes('court') || description.includes('tournament')) {
        console.warn("[CAFE SALES] ⚠️ SUSPICIOUS: Description looks like football sale:", formData.item_description);
      }

      console.log("[CAFE SALES] Inserting into cafe_sales table:", saleData);

      const { error } = await supabase.from("cafe_sales").insert(saleData as any);

      if (error) {
        console.error("[CAFE SALES] ❌ Database error:", error);
        toast.dismiss(loadingToast);
        toast.error(`Database error: ${error.message}`);
        return;
      }

      console.log("[CAFE SALES] ✅ Sale recorded successfully to cafe_sales table");
      toast.dismiss(loadingToast);
      toast.success("☕ Cafe sale recorded successfully!");
      
      setFormData({
        item_description: "",
        cash_amount: "",
        card_amount: "",
        cashier_name: formData.cashier_name,
        notes: "",
        sale_date: format(new Date(), "yyyy-MM-dd"),
      });
      
      fetchSales();
    } catch (error) {
      console.error("Error recording sale:", error);
      toast.dismiss(loadingToast);
      toast.error(`Failed to record sale: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    try {
      const { error } = await supabase
        .from('cafe_sales')
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
      <Card className="bg-[hsl(var(--cafe-light))] border-[hsl(var(--cafe))]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--cafe))]">
              <Coffee className="h-6 w-6 text-[hsl(var(--cafe-foreground))]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">☕ Cafe Sales</h2>
              <p className="text-muted-foreground">Record daily cafe transactions - Coffee, Food & Beverages</p>
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
      <Card className="border-[hsl(var(--cafe))]/30 bg-[hsl(var(--cafe-light))]/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-[hsl(var(--cafe))]" />
            Record New Cafe Sale
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
                <Label htmlFor="item_description">Item Description *</Label>
                <Input
                  id="item_description"
                  value={formData.item_description}
                  onChange={(e) => setFormData({ ...formData, item_description: e.target.value })}
                  placeholder="e.g., Coffee, Sandwich, Juice, Snacks"
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

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-[hsl(var(--cafe))] hover:bg-[hsl(var(--cafe))]/90 text-[hsl(var(--cafe-foreground))]">
              <Coffee className="h-4 w-4 mr-2" />
              Record Cafe Sale
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sales History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Cash</TableHead>
                <TableHead>Card</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Notes</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{format(new Date(sale.sale_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{sale.item_description}</TableCell>
                  <TableCell className="font-semibold text-green-600">
                    {Number(sale.cash_amount || 0).toFixed(2)} AED
                  </TableCell>
                  <TableCell className="font-semibold text-blue-600">
                    {Number(sale.card_amount || 0).toFixed(2)} AED
                  </TableCell>
                  <TableCell className="font-semibold">
                    {Number(sale.amount).toFixed(2)} AED
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
              {sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No sales recorded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
