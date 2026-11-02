// Meta ads for the "Análisis" tab: spend, conversations, clicks and impressions per day and campaign (Insights), each
// campaign's status and daily budget, and the dólar cripto of the day (dolarapi.com; she buys the dollars with ARQ,
// which follows it) to compare spend with sales in pesos. On Mondays ({ weekly: true }) it also writes the weekly
// review (what to pause or lower by the rules of her savings plan, and the traffic light: how much to spend per day given
// the sales that came from ads) and sends it to Vale as a push notification. Her sales are strong Monday to Wednesday, so on
// Sunday night ({ boost: true }) it reminds her to raise the ads and on Thursdays ({ brake: true }) to lower them (and
// warns her if half the weekly cap is gone and the ads are not selling). Every run also adds up the spend
// since Meta's last charge (estimating the days not loaded yet) and warns her at US$60 and US$75, before Meta charges at US$85.
// Called by pg_cron (x-cron-key) every 3 hours, on Mondays, Thursdays and Sunday nights, and from the panel (admin session, up to 90 days back).
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
// Campaigns that send people to the web (the ATS test, guides) instead of WhatsApp.
const isTraffic = (name: string) => /tr[aá]fico|test ats/i.test(name)

type Insight = { campaign_id: string; campaign_name: string; date_start: string; spend?: string; clicks?: string; impressions?: string; account_currency?: string; actions?: { action_type: string; value: string }[] }
type Campaign = { id: string; name: string; effective_status: string; daily_budget?: string; adsets?: { data: { daily_budget?: string; effective_status: string }[] } }

// Plan of 19/10 (spend less, sell the same): the rules live in savings_goal so they can change without a deploy.
type Rules = { cap: number; weeklyCap: number; maxPerConversation: number; targetPerSale: number; balanceAlert: number; balanceUsd: number | null; balanceOn: string | null; limitUsd: number | null; limitSpent: number; limitOn: string | null }
async function rules(admin: SupabaseClient): Promise<Rules> {
  const { data } = await admin.from('savings_goal').select('ad_cap_usd, weekly_cap_usd, max_per_conversation_usd, target_per_sale_usd, balance_alert_usd, meta_balance_usd, meta_balance_on, meta_limit_usd, meta_limit_spent_usd, meta_limit_on').eq('id', 1).maybeSingle()
  return {
    cap: Number(data?.ad_cap_usd ?? 11),
    weeklyCap: Number(data?.weekly_cap_usd ?? 80),
    maxPerConversation: Number(data?.max_per_conversation_usd ?? 0.4),
    targetPerSale: Number(data?.target_per_sale_usd ?? 6),
    balanceAlert: Number(data?.balance_alert_usd ?? 75),
    // The "Saldo actual" from Billing, noted by hand on a day.
    balanceUsd: data?.meta_balance_usd === null || data?.meta_balance_usd === undefined ? null : Number(data.meta_balance_usd),
    balanceOn: data?.meta_balance_on ?? null,
    // The account spending limit (Billing): when the spend since its last reset reaches it, Meta stops the ads.
    limitUsd: data?.meta_limit_usd === null || data?.meta_limit_usd === undefined ? null : Number(data.meta_limit_usd),
    limitSpent: Number(data?.meta_limit_spent_usd ?? 0),
    limitOn: data?.meta_limit_on ?? null,
  }
}
// Traffic light: a daily budget is only worth it when the last 7 days brought enough ad sales for each one to cost at
// most the target. The levels follow her daily cap (US$23 since 1/11): the cap, about 70% of it and about 45%.
const levelsOf = (plan: Rules) => [plan.cap, Math.round(plan.cap * 0.7), Math.round(plan.cap * 0.45)]
const needed = (level: number, targetPerSale: number) => Math.ceil((level * 7) / targetPerSale)
const LIGHTS = ['🟢', '🟡', '🔴']
// Her sales are strong Monday to Wednesday and drop from Thursday (data of October 2026): the weekly cap goes 70% to
// Sunday night–Wednesday and 30% to Thursday–Saturday. With US$80 a week that is 14 and 8 a day, all campaigns together.
const rhythmOf = (plan: Rules) => ({ strong: Math.round((plan.weeklyCap * 0.7) / 4), weak: Math.round((plan.weeklyCap * 0.3) / 3) })

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

  const body = await request.json().catch(() => ({})) as { days?: number; weekly?: boolean; review?: boolean; brake?: boolean; boost?: boolean }
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
  // Sunday night: the strong days start tomorrow.
  if (body.boost) { const { strong } = rhythmOf(plan); await pushToAdmins(admin, '🟢 Mañana arrancan tus días fuertes', `Lunes a miércoles es cuando más vendés: subí a ${usd(strong)} por día entre todas las campañas, la mayor parte en la más barata por conversación. El jueves te aviso para bajar.`, '/admin#analisis') }
  // Every run: the balance building up until Meta's charge at US$85, with warnings at US$60 and US$75, and the spend
  // against the account limit (US$75 since 2/11), with warnings when US$15 and US$5 are left.
  const balance = await balanceCheck(admin, plan, today)
  const limit = await limitCheck(admin, plan, today)
  // The panel shows it as an urgent bar on every section (phone notifications are easy to miss).
  await admin.from('savings_goal').update({ meta_status: { balance, limit }, meta_status_at: new Date().toISOString() }).eq('id', 1)

  if (syncError) return json(502, { connected: true, error: syncError, rate, review, balance, limit })
  return json(200, { connected: Boolean(token), rate, ...(synced ?? {}), review, brake, balance, limit })
})

// Meta charges the card by itself when the balance reaches this (Billing: "Pagarás cuando tu saldo llegue a US$85").
const THRESHOLD = 85
const nextDay = (day: string) => new Date(Date.parse(`${day}T12:00:00Z`) + DAY).toISOString().slice(0, 10)

/** The "saldo" that builds up until Meta charges it at US$85. It starts from the balance last noted from Billing (by Vale
 *  or the daily task), or from Meta's last charge; then adds the spend loaded day by day and, for the days not loaded yet
 *  (that task only runs with her computer on), the daily budgets of the active campaigns. Past US$85 Meta charges the
 *  card (or tries to), so it counts again from zero. Two warnings per cycle, at US$60 and at the alert (US$75), so she has
 *  dollars on the card in time or lowers the ads; it runs every 3 hours on the server, also with her computer off. */
async function balanceCheck(admin: SupabaseClient, plan: Rules, today: string) {
  const { data: last } = await admin.from('meta_payments').select('day, amount_usd').order('day', { ascending: false }).order('created_at', { ascending: false }).limit(1).maybeSingle()
  // The balance noted from Billing is exact up to its day; after that, the spend loaded or estimated day by day.
  const noted = plan.balanceUsd !== null && plan.balanceOn !== null && (!last || plan.balanceOn >= last.day)
  if (!noted && !last) return null
  const from = noted ? plan.balanceOn! : last!.day
  const { loaded, estimated, perDay } = await spendSince(admin, from, today)
  const spent = (noted ? plan.balanceUsd! : 0) + loaded + estimated
  const cycle = Math.floor(spent / THRESHOLD)
  const balance = spent - cycle * THRESHOLD
  const base = `saldo-${from}-${noted ? plan.balanceUsd : last!.amount_usd}-${cycle}`
  // Only the highest warning reached goes out; the lower one is marked too, so it doesn't come after.
  const levels = [plan.balanceAlert - 15, plan.balanceAlert].filter((level) => balance >= level)
  if (levels.length) {
    const keys = levels.map((level) => `${base}-${level}`)
    const { data: sent } = await admin.from('ad_alerts').select('key').in('key', keys)
    const top = keys[keys.length - 1]
    if (!(sent ?? []).some((row) => row.key === top)) {
      await admin.from('ad_alerts').upsert(keys.map((key) => ({ key })), { onConflict: 'key', ignoreDuplicates: true })
      const left = THRESHOLD - balance
      const days = perDay ? left / perDay : null
      await pushToAdmins(admin, `💸 Meta: saldo en ${usd(balance)} de ${usd(THRESHOLD)}`, `Meta te cobra solo al llegar a ${usd(THRESHOLD)}: faltan ${usd(left)}${days !== null ? `, más o menos ${days < 1 ? 'hoy mismo' : `${Math.floor(days)} ${Math.floor(days) === 1 ? 'día' : 'días'}`} a ${usd(perDay)} por día` : ''}${estimated ? ' (calculado con tus presupuestos)' : ''}. Tené los dólares en la tarjeta o bajá los anuncios.`, '/admin#analisis')
    }
  }
  return { since: from, spent, balance, estimated, perDay, threshold: THRESHOLD, alert: plan.balanceAlert, reached: balance >= plan.balanceAlert }
}

/** The spend after a day: what is loaded day by day and, for the days not loaded yet (the loading task only runs with
 *  her computer on), the daily budgets of the active campaigns; today by the hours gone (Argentine time). */
async function spendSince(admin: SupabaseClient, from: string, today: string) {
  const [{ data: rows }, { data: campaigns }] = await Promise.all([
    admin.from('ad_spend').select('day, spend').gt('day', from),
    admin.from('ad_campaigns').select('daily_budget, status'),
  ])
  const loaded = (rows ?? []).reduce((sum, row) => sum + Number(row.spend), 0)
  const lastLoaded = (rows ?? []).reduce((max, row) => (row.day > max ? row.day : max), from)
  const perDay = (campaigns ?? []).filter((campaign) => campaign.status === 'ACTIVE').reduce((sum, campaign) => sum + Number(campaign.daily_budget ?? 0), 0)
  const hoursGone = ((Date.now() - 3 * 60 * 60 * 1000) % DAY) / (60 * 60 * 1000)
  let estimated = 0
  for (let day = nextDay(lastLoaded); day <= today; day = nextDay(day)) estimated += day === today ? (perDay * hoursGone) / 24 : perDay
  return { loaded, estimated, perDay }
}

/** The account spending limit Vale sets in Billing (US$75 since 2/11) so Meta never charges more than she has: when the
 *  spend since its last reset reaches it, the ads stop. Warnings when US$15 and when US$5 are left, so she pays the
 *  balance and resets the limit before the ads stop (once each per reset). */
async function limitCheck(admin: SupabaseClient, plan: Rules, today: string) {
  if (plan.limitUsd === null || plan.limitOn === null) return null
  const { loaded, estimated, perDay } = await spendSince(admin, plan.limitOn, today)
  const spent = plan.limitSpent + loaded + estimated
  const left = plan.limitUsd - spent
  const levels = [15, 5].filter((margin) => left <= margin)
  if (levels.length) {
    const keys = levels.map((margin) => `limite-${plan.limitOn}-${plan.limitSpent}-${margin}`)
    const { data: sent } = await admin.from('ad_alerts').select('key').in('key', keys)
    const top = keys[keys.length - 1]
    if (!(sent ?? []).some((row) => row.key === top)) {
      await admin.from('ad_alerts').upsert(keys.map((key) => ({ key })), { onConflict: 'key', ignoreDuplicates: true })
      const days = perDay ? Math.max(left, 0) / perDay : null
      const when = left <= 0 ? 'Ya se cortaron' : days !== null && days < 1 ? 'Se cortan hoy' : `Se cortan en ${Math.floor(days ?? 0)} ${Math.floor(days ?? 0) === 1 ? 'día' : 'días'}`
      await pushToAdmins(admin, `⛔ Meta: ${usd(Math.max(left, 0))} para el límite de ${usd(plan.limitUsd)}`, `${when} los anuncios${days !== null && left > 0 ? ` (a ${usd(perDay)} por día)` : ''}. Pagá el saldo en Facturación y tocá "Restablecer" en el límite de gasto de la cuenta para que sigan.`, '/admin#analisis')
    }
  }
  return { since: plan.limitOn, spent, limit: plan.limitUsd, left, estimated, perDay }
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
  const [{ data: spend }, { data: campaigns }, { data: sales }, { data: fx }, { count: leads }] = await Promise.all([
    admin.from('ad_spend').select('campaign_id, campaign_name, spend, conversations').gte('day', since).lt('day', today),
    admin.from('ad_campaigns').select('id, name, status, daily_budget'),
    admin.from('orders').select('total, origin').not('paid_at', 'is', null).neq('status', 'cancelled').lt('number', 90000).gte('paid_at', `${since}T03:00:00Z`).lt('paid_at', `${today}T03:00:00Z`),
    admin.from('fx_rates').select('ars_per_usd').order('day', { ascending: false }).limit(1),
    // People who left their details in the ATS test: what the traffic campaign is for (it brings no conversations).
    admin.from('ats_checks').select('id', { count: 'exact', head: true }).gte('created_at', `${since}T03:00:00Z`).lt('created_at', `${today}T03:00:00Z`),
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
  // Traffic campaigns (the ATS test) take people to the web, not to WhatsApp: they are judged by the test's leads, never
  // by conversations. The rest are judged by what a conversation costs.
  const traffic = active.filter((row) => isTraffic(row.name))
  const messaging = active.filter((row) => !isTraffic(row.name))
  const budget = active.reduce((sum, row) => sum + (row.budget ?? 0), 0)
  const spendUsd = list.reduce((sum, row) => sum + row.spend, 0)
  const conversations = list.reduce((sum, row) => sum + row.conversations, 0)
  const revenue = (sales ?? []).reduce((sum, sale) => sum + Number(sale.total), 0)
  const spendArs = spendUsd * rate
  const ranked = messaging.filter((row) => row.conversations >= 5 && row.perConversation !== null).sort((a, b) => a.perConversation! - b.perConversation!)
  const best = ranked[0]

  const advice: Advice[] = []
  if (!knowsBudgets) advice.push({ kind: 'conectar', text: 'Meta no está conectado al panel: la revisión usa el gasto cargado a mano y no ve los presupuestos. Conectalo desde Análisis.' })
  // The review comes on Monday, a strong day: the budgets may sum up to the strong-day level (the weak days balance it).
  const { strong, weak } = rhythmOf(plan)
  if (budget > strong) {
    const worst = messaging.filter((row) => row.budget).sort((a, b) => (b.perConversation ?? Infinity) - (a.perConversation ?? Infinity))[0]
    advice.push({ kind: 'bajar', text: `Las campañas activas suman ${usd(budget)} por día y para lunes a miércoles el tope es ${usd(strong)} (${usd(weak)} de jueves a sábado): bajá ${usd(budget - strong)}${worst ? `, empezando por "${worst.name}"` : ''}.` })
  }
  for (const row of messaging) {
    if (row.spend >= 5 && row.conversations === 0) advice.push({ kind: 'pausar', text: `Pausá "${row.name}": gastó ${usd(row.spend)} en la semana sin conversaciones.` })
    // The cheapest one is where the money should go: never told to pause.
    else if (row.id !== best?.id && row.perConversation !== null && row.spend >= 3 && row.perConversation > plan.maxPerConversation) {
      advice.push({ kind: 'pausar', text: `Pausá o bajá "${row.name}": cada conversación cuesta ${usd(row.perConversation)} y tu límite es ${usd(plan.maxPerConversation)}.${best && best.id !== row.id ? ` La más barata es "${best.name}" (${usd(best.perConversation!)}).` : ''}` })
    }
  }
  for (const row of traffic) {
    if (row.spend < 3) continue
    const people = leads ?? 0
    if (!people) advice.push({ kind: 'pausar', text: `Pausá "${row.name}": gastó ${usd(row.spend)} en la semana y nadie dejó sus datos en el test.` })
    else advice.push({ kind: 'ok', text: `"${row.name}": ${usd(row.spend)} en la semana y ${people} ${people === 1 ? 'persona dejó' : 'personas dejaron'} sus datos en el test (${usd(row.spend / people)} cada una). Se mide por esos contactos, no por conversaciones: escribiles desde Test ATS.` })
  }
  // Money goes only behind a post that already did well on its own, and in place of the priciest campaign (not on top).
  const priciest = messaging.filter((row) => row.perConversation !== null).sort((a, b) => b.perConversation! - a.perConversation!)[0]
  if (knowsBudgets && priciest && messaging.length > 1 && !advice.some((item) => item.kind === 'pausar' || item.kind === 'bajar')) {
    // Only posts that sell the CV (before/after, testimonials): the "Cómo y dónde" company posts bring people asking for
    // jobs, not CVs, so they are never promoted with the Mensajes goal.
    advice.push({ kind: 'subir', text: `Probá un posteo que venda el CV (antes y después o testimonio, no los "Cómo y dónde") como anuncio de Mensajes, solo Instagram, US$5 por día durante 4 días, pausando esos días "${priciest.name}" (la conversación más cara, ${usd(priciest.perConversation!)}). Así no subís el gasto.` })
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
  if (knowsBudgets && !advice.some((item) => item.kind === 'bajar' || item.kind === 'pausar' || item.kind === 'subir')) advice.unshift({ kind: 'ok', text: `Presupuestos en orden: ${usd(budget)} por día de un tope de ${usd(strong)} para lunes a miércoles.` })

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
  const levels = levelsOf(plan)
  const index = levels.findIndex((value) => adSales >= needed(value, plan.targetPerSale))
  const step = index < 0 ? levels.length - 1 : index
  const level = levels[step]
  const counted = `${adSales} ${adSales === 1 ? 'venta' : 'ventas'} de anuncio en 7 días`
  const advice = step === 0 ? `podés seguir en hasta US$${level} por día` : step === 1 ? `quedate en US$${level} por día` : `bajá a US$${level} por día y dejá solo la campaña más barata`
  return { adSales, level, text: `${LIGHTS[step]} Semáforo: ${counted} (para US$${levels[0]} por día hacen falta ${needed(levels[0], plan.targetPerSale)}, para US$${levels[1]}, ${needed(levels[1], plan.targetPerSale)}): ${advice}.` }
}

/** Thursday: the weak days start, so always the reminder to lower the ads until Sunday night; plus, if more than half of
 *  the weekly cap is gone and the ads sold too little for it, that warning too. */
async function midweekBrake(admin: SupabaseClient, today: string, plan: Rules) {
  const monday = arDate(Date.now() - ((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7) * DAY)
  const [{ data: rows }, { count }] = await Promise.all([
    admin.from('ad_spend').select('spend').gte('day', monday),
    admin.from('orders').select('id', { count: 'exact', head: true }).eq('origin', 'anuncio').not('paid_at', 'is', null).neq('status', 'cancelled').lt('number', 90000).gte('paid_at', `${monday}T03:00:00Z`),
  ])
  const spent = (rows ?? []).reduce((sum, row) => sum + Number(row.spend), 0)
  const adSales = count ?? 0
  const perSale = adSales ? spent / adSales : null
  const { weak } = rhythmOf(plan)
  const overspent = spent >= plan.weeklyCap / 2 && (perSale === null || perSale > plan.targetPerSale)
  const extra = overspent ? ` Ojo: van ${usd(spent)} de ${usd(plan.weeklyCap)} con ${adSales} ${adSales === 1 ? 'venta' : 'ventas'} por anuncio: pausá la más cara.` : ''
  await pushToAdmins(admin, '🔵 Jueves: modo fin de semana', `De jueves a sábado vendés menos: bajá a ${usd(weak)} por día entre todas las campañas. El domingo te aviso para subir.${extra}`, '/admin#analisis')
  return { spent, adSales, warned: overspent }
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
