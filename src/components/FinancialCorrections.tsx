import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Edit, RefreshCw, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type CorrectionType = "name_edit" | "refund" | "price_adjustment";

interface Correction {
  id: string;
  type: CorrectionType;
  member_id: string;
  description: string;
  amount?: number;
  created_at: string;
}

export function FinancialCorrections() {
  const [members, setMembers] = useState<any[]>([]);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [correctionType, setCorrectionType] = useState<CorrectionType>("name_edit");
  const [selectedMember, setSelectedMember] = useState("");
  const [formData, setFormData] = useState({
    newName: "",
    refundAmount: "",
    refundReason: "",
    adjustmentAmount: "",
    adjustmentReason: "",
    paymentMethod: "",
  });

  useEffect(() => {
    fetchMembers();
    fetchCorrections();
  }, []);

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("members")
      .select("id, member_id, full_name, phone_number")
      .order("created_at", { ascending: false });
    setMembers(data || []);
  };

  const fetchCorrections = async () => {
    const { data } = await supabase
      .from("financial_audit_trail")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(20);
    setCorrections(data as any || []);
  };

  const handleNameCorrection = async () => {
    if (!selectedMember || !formData.newName) {
      toast.error("Please select member and enter new name");
      return;
    }

    setLoading(true);
    try {
      const member = members.find(m => m.id === selectedMember);
      
      const { error: updateError } = await supabase
        .from("members")
        .update({ full_name: formData.newName })
        .eq("id", selectedMember);

      if (updateError) throw updateError;

      const { error: auditError } = await supabase
        .from("financial_audit_trail")
        .insert([{
          table_name: "members",
          action_type: "name_correction",
          record_id: selectedMember,
          action_by: "admin",
          description: `Name changed from "${member.full_name}" to "${formData.newName}"`,
        }]);

      if (auditError) throw auditError;

      toast.success("Member name updated successfully");
      setDialogOpen(false);
      resetForm();
      fetchMembers();
      fetchCorrections();
    } catch (error: any) {
      toast.error(error.message || "Error updating name");
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedMember || !formData.refundAmount || !formData.refundReason || !formData.paymentMethod) {
      toast.error("Please fill all refund fields");
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(formData.refundAmount);
      
      // Record refund in audit trail
      const { error: auditError } = await supabase
        .from("financial_audit_trail")
        .insert([{
          table_name: "payment_receipts",
          action_type: "refund",
          record_id: selectedMember,
          action_by: "admin",
          description: `Refund of ${amount} AED via ${formData.paymentMethod}. Reason: ${formData.refundReason}`,
        }]);

      if (auditError) throw auditError;

      // Create negative payment record
      const { error: paymentError } = await supabase
        .from("payment_receipts")
        .insert([{
          member_id: selectedMember,
          amount: -amount,
          payment_method: formData.paymentMethod as 'cash' | 'card' | 'online',
          subscription_plan: "1_day" as any,
          zone: "other" as any,
          cashier_name: "admin (refund)",
        }]);

      if (paymentError) throw paymentError;

      toast.success(`Refund of ${amount} AED processed successfully`);
      setDialogOpen(false);
      resetForm();
      fetchCorrections();
    } catch (error: any) {
      toast.error(error.message || "Error processing refund");
    } finally {
      setLoading(false);
    }
  };

  const handlePriceAdjustment = async () => {
    if (!selectedMember || !formData.adjustmentAmount || !formData.adjustmentReason) {
      toast.error("Please fill all adjustment fields");
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(formData.adjustmentAmount);
      
      const { error: auditError } = await supabase
        .from("financial_audit_trail")
        .insert([{
          table_name: "payment_receipts",
          action_type: "price_adjustment",
          record_id: selectedMember,
          action_by: "admin",
          description: `Price adjustment of ${amount} AED. Reason: ${formData.adjustmentReason}`,
        }]);

      if (auditError) throw auditError;

      toast.success("Price adjustment recorded successfully");
      setDialogOpen(false);
      resetForm();
      fetchCorrections();
    } catch (error: any) {
      toast.error(error.message || "Error recording adjustment");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    switch (correctionType) {
      case "name_edit":
        handleNameCorrection();
        break;
      case "refund":
        handleRefund();
        break;
      case "price_adjustment":
        handlePriceAdjustment();
        break;
    }
  };

  const resetForm = () => {
    setFormData({
      newName: "",
      refundAmount: "",
      refundReason: "",
      adjustmentAmount: "",
      adjustmentReason: "",
      paymentMethod: "",
    });
    setSelectedMember("");
    setCorrectionType("name_edit");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle>Financial Corrections</CardTitle>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Edit className="h-4 w-4 mr-2" />
                  New Correction
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Financial Correction</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Correction Type *</Label>
                    <Select value={correctionType} onValueChange={(v) => setCorrectionType(v as CorrectionType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name_edit">Name Spelling Correction</SelectItem>
                        <SelectItem value="refund">Process Refund</SelectItem>
                        <SelectItem value="price_adjustment">Price Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Select Member *</Label>
                    <Select value={selectedMember} onValueChange={setSelectedMember}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose member" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name} ({member.member_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {correctionType === "name_edit" && (
                    <div className="space-y-2">
                      <Label>New Name *</Label>
                      <Input
                        value={formData.newName}
                        onChange={(e) => setFormData({ ...formData, newName: e.target.value })}
                        placeholder="Enter corrected name"
                      />
                    </div>
                  )}

                  {correctionType === "refund" && (
                    <>
                      <div className="space-y-2">
                        <Label>Refund Amount (AED) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.refundAmount}
                          onChange={(e) => setFormData({ ...formData, refundAmount: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Payment Method *</Label>
                        <Select
                          value={formData.paymentMethod}
                          onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}
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
                        <Label>Refund Reason *</Label>
                        <Textarea
                          value={formData.refundReason}
                          onChange={(e) => setFormData({ ...formData, refundReason: e.target.value })}
                          placeholder="Explain reason for refund"
                          rows={3}
                        />
                      </div>
                    </>
                  )}

                  {correctionType === "price_adjustment" && (
                    <>
                      <div className="space-y-2">
                        <Label>Adjustment Amount (AED) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.adjustmentAmount}
                          onChange={(e) => setFormData({ ...formData, adjustmentAmount: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Adjustment Reason *</Label>
                        <Textarea
                          value={formData.adjustmentReason}
                          onChange={(e) => setFormData({ ...formData, adjustmentReason: e.target.value })}
                          placeholder="Explain reason for adjustment"
                          rows={3}
                        />
                      </div>
                    </>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Processing..." : "Submit Correction"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {corrections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No corrections recorded
                  </TableCell>
                </TableRow>
              ) : (
                corrections.map((correction) => (
                  <TableRow key={correction.id}>
                    <TableCell>{new Date(correction.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{correction.type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md">{correction.description}</TableCell>
                    <TableCell>{correction.description}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
