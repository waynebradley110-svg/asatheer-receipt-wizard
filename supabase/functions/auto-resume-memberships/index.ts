import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log('[AUTO-RESUME] Starting auto-resume check at', new Date().toISOString())

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]
    console.log('[AUTO-RESUME] Checking for frozen memberships with freeze_end <=', today)

    // Find all active frozen memberships where freeze_end is today or earlier
    const { data: frozenMemberships, error: fetchError } = await supabase
      .from('membership_freezes')
      .select(`
        id,
        member_id,
        service_id,
        freeze_start,
        freeze_end,
        action_type,
        reason,
        notes
      `)
      .eq('action_type', 'freeze')
      .eq('status', 'active')
      .lte('freeze_end', today)

    if (fetchError) {
      console.error('[AUTO-RESUME] Error fetching frozen memberships:', fetchError)
      throw fetchError
    }

    console.log('[AUTO-RESUME] Found', frozenMemberships?.length || 0, 'memberships to resume')

    if (!frozenMemberships || frozenMemberships.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No memberships to resume',
          resumed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = []

    for (const freeze of frozenMemberships) {
      try {
        console.log('[AUTO-RESUME] Processing freeze ID:', freeze.id)

        // Get the member service to extend the expiry date
        const { data: service, error: serviceError } = await supabase
          .from('member_services')
          .select('id, expiry_date, zone, subscription_plan')
          .eq('id', freeze.service_id)
          .maybeSingle()

        if (serviceError || !service) {
          console.error('[AUTO-RESUME] Error fetching service for freeze:', freeze.id, serviceError)
          results.push({ freeze_id: freeze.id, success: false, error: 'Service not found' })
          continue
        }

        // Calculate freeze duration in days
        const freezeStart = new Date(freeze.freeze_start)
        const freezeEnd = new Date(freeze.freeze_end)
        const freezeDurationMs = freezeEnd.getTime() - freezeStart.getTime()
        const freezeDurationDays = Math.ceil(freezeDurationMs / (1000 * 60 * 60 * 24))

        console.log('[AUTO-RESUME] Freeze duration:', freezeDurationDays, 'days')

        // Calculate new expiry date
        const currentExpiry = new Date(service.expiry_date)
        const newExpiry = new Date(currentExpiry.getTime() + freezeDurationMs)
        const newExpiryDate = newExpiry.toISOString().split('T')[0]

        console.log('[AUTO-RESUME] Extending expiry from', service.expiry_date, 'to', newExpiryDate)

        // Update member_services: clear freeze status and extend expiry
        const { error: updateServiceError } = await supabase
          .from('member_services')
          .update({
            freeze_status: null,
            expiry_date: newExpiryDate
          })
          .eq('id', freeze.service_id)

        if (updateServiceError) {
          console.error('[AUTO-RESUME] Error updating service:', updateServiceError)
          results.push({ freeze_id: freeze.id, success: false, error: 'Failed to update service' })
          continue
        }

        // Update membership_freezes: mark as completed
        const { error: updateFreezeError } = await supabase
          .from('membership_freezes')
          .update({
            status: 'completed',
            resumed_at: new Date().toISOString(),
            resumed_by: 'system-auto'
          })
          .eq('id', freeze.id)

        if (updateFreezeError) {
          console.error('[AUTO-RESUME] Error updating freeze record:', updateFreezeError)
          results.push({ freeze_id: freeze.id, success: false, error: 'Failed to update freeze record' })
          continue
        }

        // Get member info for audit log
        const { data: member } = await supabase
          .from('members')
          .select('full_name, member_id')
          .eq('id', freeze.member_id)
          .maybeSingle()

        // Log to financial_audit_trail
        const { error: auditError } = await supabase
          .from('financial_audit_trail')
          .insert({
            table_name: 'membership_freezes',
            record_id: freeze.id,
            action_type: 'auto_resume',
            action_by: 'system-auto',
            description: `Auto-resumed membership for ${member?.full_name || 'Unknown'} (${member?.member_id || 'N/A'}). ${service.zone} - ${service.subscription_plan}. Freeze duration: ${freezeDurationDays} days. Expiry extended from ${service.expiry_date} to ${newExpiryDate}.`
          })

        if (auditError) {
          console.warn('[AUTO-RESUME] Warning: Failed to log to audit trail:', auditError)
        }

        console.log('[AUTO-RESUME] Successfully resumed membership for freeze ID:', freeze.id)
        results.push({ 
          freeze_id: freeze.id, 
          success: true, 
          member_name: member?.full_name,
          freeze_duration_days: freezeDurationDays,
          new_expiry: newExpiryDate
        })

      } catch (err) {
        console.error('[AUTO-RESUME] Error processing freeze:', freeze.id, err)
        results.push({ freeze_id: freeze.id, success: false, error: String(err) })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log('[AUTO-RESUME] Completed. Success:', successCount, 'Failed:', failCount)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${frozenMemberships.length} memberships. ${successCount} resumed, ${failCount} failed.`,
        resumed: successCount,
        failed: failCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[AUTO-RESUME] Fatal error:', error)
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
