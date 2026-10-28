// "Textos con Claude": Claude on Vale's computer (the scheduled task "textos-cv-claude") calls this through pg_net
// (x-cron-key, never a key on her computer). {action:'pending'} returns the CV packs and the LinkedIn profiles waiting
// for texts or a correction, with short-lived links to the client's files and the correction's screenshots, and the
// CVs to build in Canva ("Armarlo yo") with their base template;
// {action:'notify', order_item_id, kind?: 'linkedin' | 'build'} tells Vale on her phone that the texts (or the CV built in
// Canva) are ready (Claude saves them by SQL).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.57.4'
import webpush from 'npm:web-push@3.6.7'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (request) => {
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: key } = await admin.rpc('cron_key')
  if (!key || request.headers.get('x-cron-key') !== key) return json({ error: 'No autorizado' }, 401)
  const body = await request.json().catch(() => ({})) as { action?: string; order_item_id?: string; kind?: string }

  const signed = async (paths: string[]) => {
    const list = []
    for (const path of paths) {
      const { data } = await admin.storage.from('cv-sources').createSignedUrl(path, 15 * 60)
      if (data?.signedUrl) list.push({ name: path.split('/').pop(), url: data.signedUrl })
    }
    return list
  }

  if (body.action === 'pending') {
    // Asked for (new texts or a correction), or stuck "generando" for more than 20 minutes (a run that didn't finish).
    const stale = new Date(Date.now() - 20 * 60 * 1000).toISOString()
    const waiting = `status.in.(pedido,corregir),and(status.eq.generando,requested_at.lt.${stale})`
    const [cv, li, builds, templates] = await Promise.all([
      admin.from('cv_drafts')
        .select('order_item_id, order_id, source_text, target_job, files, has_letter, ats_only, status, requested_at, feedback, feedback_files, cv_modern, cv_ats, letter, orders(number, customer_name), order_items(product_id, product_name)')
        .or(waiting).order('requested_at'),
      admin.from('linkedin_drafts')
        .select('order_item_id, order_id, source_text, target_job, files, status, requested_at, feedback, feedback_files, sections, orders(number, customer_name), order_items(product_id, product_name)')
        .or(waiting).order('requested_at'),
      // "Armarlo yo": CVs to build in Canva (or stuck "armando" for more than 20 minutes), with the base templates.
      admin.from('cv_builds')
        .select('order_item_id, client_name, gender, pages, languages, cv_modern, cv_ats, letter, notes, orders(number), order_items(product_name)')
        .or(`status.eq.pedido,and(status.eq.armando,requested_at.lt.${stale})`).order('requested_at'),
      admin.from('cv_templates').select('gender, design_id'),
    ])
    const failed = cv.error ?? li.error ?? builds.error ?? templates.error
    if (failed) return json({ error: failed.message }, 500)
    const drafts = []
    for (const draft of cv.data ?? []) {
      const order = draft.orders as unknown as { number: number; customer_name: string | null } | null
      const item = draft.order_items as unknown as { product_id: string; product_name: string } | null
      drafts.push({
        order_item_id: draft.order_item_id, order_number: order?.number, client_name: order?.customer_name,
        pack: item?.product_name, ats_only: draft.ats_only, has_letter: draft.has_letter,
        target_job: draft.target_job, source_text: draft.source_text, files: await signed(draft.files as string[]),
        // A correction keeps the texts (with her own edits) and changes only what she asked; the screenshots show what is wrong.
        mode: draft.feedback ? 'correccion' : 'nuevo', feedback: draft.feedback,
        feedback_files: draft.feedback ? await signed(draft.feedback_files as string[]) : [],
        current: draft.feedback ? { cv_modern: draft.cv_modern, cv_ats: draft.cv_ats, letter: draft.letter } : null,
      })
    }
    const linkedin = []
    for (const draft of li.data ?? []) {
      const order = draft.orders as unknown as { number: number; customer_name: string | null } | null
      const item = draft.order_items as unknown as { product_id: string; product_name: string } | null
      linkedin.push({
        order_item_id: draft.order_item_id, order_number: order?.number, client_name: order?.customer_name, pack: item?.product_name,
        target_job: draft.target_job, source_text: draft.source_text, files: await signed(draft.files as string[]),
        mode: draft.feedback ? 'correccion' : 'nuevo', feedback: draft.feedback,
        feedback_files: draft.feedback ? await signed(draft.feedback_files as string[]) : [],
        current: draft.feedback ? draft.sections : null,
      })
    }
    const base = Object.fromEntries((templates.data ?? []).map((row) => [row.gender, row.design_id]))
    const build = (builds.data ?? []).map((row) => {
      const { orders, order_items, ...rest } = row as unknown as Record<string, unknown> & { orders: { number: number } | null; order_items: { product_name: string } | null }
      return { ...rest, order_number: orders?.number, pack: order_items?.product_name, template_design_id: base[row.gender] }
    })
    return json({ drafts, linkedin, builds: build })
  }

  // "Armarlo yo": the CV is built in Canva (or it couldn't be) — the client's own link is already on cv_builds.
  if (body.action === 'notify' && body.order_item_id && body.kind === 'build') {
    const { data: build } = await admin.from('cv_builds').select('status, client_name, error, orders(number)').eq('order_item_id', body.order_item_id).maybeSingle()
    if (!build) return json({ error: 'No encontré ese armado' }, 404)
    const order = build.orders as unknown as { number: number } | null
    if (build.status === 'listo') await pushToAdmins(admin, `🎨 CV armado en Canva · pedido #${order?.number}`, `Claude armó el CV de ${build.client_name}. Revisalo, poné la foto y descargalo.`, '/admin#pedidos')
    else if (build.status === 'error') await pushToAdmins(admin, `⚠️ No se pudo armar el CV · pedido #${order?.number}`, build.error ?? 'Entrá a la placa para ver qué pasó.', '/admin#pedidos')
    return json({ ok: true })
  }

  if (body.action === 'notify' && body.order_item_id) {
    const linkedin = body.kind === 'linkedin'
    const { data: draft } = await admin.from(linkedin ? 'linkedin_drafts' : 'cv_drafts').select('status, orders(number, customer_name)').eq('order_item_id', body.order_item_id).maybeSingle()
    if (!draft) return json({ error: 'No encontré ese borrador' }, 404)
    const order = draft.orders as unknown as { number: number; customer_name: string | null } | null
    const first = (order?.customer_name ?? '').split(' ')[0]
    const what = linkedin ? 'el LinkedIn' : 'los textos'
    if (draft.status === 'listo') await pushToAdmins(admin, `✨ ${linkedin ? 'LinkedIn listo' : 'Textos listos'} · pedido #${order?.number}`, `Claude terminó ${what}${first ? ` de ${first}` : ''}. ${linkedin ? 'Revisalo y copialo en su perfil.' : 'Revisalos y asignáselos al equipo.'}`, '/admin#pedidos')
    else if (draft.status === 'error') await pushToAdmins(admin, `⚠️ No se pudo generar ${what} · pedido #${order?.number}`, 'Entrá a la placa para ver qué faltó.', '/admin#pedidos')
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
