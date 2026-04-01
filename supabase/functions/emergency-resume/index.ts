import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log('[EMERGENCY-RESUME] Starting mass resume of emergency-frozen memberships...')

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const today = new Date().toISOString().split('T')[0]

    // Fetch all active emergency freezes
    const { data: emergencyFreezes, error: fetchError } = await supabase
      .from('membership_freezes')
      .select('id, member_id, service_id, freeze_start')
      .eq('action_type', 'freeze')
      .eq('status', 'active')
      .eq('created_by', 'system-emergency')

    if (fetchError) throw fetchError

    console.log('[EMERGENCY-RESUME] Found', emergencyFreezes?.length || 0, 'emergency freezes to resume')

    if (!emergencyFreezes || emergencyFreezes.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No emergency freezes to resume', resumed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let resumedCount = 0
    let failedCount = 0

    for (const freeze of emergencyFreezes) {
      try {
        // Calculate freeze duration
        const freezeStart = new Date(freeze.freeze_start)
        const now = new Date(today)
        const freezeDurationMs = now.getTime() - freezeStart.getTime()
        const freezeDurationDays = Math.ceil(freezeDurationMs / (1000 * 60 * 60 * 24))

        // Get current service expiry
        const { data: service, error: serviceError } = await supabase
          .from('member_services')
          .select('id, expiry_date, zone, subscription_plan')
          .eq('id', freeze.service_id)
          .maybeSingle()

        if (serviceError || !service) {
          console.error('[EMERGENCY-RESUME] Service not found for freeze', freeze.id)
          failedCount++
          continue
        }

        // Extend expiry by freeze duration
        const currentExpiry = new Date(service.expiry_date)
        const newExpiry = new Date(currentExpiry.getTime() + freezeDurationMs)
        const newExpiryDate = newExpiry.toISOString().split('T')[0]

        // Update service
        const { error: updateServiceError } = await supabase
          .from('member_services')
          .update({ freeze_status: null, expiry_date: newExpiryDate })
          .eq('id', freeze.service_id)

        if (updateServiceError) {
          failedCount++
          continue
        }

        // Mark freeze as completed
        const { error: updateFreezeError } = await supabase
          .from('membership_freezes')
          .update({
            status: 'completed',
            freeze_end: today,
            resumed_at: new Date().toISOString(),
            resumed_by: 'system-emergency-resume',
          })
          .eq('id', freeze.id)

        if (updateFreezeError) {
          failedCount++
          continue
        }

        resumedCount++
        console.log(`[EMERGENCY-RESUME] Resumed service ${service.id}: +${freezeDurationDays} days, new expiry: ${newExpiryDate}`)
      } catch (err) {
        console.error('[EMERGENCY-RESUME] Error processing freeze', freeze.id, err)
        failedCount++
      }
    }

    // Clear emergency flag
    await supabase
      .from('notification_settings')
      .update({ setting_value: { active: false, start_date: null, reason: null, ended_at: today } })
      .eq('setting_key', 'emergency_closure')

    // Audit trail
    await supabase.from('financial_audit_trail').insert({
      table_name: 'membership_freezes',
      action_type: 'emergency_mass_resume',
      action_by: 'system-emergency-resume',
      description: `Emergency mass resume completed. ${resumedCount} memberships resumed with expiry dates extended. ${failedCount} failed. Closure period ended ${today}.`,
    })

    console.log('[EMERGENCY-RESUME] Complete. Resumed:', resumedCount, 'Failed:', failedCount)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Emergency resume completed. ${resumedCount} memberships resumed with extended expiry dates.`,
        resumed: resumedCount,
        failed: failedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[EMERGENCY-RESUME] Fatal error:', error)
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
