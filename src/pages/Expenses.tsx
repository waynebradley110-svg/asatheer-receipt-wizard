import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Download, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import * as XLSX from 'xlsx';
import { useAuth } from "@/hooks/useAuth";

const Expenses = () => {
  const navigate = useNavigate();
  const { isReceptionist, loading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalBusiness: 0,
    totalOwner: 0,
  });
  const [formData, setFormData] = useState({
    category: "",
    description: "",
    amount: "",
    expense_date: new Date().toISOString().split('T')[0],
    notes: "",
  });

  useEffect(() => {
    if (!authLoading && isReceptionist) {
      toast.error("Access denied: This page is only for admin and accounts staff");
      navigate("/dashboard");
    }
  }, [isReceptionist, authLoading, navigate]);

  useEffect(() => {
    if (!isReceptionist && !authLoading) {
      fetchExpenses();
    }
  }, [isReceptionist, authLoading]);

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false });

    if (error) {
      toast.error("Error fetching expenses");
    } else {
      setExpenses(data || []);
      calculateStats(data || []);
    }
  };

  const calculateStats = (expenseData: any[]) => {
    const totalBusiness = expenseData
      .filter(e => e.category === 'business')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const totalOwner = expenseData
      .filter(e => e.category === 'owner')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    setStats({ totalBusiness, totalOwner });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("expenses")
        .insert([{
          category: formData.category as 'business' | 'owner',
          description: formData.description,
          amount: parseFloat(formData.amount),
          expense_date: formData.expense_date,
          notes: formData.notes || null,
        }]);

      if (error) throw error;

      toast.success("Expense added successfully!");
      setDialogOpen(false);
      resetForm();
      fetchExpenses();
    } catch (error: any) {
      toast.error(error.message || "Error adding expense");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      category: "",
      description: "",
      amount: "",
      expense_date: new Date().toISOString().split('T')[0],
      notes: "",
    });
  };

  const exportToExcel = () => {
    // Prepare data for Excel
    const excelData = expenses.map(expense => ({
      'Date': new Date(expense.expense_date).toLocaleDateString(),
      'Category': expense.category === 'business' ? 'Business Expense' : 'Owner Expense',
      'Description': expense.description,
      'Amount (AED)': Number(expense.amount).toFixed(2),
      'Notes': expense.notes || '',
      'Created At': new Date(expense.created_at).toLocaleString(),
    }));

    // Add summary rows
    excelData.push({} as any); // Empty row
    excelData.push({
      'Date': '',
      'Category': 'SUMMARY',
      'Description': 'Total Business Expenses',
      'Amount (AED)': stats.totalBusiness.toFixed(2),
      'Notes': '',
      'Created At': '',
    } as any);
    excelData.push({
      'Date': '',
      'Category': 'SUMMARY',
      'Description': 'Total Owner Expenses',
      'Amount (AED)': stats.totalOwner.toFixed(2),
      'Notes': '',
      'Created At': '',
    } as any);
    excelData.push({
      'Date': '',
      'Category': 'SUMMARY',
      'Description': 'TOTAL EXPENSES',
      'Amount (AED)': (stats.totalBusiness + stats.totalOwner).toFixed(2),
      'Notes': '',
      'Created At': '',
    } as any);

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // Date
      { wch: 18 }, // Category
      { wch: 30 }, // Description
      { wch: 15 }, // Amount
      { wch: 20 }, // Notes
      { wch: 20 }, // Created At
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');

    // Generate filename with current date
    const filename = `Asatheer_Expenses_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
    toast.success("Expenses exported to Excel!");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Expenses Management</h1>
          <p className="text-muted-foreground">Track business and owner expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business">Business Expense</SelectItem>
                      <SelectItem value="owner">Owner Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="E.g., Equipment purchase, Utilities, etc."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (AED) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense_date">Expense Date *</Label>
                    <Input
                      id="expense_date"
                      type="date"
                      value={formData.expense_date}
                      onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="Additional details..."
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Adding..." : "Add Expense"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Business Expenses</CardTitle>
            <DollarSign className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              AED {stats.totalBusiness.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Owner Expenses</CardTitle>
            <DollarSign className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              AED {stats.totalOwner.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expenses List</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No expenses recorded yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{new Date(expense.expense_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={expense.category === 'business' ? 'default' : 'secondary'}>
                        {expense.category === 'business' ? 'Business' : 'Owner'}
                      </Badge>
                    </TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell className="text-right font-medium">
                      AED {Number(expense.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {expense.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Expenses;