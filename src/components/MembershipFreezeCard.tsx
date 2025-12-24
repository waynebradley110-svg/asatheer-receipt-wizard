import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays, differenceInDays } from "date-fns";
import { Snowflake, Pause, CalendarIcon, Search, User, X, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  member_id: string;
  full_name: string;
  phone_number: string;
  member_services: {
    id: string;
    zone: string;
    subscription_plan: string;
    expiry_date: string;
    is_active: boolean;
    freeze_status: string | null;
  }[];
}

interface SelectedService {
  id: string;
  zone: string;
  subscription_plan: string;
  expiry_date: string;
  is_active: boolean;
  freeze_status: string | null;
}

const REASONS = [
  { value: "travel", label: "Travel" },
  { value: "injury", label: "Injury" },
  { value: "medical", label: "Medical" },
  { value: "personal", label: "Personal Reason" },
  { value: "other", label: "Other" },
];

export const MembershipFreezeCard = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedService, setSelectedService] = useState<SelectedService | null>(null);
  const [actionType, setActionType] = useState<"freeze" | "suspend">("freeze");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(addDays(new Date(), 7));
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openSearch, setOpenSearch] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from("members")
      .select(`
        id,
        member_id,
        full_name,
        phone_number,
        member_services (
          id,
          zone,
          subscription_plan,
          expiry_date,
          is_active,
          freeze_status
        )
      `)
      .order("full_name");

    if (error) {
      toast.error("Failed to fetch members");
      return;
    }

    setMembers(data || []);
    setLoading(false);
  };

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members.slice(0, 10);
    const query = searchQuery.toLowerCase();
    return members
      .filter(m => 
        m.full_name.toLowerCase().includes(query) ||
        m.member_id.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [members, searchQuery]);

  const handleMemberSelect = (member: Member) => {
    setSelectedMember(member);
    setOpenSearch(false);
    setSearchQuery("");
    // Auto-select first active service
    const activeService = member.member_services?.find(s => s.is_active && !s.freeze_status);
    if (activeService) {
      setSelectedService(activeService);
    } else {
      setSelectedService(null);
    }
  };

  const handleQuickSelect = (days: number) => {
    setEndDate(addDays(startDate, days));
  };

  const freezeDuration = useMemo(() => {
    if (!endDate) return 0;
    return differenceInDays(endDate, startDate);
  }, [startDate, endDate]);

  const newExpiryDate = useMemo(() => {
    if (!selectedService || actionType === "suspend") return null;
    const currentExpiry = new Date(selectedService.expiry_date);
    return addDays(currentExpiry, freezeDuration);
  }, [selectedService, freezeDuration, actionType]);

  const handleConfirmAction = async () => {
    if (!selectedMember || !selectedService) return;

    setSubmitting(true);
    try {
      // Get current user for audit
      const { data: { user } } = await supabase.auth.getUser();
      const userName = user?.email || "Unknown";

      // Insert freeze record
      const { error: freezeError } = await supabase
        .from("membership_freezes")
        .insert({
          member_id: selectedMember.id,
          service_id: selectedService.id,
          action_type: actionType,
          freeze_start: format(startDate, "yyyy-MM-dd"),
          freeze_end: actionType === "freeze" && endDate ? format(endDate, "yyyy-MM-dd") : null,
          reason: reason || null,
          notes: notes || null,
          status: "active",
          created_by: userName,
        });

      if (freezeError) throw freezeError;

      // Update member_services freeze_status
      const updateData: any = {
        freeze_status: actionType === "freeze" ? "frozen" : "suspended",
      };

      // If suspending, also set is_active to false
      if (actionType === "suspend") {
        updateData.is_active = false;
      }

      const { error: serviceError } = await supabase
        .from("member_services")
        .update(updateData)
        .eq("id", selectedService.id);

      if (serviceError) throw serviceError;

      // Log to audit trail
      await supabase.from("financial_audit_trail").insert({
        action_type: actionType === "freeze" ? "MEMBERSHIP_FREEZE" : "MEMBERSHIP_SUSPEND",
        action_by: userName,
        table_name: "member_services",
        record_id: selectedService.id,
        description: `${actionType === "freeze" ? "Froze" : "Suspended"} membership for ${selectedMember.full_name} (${selectedMember.member_id})${actionType === "freeze" ? ` until ${format(endDate!, "dd/MM/yyyy")}` : ""}. Reason: ${reason || "Not specified"}`,
      });

      toast.success(
        actionType === "freeze" 
          ? `Membership frozen until ${format(endDate!, "dd/MM/yyyy")}` 
          : "Membership suspended successfully"
      );

      // Reset form
      setSelectedMember(null);
      setSelectedService(null);
      setActionType("freeze");
      setStartDate(new Date());
      setEndDate(addDays(new Date(), 7));
      setReason("");
      setNotes("");
      setShowConfirmDialog(false);

      // Refresh members
      fetchMembers();
    } catch (error: any) {
      toast.error(error.message || "Failed to apply action");
    } finally {
      setSubmitting(false);
    }
  };

  const clearSelection = () => {
    setSelectedMember(null);
    setSelectedService(null);
  };

  return (
    <Card className="border-l-4 border-l-primary/30 stat-card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Snowflake className="h-5 w-5 text-primary" />
          </div>
          <span>Membership Hold / Freeze Management</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Member Search */}
        <div className="space-y-2">
          <Label>Select Member</Label>
          {!selectedMember ? (
            <Popover open={openSearch} onOpenChange={setOpenSearch}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-start text-left font-normal"
                >
                  <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Search by name or ID...</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput 
                    placeholder="Search members..." 
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>No members found</CommandEmpty>
                    <CommandGroup>
                      {filteredMembers.map((member) => (
                        <CommandItem
                          key={member.id}
                          value={member.id}
                          onSelect={() => handleMemberSelect(member)}
                          className="cursor-pointer"
                        >
                          <User className="mr-2 h-4 w-4" />
                          <div className="flex flex-col">
                            <span className="font-medium">{member.full_name}</span>
                            <span className="text-xs text-muted-foreground">
                              ID: {member.member_id}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : (
            <div className="p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{selectedMember.full_name}</p>
                    <p className="text-xs text-muted-foreground">ID: {selectedMember.member_id}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={clearSelection}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Service Selection */}
              {selectedMember.member_services && selectedMember.member_services.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <Label className="text-xs">Select Service</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedMember.member_services.map((service) => (
                      <Badge
                        key={service.id}
                        variant={selectedService?.id === service.id ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-colors",
                          !service.is_active && "opacity-50",
                          service.freeze_status && "bg-primary/20 border-primary"
                        )}
                        onClick={() => !service.freeze_status && service.is_active && setSelectedService(service)}
                      >
                        {service.zone} - {service.subscription_plan}
                        {service.freeze_status && (
                          <Snowflake className="ml-1 h-3 w-3" />
                        )}
                      </Badge>
                    ))}
                  </div>
                  {selectedService && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Expires: {format(new Date(selectedService.expiry_date), "dd/MM/yyyy")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {selectedService && (
          <>
            {/* Action Type */}
            <div className="space-y-2">
              <Label>Action Type</Label>
              <RadioGroup
                value={actionType}
                onValueChange={(v) => setActionType(v as "freeze" | "suspend")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="freeze" id="freeze" />
                  <Label htmlFor="freeze" className="flex items-center gap-1 cursor-pointer">
                    <Snowflake className="h-4 w-4 text-primary" />
                    Freeze (auto-resume)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="suspend" id="suspend" />
                  <Label htmlFor="suspend" className="flex items-center gap-1 cursor-pointer">
                    <Pause className="h-4 w-4 text-[hsl(var(--power))]" />
                    Suspend (manual)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Duration */}
            {actionType === "freeze" && (
              <div className="space-y-2">
                <Label>Duration</Label>
                <div className="flex gap-2 flex-wrap">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-[130px]">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(startDate, "dd/MM/yy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => d && setStartDate(d)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="self-center text-muted-foreground">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-[130px]">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "dd/MM/yy") : "Select"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => date < startDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => handleQuickSelect(7)}>7 Days</Button>
                  <Button variant="outline" size="sm" onClick={() => handleQuickSelect(14)}>14 Days</Button>
                  <Button variant="outline" size="sm" onClick={() => handleQuickSelect(30)}>30 Days</Button>
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Status Preview */}
            <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="h-4 w-4" />
                Status Preview
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "ml-2",
                      actionType === "freeze" && "bg-primary/20 text-primary",
                      actionType === "suspend" && "bg-[hsl(var(--power))]/20 text-[hsl(var(--power))]"
                    )}
                  >
                    {actionType === "freeze" ? (
                      <><Snowflake className="h-3 w-3 mr-1" /> Frozen</>
                    ) : (
                      <><Pause className="h-3 w-3 mr-1" /> Suspended</>
                    )}
                  </Badge>
                </div>
                {actionType === "freeze" && endDate && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Resume:</span>
                      <span className="ml-2 font-medium">{format(endDate, "dd/MM/yyyy")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Days Paused:</span>
                      <span className="ml-2 font-medium">{freezeDuration}</span>
                    </div>
                    {newExpiryDate && (
                      <div>
                        <span className="text-muted-foreground">New Expiry:</span>
                        <span className="ml-2 font-medium text-accent">
                          {format(newExpiryDate, "dd/MM/yyyy")}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => setShowConfirmDialog(true)}
                className={cn(
                  actionType === "freeze" 
                    ? "bg-primary hover:bg-primary/90" 
                    : "bg-[hsl(var(--power))] hover:bg-[hsl(var(--power))]/90"
                )}
                disabled={actionType === "freeze" && !endDate}
              >
                {actionType === "freeze" ? (
                  <><Snowflake className="h-4 w-4 mr-2" /> Confirm Freeze</>
                ) : (
                  <><Pause className="h-4 w-4 mr-2" /> Suspend Membership</>
                )}
              </Button>
              <Button variant="outline" onClick={clearSelection}>
                Cancel
              </Button>
            </div>
          </>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionType === "freeze" ? "Confirm Membership Freeze" : "Confirm Membership Suspension"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {actionType === "freeze" ? (
                  <>
                    Are you sure you want to freeze <strong>{selectedMember?.full_name}</strong>'s membership
                    from <strong>{format(startDate, "dd/MM/yyyy")}</strong> to <strong>{endDate && format(endDate, "dd/MM/yyyy")}</strong>?
                    <br /><br />
                    The membership will automatically resume on the end date, and the expiry will be extended by {freezeDuration} days.
                  </>
                ) : (
                  <>
                    Are you sure you want to suspend <strong>{selectedMember?.full_name}</strong>'s membership?
                    <br /><br />
                    This will deactivate the membership until manually reactivated by an admin.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmAction}
                disabled={submitting}
                className={cn(
                  actionType === "freeze" 
                    ? "bg-primary hover:bg-primary/90" 
                    : "bg-[hsl(var(--power))] hover:bg-[hsl(var(--power))]/90"
                )}
              >
                {submitting ? "Processing..." : (actionType === "freeze" ? "Confirm Freeze" : "Confirm Suspend")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
