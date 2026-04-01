import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log('[EMERGENCY-FREEZE] Starting emergency mass freeze...')

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const freezeDate = '2026-03-31'

    // Check if emergency is already active
    const { data: existingFlag } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('setting_key', 'emergency_closure')
      .maybeSingle()

    if (existingFlag?.setting_value?.active) {
      return new Response(
        JSON.stringify({ success: false, error: 'Emergency freeze is already active' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch all active, unfrozen services with expiry >= freeze date
    const { data: activeServices, error: fetchError } = await supabase
      .from('member_services')
      .select('id, member_id, zone, subscription_plan, expiry_date')
      .eq('is_active', true)
      .is('freeze_status', null)
      .gte('expiry_date', freezeDate)

    if (fetchError) throw fetchError

    console.log('[EMERGENCY-FREEZE] Found', activeServices?.length || 0, 'active services to freeze')

    if (!activeServices || activeServices.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active services to freeze', frozen: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let frozenCount = 0
    let failedCount = 0

    for (const service of activeServices) {
      try {
        // Insert freeze record
        const { error: insertError } = await supabase
          .from('membership_freezes')
          .insert({
            member_id: service.member_id,
            service_id: service.id,
            action_type: 'freeze',
            status: 'active',
            freeze_start: freezeDate,
            freeze_end: null,
            reason: 'Emergency Closure',
            notes: 'Emergency closure due to ongoing conflict in UAE. All memberships frozen until further notice.',
            created_by: 'system-emergency',
          })

        if (insertError) {
          console.error('[EMERGENCY-FREEZE] Insert error for service', service.id, insertError)
          failedCount++
          continue
        }

        // Update service freeze status
        const { error: updateError } = await supabase
          .from('member_services')
          .update({ freeze_status: 'frozen' })
          .eq('id', service.id)

        if (updateError) {
          console.error('[EMERGENCY-FREEZE] Update error for service', service.id, updateError)
          failedCount++
          continue
        }

        frozenCount++
      } catch (err) {
        console.error('[EMERGENCY-FREEZE] Error processing service', service.id, err)
        failedCount++
      }
    }

    // Set emergency closure flag
    if (existingFlag) {
      await supabase
        .from('notification_settings')
        .update({
          setting_value: { active: true, start_date: freezeDate, reason: 'Conflict in UAE' },
        })
        .eq('setting_key', 'emergency_closure')
    } else {
      await supabase
        .from('notification_settings')
        .insert({
          setting_key: 'emergency_closure',
          setting_value: { active: true, start_date: freezeDate, reason: 'Conflict in UAE' },
          description: 'Emergency closure flag for mass membership freeze',
        })
    }

    // Log to audit trail
    await supabase.from('financial_audit_trail').insert({
      table_name: 'membership_freezes',
      action_type: 'emergency_mass_freeze',
      action_by: 'system-emergency',
      description: `Emergency mass freeze activated. ${frozenCount} memberships frozen starting ${freezeDate}. Reason: Ongoing conflict in UAE. ${failedCount} failed.`,
    })

    console.log('[EMERGENCY-FREEZE] Complete. Frozen:', frozenCount, 'Failed:', failedCount)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Emergency freeze activated. ${frozenCount} memberships frozen.`,
        frozen: frozenCount,
        failed: failedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[EMERGENCY-FREEZE] Fatal error:', error)
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
