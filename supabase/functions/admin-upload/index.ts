// Admin uploads authenticated with a short-lived token from public.admin_upload_tokens (sent as x-upload-token).
//  ?ebook=<id>&name=<file>.pdf     -> private "ebooks" bucket, linked to the e-book
//  ?social=<path>.png|jpg|pdf|mp4   -> public "social" bucket (media for Instagram scheduling, PDFs for Canva imports)
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method' })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const token = req.headers.get('x-upload-token') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(token)) return json(401, { error: 'token' })
  const { data: valid } = await admin.from('admin_upload_tokens').select('token').eq('token', token).gt('expires_at', new Date().toISOString()).maybeSingle()
  if (!valid) return json(401, { error: 'token' })

  const url = new URL(req.url)
  const bytes = new Uint8Array(await req.arrayBuffer())
  if (bytes.length < 1000 || bytes.length > 50 * 1024 * 1024) return json(400, { error: 'size' })

  const social = url.searchParams.get('social')
  if (social) {
    const path = social.replace(/[^A-Za-z0-9._\/-]+/g, '-')
    const head = new TextDecoder().decode(bytes.slice(0, 12))
    const contentType =
      bytes[0] === 0x89 && bytes[1] === 0x50 ? 'image/png'
      : bytes[0] === 0xff && bytes[1] === 0xd8 ? 'image/jpeg'
      : head.startsWith('%PDF-') ? 'application/pdf'
      : head.slice(4, 8) === 'ftyp' ? 'video/mp4'
      : null
    if (!contentType) return json(400, { error: 'unsupported file type' })
    const { error } = await admin.storage.from('social').upload(path, bytes, { contentType, upsert: true })
    if (error) return json(500, { error: error.message })
    const { data } = admin.storage.from('social').getPublicUrl(path)
    return json(200, { ok: true, url: data.publicUrl })
  }

  const ebookId = url.searchParams.get('ebook') ?? ''
  const fileName = (url.searchParams.get('name') ?? 'ebook.pdf').replace(/[^A-Za-z0-9._-]+/g, '-')
  const { data: ebook } = await admin.from('ebooks').select('id, file_path').eq('id', ebookId).maybeSingle()
  if (!ebook) return json(404, { error: 'ebook' })
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') return json(400, { error: 'not a pdf' })

  const path = `${ebook.id}/${Date.now()}-${fileName}`
  const { error: uploadError } = await admin.storage.from('ebooks').upload(path, bytes, { contentType: 'application/pdf' })
  if (uploadError) return json(500, { error: uploadError.message })
  await admin.from('ebooks').update({ file_path: path }).eq('id', ebook.id)
  if (ebook.file_path) await admin.storage.from('ebooks').remove([ebook.file_path])
  return json(200, { ok: true, path, bytes: bytes.length })
})
