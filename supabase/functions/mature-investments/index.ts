// Supabase Edge Function: mature-investments
// Triggered daily by a cron job
// 1. Matures FDs: credits principal + interest to balance
// 2. Processes RD installments: deducts monthly amount
// 3. Cleans up old transactions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const now = new Date()
  const results = { fd_matured: 0, rd_installments: 0, tx_deleted: 0 }

  try {
    // ============ 1. Mature FDs ============
    const { data: matureFDs } = await supabase
      .from('fixed_deposits')
      .select('*')
      .eq('is_matured', false)
      .lte('maturity_date', now.toISOString())

    for (const fd of matureFDs ?? []) {
      const years = fd.duration_days / 365
      const maturityAmount = fd.principal * Math.pow(1 + fd.interest_rate / 100, years)
      const interest = maturityAmount - fd.principal

      // Get current balance
      const { data: account } = await supabase
        .from('accounts')
        .select('balance')
        .eq('user_id', fd.user_id)
        .single()

      if (!account) continue

      const newBalance = (account.balance || 0) + maturityAmount

      await supabase.from('accounts').update({
        balance: newBalance,
        updated_at: now.toISOString(),
      }).eq('user_id', fd.user_id)

      await supabase.from('transactions').insert({
        user_id: fd.user_id,
        type: 'interest_credit',
        amount: maturityAmount,
        description: `FD matured: ₹${fd.principal} + ₹${interest.toFixed(2)} interest`,
      })

      await supabase.from('fixed_deposits').update({ is_matured: true }).eq('id', fd.id)

      results.fd_matured++
    }

    // ============ 2. Process RD Installments ============
    const { data: dueRDs } = await supabase
      .from('recurring_deposits')
      .select('*')
      .eq('is_active', true)
      .lte('next_due_date', now.toISOString())

    for (const rd of dueRDs ?? []) {
      const { data: account } = await supabase
        .from('accounts')
        .select('balance')
        .eq('user_id', rd.user_id)
        .single()

      if (!account || account.balance < rd.monthly_amount) continue

      const newInstallments = rd.installments_paid + 1
      const isComplete = newInstallments >= rd.duration_months

      // Deduct installment
      await supabase.from('accounts').update({
        balance: account.balance - rd.monthly_amount,
        updated_at: now.toISOString(),
      }).eq('user_id', rd.user_id)

      await supabase.from('transactions').insert({
        user_id: rd.user_id,
        type: 'rd_installment',
        amount: rd.monthly_amount,
        description: `RD Installment ${newInstallments}/${rd.duration_months}`,
      })

      if (isComplete) {
        // Calculate maturity amount
        const r = rd.interest_rate / 100 / 12
        const maturityAmount = r === 0
          ? rd.monthly_amount * rd.duration_months
          : rd.monthly_amount * ((Math.pow(1 + r, rd.duration_months) - 1) / r) * (1 + r)

        const { data: latestAccount } = await supabase
          .from('accounts')
          .select('balance')
          .eq('user_id', rd.user_id)
          .single()

        await supabase.from('accounts').update({
          balance: (latestAccount?.balance || 0) + maturityAmount,
          updated_at: now.toISOString(),
        }).eq('user_id', rd.user_id)

        await supabase.from('transactions').insert({
          user_id: rd.user_id,
          type: 'interest_credit',
          amount: maturityAmount,
          description: `RD matured: received ₹${maturityAmount.toFixed(2)}`,
        })

        await supabase.from('recurring_deposits').update({ is_active: false, installments_paid: newInstallments }).eq('id', rd.id)
      } else {
        // Schedule next installment
        const nextDue = new Date(rd.next_due_date)
        nextDue.setMonth(nextDue.getMonth() + 1)

        await supabase.from('recurring_deposits').update({
          installments_paid: newInstallments,
          next_due_date: nextDue.toISOString(),
        }).eq('id', rd.id)
      }

      results.rd_installments++
    }

    // ============ 3. Clean up old transactions (30 days default) ============
    const deleteThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const { count } = await supabase
      .from('transactions')
      .delete({ count: 'exact' })
      .lt('created_at', deleteThreshold.toISOString())

    results.tx_deleted = count ?? 0

    return new Response(
      JSON.stringify({ success: true, results, timestamp: now.toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('mature-investments error:', error)
    return new Response(
      JSON.stringify({ error: error.message, results }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
