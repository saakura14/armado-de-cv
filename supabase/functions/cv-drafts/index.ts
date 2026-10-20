// "Textos con Claude": Claude on Vale's computer (started by the watcher, or the scheduled task) calls this through
// pg_net (x-cron-key, never a key on her computer). {action:'pending'} returns the CV packs waiting for texts or a
// correction, with short-lived links to the client's files; {action:'notify', order_item_id} tells Vale on her phone
// that the texts are ready (Claude saves them by SQL).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.57.4'
import webpush from 'npm:web-push@3.6.7'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (request) => {
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: key } = await admin.rpc('cron_key')
  if (!key || request.headers.get('x-cron-key') !== key) return json({ error: 'No autorizado' }, 401)
  const body = await request.json().catch(() => ({})) as { action?: string; order_item_id?: string }

  if (body.action === 'pending') {
    // Asked for (new texts or a correction), or stuck "generando" for more than 20 minutes (a run that didn't finish).
    const stale = new Date(Date.now() - 20 * 60 * 1000).toISOString()
    const { data: drafts, error } = await admin.from('cv_drafts')
      .select('order_item_id, order_id, source_text, target_job, files, has_letter, ats_only, status, requested_at, feedback, cv_modern, cv_ats, letter, orders(number, customer_name), order_items(product_id, product_name)')
      .or(`status.in.(pedido,corregir),and(status.eq.generando,requested_at.lt.${stale})`)
      .order('requested_at')
    if (error) return json({ error: error.message }, 500)
    const list = []
    for (const draft of drafts ?? []) {
      const files = []
      for (const path of draft.files as string[]) {
        const { data } = await admin.storage.from('cv-sources').createSignedUrl(path, 15 * 60)
        if (data?.signedUrl) files.push({ name: path.split('/').pop(), url: data.signedUrl })
      }
      const order = draft.orders as unknown as { number: number; customer_name: string | null } | null
      const item = draft.order_items as unknown as { product_id: string; product_name: string } | null
      list.push({
        order_item_id: draft.order_item_id, order_number: order?.number, client_name: order?.customer_name,
        pack: item?.product_name, ats_only: draft.ats_only, has_letter: draft.has_letter,
        target_job: draft.target_job, source_text: draft.source_text, files,
        // A correction keeps the texts (with her own edits) and changes only what she asked.
        mode: draft.feedback ? 'correccion' : 'nuevo', feedback: draft.feedback,
        current: draft.feedback ? { cv_modern: draft.cv_modern, cv_ats: draft.cv_ats, letter: draft.letter } : null,
      })
    }
    return json({ drafts: list })
  }

  if (body.action === 'notify' && body.order_item_id) {
    const { data: draft } = await admin.from('cv_drafts').select('status, orders(number, customer_name)').eq('order_item_id', body.order_item_id).maybeSingle()
    if (!draft) return json({ error: 'No encontré ese borrador' }, 404)
    const order = draft.orders as unknown as { number: number; customer_name: string | null } | null
    const first = (order?.customer_name ?? '').split(' ')[0]
    if (draft.status === 'listo') await pushToAdmins(admin, `✨ Textos listos · pedido #${order?.number}`, `Claude terminó los textos${first ? ` de ${first}` : ''}. Revisalos y asignáselos al equipo.`, '/admin#pedidos')
    else if (draft.status === 'error') await pushToAdmins(admin, `⚠️ No se pudieron generar los textos · pedido #${order?.number}`, 'Entrá a la placa para ver qué faltó.', '/admin#pedidos')
    return json({ ok: true })
  }

  return json({ error: 'Acción inválida' }, 400)
})

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
