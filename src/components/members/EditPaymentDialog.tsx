import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Edit, DollarSign } from "lucide-react";

interface PaymentReceipt {
  id: string;
  amount: number;
  payment_method: string;
  created_at: string;
  zone: string;
  subscription_plan: string;
}

interface EditPaymentDialogProps {
  memberId: string;
  memberName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const getZoneLabel = (zone: string): string => {
  const labels: Record<string, string> = {
    gym: "Gym",
    ladies_gym: "Ladies Gym",
    pt: "Personal Training",
    crossfit: "CrossFit",
    football_student: "Football Academy",
    football_court: "Football Court",
    football: "Football",
    swimming: "Swimming",
    paddle_court: "Paddle Court",
    other: "Other"
  };
  return labels[zone] || zone;
};

export function EditPaymentDialog({ 
  memberId, 
  memberName, 
  open, 
  onOpenChange,
  onSuccess 
}: EditPaymentDialogProps) {
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [selectedPayment, setSelectedPayment] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingPayments, setFetchingPayments] = useState(false);

  useEffect(() => {
    if (open && memberId) {
      fetchPayments();
    }
  }, [open, memberId]);

  useEffect(() => {
    if (selectedPayment) {
      const payment = payments.find(p => p.id === selectedPayment);
      if (payment) {
        setNewPaymentMethod(payment.payment_method);
        setNewAmount(payment.amount.toString());
      }
    }
  }, [selectedPayment, payments]);

  const fetchPayments = async () => {
    setFetchingPayments(true);
    const { data, error } = await supabase
      .from("payment_receipts")
      .select("id, amount, payment_method, created_at, zone, subscription_plan")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      toast.error("Error fetching payments");
    } else {
      setPayments(data || []);
    }
    setFetchingPayments(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPayment) {
      toast.error("Please select a payment to edit");
      return;
    }

    const payment = payments.find(p => p.id === selectedPayment);
    if (!payment) return;

    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      // Update payment record
      const { error: updateError } = await supabase
        .from("payment_receipts")
        .update({ 
          payment_method: newPaymentMethod as 'cash' | 'card' | 'online',
          amount: amount
        })
        .eq("id", selectedPayment);

      if (updateError) throw updateError;

      // Create audit trail entry
      const changes: string[] = [];
      if (payment.payment_method !== newPaymentMethod) {
        changes.push(`method: ${payment.payment_method} → ${newPaymentMethod}`);
      }
      if (payment.amount !== amount) {
        changes.push(`amount: ${payment.amount} → ${amount} AED`);
      }

      if (changes.length > 0) {
        const { error: auditError } = await supabase
          .from("financial_audit_trail")
          .insert([{
            table_name: "payment_receipts",
            action_type: "payment_edit",
            record_id: selectedPayment,
            action_by: "admin",
            description: `Payment edited for ${memberName} (${getZoneLabel(payment.zone)}): ${changes.join(", ")}`,
          }]);

        if (auditError) console.error("Audit trail error:", auditError);
      }

      toast.success("Payment updated successfully");
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Error updating payment");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPayment("");
    setNewPaymentMethod("");
    setNewAmount("");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Payment - {memberName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Payment to Edit *</Label>
            <Select 
              value={selectedPayment} 
              onValueChange={setSelectedPayment}
              disabled={fetchingPayments}
            >
              <SelectTrigger>
                <SelectValue placeholder={fetchingPayments ? "Loading..." : "Choose payment"} />
              </SelectTrigger>
              <SelectContent>
                {payments.length === 0 ? (
                  <SelectItem value="none" disabled>No payments found</SelectItem>
                ) : (
                  payments.map((payment) => (
                    <SelectItem key={payment.id} value={payment.id}>
                      {format(new Date(payment.created_at), 'dd/MM/yyyy')} - {payment.amount} AED ({payment.payment_method}) - {getZoneLabel(payment.zone)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedPayment && (
            <>
              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select
                  value={newPaymentMethod}
                  onValueChange={setNewPaymentMethod}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Amount (AED) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground">
                  Original: {payments.find(p => p.id === selectedPayment)?.amount} AED via {payments.find(p => p.id === selectedPayment)?.payment_method}
                </p>
              </div>
            </>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !selectedPayment}
          >
            {loading ? "Updating..." : "Update Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
