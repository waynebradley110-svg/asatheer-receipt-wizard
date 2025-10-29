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
import { Plus, Search, Trash2, MessageCircle, Edit, Users, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { DigitalMemberCard } from "@/components/DigitalMemberCard";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";

interface PaymentEntry {
  payment_method: string;
  amount: string;
}

const Members = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    gender: "",
    phone_number: "",
    date_of_birth: "",
    subscription_plan: "",
    zone: "",
    notes: "",
    coach_name: "",
  });
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [renewingMember, setRenewingMember] = useState<any>(null);
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([
    { payment_method: "", amount: "" }
  ]);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [newMemberData, setNewMemberData] = useState<any>(null);
  const [viewCardDialogOpen, setViewCardDialogOpen] = useState(false);
  const [viewingMember, setViewingMember] = useState<any>(null);
  const [filterZone, setFilterZone] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deletingMember, setDeletingMember] = useState<string | null>(null);
  const { isAdmin } = useAuth();

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

      // Check for duplicate member by phone number
      const { data: existingMember } = await supabase
        .from("members")
        .select("id, member_id, full_name, member_services(*)")
        .eq("phone_number", formData.phone_number)
        .single();

      let memberId, memberDbId, barcode;

      if (existingMember) {
        // Member exists - add new service only
        toast.info(`Member ${existingMember.full_name} already exists. Adding new service...`);
        memberId = existingMember.member_id;
        memberDbId = existingMember.id;
        barcode = null; // Use existing barcode
      } else {
        // New member - create full record
        memberId = generateMemberId();
        barcode = generateBarcode();
        
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
        memberDbId = newMember.id;
      }

      const startDate = new Date();
      const expiryDate = calculateExpiryDate(startDate, formData.subscription_plan);
      const transactionId = crypto.randomUUID();

      // Insert service
      const { error: serviceError } = await supabase
        .from("member_services")
        .insert([{
          member_id: memberDbId,
          subscription_plan: formData.subscription_plan as any,
          zone: formData.zone as any,
          start_date: startDate.toISOString().split('T')[0],
          expiry_date: expiryDate.toISOString().split('T')[0],
          coach_name: formData.zone === 'pt' ? formData.coach_name || null : null,
          notes: formData.zone === 'pt' ? `Coach: ${formData.coach_name}` : null,
        }]);

      if (serviceError) throw serviceError;

      // Insert multiple payment receipts with same transaction_id
      const paymentRecords = validPayments.map(payment => ({
        member_id: memberDbId,
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

      const message = existingMember 
        ? `Service added for existing member! Total paid: ${totalPaid} AED`
        : `Member registered! Total paid: ${totalPaid} AED`;
      toast.success(message);
      
      // Fetch the newly created/updated member with services to display card
      const { data: memberWithServices } = await supabase
        .from("members")
        .select("*, member_services(*)")
        .eq("id", memberDbId)
        .single();
      
      if (memberWithServices && !existingMember) {
        // Show digital card for new members only
        const activeService = memberWithServices.member_services?.find((s: any) => s.is_active);
        setNewMemberData({
          ...memberWithServices,
          activeService,
          totalPaid
        });
        setDialogOpen(false);
        setCardDialogOpen(true);
      } else {
        setDialogOpen(false);
        resetForm();
      }
      
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
      coach_name: "",
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

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.member_id.toLowerCase().includes(search.toLowerCase()) ||
      m.phone_number.includes(search);
    
    const activeService = m.member_services?.find((s: any) => 
      new Date(s.expiry_date) >= new Date() && s.is_active
    );
    
    const matchesZone = filterZone === "all" || 
      m.member_services?.some((s: any) => s.zone === filterZone && s.is_active);
    
    const status = activeService ? "active" : "expired";
    const matchesStatus = filterStatus === "all" || status === filterStatus;
    
    return matchesSearch && matchesZone && matchesStatus;
  });

  // Helper function to determine member status
  const getMemberStatus = (member: any) => {
    const activeService = member.member_services?.find((s: any) => 
      new Date(s.expiry_date) >= new Date() && s.is_active
    );
    return activeService ? "active" : "expired";
  };

  // Calculate statistics
  const stats = {
    total: members.length,
    active: members.filter(m => getMemberStatus(m) === "active").length,
    expired: members.filter(m => getMemberStatus(m) === "expired").length,
    byZone: {
      gym: { 
        total: members.filter(m => m.member_services?.some((s: any) => s.zone === 'gym' && s.is_active)).length,
        active: members.filter(m => m.member_services?.some((s: any) => s.zone === 'gym' && s.is_active && new Date(s.expiry_date) >= new Date())).length,
        expired: members.filter(m => m.member_services?.some((s: any) => s.zone === 'gym' && s.is_active && new Date(s.expiry_date) < new Date())).length
      },
      ladies_gym: { 
        total: members.filter(m => m.member_services?.some((s: any) => s.zone === 'ladies_gym' && s.is_active)).length,
        active: members.filter(m => m.member_services?.some((s: any) => s.zone === 'ladies_gym' && s.is_active && new Date(s.expiry_date) >= new Date())).length,
        expired: members.filter(m => m.member_services?.some((s: any) => s.zone === 'ladies_gym' && s.is_active && new Date(s.expiry_date) < new Date())).length
      },
      crossfit: { 
        total: members.filter(m => m.member_services?.some((s: any) => s.zone === 'crossfit' && s.is_active)).length,
        active: members.filter(m => m.member_services?.some((s: any) => s.zone === 'crossfit' && s.is_active && new Date(s.expiry_date) >= new Date())).length,
        expired: members.filter(m => m.member_services?.some((s: any) => s.zone === 'crossfit' && s.is_active && new Date(s.expiry_date) < new Date())).length
      },
      football_student: { 
        total: members.filter(m => m.member_services?.some((s: any) => s.zone === 'football_student' && s.is_active)).length,
        active: members.filter(m => m.member_services?.some((s: any) => s.zone === 'football_student' && s.is_active && new Date(s.expiry_date) >= new Date())).length,
        expired: members.filter(m => m.member_services?.some((s: any) => s.zone === 'football_student' && s.is_active && new Date(s.expiry_date) < new Date())).length
      },
      pt: { 
        total: members.filter(m => m.member_services?.some((s: any) => s.zone === 'pt' && s.is_active)).length,
        active: members.filter(m => m.member_services?.some((s: any) => s.zone === 'pt' && s.is_active && new Date(s.expiry_date) >= new Date())).length,
        expired: members.filter(m => m.member_services?.some((s: any) => s.zone === 'pt' && s.is_active && new Date(s.expiry_date) < new Date())).length
      },
    }
  };

  const getWelcomeMessage = (member: any) => {
    const activeService = member.member_services?.find((s: any) => 
      new Date(s.expiry_date) >= new Date() && s.is_active
    );
    
    if (activeService) {
      return `Welcome to Asatheer Sports Academy, ${member.full_name}!\n\nYour membership details:\nID: ${member.member_id}\nZone: ${activeService.zone.replace('_', ' ').toUpperCase()}\nPlan: ${activeService.subscription_plan.replace('_', ' ')}\nExpires: ${new Date(activeService.expiry_date).toLocaleDateString()}\n\nWe're excited to have you with us!`;
    }
    
    return `Hello ${member.full_name},\n\nThank you for being a member of Asatheer Sports Academy!\n\nMember ID: ${member.member_id}\n\nContact us anytime for assistance.`;
  };

  const handleEditMember = (member: any) => {
    setEditingMember(member);
    setFormData({
      full_name: member.full_name,
      gender: member.gender,
      phone_number: member.phone_number,
      date_of_birth: member.date_of_birth || "",
      subscription_plan: "",
      zone: "",
      notes: member.notes || "",
      coach_name: "",
    });
    setEditDialogOpen(true);
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("members")
        .update({
          full_name: formData.full_name,
          gender: formData.gender as 'male' | 'female',
          phone_number: formData.phone_number,
          date_of_birth: formData.date_of_birth || null,
          notes: formData.notes || null,
        })
        .eq("id", editingMember.id);

      if (error) throw error;

      toast.success("Member updated successfully");
      setEditDialogOpen(false);
      setEditingMember(null);
      resetForm();
      fetchMembers();
    } catch (error: any) {
      toast.error(error.message || "Error updating member");
    } finally {
      setLoading(false);
    }
  };

  const handleRenewMembership = (member: any) => {
    setRenewingMember(member);
    setFormData({
      ...formData,
      full_name: member.full_name,
      phone_number: member.phone_number,
      subscription_plan: "",
      zone: "",
    });
    setRenewDialogOpen(true);
  };

  const handleRenewalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validPayments = paymentEntries.filter(p => p.payment_method && p.amount);
      if (validPayments.length === 0) {
        toast.error("Please add at least one payment");
        setLoading(false);
        return;
      }

      const totalPaid = validPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const startDate = new Date();
      const expiryDate = calculateExpiryDate(startDate, formData.subscription_plan);
      const transactionId = crypto.randomUUID();

      // Add new service
      const { error: serviceError } = await supabase
        .from("member_services")
        .insert([{
          member_id: renewingMember.id,
          subscription_plan: formData.subscription_plan as any,
          zone: formData.zone as any,
          start_date: startDate.toISOString().split('T')[0],
          expiry_date: expiryDate.toISOString().split('T')[0],
          coach_name: formData.zone === 'pt' ? formData.coach_name || null : null,
          notes: formData.zone === 'pt' ? `Coach: ${formData.coach_name}` : null,
        }]);

      if (serviceError) throw serviceError;

      // Insert payment receipts
      const paymentRecords = validPayments.map(payment => ({
        member_id: renewingMember.id,
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

      toast.success(`Membership renewed! Total paid: ${totalPaid} AED`);
      setRenewDialogOpen(false);
      setRenewingMember(null);
      resetForm();
      fetchMembers();
    } catch (error: any) {
      toast.error(error.message || "Error renewing membership");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
      
      toast.success("Member deleted successfully");
      fetchMembers();
      setDeletingMember(null);
    } catch (error) {
      console.error('Error deleting member:', error);
      toast.error("Failed to delete member");
    }
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
                      <SelectItem value="football_court">Football Court</SelectItem>
                      <SelectItem value="football_student">Football Student Zone</SelectItem>
                      <SelectItem value="swimming">Swimming</SelectItem>
                      <SelectItem value="paddle_court">Paddle Court</SelectItem>
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

              {formData.zone === 'pt' && (
                <div className="space-y-2">
                  <Label htmlFor="coach_name">Coach Name</Label>
                  <Input
                    id="coach_name"
                    value={formData.coach_name}
                    onChange={(e) => setFormData({ ...formData, coach_name: e.target.value })}
                    placeholder="Enter coach's name"
                  />
                </div>
              )}

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

      {/* Statistics Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="flex gap-3 mt-2 text-xs">
              <span className="text-green-600 font-medium">Active: {stats.active}</span>
              <span className="text-red-600 font-medium">Expired: {stats.expired}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Gym</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byZone.gym.total}</div>
            <div className="flex gap-3 mt-2 text-xs">
              <span className="text-green-600 font-medium">Active: {stats.byZone.gym.active}</span>
              <span className="text-red-600 font-medium">Expired: {stats.byZone.gym.expired}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Ladies Gym</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byZone.ladies_gym.total}</div>
            <div className="flex gap-3 mt-2 text-xs">
              <span className="text-green-600 font-medium">Active: {stats.byZone.ladies_gym.active}</span>
              <span className="text-red-600 font-medium">Expired: {stats.byZone.ladies_gym.expired}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">CrossFit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byZone.crossfit.total}</div>
            <div className="flex gap-3 mt-2 text-xs">
              <span className="text-green-600 font-medium">Active: {stats.byZone.crossfit.active}</span>
              <span className="text-red-600 font-medium">Expired: {stats.byZone.crossfit.expired}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Football Academy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byZone.football_student.total}</div>
            <div className="flex gap-3 mt-2 text-xs">
              <span className="text-green-600 font-medium">Active: {stats.byZone.football_student.active}</span>
              <span className="text-red-600 font-medium">Expired: {stats.byZone.football_student.expired}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Personal Training</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byZone.pt.total}</div>
            <div className="flex gap-3 mt-2 text-xs">
              <span className="text-green-600 font-medium">Active: {stats.byZone.pt.active}</span>
              <span className="text-red-600 font-medium">Expired: {stats.byZone.pt.expired}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label>Zone</Label>
              <Select value={filterZone} onValueChange={setFilterZone}>
                <SelectTrigger>
                  <SelectValue placeholder="All Zones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  <SelectItem value="gym">Gym</SelectItem>
                  <SelectItem value="ladies_gym">Ladies Gym</SelectItem>
                  <SelectItem value="pt">Personal Training</SelectItem>
                  <SelectItem value="crossfit">CrossFit</SelectItem>
                  <SelectItem value="football_court">Football Court</SelectItem>
                  <SelectItem value="football_student">Football Student Zone</SelectItem>
                  <SelectItem value="swimming">Swimming</SelectItem>
                  <SelectItem value="paddle_court">Paddle Court</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="expired">Expired Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(filterZone !== "all" || filterStatus !== "all") && (
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFilterZone("all");
                    setFilterStatus("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
                <TableHead className="text-right">Actions</TableHead>
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
                    <div className="flex gap-2 justify-end">
                      {getMemberStatus(member) === "expired" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleRenewMembership(member)}
                        >
                          Renew
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditMember(member)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setViewingMember(member);
                          setViewCardDialogOpen(true);
                        }}
                      >
                        View Card
                      </Button>
                      <WhatsAppButton
                        phoneNumber={member.phone_number}
                        message={getWelcomeMessage(member)}
                        variant="outline"
                        size="sm"
                      />
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Member</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {member.full_name}? This action cannot be undone and will remove all associated data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteMember(member.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Member Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateMember} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_full_name">Full Name *</Label>
                <Input
                  id="edit_full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_gender">Gender *</Label>
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
                <Label htmlFor="edit_phone_number">Phone Number *</Label>
                <Input
                  id="edit_phone_number"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_date_of_birth">Date of Birth</Label>
                <Input
                  id="edit_date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Update Member"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Renew Membership Dialog */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Renew Membership - {renewingMember?.full_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRenewalSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="renew_zone">Zone *</Label>
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
                    <SelectItem value="football_court">Football Court</SelectItem>
                    <SelectItem value="basketball">Basketball</SelectItem>
                    <SelectItem value="swimming">Swimming</SelectItem>
                    <SelectItem value="paddle_court">Paddle Court</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="renew_subscription_plan">Subscription Plan *</Label>
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

            {formData.zone === 'pt' && (
              <div className="space-y-2">
                <Label htmlFor="renew_coach_name">Coach Name</Label>
                <Input
                  id="renew_coach_name"
                  value={formData.coach_name}
                  onChange={(e) => setFormData({ ...formData, coach_name: e.target.value })}
                  placeholder="Enter coach's name"
                />
              </div>
            )}

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
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Renewing..." : "Renew Membership"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Member Card Dialog */}
      <Dialog open={viewCardDialogOpen} onOpenChange={setViewCardDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Member Card</DialogTitle>
          </DialogHeader>
          {viewingMember && viewingMember.member_services && viewingMember.member_services.length > 0 && (
            <DigitalMemberCard
              memberId={viewingMember.member_id}
              memberUuid={viewingMember.id}
              memberName={viewingMember.full_name}
              phone={viewingMember.phone_number}
              zone={viewingMember.member_services.find((s: any) => s.is_active)?.zone || viewingMember.member_services[0].zone}
              expiryDate={viewingMember.member_services.find((s: any) => s.is_active)?.expiry_date || viewingMember.member_services[0].expiry_date}
              barcode={viewingMember.barcode}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Digital Member Card Dialog */}
      <Dialog open={cardDialogOpen} onOpenChange={(open) => {
        setCardDialogOpen(open);
        if (!open) {
          resetForm();
          setNewMemberData(null);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Member Card Created Successfully!</DialogTitle>
          </DialogHeader>
          {newMemberData && newMemberData.activeService && (
            <DigitalMemberCard
              memberId={newMemberData.member_id}
              memberUuid={newMemberData.id}
              memberName={newMemberData.full_name}
              phone={newMemberData.phone_number}
              zone={newMemberData.activeService.zone}
              expiryDate={newMemberData.activeService.expiry_date}
              barcode={newMemberData.barcode}
              paymentAmount={newMemberData.totalPaid}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Members;