// Meta ads for the "Análisis" tab: spend, conversations, clicks and impressions per day and campaign (Insights), each
// campaign's status and daily budget, and the dólar cripto of the day (dolarapi.com; she buys the dollars with ARQ,
// which follows it) to compare spend with sales in pesos. On Mondays ({ weekly: true }) it also writes the weekly
// review (what to pause, lower or raise within her daily cap, and the traffic light: how much to spend per day given the
// sales that came from ads) and sends it to Vale as a push notification. On Thursdays ({ brake: true }) it checks the
// week so far and warns her to drop to US$15 if the ads are not selling.
// Called by pg_cron (x-cron-key) every 3 hours, on Mondays and Thursdays, and from the panel (admin session, up to 90 days back).
// Secrets: META_ADS_TOKEN (a System User token with ads_read) and optionally META_AD_ACCOUNT.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.57.4'
import webpush from 'npm:web-push@3.6.7'

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
const usd = (value: number) => `US$${value.toFixed(2).replace('.', ',')}`
const ars = (value: number) => '$' + Math.round(value).toLocaleString('es-AR')

type Insight = { campaign_id: string; campaign_name: string; date_start: string; spend?: string; clicks?: string; impressions?: string; account_currency?: string; actions?: { action_type: string; value: string }[] }
type Campaign = { id: string; name: string; effective_status: string; daily_budget?: string; adsets?: { data: { daily_budget?: string; effective_status: string }[] } }

// Traffic light: Meta may take at most this much per sale that came from an ad (about half of a $50.000 ticket), so a
// daily budget is only worth it when the last 7 days brought enough ad sales to pay for it.
const MAX_COST_PER_AD_SALE = 25000
const LEVELS = [23, 15, 10]
// Trial month: alternating weeks (Monday to Sunday) at US$23 and US$15, to see whether 15 sells as much as 23.
const TRIAL = [
  { from: '2026-10-19', until: '2026-10-25', usd: 23 },
  { from: '2026-10-26', until: '2026-11-01', usd: 15 },
  { from: '2026-11-02', until: '2026-11-08', usd: 23 },
  { from: '2026-11-09', until: '2026-11-15', usd: 15 },
]
// Ad sales needed in 7 days for a daily budget to pay for itself.
const needed = (level: number, rate: number) => Math.ceil((level * 7 * rate) / MAX_COST_PER_AD_SALE)
const LIGHT: Record<number, string> = { 23: '🟢', 15: '🟡', 10: '🔴' }

/** Every page of a Graph API list. */
async function graphList<T>(first: string, token: string): Promise<T[]> {
  const rows: T[] = []
  let next: string | null = first
  while (next) {
    const response: Response = await fetch(next, { headers: { Authorization: `Bearer ${token}` } })
    const page = await response.json() as { data?: T[]; paging?: { next?: string }; error?: { message: string } }
    if (!response.ok || page.error) throw new Error(page.error?.message ?? `Meta respondió ${response.status}`)
    rows.push(...(page.data ?? []))
    next = page.paging?.next ?? null
  }
  return rows
}

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

  const body = await request.json().catch(() => ({})) as { days?: number; weekly?: boolean; review?: boolean; brake?: boolean }
  const days = Math.min(Math.max(Math.round(Number(body.days) || 3), 1), 90)
  const today = arDate(Date.now())

  // Dólar cripto: close to what ARQ charges her for the dollars she pays Meta with. A failure never stops the sync.
  let rate: number | null = null
  try {
    const response = await fetch('https://dolarapi.com/v1/dolares/cripto')
    if (response.ok) {
      const quote = await response.json() as { venta?: number }
      if (quote.venta && quote.venta > 0) {
        rate = quote.venta
        await admin.from('fx_rates').upsert({ day: today, ars_per_usd: rate, source: 'dolarapi-cripto', updated_at: new Date().toISOString() })
      }
    }
  } catch { /* keep the last saved rate */ }

  const token = Deno.env.get('META_ADS_TOKEN')
  let synced: { rows: number; campaigns: number } | null = null
  let syncError = ''
  if (token) {
    try {
      synced = await sync(admin, token, Deno.env.get('META_AD_ACCOUNT') ?? '930397056323189', days, today)
    } catch (error) {
      syncError = (error as Error).message
    }
  }

  // The weekly review works with whatever spend is loaded (from Meta or by hand).
  const review = body.weekly || body.review ? await weeklyReview(admin, today, Boolean(token), body.weekly === true) : null
  // Thursday: the week so far.
  const brake = body.brake ? await midweekBrake(admin, today) : null

  if (syncError) return json(502, { connected: true, error: syncError, rate, review })
  return json(200, { connected: Boolean(token), rate, ...(synced ?? {}), review, brake })
})

async function sync(admin: SupabaseClient, token: string, account: string, days: number, today: string) {
  const since = arDate(Date.now() - (days - 1) * DAY)
  const params = new URLSearchParams({
    level: 'campaign',
    time_increment: '1',
    time_range: JSON.stringify({ since, until: today }),
    fields: 'campaign_id,campaign_name,spend,clicks,impressions,actions,account_currency',
    limit: '500',
  })
  const rows = await graphList<Insight>(`${GRAPH}/act_${account}/insights?${params}`, token)
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
    if (error) throw new Error(error.message)
  }

  // Status and daily budget of every campaign (the budget may live in the campaign or in its ad sets). Minor units → USD.
  const fields = 'id,name,effective_status,daily_budget,adsets.limit(50){daily_budget,effective_status}'
  const campaigns = await graphList<Campaign>(`${GRAPH}/act_${account}/campaigns?fields=${encodeURIComponent(fields)}&limit=100`, token)
  const budgets = campaigns.map((campaign) => {
    const own = Number(campaign.daily_budget ?? 0)
    const sets = (campaign.adsets?.data ?? []).filter((set) => set.effective_status === 'ACTIVE').reduce((sum, set) => sum + Number(set.daily_budget ?? 0), 0)
    const minor = own || sets
    return { id: campaign.id, name: campaign.name, status: campaign.effective_status, daily_budget: minor ? minor / 100 : null, updated_at: new Date().toISOString() }
  })
  if (budgets.length) {
    const { error } = await admin.from('ad_campaigns').upsert(budgets)
    if (error) throw new Error(error.message)
  }
  return { rows: records.length, campaigns: budgets.length }
}

type CampaignWeek = { id: string; name: string; spend: number; conversations: number; perConversation: number | null; budget: number | null; active: boolean }
type Advice = { kind: 'semaforo' | 'bajar' | 'pausar' | 'subir' | 'ok' | 'ventas' | 'conectar'; text: string }

/** Last 7 full days: spend, sales and what to change so the money goes where conversations are cheapest, within the cap. */
async function weeklyReview(admin: SupabaseClient, today: string, connected: boolean, notify: boolean) {
  const since = arDate(Date.now() - 7 * DAY)
  const [{ data: spend }, { data: campaigns }, { data: sales }, { data: goal }, { data: fx }] = await Promise.all([
    admin.from('ad_spend').select('campaign_id, campaign_name, spend, conversations').gte('day', since).lt('day', today),
    admin.from('ad_campaigns').select('id, name, status, daily_budget'),
    admin.from('orders').select('total, origin').not('paid_at', 'is', null).neq('status', 'cancelled').lt('number', 90000).gte('paid_at', `${since}T03:00:00Z`).lt('paid_at', `${today}T03:00:00Z`),
    admin.from('savings_goal').select('ad_cap_usd').eq('id', 1).maybeSingle(),
    admin.from('fx_rates').select('ars_per_usd').order('day', { ascending: false }).limit(1),
  ])
  const cap = Number(goal?.ad_cap_usd ?? 23)
  // Budgets come from Meta (token) or from what Claude reads in Ads Manager each week (ad_campaigns either way).
  const knowsBudgets = connected || (campaigns ?? []).length > 0
  const rate = Number(fx?.[0]?.ars_per_usd ?? 0)

  const byCampaign = new Map<string, CampaignWeek>()
  const blank = (id: string, name: string): CampaignWeek => ({ id, name, spend: 0, conversations: 0, perConversation: null, budget: null, active: false })
  for (const row of spend ?? []) {
    const current = byCampaign.get(row.campaign_id) ?? blank(row.campaign_id, row.campaign_name)
    current.spend += Number(row.spend)
    current.conversations += row.conversations
    byCampaign.set(row.campaign_id, current)
  }
  for (const campaign of campaigns ?? []) {
    const current = byCampaign.get(campaign.id) ?? blank(campaign.id, campaign.name)
    current.active = campaign.status === 'ACTIVE'
    current.budget = campaign.daily_budget === null ? null : Number(campaign.daily_budget)
    byCampaign.set(campaign.id, current)
  }
  const list = [...byCampaign.values()].map((row) => ({ ...row, perConversation: row.conversations ? row.spend / row.conversations : null }))
  const active = list.filter((row) => row.active)
  const budget = active.reduce((sum, row) => sum + (row.budget ?? 0), 0)
  const spendUsd = list.reduce((sum, row) => sum + row.spend, 0)
  const conversations = list.reduce((sum, row) => sum + row.conversations, 0)
  const revenue = (sales ?? []).reduce((sum, sale) => sum + Number(sale.total), 0)
  const spendArs = spendUsd * rate
  const ranked = active.filter((row) => row.conversations >= 5 && row.perConversation !== null).sort((a, b) => a.perConversation! - b.perConversation!)
  const best = ranked[0]

  const advice: Advice[] = []
  if (!knowsBudgets) advice.push({ kind: 'conectar', text: 'Meta no está conectado al panel: la revisión usa el gasto cargado a mano y no ve los presupuestos. Conectalo desde Análisis.' })
  if (budget > cap) {
    const worst = active.filter((row) => row.budget).sort((a, b) => (b.perConversation ?? Infinity) - (a.perConversation ?? Infinity))[0]
    advice.push({ kind: 'bajar', text: `Las campañas activas suman ${usd(budget)} por día y tu tope es ${usd(cap)}: bajá ${usd(budget - cap)}${worst ? `, empezando por "${worst.name}"` : ''}.` })
  }
  for (const row of active) {
    if (row.spend >= 5 && row.conversations === 0) advice.push({ kind: 'pausar', text: `Pausá "${row.name}": gastó ${usd(row.spend)} en la semana sin conversaciones.` })
    else if (best && row.id !== best.id && row.perConversation !== null && row.spend >= 7 && row.perConversation > best.perConversation! * 1.5) {
      advice.push({ kind: 'pausar', text: `Pausá o bajá "${row.name}": cada conversación cuesta ${usd(row.perConversation)}, contra ${usd(best.perConversation!)} de "${best.name}". Pasale ese presupuesto a la más barata.` })
    }
  }
  if (best && knowsBudgets && budget > 0 && budget < cap - 2 && !advice.some((item) => item.kind === 'pausar')) {
    advice.push({ kind: 'subir', text: `Te quedan ${usd(cap - budget)} por día dentro del tope: sumáselos a "${best.name}", la conversación más barata (${usd(best.perConversation!)}).` })
  }
  const sold = (sales ?? []).length
  if (spendArs > 0) {
    const back = revenue / spendArs
    if (!sold) advice.push({ kind: 'ventas', text: `Gastaste ${ars(spendArs)} en anuncios y no hubo ventas en la semana: revisá cómo estás respondiendo los mensajes antes de subir presupuesto.` })
    else if (back < 2) advice.push({ kind: 'ventas', text: `Cada $1.000 en anuncios trajo ${ars(back * 1000)} en ventas: es poco margen. No subas presupuesto; priorizá cerrar las conversaciones que ya tenés.` })
    else advice.push({ kind: 'ok', text: `Cada $1.000 en anuncios trajo ${ars(back * 1000)} en ventas (${sold} ${sold === 1 ? 'venta' : 'ventas'}, costo por venta ${ars(spendArs / sold)}).` })
  }
  if (knowsBudgets && !advice.some((item) => item.kind === 'bajar' || item.kind === 'pausar' || item.kind === 'subir')) advice.unshift({ kind: 'ok', text: `Presupuestos en orden: ${usd(budget)} por día de un tope de ${usd(cap)}.` })

  // The traffic light goes first: it is the decision of the week.
  const light = await trafficLight(admin, today, sales ?? [], rate)
  advice.unshift({ kind: 'semaforo', text: light.text })

  const stats = { since, until: today, cap, budget, spendUsd, spendArs, conversations, sales: sold, revenue, rate, campaigns: list, adSales: light.adSales, level: light.level, trial: light.trial }
  // The week is named by its Monday.
  const week = arDate(Date.now() - ((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7) * DAY)
  await admin.from('ad_reviews').upsert({ week, stats, advice, created_at: new Date().toISOString() })

  if (notify) await pushToAdmins(admin, '📊 Revisión semanal de anuncios', advice.slice(0, 3).map((item) => item.text).join(' '), '/admin#analisis')
  return { week, stats, advice }
}

/** The traffic light for next week, from the sales that came from ads in the last 7 days (origin "anuncio"). During the trial
 *  month the week's budget is fixed; after it, the light decides, and the first review after it compares 23 with 15. */
async function trafficLight(admin: SupabaseClient, today: string, sales: { total: number; origin: string | null }[], rate: number) {
  const adSales = sales.filter((sale) => sale.origin === 'anuncio').length
  const level = rate > 0 ? LEVELS.find((value) => adSales >= needed(value, rate)) ?? 10 : 15
  const counted = `${adSales} ${adSales === 1 ? 'venta' : 'ventas'} de anuncio en 7 días`
  const week = TRIAL.findIndex((row) => today >= row.from && today <= row.until)
  if (week >= 0) {
    const target = TRIAL[week].usd
    return { adSales, level, trial: week + 1, text: `Semana de prueba ${week + 1} de 4: esta semana el presupuesto va a US$${target} por día (sumando todas las campañas). Con ${counted}, el semáforo marcaría ${LIGHT[level]} US$${level}.` }
  }
  const last = TRIAL[TRIAL.length - 1]
  if (today > last.until && today <= arDate(new Date(`${last.until}T12:00:00Z`).getTime() + 8 * DAY)) {
    // Trial over: ad sales of the weeks at 23 against the weeks at 15.
    const { data: orders } = await admin.from('orders').select('paid_at').eq('origin', 'anuncio').not('paid_at', 'is', null).neq('status', 'cancelled').lt('number', 90000).gte('paid_at', `${TRIAL[0].from}T03:00:00Z`)
    const per = (usdLevel: number) => (orders ?? []).filter((order) => {
      const day = arDate(new Date(order.paid_at).getTime())
      return TRIAL.some((row) => row.usd === usdLevel && day >= row.from && day <= row.until)
    }).length
    const high = per(23)
    const low = per(15)
    const verdict = high === 0
      ? 'Con tan pocas ventas de anuncio todavía no se puede comparar.'
      : low >= high * 0.8
        ? `A US$15 se vendió casi lo mismo (${Math.round((low / high) * 100)}%): conviene quedarse en 15 y usar la diferencia para empujar los posts que peguen.`
        : 'A US$23 se vendió bastante más: conviene volver a 23 mientras el semáforo dé verde.'
    return { adSales, level, trial: 0, text: `Prueba terminada: semanas a US$23, ${high} ventas de anuncio; semanas a US$15, ${low}. ${verdict}` }
  }
  const advice = level === 23 ? 'seguí en US$23 por día' : level === 15 ? 'bajá a US$15 por día' : 'bajá a US$10 por día y dejá solo la campaña más barata'
  return { adSales, level, trial: 0, text: `${LIGHT[level]} Semáforo: ${counted} (para US$23 hacen falta ${needed(23, rate)}, para US$15, ${needed(15, rate)}): ${advice}.` }
}

/** Thursday: if this week runs at US$23 and the ads brought fewer than 3 sales since Monday, drop to 15 until Monday. */
async function midweekBrake(admin: SupabaseClient, today: string) {
  const monday = arDate(Date.now() - ((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7) * DAY)
  const trial = TRIAL.find((row) => today >= row.from && today <= row.until)
  const { data: review } = await admin.from('ad_reviews').select('stats').eq('week', monday).maybeSingle()
  const target = trial?.usd ?? Number((review?.stats as { level?: number } | null)?.level ?? 23)
  const { count } = await admin.from('orders').select('id', { count: 'exact', head: true }).eq('origin', 'anuncio').not('paid_at', 'is', null).neq('status', 'cancelled').lt('number', 90000).gte('paid_at', `${monday}T03:00:00Z`)
  const adSales = count ?? 0
  if (target < 23 || adSales >= 3) return { target, adSales, warned: false }
  await pushToAdmins(admin, '🟡 Freno de anuncios', `Van ${adSales} ${adSales === 1 ? 'venta' : 'ventas'} de anuncio desde el lunes: bajá a US$15 por día hasta el lunes. Cargá el origen de cada venta para que la cuenta sea justa.`, '/admin#analisis')
  return { target, adSales, warned: true }
}

async function pushToAdmins(admin: SupabaseClient, title: string, body: string, url: string) {
  const { data: config } = await admin.rpc('push_config')
  if (!config?.private || !config?.public) return
  webpush.setVapidDetails('mailto:ayuda.armadodecv@gmail.com', config.public, config.private)
  const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin')
  const { data: subscriptions } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth').in('user_id', (admins ?? []).map((row) => row.id))
  for (const subscription of subscriptions ?? []) {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title, body: body.slice(0, 230), url }), { TTL: 60 * 60 * 24, urgency: 'normal' })
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
    }
  }
}
