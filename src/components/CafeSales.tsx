import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Coffee, DollarSign, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface CafeSale {
  id: string;
  sale_date: string;
  item_description: string;
  amount: number;
  payment_method: string;
  cashier_name: string | null;
  notes: string | null;
  created_at: string;
}

export function CafeSales() {
  const [sales, setSales] = useState<CafeSale[]>([]);
  const [formData, setFormData] = useState({
    item_description: "",
    amount: "",
    payment_method: "cash",
    cashier_name: "",
    notes: "",
    sale_date: format(new Date(), "yyyy-MM-dd"),
  });
  const [dailyTotals, setDailyTotals] = useState({ cash: 0, card: 0, total: 0 });

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
    
    const cash = todaySales
      .filter(s => s.payment_method === "cash")
      .reduce((sum, s) => sum + Number(s.amount), 0);
    
    const card = todaySales
      .filter(s => s.payment_method === "card")
      .reduce((sum, s) => sum + Number(s.amount), 0);

    setDailyTotals({ cash, card, total: cash + card });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.item_description || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    const { error } = await supabase.from("cafe_sales").insert({
      item_description: formData.item_description,
      amount: parseFloat(formData.amount),
      payment_method: formData.payment_method,
      cashier_name: formData.cashier_name || null,
      notes: formData.notes || null,
      sale_date: formData.sale_date,
      created_by: (await supabase.auth.getUser()).data.user?.email || "Unknown",
    });

    if (error) {
      toast.error("Failed to record sale");
      return;
    }

    toast.success("Sale recorded successfully!");
    setFormData({
      item_description: "",
      amount: "",
      payment_method: "cash",
      cashier_name: formData.cashier_name,
      notes: "",
      sale_date: format(new Date(), "yyyy-MM-dd"),
    });
    fetchSales();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Coffee className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Cafe Sales</h2>
          <p className="text-muted-foreground">Record daily cafe transactions</p>
        </div>
      </div>

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
      <Card>
        <CardHeader>
          <CardTitle>Record New Sale</CardTitle>
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
                  placeholder="e.g., Coffee, Sandwich"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (AED) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method *</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
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

            <Button type="submit" className="w-full">
              <DollarSign className="h-4 w-4 mr-2" />
              Record Sale
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
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{format(new Date(sale.sale_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{sale.item_description}</TableCell>
                  <TableCell className="font-semibold">{Number(sale.amount).toFixed(2)} AED</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      sale.payment_method === "cash" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {sale.payment_method.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>{sale.cashier_name || "-"}</TableCell>
                  <TableCell>{sale.notes || "-"}</TableCell>
                </TableRow>
              ))}
              {sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
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
