import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cashAmount = parseFloat(formData.cash_amount || "0");
    const cardAmount = parseFloat(formData.card_amount || "0");

    if (!formData.description) {
      toast.error("Please enter description");
      return;
    }

    if (cashAmount === 0 && cardAmount === 0) {
      toast.error("Please enter at least cash or card amount");
      return;
    }

    const { error } = await supabase.from("football_sales").insert({
      description: formData.description,
      cash_amount: cashAmount,
      card_amount: cardAmount,
      cashier_name: formData.cashier_name || null,
      notes: formData.notes || null,
      sale_date: formData.sale_date,
      created_by: (await supabase.auth.getUser()).data.user?.email || "Unknown",
    } as any);

    if (error) {
      toast.error("Failed to record sale");
      return;
    }

    toast.success("Football sale recorded successfully!");
    setFormData({
      description: "",
      cash_amount: "",
      card_amount: "",
      cashier_name: formData.cashier_name,
      notes: "",
      sale_date: format(new Date(), "yyyy-MM-dd"),
    });
    fetchSales();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Football Court Sales</h2>
          <p className="text-muted-foreground">Record football court rentals and sales</p>
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
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Court rental, Tournament"
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
                <TableHead>Description</TableHead>
                <TableHead>Cash</TableHead>
                <TableHead>Card</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
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
