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
import { Plus, Search, Trash2, MessageCircle, Edit, Users, Filter, UserCheck, UserX, TrendingUp, Dumbbell, Heart, Trophy, Activity, Calendar, User, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { DigitalMemberCard } from "@/components/DigitalMemberCard";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

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
    payment_date: format(new Date(), "yyyy-MM-dd"),
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
  const [addServiceDialogOpen, setAddServiceDialogOpen] = useState(false);
  const [addingServiceMember, setAddingServiceMember] = useState<any>(null);
  const [registrationType, setRegistrationType] = useState<'membership' | 'event'>('membership');
  const [eventFormData, setEventFormData] = useState({
    event_type: '',
    event_name: '',
    event_date: '',
    event_time: '',
    venue: '',
    max_capacity: '',
    age_group: '',
    participant_name: '',
    participant_phone: '',
    participant_email: '',
    amount: '',
    payment_method: '',
    notes: ''
  });

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

      const startDate = new Date(formData.payment_date);
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
        created_at: new Date(formData.payment_date).toISOString(),
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
      payment_date: format(new Date(), "yyyy-MM-dd"),
    });
    setPaymentEntries([{ payment_method: "", amount: "" }]);
  };

  const resetEventForm = () => {
    setEventFormData({
      event_type: '',
      event_name: '',
      event_date: '',
      event_time: '',
      venue: '',
      max_capacity: '',
      age_group: '',
      participant_name: '',
      participant_phone: '',
      participant_email: '',
      amount: '',
      payment_method: '',
      notes: ''
    });
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert event registration
      const { data: registration, error: regError } = await supabase
        .from("event_registrations")
        .insert({
          event_type: eventFormData.event_type,
          event_name: eventFormData.event_name,
          event_date: eventFormData.event_date || null,
          event_time: eventFormData.event_time || null,
          venue: eventFormData.venue || null,
          max_capacity: eventFormData.max_capacity ? parseInt(eventFormData.max_capacity) : null,
          age_group: eventFormData.age_group || null,
          participant_name: eventFormData.participant_name,
          participant_phone: eventFormData.participant_phone,
          participant_email: eventFormData.participant_email || null,
          amount: parseFloat(eventFormData.amount),
          payment_method: eventFormData.payment_method,
          payment_status: 'paid',
          notes: eventFormData.notes || null,
          created_by: user.email || "Unknown"
        } as any)
        .select()
        .single();

      if (regError) throw regError;

      // Log in financial audit trail
      await supabase.from("financial_audit_trail").insert({
        record_id: registration.id,
        action_type: "event_registration",
        table_name: "event_registrations",
        action_by: user.email || "Unknown",
        description: `Event registration: ${eventFormData.event_name} - ${eventFormData.participant_name} - AED ${eventFormData.amount}`
      });

      toast.success(`${eventFormData.event_name} registration successful!`);
      setDialogOpen(false);
      resetEventForm();
      setRegistrationType('membership');
      
    } catch (error: any) {
      console.error("Event registration error:", error);
      toast.error(error.message || "Failed to register for event");
    } finally {
      setLoading(false);
    }
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

  const statCardsData = [
    {
      title: "Total Members",
      value: stats.total,
      active: stats.active,
      expired: stats.expired,
      icon: Users,
      colorScheme: "performance" as const,
      description: "All registered members",
      trend: stats.total > 0 ? `${((stats.active / stats.total) * 100).toFixed(0)}% active` : null,
    },
    {
      title: "Gym",
      value: stats.byZone.gym.total,
      active: stats.byZone.gym.active,
      expired: stats.byZone.gym.expired,
      icon: Dumbbell,
      colorScheme: "energy" as const,
      description: "Main gym zone",
    },
    {
      title: "Ladies Gym",
      value: stats.byZone.ladies_gym.total,
      active: stats.byZone.ladies_gym.active,
      expired: stats.byZone.ladies_gym.expired,
      icon: Heart,
      colorScheme: "wellness" as const,
      description: "Ladies only zone",
    },
    {
      title: "CrossFit",
      value: stats.byZone.crossfit.total,
      active: stats.byZone.crossfit.active,
      expired: stats.byZone.crossfit.expired,
      icon: Activity,
      colorScheme: "power" as const,
      description: "High intensity training",
    },
    {
      title: "Football Academy",
      value: stats.byZone.football_student.total,
      active: stats.byZone.football_student.active,
      expired: stats.byZone.football_student.expired,
      icon: Trophy,
      colorScheme: "performance" as const,
      description: "Student football zone",
    },
    {
      title: "Personal Training",
      value: stats.byZone.pt.total,
      active: stats.byZone.pt.active,
      expired: stats.byZone.pt.expired,
      icon: UserCheck,
      colorScheme: "energy" as const,
      description: "One-on-one coaching",
    },
  ];

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
      payment_date: format(new Date(), "yyyy-MM-dd"),
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
      payment_date: format(new Date(), "yyyy-MM-dd"),
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
      const startDate = new Date(formData.payment_date);
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
        created_at: new Date(formData.payment_date).toISOString(),
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

  const handleAddService = (member: any) => {
    setAddingServiceMember(member);
    setFormData({
      ...formData,
      zone: "",
      subscription_plan: "",
      coach_name: "",
      payment_date: format(new Date(), "yyyy-MM-dd"),
      notes: ""
    });
    setPaymentEntries([{ payment_method: "", amount: "" }]);
    setAddServiceDialogOpen(true);
  };

  const handleAddServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingServiceMember) return;
    
    setLoading(true);
    try {
      const validPayments = paymentEntries.filter(p => p.payment_method && p.amount);
      if (validPayments.length === 0) {
        toast.error("Please add at least one payment");
        setLoading(false);
        return;
      }

      const totalPaid = validPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const startDate = new Date(formData.payment_date);
      const expiryDate = calculateExpiryDate(startDate, formData.subscription_plan);
      const transactionId = crypto.randomUUID();

      // Insert new service
      const { error: serviceError } = await supabase
        .from("member_services")
        .insert([{
          member_id: addingServiceMember.id,
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
        member_id: addingServiceMember.id,
        amount: parseFloat(payment.amount),
        payment_method: payment.payment_method as any,
        subscription_plan: formData.subscription_plan as any,
        zone: formData.zone as any,
        transaction_id: transactionId,
        created_at: new Date(formData.payment_date).toISOString(),
      }));

      const { error: paymentError } = await supabase
        .from("payment_receipts")
        .insert(paymentRecords);

      if (paymentError) throw paymentError;

      toast.success(`New service added for ${addingServiceMember.full_name}! Total: ${totalPaid} AED`);
      setAddServiceDialogOpen(false);
      setAddingServiceMember(null);
      resetForm();
      fetchMembers();
    } catch (error: any) {
      toast.error(error.message || "Error adding service");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 dashboard-section">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-accent/5 to-transparent p-8 border border-border/50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 border-2 border-accent/20">
              <Users className="h-8 w-8 text-accent" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Manage Academy Members
              </h1>
              <p className="text-muted-foreground text-lg mt-1">
                Complete member management and registration system
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm text-muted-foreground">Total Active</p>
              <p className="text-2xl font-bold text-accent">
                {stats.active}
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-accent hover:bg-accent/90">
                  <Plus className="h-5 w-5 mr-2" />
                  Register Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>New Registration</DialogTitle>
                </DialogHeader>
                
                {/* Registration Type Toggle */}
                <div className="flex gap-2 p-4 bg-muted/30 rounded-lg">
                  <Button
                    type="button"
                    variant={registrationType === 'membership' ? 'default' : 'outline'}
                    onClick={() => setRegistrationType('membership')}
                    className="flex-1"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Regular Membership
                  </Button>
                  <Button
                    type="button"
                    variant={registrationType === 'event' ? 'default' : 'outline'}
                    onClick={() => setRegistrationType('event')}
                    className="flex-1"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Custom Event / Other
                  </Button>
                </div>

                {registrationType === 'event' ? (
                  // EVENT REGISTRATION FORM
                  <form onSubmit={handleEventSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="event_type">Event Type *</Label>
                      <Select
                        value={eventFormData.event_type}
                        onValueChange={(value) => setEventFormData({ ...eventFormData, event_type: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="workshop">🧘 Workshop / Class</SelectItem>
                          <SelectItem value="camp">⛺ Camp (Multi-day)</SelectItem>
                          <SelectItem value="tournament">🏆 Tournament</SelectItem>
                          <SelectItem value="seminar">📚 Seminar / Lecture</SelectItem>
                          <SelectItem value="day_pass">🎫 Day Pass / Guest</SelectItem>
                          <SelectItem value="private_session">👤 Private Session</SelectItem>
                          <SelectItem value="custom">✨ Custom Event</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="event_name">Event Name *</Label>
                      <Input
                        id="event_name"
                        placeholder="e.g., Summer Football Camp, Yoga Workshop"
                        value={eventFormData.event_name}
                        onChange={(e) => setEventFormData({ ...eventFormData, event_name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="event_date">Event Date *</Label>
                        <Input
                          id="event_date"
                          type="date"
                          value={eventFormData.event_date}
                          onChange={(e) => setEventFormData({ ...eventFormData, event_date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event_time">Event Time</Label>
                        <Input
                          id="event_time"
                          type="time"
                          value={eventFormData.event_time}
                          onChange={(e) => setEventFormData({ ...eventFormData, event_time: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="venue">Venue / Location</Label>
                        <Select
                          value={eventFormData.venue}
                          onValueChange={(value) => setEventFormData({ ...eventFormData, venue: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select venue" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="main_hall">Main Gym Hall</SelectItem>
                            <SelectItem value="ladies_gym">Ladies Gym Area</SelectItem>
                            <SelectItem value="football_court">Football Court</SelectItem>
                            <SelectItem value="swimming_pool">Swimming Pool</SelectItem>
                            <SelectItem value="basketball_court">Basketball Court</SelectItem>
                            <SelectItem value="paddle_court">Paddle Court</SelectItem>
                            <SelectItem value="crossfit_area">CrossFit Area</SelectItem>
                            <SelectItem value="outdoor">Outdoor Area</SelectItem>
                            <SelectItem value="conference_room">Conference Room</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="age_group">Age Group</Label>
                        <Select
                          value={eventFormData.age_group}
                          onValueChange={(value) => setEventFormData({ ...eventFormData, age_group: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select age group" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kids">Kids (5-12)</SelectItem>
                            <SelectItem value="youth">Youth (13-17)</SelectItem>
                            <SelectItem value="adults">Adults (18-59)</SelectItem>
                            <SelectItem value="seniors">Seniors (60+)</SelectItem>
                            <SelectItem value="all_ages">All Ages</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_capacity">Max Capacity (Optional)</Label>
                      <Input
                        id="max_capacity"
                        type="number"
                        min="1"
                        placeholder="e.g., 20"
                        value={eventFormData.max_capacity}
                        onChange={(e) => setEventFormData({ ...eventFormData, max_capacity: e.target.value })}
                      />
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Participant Information
                      </h4>
                      
                      <div className="space-y-2">
                        <Label htmlFor="participant_name">Full Name *</Label>
                        <Input
                          id="participant_name"
                          value={eventFormData.participant_name}
                          onChange={(e) => setEventFormData({ ...eventFormData, participant_name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="space-y-2">
                          <Label htmlFor="participant_phone">Phone Number *</Label>
                          <Input
                            id="participant_phone"
                            value={eventFormData.participant_phone}
                            onChange={(e) => setEventFormData({ ...eventFormData, participant_phone: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="participant_email">Email (Optional)</Label>
                          <Input
                            id="participant_email"
                            type="email"
                            value={eventFormData.participant_email}
                            onChange={(e) => setEventFormData({ ...eventFormData, participant_email: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Payment Details
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="event_amount">Amount (AED) *</Label>
                          <Input
                            id="event_amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={eventFormData.amount}
                            onChange={(e) => setEventFormData({ ...eventFormData, amount: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="event_payment_method">Payment Method *</Label>
                          <Select
                            value={eventFormData.payment_method}
                            onValueChange={(value) => setEventFormData({ ...eventFormData, payment_method: value })}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="online">Online Transfer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="event_notes">Additional Notes</Label>
                      <Textarea
                        id="event_notes"
                        placeholder="Special requirements, medical info, etc."
                        value={eventFormData.notes}
                        onChange={(e) => setEventFormData({ ...eventFormData, notes: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Registering..." : "Complete Event Registration"}
                    </Button>
                  </form>
                ) : (
                  // REGULAR MEMBERSHIP FORM
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

                  <div className="space-y-2">
                    <Label htmlFor="payment_date">Payment Date *</Label>
                    <Input
                      id="payment_date"
                      type="date"
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                      required
                    />
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
                          <SelectItem value="gym">🏋️ Gym</SelectItem>
                          <SelectItem value="ladies_gym">👩 Ladies Gym</SelectItem>
                          <SelectItem value="pt">💪 PT (Personal Training)</SelectItem>
                          <SelectItem value="crossfit">🏃 CrossFit</SelectItem>
                          <SelectItem value="football">⚽ Football Academy</SelectItem>
                          <SelectItem value="football_court">⚽ Football Court</SelectItem>
                          <SelectItem value="swimming">🏊 Swimming</SelectItem>
                          <SelectItem value="paddle_court">🎾 Paddle Court</SelectItem>
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
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Membership Overview</h2>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {statCardsData.map((stat) => (
            <Card 
              key={stat.title}
              className={cn(
                "stat-card-hover relative overflow-hidden",
                "border-l-4",
                stat.colorScheme === "energy" && "border-l-accent glow-green",
                stat.colorScheme === "performance" && "border-l-primary glow-blue",
                stat.colorScheme === "wellness" && "border-l-[hsl(var(--wellness))]",
                stat.colorScheme === "power" && "border-l-[hsl(var(--power))] glow-orange"
              )}
            >
              {/* Gradient overlay */}
              <div 
                className={cn(
                  "absolute top-0 right-0 w-32 h-32 opacity-5 blur-2xl rounded-full",
                  stat.colorScheme === "energy" && "bg-accent",
                  stat.colorScheme === "performance" && "bg-primary",
                  stat.colorScheme === "wellness" && "bg-[hsl(var(--wellness))]",
                  stat.colorScheme === "power" && "bg-[hsl(var(--power))]"
                )}
              />
              
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div 
                  className={cn(
                    "p-2 rounded-lg",
                    stat.colorScheme === "energy" && "bg-accent/10 text-accent",
                    stat.colorScheme === "performance" && "bg-primary/10 text-primary",
                    stat.colorScheme === "wellness" && "bg-[hsl(var(--wellness))]/10 text-[hsl(var(--wellness))]",
                    stat.colorScheme === "power" && "bg-[hsl(var(--power))]/10 text-[hsl(var(--power))]"
                  )}
                >
                  <stat.icon className="h-5 w-5" />
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="stat-number text-3xl font-bold mb-2">
                  {stat.value}
                </div>
                
                {/* Active/Expired breakdown */}
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span className="text-accent font-medium">Active: {stat.active}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-destructive" />
                    <span className="text-destructive font-medium">Expired: {stat.expired}</span>
                  </div>
                </div>
                
                {stat.description && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {stat.description}
                  </p>
                )}
                
                {stat.trend && (
                  <p className="text-xs font-medium text-accent mt-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {stat.trend}
                  </p>
                )}
                
                {/* Progress bar for active percentage */}
                {stat.value > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          stat.colorScheme === "energy" && "bg-accent",
                          stat.colorScheme === "performance" && "bg-primary",
                          stat.colorScheme === "wellness" && "bg-[hsl(var(--wellness))]",
                          stat.colorScheme === "power" && "bg-[hsl(var(--power))]"
                        )}
                        style={{ width: `${(stat.active / stat.value) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Add subtle separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Filters Section */}
      <Card className="border-l-4 border-l-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Filter className="h-5 w-5 text-primary" />
            </div>
            <span>Search & Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Search Input */}
            <div className="space-y-2 flex-1 min-w-[250px]">
              <Label>Search Members</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Zone Filter */}
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
                  <SelectItem value="football_student">Football Academy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Status Filter */}
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Active Filters Summary */}
          {(filterZone !== "all" || filterStatus !== "all" || search) && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">Active Filters:</span>
              <div className="flex gap-2">
                {filterZone !== "all" && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    Zone: {filterZone.replace('_', ' ')}
                  </Badge>
                )}
                {filterStatus !== "all" && (
                  <Badge variant="secondary" className={cn(
                    filterStatus === "active" ? "bg-accent/10 text-accent border-accent/20" : "bg-destructive/10 text-destructive border-destructive/20"
                  )}>
                    Status: {filterStatus}
                  </Badge>
                )}
                {search && (
                  <Badge variant="secondary" className="bg-muted">
                    Search: "{search}"
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card className="border-l-4 border-l-accent/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-accent/10">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <span>Members List</span>
              <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'}
              </Badge>
            </CardTitle>
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
                    <Badge 
                      variant={getMemberStatus(member) === "active" ? "default" : "destructive"}
                      className={cn(
                        "flex items-center gap-1 w-fit",
                        getMemberStatus(member) === "active" 
                          ? "bg-accent/90 hover:bg-accent text-white border-accent" 
                          : "bg-destructive/90 hover:bg-destructive"
                      )}
                    >
                      {getMemberStatus(member) === "active" ? (
                        <UserCheck className="h-3 w-3" />
                      ) : (
                        <UserX className="h-3 w-3" />
                      )}
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
                        onClick={() => handleAddService(member)}
                        className="text-accent hover:text-accent"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Service
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
                    <SelectItem value="football_student">Football Academy</SelectItem>
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

            <div className="space-y-2">
              <Label htmlFor="renew_payment_date">Payment Date *</Label>
              <Input
                id="renew_payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                max={format(new Date(), "yyyy-MM-dd")}
                required
              />
              <p className="text-xs text-muted-foreground">
                Select the actual date the payment was made
              </p>
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

      {/* Add Service Dialog */}
      <Dialog open={addServiceDialogOpen} onOpenChange={setAddServiceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Service - {addingServiceMember?.full_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddServiceSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add_zone">Zone *</Label>
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
                    <SelectItem value="football_student">Football Academy</SelectItem>
                    <SelectItem value="football_court">Football Court</SelectItem>
                    <SelectItem value="basketball">Basketball</SelectItem>
                    <SelectItem value="swimming">Swimming</SelectItem>
                    <SelectItem value="paddle_court">Paddle Court</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="add_subscription_plan">Subscription Plan *</Label>
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
                <Label htmlFor="add_coach_name">Coach Name</Label>
                <Input
                  id="add_coach_name"
                  value={formData.coach_name}
                  onChange={(e) => setFormData({ ...formData, coach_name: e.target.value })}
                  placeholder="Enter coach name (optional)"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="add_payment_date">Payment Date *</Label>
              <Input
                id="add_payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Payment Details *</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={addPaymentEntry}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Payment Method
                </Button>
              </div>

              {paymentEntries.map((entry, index) => (
                <div key={index} className="relative p-4 border rounded-lg space-y-3">
                  {paymentEntries.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePaymentEntry(index)}
                      className="absolute top-2 right-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <div className="grid grid-cols-2 gap-4">
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
                          <SelectItem value="cash">💵 Cash</SelectItem>
                          <SelectItem value="card">💳 Card</SelectItem>
                          <SelectItem value="online">🌐 Online Transfer</SelectItem>
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
              {loading ? "Adding Service..." : "Add Service"}
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