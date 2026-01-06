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

    console.log("Starting notification sender...");

    // Fetch pending notifications
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from("notification_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch pending notifications: ${fetchError.message}`);
    }

    console.log(`Found ${pendingNotifications?.length || 0} pending notifications`);

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const notification of pendingNotifications || []) {
      try {
        // For now, we'll mark as sent and log the message
        // In production, integrate with WhatsApp Business API, Twilio, etc.
        console.log(`Sending ${notification.channel} notification to ${notification.recipient}`);
        console.log(`Message: ${notification.message}`);

        // Simulate sending (replace with actual API calls)
        let sendSuccess = true;
        let errorMessage = null;

        if (notification.channel === "whatsapp") {
          // TODO: Integrate with WhatsApp Business API
          // For now, we'll log to whatsapp_receipt_logs for manual sending
          const { error: logError } = await supabase
            .from("whatsapp_receipt_logs")
            .insert({
              member_id: notification.member_id,
              phone: notification.recipient,
              status: "pending",
              pdf_url: null,
            });

          if (logError) {
            console.error("Error logging WhatsApp notification:", logError);
          }
        }

        // Update notification status
        const { error: updateError } = await supabase
          .from("notification_queue")
          .update({
            status: sendSuccess ? "sent" : "failed",
            sent_at: sendSuccess ? new Date().toISOString() : null,
            error_message: errorMessage,
            retry_count: notification.retry_count + (sendSuccess ? 0 : 1),
          })
          .eq("id", notification.id);

        if (updateError) {
          console.error("Error updating notification status:", updateError);
        }

        if (sendSuccess) {
          results.sent++;
        } else {
          results.failed++;
          if (errorMessage) {
            results.errors.push(errorMessage);
          }
        }
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error processing notification ${notification.id}:`, error);
        
        await supabase
          .from("notification_queue")
          .update({
            status: "failed",
            error_message: errorMsg,
            retry_count: notification.retry_count + 1,
          })
          .eq("id", notification.id);

        results.failed++;
        results.errors.push(`Notification ${notification.id}: ${errorMsg}`);
      }
    }

    console.log("Sender completed:", results);

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
    console.error("Error in send-notifications:", error);
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
