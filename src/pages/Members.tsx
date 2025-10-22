import { useState, useEffect } from "react";
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
import { Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MemberCard } from "@/components/MemberCard";

interface PaymentEntry {
  payment_method: string;
  amount: string;
}

const Members = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    gender: "",
    phone_number: "",
    date_of_birth: "",
    subscription_plan: "",
    zone: "",
    notes: "",
  });
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([
    { payment_method: "", amount: "" }
  ]);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from("members")
      .select("*, member_services(*)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error fetching members");
    } else {
      setMembers(data || []);
    }
  };

  const generateMemberId = () => {
    return `AS${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const generateBarcode = () => {
    return `ASA${Date.now()}`;
  };

  const calculateExpiryDate = (startDate: Date, plan: string) => {
    const expiry = new Date(startDate);
    switch (plan) {
      case "1_day":
        expiry.setDate(expiry.getDate() + 1);
        break;
      case "1_month":
        expiry.setMonth(expiry.getMonth() + 1);
        break;
      case "2_months":
        expiry.setMonth(expiry.getMonth() + 2);
        break;
      case "3_months":
        expiry.setMonth(expiry.getMonth() + 3);
        break;
      case "6_months":
        expiry.setMonth(expiry.getMonth() + 6);
        break;
      case "1_year":
        expiry.setFullYear(expiry.getFullYear() + 1);
        break;
    }
    return expiry;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate payments
      const validPayments = paymentEntries.filter(p => p.payment_method && p.amount);
      if (validPayments.length === 0) {
        toast.error("Please add at least one payment");
        setLoading(false);
        return;
      }

      const totalPaid = validPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

      const memberId = generateMemberId();
      const barcode = generateBarcode();
      const startDate = new Date();
      const expiryDate = calculateExpiryDate(startDate, formData.subscription_plan);
      const transactionId = crypto.randomUUID();

      // Insert member
      const { data: newMember, error: memberError } = await supabase
        .from("members")
        .insert([{
          member_id: memberId,
          barcode,
          full_name: formData.full_name,
          gender: formData.gender as 'male' | 'female',
          phone_number: formData.phone_number,
          date_of_birth: formData.date_of_birth || null,
          notes: formData.notes || null,
        }])
        .select()
        .single();

      if (memberError) throw memberError;

      // Insert service
      const { error: serviceError } = await supabase
        .from("member_services")
        .insert([{
          member_id: newMember.id,
          subscription_plan: formData.subscription_plan as any,
          zone: formData.zone as any,
          start_date: startDate.toISOString().split('T')[0],
          expiry_date: expiryDate.toISOString().split('T')[0],
        }]);

      if (serviceError) throw serviceError;

      // Insert multiple payment receipts with same transaction_id
      const paymentRecords = validPayments.map(payment => ({
        member_id: newMember.id,
        amount: parseFloat(payment.amount),
        payment_method: payment.payment_method as any,
        subscription_plan: formData.subscription_plan as any,
        zone: formData.zone as any,
        transaction_id: transactionId,
      }));

      const { error: paymentError } = await supabase
        .from("payment_receipts")
        .insert(paymentRecords);

      if (paymentError) throw paymentError;

      toast.success(`Member registered! Total paid: ${totalPaid} AED (${validPayments.length} payment${validPayments.length > 1 ? 's' : ''})`);
      setDialogOpen(false);
      resetForm();
      fetchMembers();
    } catch (error: any) {
      toast.error(error.message || "Error registering member");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      gender: "",
      phone_number: "",
      date_of_birth: "",
      subscription_plan: "",
      zone: "",
      notes: "",
    });
    setPaymentEntries([{ payment_method: "", amount: "" }]);
  };

  const addPaymentEntry = () => {
    setPaymentEntries([...paymentEntries, { payment_method: "", amount: "" }]);
  };

  const removePaymentEntry = (index: number) => {
    if (paymentEntries.length > 1) {
      setPaymentEntries(paymentEntries.filter((_, i) => i !== index));
    }
  };

  const updatePaymentEntry = (index: number, field: keyof PaymentEntry, value: string) => {
    const updated = [...paymentEntries];
    updated[index][field] = value;
    setPaymentEntries(updated);
  };

  const getTotalPayment = () => {
    return paymentEntries
      .filter(p => p.amount)
      .reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
  };

  const filteredMembers = members.filter(m =>
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    m.member_id.toLowerCase().includes(search.toLowerCase()) ||
    m.phone_number.includes(search)
  );

  const getMemberStatus = (member: any) => {
    const activeService = member.member_services?.find((s: any) => 
      new Date(s.expiry_date) >= new Date() && s.is_active
    );
    return activeService ? "active" : "expired";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Members</h1>
          <p className="text-muted-foreground">Manage academy members</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Register Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register New Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number *</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zone">Zone *</Label>
                  <Select
                    value={formData.zone}
                    onValueChange={(value) => setFormData({ ...formData, zone: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gym">Gym</SelectItem>
                      <SelectItem value="ladies_gym">Ladies Gym</SelectItem>
                      <SelectItem value="pt">PT (Personal Training)</SelectItem>
                      <SelectItem value="crossfit">CrossFit</SelectItem>
                      <SelectItem value="football">Football Academy</SelectItem>
                      <SelectItem value="basketball">Basketball</SelectItem>
                      <SelectItem value="swimming">Swimming</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subscription_plan">Subscription Plan *</Label>
                  <Select
                    value={formData.subscription_plan}
                    onValueChange={(value) => setFormData({ ...formData, subscription_plan: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1_day">1 Day</SelectItem>
                      <SelectItem value="1_month">1 Month</SelectItem>
                      <SelectItem value="2_months">2 Months</SelectItem>
                      <SelectItem value="3_months">3 Months</SelectItem>
                      <SelectItem value="6_months">6 Months</SelectItem>
                      <SelectItem value="1_year">1 Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Payment Details *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addPaymentEntry}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Payment
                  </Button>
                </div>

                {paymentEntries.map((entry, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Payment {index + 1}</span>
                      {paymentEntries.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePaymentEntry(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Payment Method</Label>
                        <Select
                          value={entry.payment_method}
                          onValueChange={(value) => updatePaymentEntry(index, "payment_method", value)}
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
                        <Label>Amount (AED)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.amount}
                          onChange={(e) => updatePaymentEntry(index, "amount", e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Payment:</span>
                    <span className="text-lg font-bold">{getTotalPayment().toFixed(2)} AED</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Registering..." : "Register Member"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members List</CardTitle>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.member_id}</TableCell>
                  <TableCell>{member.full_name}</TableCell>
                  <TableCell>{member.phone_number}</TableCell>
                  <TableCell>
                    <Badge variant={getMemberStatus(member) === "active" ? "default" : "destructive"}>
                      {getMemberStatus(member)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{member.barcode}</TableCell>
                  <TableCell>
                    <MemberCard member={member} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Members;