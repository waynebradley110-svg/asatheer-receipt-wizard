import { getGenericError } from "@/lib/errorUtils";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Edit, DollarSign, Trash2, Lock } from "lucide-react";

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

// Per-session admin grant so the password isn't required for every action
// within a 5-minute window after a successful unlock.
let cachedGrant: { expiresAt: number } | null = null;

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

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | "update" | "delete">(null);
  const [passwordValue, setPasswordValue] = useState("");
  const [verifying, setVerifying] = useState(false);

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

  const hasValidGrant = () => cachedGrant !== null && cachedGrant.expiresAt > Date.now();

  const requestPassword = (action: "update" | "delete") => {
    if (hasValidGrant()) {
      runAction(action);
      return;
    }
    setPendingAction(action);
    setPasswordValue("");
    setPasswordOpen(true);
  };

  const verifyAndRun = async () => {
    if (!passwordValue) {
      toast.error("Enter the admin password");
      return;
    }
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-admin-password", {
        body: { password: passwordValue },
      });
      if (error || !data?.ok) {
        toast.error("Incorrect password");
        return;
      }
      cachedGrant = { expiresAt: new Date(data.expiresAt).getTime() };
      setPasswordOpen(false);
      setPasswordValue("");
      if (pendingAction) {
        await runAction(pendingAction);
        setPendingAction(null);
      }
    } catch {
      toast.error("Could not verify password");
    } finally {
      setVerifying(false);
    }
  };

  const runAction = async (action: "update" | "delete") => {
    if (action === "update") {
      await performUpdate();
    } else {
      await performDelete();
    }
  };

  const performUpdate = async () => {
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
      const { error: updateError } = await supabase
        .from("payment_receipts")
        .update({ 
          payment_method: newPaymentMethod as 'cash' | 'card' | 'online',
          amount: amount
        })
        .eq("id", selectedPayment);

      if (updateError) throw updateError;

      const changes: string[] = [];
      if (payment.payment_method !== newPaymentMethod) {
        changes.push(`method: ${payment.payment_method} → ${newPaymentMethod}`);
      }
      if (payment.amount !== amount) {
        changes.push(`amount: ${payment.amount} → ${amount} AED`);
      }
      if (changes.length > 0) {
        await supabase.from("financial_audit_trail").insert([{
          table_name: "payment_receipts",
          action_type: "payment_edit",
          record_id: selectedPayment,
          action_by: "admin",
          description: `Payment edited for ${memberName} (${getZoneLabel(payment.zone)}): ${changes.join(", ")}`,
        }]);
      }

      toast.success("Payment updated successfully");
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      toast.error(getGenericError(error, "Error updating payment"));
    } finally {
      setLoading(false);
    }
  };

  const performDelete = async () => {
    if (!selectedPayment) return;
    const payment = payments.find(p => p.id === selectedPayment);
    if (!payment) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("payment_receipts")
        .delete()
        .eq("id", selectedPayment);
      if (error) throw error;

      await supabase.from("financial_audit_trail").insert([{
        table_name: "payment_receipts",
        action_type: "payment_delete",
        record_id: selectedPayment,
        action_by: "admin",
        description: `Payment deleted for ${memberName} (${getZoneLabel(payment.zone)}): ${payment.amount} AED via ${payment.payment_method}`,
      }]);

      toast.success("Payment deleted");
      setSelectedPayment("");
      await fetchPayments();
      onSuccess?.();
    } catch (error: any) {
      toast.error(getGenericError(error, "Error deleting payment"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestPassword("update");
  };

  const resetForm = () => {
    setSelectedPayment("");
    setNewPaymentMethod("");
    setNewAmount("");
  };

  return (
    <>
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

            <div className="flex gap-2">
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={loading || !selectedPayment}
              >
                <Lock className="h-3.5 w-3.5 mr-1" />
                {loading ? "Updating..." : "Update Payment"}
              </Button>
              {selectedPayment && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this payment?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes the payment record and will affect financial reports. The admin password will be required.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => requestPassword("delete")}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={(o) => { if (!verifying) setPasswordOpen(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Admin password required
            </DialogTitle>
            <DialogDescription>
              Enter the admin password to {pendingAction === "delete" ? "delete" : "update"} this payment.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            value={passwordValue}
            onChange={(e) => setPasswordValue(e.target.value)}
            placeholder="Password"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") verifyAndRun(); }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordOpen(false)} disabled={verifying}>
              Cancel
            </Button>
            <Button onClick={verifyAndRun} disabled={verifying}>
              {verifying ? "Verifying..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
