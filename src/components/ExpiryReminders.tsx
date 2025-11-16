import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppButton } from "./WhatsAppButton";
import { Calendar, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpiringMember {
  id: string;
  full_name: string;
  phone_number: string;
  member_id: string;
  expiry_date: string;
  days_until_expiry: number;
}

export const ExpiryReminders = () => {
  const [expiringMembers, setExpiringMembers] = useState<ExpiringMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpiringMembers();
  }, []);

  const fetchExpiringMembers = async () => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { data: members } = await supabase
      .from("members")
      .select(`
        id,
        full_name,
        phone_number,
        member_id,
        member_services (
          expiry_date,
          is_active
        )
      `)
      .order('created_at', { ascending: false });

    const expiring: ExpiringMember[] = [];

    members?.forEach((member: any) => {
      member.member_services?.forEach((service: any) => {
        const expiryDate = new Date(service.expiry_date);
        const daysUntil = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (service.is_active && daysUntil > 0 && daysUntil <= 30) {
          expiring.push({
            id: member.id,
            full_name: member.full_name,
            phone_number: member.phone_number,
            member_id: member.member_id,
            expiry_date: service.expiry_date,
            days_until_expiry: daysUntil,
          });
        }
      });
    });

    // Sort by days until expiry
    expiring.sort((a, b) => a.days_until_expiry - b.days_until_expiry);

    setExpiringMembers(expiring);
    setLoading(false);
  };

  const getReminderMessage = (member: ExpiringMember) => {
    return `Hello ${member.full_name},\n\nThis is a friendly reminder from Asatheer Sports Academy.\n\nYour membership (ID: ${member.member_id}) will expire in ${member.days_until_expiry} day${member.days_until_expiry > 1 ? 's' : ''} on ${new Date(member.expiry_date).toLocaleDateString()}.\n\nPlease renew your membership to continue enjoying our facilities.\n\nThank you!`;
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 7) return "destructive";
    if (days <= 14) return "default";
    return "secondary";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Membership Expiry Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (expiringMembers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Membership Expiry Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No memberships expiring in the next 30 days
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-[hsl(var(--power))]/30 stat-card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[hsl(var(--power))]/10">
            <AlertCircle className="h-5 w-5 text-[hsl(var(--power))]" />
          </div>
          <span>Membership Expiry Reminders</span>
          <Badge variant="secondary" className="bg-[hsl(var(--power))]/10 text-[hsl(var(--power))] border-[hsl(var(--power))]/20">
            <Clock className="h-3 w-3 mr-1" />
            {expiringMembers.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {expiringMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/10 transition-colors stat-card-hover"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{member.full_name}</p>
                  <Badge variant={getUrgencyColor(member.days_until_expiry)}
                    className={cn(
                      "flex items-center gap-1",
                      member.days_until_expiry <= 7 && "bg-destructive/90 text-white",
                      member.days_until_expiry > 7 && member.days_until_expiry <= 14 && "bg-[hsl(var(--power))]/90 text-white",
                      member.days_until_expiry > 14 && "bg-accent/90 text-white"
                    )}
                  >
                    <Clock className="h-3 w-3" />
                    {member.days_until_expiry} day{member.days_until_expiry > 1 ? 's' : ''}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  ID: {member.member_id} | Expires: {new Date(member.expiry_date).toLocaleDateString()}
                </p>
              </div>
              <WhatsAppButton
                phoneNumber={member.phone_number}
                message={getReminderMessage(member)}
                variant="default"
                size="sm"
              >
                Send Reminder
              </WhatsAppButton>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
