import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting notification scheduler...");

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Fetch notification settings
    const { data: settings } = await supabase
      .from("notification_settings")
      .select("*");

    const expiryReminderDays = settings?.find(s => s.setting_key === "expiry_reminder_days")?.setting_value || [7, 3, 1, 0];
    const birthdayEnabled = settings?.find(s => s.setting_key === "birthday_enabled")?.setting_value !== false;

    // Fetch active expiry reminder templates
    const { data: expiryTemplates } = await supabase
      .from("notification_templates")
      .select("*")
      .eq("type", "expiry_reminder")
      .eq("is_active", true);

    // Fetch members with expiring services
    const results = {
      expiryReminders: 0,
      birthdayWishes: 0,
      errors: [] as string[],
    };

    // Process expiry reminders
    for (const days of expiryReminderDays) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);
      const targetDateStr = targetDate.toISOString().split("T")[0];

      console.log(`Checking for memberships expiring on ${targetDateStr} (${days} days from now)`);

      // Fetch members with services expiring on target date
      const { data: expiringServices } = await supabase
        .from("member_services")
        .select(`
          id,
          expiry_date,
          zone,
          subscription_plan,
          members!inner (
            id,
            full_name,
            phone_number
          )
        `)
        .eq("expiry_date", targetDateStr)
        .eq("is_active", true);

      if (expiringServices && expiringServices.length > 0) {
        console.log(`Found ${expiringServices.length} expiring services for ${days} days reminder`);

        // Find the template for this trigger day
        const template = expiryTemplates?.find(t => 
          t.trigger_days && t.trigger_days.includes(days)
        );

        if (template) {
          for (const service of expiringServices) {
            const member = service.members as any;
            
            // Check if notification already queued
            const { data: existing } = await supabase
              .from("notification_queue")
              .select("id")
              .eq("member_id", member.id)
              .eq("notification_type", "expiry_reminder")
              .gte("scheduled_at", todayStr)
              .single();

            if (existing) {
              console.log(`Skipping duplicate notification for member ${member.id}`);
              continue;
            }

            // Replace template variables
            let message = template.message_template
              .replace(/\{\{member_name\}\}/g, member.full_name)
              .replace(/\{\{service_name\}\}/g, service.zone)
              .replace(/\{\{expiry_date\}\}/g, service.expiry_date);

            // Queue the notification
            const { error: insertError } = await supabase
              .from("notification_queue")
              .insert({
                member_id: member.id,
                template_id: template.id,
                notification_type: "expiry_reminder",
                channel: template.channels[0] || "whatsapp",
                recipient: member.phone_number,
                message,
                variables: {
                  member_name: member.full_name,
                  service_name: service.zone,
                  expiry_date: service.expiry_date,
                  days_until_expiry: days,
                },
                scheduled_at: new Date().toISOString(),
                status: "pending",
              });

            if (insertError) {
              console.error("Error queuing notification:", insertError);
              results.errors.push(`Failed to queue notification for ${member.full_name}`);
            } else {
              results.expiryReminders++;
            }
          }
        }
      }
    }

    // Process birthday wishes
    if (birthdayEnabled) {
      const todayMonth = today.getMonth() + 1;
      const todayDay = today.getDate();

      const { data: birthdayMembers } = await supabase
        .from("members")
        .select("id, full_name, phone_number, date_of_birth")
        .not("date_of_birth", "is", null);

      const { data: birthdayTemplate } = await supabase
        .from("notification_templates")
        .select("*")
        .eq("type", "birthday")
        .eq("is_active", true)
        .single();

      if (birthdayTemplate && birthdayMembers) {
        for (const member of birthdayMembers) {
          const dob = new Date(member.date_of_birth);
          if (dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDay) {
            // Check if already sent today
            const { data: existing } = await supabase
              .from("notification_queue")
              .select("id")
              .eq("member_id", member.id)
              .eq("notification_type", "birthday")
              .gte("scheduled_at", todayStr)
              .single();

            if (existing) continue;

            const message = birthdayTemplate.message_template
              .replace(/\{\{member_name\}\}/g, member.full_name);

            const { error: insertError } = await supabase
              .from("notification_queue")
              .insert({
                member_id: member.id,
                template_id: birthdayTemplate.id,
                notification_type: "birthday",
                channel: birthdayTemplate.channels[0] || "whatsapp",
                recipient: member.phone_number,
                message,
                variables: { member_name: member.full_name },
                scheduled_at: new Date().toISOString(),
                status: "pending",
              });

            if (!insertError) {
              results.birthdayWishes++;
            }
          }
        }
      }
    }

    console.log("Scheduler completed:", results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error in schedule-notifications:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
