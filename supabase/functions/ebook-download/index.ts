// Returns an e-book with a discreet line naming the buyer (email and order number) on every page.
// Buyers can't read the private "ebooks" bucket directly: every download goes through here.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// Helvetica (WinAnsi) can't draw every character: keep emails and names printable.
const printable = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, '')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' })

  const url = Deno.env.get('SUPABASE_URL')!
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  let ebookId = '', token = ''
  try { const body = await req.json(); ebookId = String(body.ebook_id ?? ''); token = String(body.token ?? '') } catch { /* handled below */ }
  if (!ebookId) return json(400, { error: 'Falta el e-book' })

  // Two ways in: the buyer's session (Mi cuenta), or the private link emailed to buyers without an account.
  let access: { order_id: string | null } | null = null
  let buyerEmail = ''
  if (token) {
    if (!/^[0-9a-f-]{36}$/i.test(token)) return json(400, { error: 'Link inválido' })
    const { data: order } = await admin.from('orders').select('id, user_id, customer_email, payment_check').eq('download_token', token).maybeSingle()
    if (!order || order.payment_check === 'rejected') return json(403, { error: 'Este link no es válido' })
    const { data: row } = await admin.from('ebook_access').select('order_id').eq('order_id', order.id).eq('user_id', order.user_id).eq('ebook_id', ebookId).maybeSingle()
    if (!row) return json(403, { error: 'Este link no incluye ese e-book' })
    access = row
    buyerEmail = order.customer_email ?? ''
  } else {
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json(401, { error: 'Iniciá sesión para descargar' })
    // Access check runs with the buyer's own permissions (RLS).
    const { data: row } = await userClient
      .from('ebook_access').select('order_id').eq('ebook_id', ebookId).eq('user_id', user.id).maybeSingle()
    const { data: isAdmin } = await userClient.rpc('is_admin')
    if (!row && !isAdmin) return json(403, { error: 'No tenés acceso a este e-book' })
    access = row
    buyerEmail = user.email ?? user.id
    // Bought without an account: the anonymous session has no email, the order has it.
    if (!user.email && row?.order_id) {
      const { data: order } = await admin.from('orders').select('customer_email').eq('id', row.order_id).maybeSingle()
      buyerEmail = order?.customer_email ?? buyerEmail
    }
  }

  const { data: ebook } = await admin.from('ebooks').select('title, file_path').eq('id', ebookId).maybeSingle()
  if (!ebook?.file_path) return json(404, { error: 'Este e-book todavía no está disponible. Escribinos y te lo enviamos.' })

  let orderNumber = ''
  if (access?.order_id) {
    const { data: order } = await admin.from('orders').select('number').eq('id', access.order_id).maybeSingle()
    orderNumber = order?.number ? ` - Pedido #${order.number}` : ''
  }

  const { data: file, error } = await admin.storage.from('ebooks').download(ebook.file_path)
  if (error || !file) return json(500, { error: 'No se pudo leer el archivo' })
  const bytes = new Uint8Array(await file.arrayBuffer())
  const extension = ebook.file_path.split('.').pop()?.toLowerCase() ?? 'pdf'
  const filename = `${printable(ebook.title).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')}.${extension}`
  const headers = { ...cors, 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${filename}"` }

  // Word or other formats are delivered as they are.
  if (extension !== 'pdf') return new Response(bytes, { headers })

  const email = printable(buyerEmail)
  const line = `E-book adquirido por ${email}${orderNumber}`

  const pdf = await PDFDocument.load(bytes)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const size = 6.5
  const textWidth = font.widthOfTextAtSize(line, size)
  for (const page of pdf.getPages()) {
    const { width } = page.getSize()
    // one small line just above the footer band
    page.drawText(line, { x: (width - textWidth) / 2, y: 44, size, font, color: rgb(0.55, 0.53, 0.5) })
  }
  pdf.setAuthor('Valeria Yanina Gil - Armado de CV')
  pdf.setSubject(line)
  pdf.setKeywords([email, `pedido${orderNumber.replace(/\D/g, '')}`])
  const stamped = await pdf.save()
  return new Response(stamped, { headers })
})
