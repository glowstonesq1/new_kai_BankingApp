// Supabase Edge Function: price-tick
// Triggered by a cron job (every 10 minutes via pg_cron or Supabase scheduler)
// Updates all stock prices with a random fluctuation + pending news impact

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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get config (could be stored in a settings table; using defaults here)
    const MIN_FLUCTUATION = 2   // %
    const MAX_FLUCTUATION = 8   // %

    // Fetch all stocks
    const { data: stocks, error: stocksError } = await supabase
      .from('stocks')
      .select('*')

    if (stocksError) throw stocksError

    // Fetch pending news (published but not yet priced in)
    const { data: pendingNews } = await supabase
      .from('news')
      .select('stock_id, sentiment, price_impact_percent')
      .eq('is_published', true)
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes

    const newsMap = new Map<string, number>()
    for (const article of pendingNews ?? []) {
      const impact = article.sentiment === 'negative'
        ? -Math.abs(article.price_impact_percent)
        : Math.abs(article.price_impact_percent)
      newsMap.set(article.stock_id, (newsMap.get(article.stock_id) ?? 0) + impact)
    }

    // Update each stock
    const updates = []
    for (const stock of stocks ?? []) {
      const randomPct = MIN_FLUCTUATION + Math.random() * (MAX_FLUCTUATION - MIN_FLUCTUATION)
      const direction = Math.random() > 0.5 ? 1 : -1
      const baseChange = randomPct * direction / 100

      const newsImpact = (newsMap.get(stock.id) ?? 0) / 100
      const totalChange = baseChange + newsImpact

      const newPrice = Math.max(1, +(stock.current_price * (1 + totalChange)).toFixed(2))

      updates.push(
        supabase
          .from('stocks')
          .update({
            previous_price: stock.current_price,
            current_price: newPrice,
            updated_at: new Date().toISOString(),
          })
          .eq('id', stock.id)
      )
    }

    await Promise.all(updates)

    return new Response(
      JSON.stringify({ success: true, updated: stocks?.length ?? 0, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('price-tick error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
