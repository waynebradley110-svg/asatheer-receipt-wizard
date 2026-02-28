import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Zap, Calendar, MapPin, Clock, User, Phone, ShieldCheck, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";

interface MemberData {
  full_name: string;
  member_id: string;
  phone_number: string;
  is_vip: boolean;
}

interface ServiceData {
  zone: string;
  expiry_date: string;
  subscription_plan: string;
  is_active: boolean;
  coach_name: string | null;
}

interface AttendanceRecord {
  check_in_time: string;
  zone: string | null;
}

const zoneLabels: Record<string, string> = {
  gym: "Gym", ladies_gym: "Ladies Gym", pt: "Personal Training", crossfit: "CrossFit",
  football_court: "Football Court", football_student: "Football Student", swimming: "Swimming",
  paddle_court: "Paddle Court", football: "Football", other: "Other",
};

const planLabels: Record<string, string> = {
  "1_day": "1 Day", "1_month": "1 Month", "2_months": "2 Months", "3_months": "3 Months",
  "6_months": "6 Months", "1_year": "1 Year",
};

export default function MemberPortal() {
  const { memberId } = useParams<{ memberId: string }>();
  const [member, setMember] = useState<MemberData | null>(null);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!memberId) return;
    fetchData();
  }, [memberId]);

  const fetchData = async () => {
    setLoading(true);
    // Fetch member
    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("full_name, member_id, phone_number, is_vip")
      .eq("member_id", memberId)
      .maybeSingle();

    if (memberError || !memberData) {
      setError("Member not found. Please check your member ID.");
      setLoading(false);
      return;
    }

    setMember(memberData);

    // Fetch services & attendance in parallel using member's uuid
    const { data: allMembers } = await supabase
      .from("members")
      .select("id")
      .eq("member_id", memberId)
      .maybeSingle();

    if (!allMembers) {
      setLoading(false);
      return;
    }

    const [servicesRes, attendanceRes] = await Promise.all([
      supabase
        .from("member_services")
        .select("zone, expiry_date, subscription_plan, is_active, coach_name")
        .eq("member_id", allMembers.id)
        .order("expiry_date", { ascending: false }),
      supabase
        .from("attendance")
        .select("check_in_time, zone")
        .eq("member_id", allMembers.id)
        .order("check_in_time", { ascending: false })
        .limit(10),
    ]);

    if (servicesRes.data) setServices(servicesRes.data);
    if (attendanceRes.data) setAttendance(attendanceRes.data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading member info...</p>
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Member Not Found</h2>
            <p className="text-muted-foreground">{error || "Please check your member ID and try again."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeService = services.find(s => s.is_active && new Date(s.expiry_date) >= new Date());
  const isActive = !!activeService;
  const daysRemaining = activeService ? differenceInDays(new Date(activeService.expiry_date), new Date()) : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-bold text-primary text-sm">ASATHEER SPORTS ACADEMY</span>
          </div>
          <h1 className="text-2xl font-bold">{member.full_name}</h1>
          <p className="text-muted-foreground text-sm">Member ID: {member.member_id}</p>
          {member.is_vip && <Badge variant="secondary">⭐ VIP</Badge>}
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {isActive ? <ShieldCheck className="h-5 w-5 text-primary" /> : <ShieldAlert className="h-5 w-5 text-destructive" />}
              Membership Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={isActive ? "default" : "destructive"}>
                {isActive ? "Active" : "Expired"}
              </Badge>
            </div>
            {activeService && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Zone</span>
                  <span className="text-sm font-medium">{zoneLabels[activeService.zone] || activeService.zone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Expires</span>
                  <span className="text-sm font-medium">{format(new Date(activeService.expiry_date), "dd/MM/yyyy")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <span className="text-sm font-medium">{planLabels[activeService.subscription_plan] || activeService.subscription_plan}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Days Remaining</span>
                  <Badge variant={daysRemaining <= 7 ? "destructive" : "secondary"}>{daysRemaining} days</Badge>
                </div>
                {activeService.coach_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Coach</span>
                    <span className="text-sm font-medium">🏅 {activeService.coach_name}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Attendance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Recent Check-ins
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendance.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No attendance records</p>
            ) : (
              <div className="space-y-2">
                {attendance.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0 border-border">
                    <span>{format(new Date(a.check_in_time), "dd/MM/yyyy HH:mm")}</span>
                    <Badge variant="outline" className="text-xs">
                      {a.zone ? zoneLabels[a.zone] || a.zone : "—"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Powered by Asatheer Sports Academy
        </p>
      </div>
    </div>
  );
}
