// Meta ads for the "Análisis" tab: spend, conversations, clicks and impressions per day and campaign (Insights), each
// campaign's status and daily budget, and the dólar cripto of the day (dolarapi.com; she buys the dollars with ARQ,
// which follows it) to compare spend with sales in pesos. On Mondays ({ weekly: true }) it also writes the weekly
// review (what to pause or lower by the rules of her savings plan, and the traffic light: how much to spend per day given
// the sales that came from ads) and sends it to Vale as a push notification. On Thursdays ({ brake: true }) it checks the
// week so far and warns her if half the weekly cap is gone and the ads are not selling. Every run also adds up the spend
// since Meta's last charge and warns her once it reaches the balance alert (US$75).
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

// Plan of 19/10 (spend less, sell the same): the rules live in savings_goal so they can change without a deploy.
type Rules = { cap: number; weeklyCap: number; maxPerConversation: number; targetPerSale: number; balanceAlert: number; balanceUsd: number | null; balanceOn: string | null }
async function rules(admin: SupabaseClient): Promise<Rules> {
  const { data } = await admin.from('savings_goal').select('ad_cap_usd, weekly_cap_usd, max_per_conversation_usd, target_per_sale_usd, balance_alert_usd, meta_balance_usd, meta_balance_on').eq('id', 1).maybeSingle()
  return {
    cap: Number(data?.ad_cap_usd ?? 11),
    weeklyCap: Number(data?.weekly_cap_usd ?? 80),
    maxPerConversation: Number(data?.max_per_conversation_usd ?? 0.4),
    targetPerSale: Number(data?.target_per_sale_usd ?? 6),
    balanceAlert: Number(data?.balance_alert_usd ?? 75),
    // The "Saldo actual" from Billing, noted by hand on a day.
    balanceUsd: data?.meta_balance_usd === null || data?.meta_balance_usd === undefined ? null : Number(data.meta_balance_usd),
    balanceOn: data?.meta_balance_on ?? null,
  }
}
// Traffic light: a daily budget is only worth it when the last 7 days brought enough ad sales for each one to cost at
// most the target (US$6, under a quarter of the ticket). The top level is the plan's base (11 a day, 77 a week).
const LEVELS = [11, 8, 5]
const needed = (level: number, targetPerSale: number) => Math.ceil((level * 7) / targetPerSale)
const LIGHT: Record<number, string> = { 11: '🟢', 8: '🟡', 5: '🔴' }

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

  const plan = await rules(admin)
  // The weekly review works with whatever spend is loaded (from Meta or by hand).
  const review = body.weekly || body.review ? await weeklyReview(admin, today, Boolean(token), body.weekly === true, plan) : null
  // Thursday: the week so far.
  const brake = body.brake ? await midweekBrake(admin, today, plan) : null
  // Every run: how much was spent since Meta's last charge, with a notification once it reaches the alert.
  const balance = await balanceCheck(admin, plan)

  if (syncError) return json(502, { connected: true, error: syncError, rate, review, balance })
  return json(200, { connected: Boolean(token), rate, ...(synced ?? {}), review, brake, balance })
})

/** Spend since the last charge (or balance added) that Meta took: the "saldo" that builds up until the next charge. Once
 *  it reaches the alert (US$75, before Meta charges at about US$85) Vale gets one notification per cycle, so she has
 *  dollars in ARQ when the charge comes, and can stop to look at what is spending. */
async function balanceCheck(admin: SupabaseClient, plan: Rules) {
  const { data: last } = await admin.from('meta_payments').select('day, amount_usd').order('day', { ascending: false }).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!last) return null
  // The balance she noted from Billing is exact up to its day; after that (or without one), the spend loaded day by day.
  const noted = plan.balanceUsd !== null && plan.balanceOn !== null && plan.balanceOn >= last.day
  const { data: rows } = await admin.from('ad_spend').select('spend').gt('day', noted ? plan.balanceOn! : last.day)
  const spent = (noted ? plan.balanceUsd! : 0) + (rows ?? []).reduce((sum, row) => sum + Number(row.spend), 0)
  const key = `saldo-${last.day}-${last.amount_usd}`
  if (spent >= plan.balanceAlert) {
    const { data: sent } = await admin.from('ad_alerts').select('key').eq('key', key).maybeSingle()
    if (!sent) {
      await admin.from('ad_alerts').insert({ key })
      await pushToAdmins(admin, `💸 Meta ya gastó ${usd(spent)}`, `Desde el último cobro (${last.day.slice(8)}/${last.day.slice(5, 7)}) llevás ${usd(spent)} de gasto. Meta te cobra cerca de US$85: tené los dólares en ARQ y mirá en Análisis qué campaña conviene frenar.`, '/admin#analisis')
    }
  }
  return { since: last.day, spent, alert: plan.balanceAlert, reached: spent >= plan.balanceAlert }
}

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
async function weeklyReview(admin: SupabaseClient, today: string, connected: boolean, notify: boolean, plan: Rules) {
  const since = arDate(Date.now() - 7 * DAY)
  const [{ data: spend }, { data: campaigns }, { data: sales }, { data: fx }] = await Promise.all([
    admin.from('ad_spend').select('campaign_id, campaign_name, spend, conversations').gte('day', since).lt('day', today),
    admin.from('ad_campaigns').select('id, name, status, daily_budget'),
    admin.from('orders').select('total, origin').not('paid_at', 'is', null).neq('status', 'cancelled').lt('number', 90000).gte('paid_at', `${since}T03:00:00Z`).lt('paid_at', `${today}T03:00:00Z`),
    admin.from('fx_rates').select('ars_per_usd').order('day', { ascending: false }).limit(1),
  ])
  const cap = plan.cap
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
  // The week's total cap, looking ahead: what the active budgets would spend in 7 days.
  else if (budget * 7 > plan.weeklyCap) advice.push({ kind: 'bajar', text: `Con ${usd(budget)} por día se van ${usd(budget * 7)} en la semana, más que tu tope de ${usd(plan.weeklyCap)}: bajá la campaña más cara.` })
  for (const row of active) {
    if (row.spend >= 5 && row.conversations === 0) advice.push({ kind: 'pausar', text: `Pausá "${row.name}": gastó ${usd(row.spend)} en la semana sin conversaciones.` })
    else if (row.perConversation !== null && row.spend >= 3 && row.perConversation > plan.maxPerConversation) {
      advice.push({ kind: 'pausar', text: `Pausá o bajá "${row.name}": cada conversación cuesta ${usd(row.perConversation)} y tu límite es ${usd(plan.maxPerConversation)}.${best && best.id !== row.id ? ` La más barata es "${best.name}" (${usd(best.perConversation!)}).` : ''}` })
    }
  }
  // Money goes only behind a post that already did well on its own, and in place of the priciest campaign (not on top).
  const priciest = active.filter((row) => row.perConversation !== null).sort((a, b) => b.perConversation! - a.perConversation!)[0]
  if (knowsBudgets && priciest && active.length > 1 && !advice.some((item) => item.kind === 'pausar' || item.kind === 'bajar')) {
    advice.push({ kind: 'subir', text: `Publicación ganadora: elegí la de más guardados y compartidos de los últimos 7 días (suelen ser los "Cómo y dónde") y promocionala US$5 por día durante 4 días, con objetivo Mensajes y solo Instagram, pausando esos días "${priciest.name}" (la conversación más cara, ${usd(priciest.perConversation!)}). Así no subís el gasto.` })
  }
  const sold = (sales ?? []).length
  const adSold = (sales ?? []).filter((sale) => sale.origin === 'anuncio').length
  // Conversations that ended in a sale: the cheapest way to lower the cost per sale is closing more of the ones that arrive.
  if (conversations >= 30) {
    const close = adSold / conversations
    if (close < 0.08) advice.push({ kind: 'ventas', text: `De ${conversations} conversaciones salieron ${adSold} ventas por anuncio (${Math.round(close * 100)}%). Antes de gastar más, cerrá más: respondé en menos de 5 minutos, usá las respuestas guardadas con los packs y volvé a escribir a las 24 y 72 hs a quien no compró.` })
  }
  if (spendUsd > 0 && adSold > 0) {
    const perSale = spendUsd / adSold
    const kind: Advice['kind'] = perSale <= plan.targetPerSale ? 'ok' : 'ventas'
    advice.push({ kind, text: `Cada venta por anuncio costó ${usd(perSale)} (${ars(perSale * rate)}); la meta es ${usd(plan.targetPerSale)} como máximo.${kind === 'ventas' ? ' Bajá la campaña más cara antes de tocar las demás.' : ''}` })
  }
  if (spendArs > 0) {
    const back = revenue / spendArs
    if (!sold) advice.push({ kind: 'ventas', text: `Gastaste ${ars(spendArs)} en anuncios y no hubo ventas en la semana: revisá cómo estás respondiendo los mensajes antes de subir presupuesto.` })
    else if (back < 2) advice.push({ kind: 'ventas', text: `Cada $1.000 en anuncios trajo ${ars(back * 1000)} en ventas: es poco margen. No subas presupuesto; priorizá cerrar las conversaciones que ya tenés.` })
    else advice.push({ kind: 'ok', text: `Cada $1.000 en anuncios trajo ${ars(back * 1000)} en ventas (${sold} ${sold === 1 ? 'venta' : 'ventas'} en total).` })
  }
  if (knowsBudgets && !advice.some((item) => item.kind === 'bajar' || item.kind === 'pausar' || item.kind === 'subir')) advice.unshift({ kind: 'ok', text: `Presupuestos en orden: ${usd(budget)} por día de un tope de ${usd(cap)}.` })

  // The traffic light goes first: it is the decision of the week.
  const light = trafficLight(sales ?? [], plan)
  advice.unshift({ kind: 'semaforo', text: light.text })

  const stats = { since, until: today, cap, weeklyCap: plan.weeklyCap, budget, spendUsd, spendArs, conversations, sales: sold, revenue, rate, campaigns: list, adSales: light.adSales, level: light.level }
  // The week is named by its Monday.
  const week = arDate(Date.now() - ((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7) * DAY)
  await admin.from('ad_reviews').upsert({ week, stats, advice, created_at: new Date().toISOString() })

  if (notify) await pushToAdmins(admin, '📊 Revisión semanal de anuncios', advice.slice(0, 3).map((item) => item.text).join(' '), '/admin#analisis')
  return { week, stats, advice }
}

/** The traffic light for next week, from the sales that came from ads in the last 7 days (origin "anuncio"): the highest
 *  daily budget whose ad sales would each cost at most the target. */
function trafficLight(sales: { total: number; origin: string | null }[], plan: Rules) {
  const adSales = sales.filter((sale) => sale.origin === 'anuncio').length
  const level = LEVELS.find((value) => value <= plan.cap && adSales >= needed(value, plan.targetPerSale)) ?? LEVELS[LEVELS.length - 1]
  const counted = `${adSales} ${adSales === 1 ? 'venta' : 'ventas'} de anuncio en 7 días`
  const advice = level === LEVELS[0] ? `podés seguir en hasta US$${level} por día` : level === LEVELS[1] ? `quedate en US$${level} por día` : `bajá a US$${level} por día y dejá solo la campaña más barata`
  return { adSales, level, text: `${LIGHT[level] ?? '🟡'} Semáforo: ${counted} (para US$${LEVELS[0]} por día hacen falta ${needed(LEVELS[0], plan.targetPerSale)}, para US$${LEVELS[1]}, ${needed(LEVELS[1], plan.targetPerSale)}): ${advice}.` }
}

/** Thursday: the week so far. If more than half of the weekly cap is gone and the ads sold too little for it, warn her. */
async function midweekBrake(admin: SupabaseClient, today: string, plan: Rules) {
  const monday = arDate(Date.now() - ((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7) * DAY)
  const [{ data: rows }, { count }] = await Promise.all([
    admin.from('ad_spend').select('spend').gte('day', monday),
    admin.from('orders').select('id', { count: 'exact', head: true }).eq('origin', 'anuncio').not('paid_at', 'is', null).neq('status', 'cancelled').lt('number', 90000).gte('paid_at', `${monday}T03:00:00Z`),
  ])
  const spent = (rows ?? []).reduce((sum, row) => sum + Number(row.spend), 0)
  const adSales = count ?? 0
  const perSale = adSales ? spent / adSales : null
  if (spent < plan.weeklyCap / 2 || (perSale !== null && perSale <= plan.targetPerSale)) return { spent, adSales, warned: false }
  await pushToAdmins(admin, '🟡 Freno de anuncios', `Desde el lunes van ${usd(spent)} de ${usd(plan.weeklyCap)} y ${adSales} ${adSales === 1 ? 'venta' : 'ventas'} por anuncio${perSale !== null ? ` (${usd(perSale)} cada una)` : ''}. Bajá la campaña más cara hasta el lunes y cargá el origen de cada venta.`, '/admin#analisis')
  return { spent, adSales, warned: true }
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
