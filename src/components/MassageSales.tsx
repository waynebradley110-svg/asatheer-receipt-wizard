import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface MassageSale {
  id: string;
  sale_date: string;
  customer_name: string;
  amount: number;
  cash_amount: number;
  card_amount: number;
  cashier_name: string | null;
  notes: string | null;
  created_at: string;
}

export const MassageSales = () => {
  const { user, roles } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sales, setSales] = useState<MassageSale[]>([]);
  const [dailyTotals, setDailyTotals] = useState({
    cash: 0,
    card: 0,
    total: 0,
    count: 0,
  });

  const [formData, setFormData] = useState({
    sale_date: format(new Date(), "yyyy-MM-dd"),
    customer_name: "",
    cash_amount: "",
    card_amount: "",
    cashier_name: "",
    notes: "",
  });

  useEffect(() => {
    fetchSales();
  }, [formData.sale_date]);

  const fetchSales = async () => {
    console.log("[MASSAGE SALES] Fetching sales for date:", formData.sale_date);
    
    const { data, error } = await supabase
      .from("massage_sales")
      .select("*")
      .eq("sale_date", formData.sale_date)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[MASSAGE SALES] Error fetching sales:", error);
      toast.error("Failed to load massage sales");
      return;
    }

    console.log("[MASSAGE SALES] Fetched sales:", data?.length || 0);
    setSales(data || []);

    const totals = (data || []).reduce(
      (acc, sale) => ({
        cash: acc.cash + Number(sale.cash_amount || 0),
        card: acc.card + Number(sale.card_amount || 0),
        total: acc.total + Number(sale.amount || 0),
        count: acc.count + 1,
      }),
      { cash: 0, card: 0, total: 0, count: 0 }
    );

    setDailyTotals(totals);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log("[MASSAGE SALES] Starting submission...");
    console.log("[MASSAGE SALES] Form data:", formData);

    const cashAmount = Number(formData.cash_amount) || 0;
    const cardAmount = Number(formData.card_amount) || 0;
    const totalAmount = cashAmount + cardAmount;

    if (totalAmount <= 0) {
      toast.error("Please enter at least a cash or card amount");
      setLoading(false);
      return;
    }

    if (!formData.customer_name.trim()) {
      toast.error("Please enter customer name");
      setLoading(false);
      return;
    }

    const saleData = {
      customer_name: formData.customer_name.trim(),
      amount: totalAmount,
      cash_amount: cashAmount,
      card_amount: cardAmount,
      cashier_name: formData.cashier_name?.trim() || null,
      notes: formData.notes?.trim() || null,
      sale_date: formData.sale_date,
      created_by: user?.email || "unknown",
    };

    console.log("[MASSAGE SALES] Inserting sale data:", saleData);

    const { error } = await supabase.from("massage_sales").insert([saleData]);

    if (error) {
      console.error("[MASSAGE SALES] Error recording sale:", error);
      toast.error("Failed to record massage sale");
      setLoading(false);
      return;
    }

    console.log("[MASSAGE SALES] Sale recorded successfully");
    toast.success("Massage sale recorded successfully!");

    setFormData({
      ...formData,
      customer_name: "",
      cash_amount: "",
      card_amount: "",
      notes: "",
    });

    fetchSales();
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!roles?.includes("admin")) {
      toast.error("Only admins can delete sales");
      return;
    }

    if (!confirm("Are you sure you want to delete this sale?")) {
      return;
    }

    const { error } = await supabase.from("massage_sales").delete().eq("id", id);

    if (error) {
      console.error("[MASSAGE SALES] Error deleting sale:", error);
      toast.error("Failed to delete sale");
      return;
    }

    toast.success("Sale deleted successfully");
    fetchSales();
  };

  const cashAmount = Number(formData.cash_amount) || 0;
  const cardAmount = Number(formData.card_amount) || 0;
  const totalAmount = cashAmount + cardAmount;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Record Massage Sale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sale_date">Date</Label>
                <Input
                  id="sale_date"
                  type="date"
                  value={formData.sale_date}
                  onChange={(e) =>
                    setFormData({ ...formData, sale_date: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_name: e.target.value })
                  }
                  placeholder="Enter customer name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="cash_amount">Cash Amount (AED)</Label>
                <Input
                  id="cash_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cash_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, cash_amount: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="card_amount">Card Amount (AED)</Label>
                <Input
                  id="card_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.card_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, card_amount: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Total Amount</Label>
                <div className="text-2xl font-bold text-purple-600">
                  {totalAmount.toFixed(2)} AED
                </div>
              </div>

              <div>
                <Label htmlFor="cashier_name">Cashier Name</Label>
                <Input
                  id="cashier_name"
                  value={formData.cashier_name}
                  onChange={(e) =>
                    setFormData({ ...formData, cashier_name: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Optional notes"
                  rows={2}
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Recording..." : "Record Sale"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Summary - {format(new Date(formData.sale_date), "MMM dd, yyyy")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <p className="text-2xl font-bold">{dailyTotals.count}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cash</p>
              <p className="text-2xl font-bold text-green-600">
                {dailyTotals.cash.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Card</p>
              <p className="text-2xl font-bold text-blue-600">
                {dailyTotals.card.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-purple-600">
                {dailyTotals.total.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Customer</th>
                  <th className="text-right p-2">Cash</th>
                  <th className="text-right p-2">Card</th>
                  <th className="text-right p-2">Total</th>
                  <th className="text-left p-2">Cashier</th>
                  {roles?.includes("admin") && (
                    <th className="text-center p-2">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={roles?.includes("admin") ? 7 : 6} className="text-center p-4 text-muted-foreground">
                      No sales recorded for this date
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <tr key={sale.id} className="border-b">
                      <td className="p-2">{format(new Date(sale.created_at), "HH:mm")}</td>
                      <td className="p-2">{sale.customer_name}</td>
                      <td className="text-right p-2">{Number(sale.cash_amount).toFixed(2)}</td>
                      <td className="text-right p-2">{Number(sale.card_amount).toFixed(2)}</td>
                      <td className="text-right p-2 font-semibold">{Number(sale.amount).toFixed(2)}</td>
                      <td className="p-2">{sale.cashier_name || "-"}</td>
                      {roles?.includes("admin") && (
                        <td className="text-center p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(sale.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
