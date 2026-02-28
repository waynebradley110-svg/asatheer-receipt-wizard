import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const zoneLabels: Record<string, string> = {
  gym: "Gym",
  ladies_gym: "Ladies Gym",
  pt: "Personal Training",
  crossfit: "CrossFit",
  football_court: "Football Court",
  football_student: "Football Student",
  swimming: "Swimming",
  paddle_court: "Paddle Court",
  football: "Football",
  other: "Other",
};

export function RealtimeAttendanceNotifier() {
  useEffect(() => {
    const channel = supabase
      .channel("attendance-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "attendance" },
        async (payload) => {
          const record = payload.new as {
            member_id: string;
            zone: string;
            check_in_time: string;
          };

          // Fetch member name
          const { data: member } = await supabase
            .from("members")
            .select("full_name, member_id")
            .eq("id", record.member_id)
            .maybeSingle();

          // Fetch active service to check status
          const { data: service } = await supabase
            .from("member_services")
            .select("expiry_date, is_active")
            .eq("member_id", record.member_id)
            .eq("is_active", true)
            .order("expiry_date", { ascending: false })
            .limit(1)
            .maybeSingle();

          const name = member?.full_name || "Unknown Member";
          const zone = zoneLabels[record.zone] || record.zone || "Unknown";
          const isExpired = service
            ? new Date(service.expiry_date) < new Date()
            : true;
          const time = new Date(record.check_in_time).toLocaleTimeString(
            "en-GB",
            { hour: "2-digit", minute: "2-digit" }
          );

          toast(
            `🏋️ ${name} checked in`,
            {
              description: `${zone} • ${time} • ${isExpired ? "⚠️ Expired" : "✅ Active"}`,
              duration: 5000,
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
