// Meta ad spend for the "Análisis" tab: spend, conversations, clicks and impressions per day and campaign from the
// Marketing API (Insights), plus the dólar tarjeta of the day (dolarapi.com) to compare spend with sales in pesos.
// Called every 3 hours by pg_cron (x-cron-key, last 3 days) and from the panel's "Actualizar" (admin session, up to
// 90 days back). Secrets: META_ADS_TOKEN (a System User token with ads_read) and optionally META_AD_ACCOUNT.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const GRAPH = 'https://graph.facebook.com/v21.0'
// "Conversaciones con mensajes iniciadas": what the messaging campaigns are optimized for.
const CONVERSATION = 'onsite_conversion.messaging_conversation_started_7d'
const DAY = 24 * 60 * 60 * 1000
// Argentine calendar date (UTC-3 all year), 'YYYY-MM-DD'.
const arDate = (moment: number) => new Date(moment - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)

type Insight = { campaign_id: string; campaign_name: string; date_start: string; spend?: string; clicks?: string; impressions?: string; account_currency?: string; actions?: { action_type: string; value: string }[] }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const url = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // The scheduler (key from Vault) or the admin from the panel (her session).
  const cronKey = request.headers.get('x-cron-key')
  let allowed = false
  if (cronKey) {
    const { data: key } = await admin.rpc('cron_key')
    allowed = Boolean(key) && cronKey === key
  } else {
    const session = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } } })
    const { data: isAdmin } = await session.rpc('is_admin')
    allowed = isAdmin === true
  }
  if (!allowed) return json(401, { error: 'No autorizado' })

  const body = await request.json().catch(() => ({})) as { days?: number }
  const days = Math.min(Math.max(Math.round(Number(body.days) || 3), 1), 90)
  const today = arDate(Date.now())

  // Dólar tarjeta: the rate the card is charged at. A failure here never stops the spend sync.
  let rate: number | null = null
  try {
    const response = await fetch('https://dolarapi.com/v1/dolares/tarjeta')
    if (response.ok) {
      const quote = await response.json() as { venta?: number }
      if (quote.venta && quote.venta > 0) {
        rate = quote.venta
        await admin.from('fx_rates').upsert({ day: today, ars_per_usd: rate, source: 'dolarapi-tarjeta', updated_at: new Date().toISOString() })
      }
    }
  } catch { /* keep the last saved rate */ }

  const token = Deno.env.get('META_ADS_TOKEN')
  if (!token) return json(200, { connected: false, rate })
  const account = Deno.env.get('META_AD_ACCOUNT') ?? '930397056323189'

  const since = arDate(Date.now() - (days - 1) * DAY)
  const params = new URLSearchParams({
    level: 'campaign',
    time_increment: '1',
    time_range: JSON.stringify({ since, until: today }),
    fields: 'campaign_id,campaign_name,spend,clicks,impressions,actions,account_currency',
    limit: '500',
  })
  const rows: Insight[] = []
  let next: string | null = `${GRAPH}/act_${account}/insights?${params}`
  while (next) {
    const response: Response = await fetch(next, { headers: { Authorization: `Bearer ${token}` } })
    const page = await response.json() as { data?: Insight[]; paging?: { next?: string }; error?: { message: string } }
    if (!response.ok || page.error) return json(502, { connected: true, error: page.error?.message ?? `Meta respondió ${response.status}`, rate })
    rows.push(...(page.data ?? []))
    next = page.paging?.next ?? null
  }

  const records = rows.map((row) => ({
    day: row.date_start,
    campaign_id: row.campaign_id,
    campaign_name: row.campaign_name,
    spend: Number(row.spend ?? 0),
    conversations: Number(row.actions?.find((action) => action.action_type === CONVERSATION)?.value ?? 0),
    clicks: Number(row.clicks ?? 0),
    impressions: Number(row.impressions ?? 0),
    currency: row.account_currency ?? 'USD',
    source: 'meta',
    updated_at: new Date().toISOString(),
  }))
  if (records.length) {
    // Days that now come from Meta replace what was loaded by hand, so nothing counts twice.
    await admin.from('ad_spend').delete().eq('source', 'manual').in('day', [...new Set(records.map((record) => record.day))])
    const { error } = await admin.from('ad_spend').upsert(records)
    if (error) return json(500, { connected: true, error: error.message, rate })
  }
  return json(200, { connected: true, since, until: today, rows: records.length, rate })
})
