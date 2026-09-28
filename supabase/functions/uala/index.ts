// Card payments through Ualá Bis (API v2).
//   POST { action: 'create', order_id }  buyer's session → checkout link for the order total plus Ualá's fee.
//   POST { action: 'sync', order_id }    buyer's session → re-reads the order's Ualá payments (back from checkout).
//   POST ?webhook=1 { uuid, ... }        Ualá's notification. It is not signed, so it is only a hint:
//                                        the status is always read back from Ualá with our own token.
// Secrets: UALA_USERNAME, UALA_CLIENT_ID, UALA_CLIENT_SECRET and UALA_ENV ('stage' or 'production', stage by default).
// Customers see the option once payment_settings.card_enabled is on and UALA_ENV is 'production'; the admin always can, to test.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const SITE_URL = 'https://www.armadodecv.com'
// 'production', 'prod', 'producción'... all mean production; anything else is stage.
const ualaEnv = (Deno.env.get('UALA_ENV') ?? '').trim().toLowerCase()
const production = ualaEnv.startsWith('prod')
const AUTH_API = production ? 'https://auth.developers.ar.ua.la/v2/api' : 'https://auth.stage.developers.ar.ua.la/v2/api'
const CHECKOUT_API = production ? 'https://checkout.developers.ar.ua.la/v2/api' : 'https://checkout.stage.developers.ar.ua.la/v2/api'
const REUSE_LINK_MINUTES = 30

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

/** Same rounding as cardTotal in lib/orders.ts: the fee on top, rounded up to $10. */
const cardTotal = (total: number, fee: number) => Math.ceil(total / (1 - fee) / 10) * 10

let token: { value: string; expires: number } | null = null
async function ualaToken() {
  if (token && Date.now() < token.expires) return token.value
  // Trimmed: a pasted secret often carries a trailing space or line break.
  const username = Deno.env.get('UALA_USERNAME')?.trim(), clientId = Deno.env.get('UALA_CLIENT_ID')?.trim(), secret = Deno.env.get('UALA_CLIENT_SECRET')?.trim()
  if (!username || !clientId || !secret) throw new Error('Faltan las credenciales de Ualá')
  const response = await fetch(`${AUTH_API}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, client_id: clientId, client_secret_id: secret, grant_type: 'client_credentials' }),
  })
  if (!response.ok) {
    const detail = await response.json().then((error) => error?.message ?? error?.Message ?? '').catch(() => '')
    throw new Error(`Ualá rechazó las credenciales (${response.status}${detail ? `: ${detail}` : ''})`)
  }
  const body = await response.json()
  token = { value: body.access_token, expires: Date.now() + (Number(body.expires_in) || 3600) * 1000 - 60_000 }
  return token.value
}

async function ualaFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${CHECKOUT_API}${path}`, {
    ...init,
    headers: { ...init.headers, 'Content-Type': 'application/json', Authorization: `Bearer ${await ualaToken()}` },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(`Ualá respondió ${response.status}: ${body?.message ?? body?.Message ?? 'sin detalle'}`)
  return body
}

/** Reads a payment back from Ualá and applies it. Amounts travel in pesos (the docs say cents, but checkout showed 100x). */
async function syncPayment(ualaOrderId: string) {
  const { data: payment } = await admin.from('card_payments').select('order_id, amount').eq('uala_order_id', ualaOrderId).maybeSingle()
  if (!payment) return null
  const remote = await ualaFetch(`/orders/${encodeURIComponent(ualaOrderId)}`)
  let status = String(remote?.status ?? 'PENDING')
  // Anything that does not match what we asked for is left for the admin, never approved.
  const remoteAmount = Math.round(Number(remote?.amount))
  if (remote?.external_reference !== payment.order_id || remoteAmount !== payment.amount) status = `REVISAR_${status}`
  const { data, error } = await admin.rpc('mark_card_payment', { p_uala_order: ualaOrderId, p_status: status })
  if (error) throw new Error(error.message)
  return data as string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' })
  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* handled below */ }

  // Ualá's notification: answer 200 unless we could not check it, so Ualá retries (up to 3 more times).
  if (new URL(req.url).searchParams.has('webhook')) {
    const uuid = typeof body.uuid === 'string' ? body.uuid : ''
    if (!uuid) return json(200, { ok: true })
    try {
      await syncPayment(uuid)
      return json(200, { ok: true })
    } catch (error) {
      console.error('uala webhook', uuid, (error as Error).message)
      return json(500, { error: 'No se pudo verificar' })
    }
  }

  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })

  // Connection test for the admin panel (or with a short-lived admin_upload_tokens token): only asks Ualá for a token.
  if (body.action === 'check') {
    const uploadToken = req.headers.get('x-upload-token') ?? ''
    const { data: validToken } = uploadToken
      ? await admin.from('admin_upload_tokens').select('token').eq('token', uploadToken).gt('expires_at', new Date().toISOString()).maybeSingle()
      : { data: null }
    const { data: isAdmin } = validToken ? { data: true } : await userClient.rpc('is_admin')
    if (!isAdmin) return json(403, { error: 'Solo administración' })
    try {
      token = null
      await ualaToken()
      return json(200, { ok: true, env: production ? 'production' : 'stage' })
    } catch (error) {
      // Says which secrets exist (never their values) to tell a missing one from a wrong one.
      const loaded = Object.fromEntries(['UALA_USERNAME', 'UALA_CLIENT_ID', 'UALA_CLIENT_SECRET', 'UALA_ENV'].map((name) => [name, !!Deno.env.get(name)?.trim()]))
      return json(200, { ok: false, env: production ? 'production' : 'stage', uala_env: /^[a-záéíóú]{1,15}$/.test(ualaEnv) ? ualaEnv : '(otro valor)', loaded, error: (error as Error).message })
    }
  }

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json(401, { error: 'Iniciá sesión' })

  const orderId = String(body.order_id ?? '')
  const { data: order } = await admin.from('orders').select('id, number, user_id, total, status, paid_at').eq('id', orderId).maybeSingle()
  if (!order || order.user_id !== user.id) return json(404, { error: 'Pedido no encontrado' })

  try {
    if (body.action === 'sync') {
      const { data: payments } = await admin.from('card_payments').select('uala_order_id').eq('order_id', order.id)
        .not('status', 'in', '(APPROVED,PROCESSED,REJECTED,REFUNDED,ANULADA)').order('created_at', { ascending: false }).limit(3)
      let status = order.status as string
      for (const payment of payments ?? []) status = (await syncPayment(payment.uala_order_id)) ?? status
      return json(200, { status })
    }

    if (body.action !== 'create') return json(400, { error: 'Acción inválida' })
    const { data: settings } = await admin.from('payment_settings').select('card_enabled, card_fee').maybeSingle()
    // Customers only get real (production) checkouts: in stage anyone could "pay" with Ualá's public test card.
    // The admin can always open one to test.
    const { data: isAdmin } = await userClient.rpc('is_admin')
    if (!isAdmin && (!settings?.card_enabled || !production)) return json(400, { error: 'El pago con tarjeta todavía no está disponible. Podés pagar por transferencia.' })
    if (order.paid_at || !['pending_payment', 'payment_review'].includes(order.status)) return json(400, { error: 'Este pedido ya no espera un pago.' })

    const amount = cardTotal(order.total, Number(settings?.card_fee ?? 0.05929))
    // Tapping the button twice reuses the same link instead of opening a second Ualá order.
    const since = new Date(Date.now() - REUSE_LINK_MINUTES * 60_000).toISOString()
    const { data: recent } = await admin.from('card_payments').select('checkout_url').eq('order_id', order.id)
      .eq('amount', amount).eq('status', 'PENDING').gte('created_at', since).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (recent) return json(200, { url: recent.checkout_url, amount })

    const back = `${SITE_URL}/cuenta/pedido/${order.id}`
    const created = await ualaFetch('/checkout', {
      method: 'POST',
      body: JSON.stringify({
        amount: String(amount),
        description: `Armado de CV · Pedido #${order.number}`,
        callback_success: `${back}?pago=ok`,
        callback_fail: `${back}?pago=error`,
        notification_url: `${supabaseUrl}/functions/v1/uala?webhook=1`,
        external_reference: order.id,
      }),
    })
    const url = created?.links?.checkout_link
    if (!created?.uuid || !url) throw new Error('Ualá no devolvió el link de pago')
    const { error } = await admin.from('card_payments').insert({ uala_order_id: created.uuid, order_id: order.id, amount, checkout_url: url })
    if (error) throw new Error(error.message)
    return json(200, { url, amount })
  } catch (error) {
    console.error('uala', body.action, order.id, (error as Error).message)
    return json(502, { error: 'No pudimos conectar con Ualá. Probá de nuevo en un rato o pagá por transferencia.' })
  }
})
