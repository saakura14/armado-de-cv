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

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json(401, { error: 'Iniciá sesión para descargar' })

  let ebookId = ''
  try { ebookId = String((await req.json()).ebook_id ?? '') } catch { /* handled below */ }
  if (!ebookId) return json(400, { error: 'Falta el e-book' })

  // Access check runs with the buyer's own permissions (RLS).
  const { data: access } = await userClient
    .from('ebook_access').select('order_id').eq('ebook_id', ebookId).eq('user_id', user.id).maybeSingle()
  const { data: isAdmin } = await userClient.rpc('is_admin')
  if (!access && !isAdmin) return json(403, { error: 'No tenés acceso a este e-book' })

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

  const email = printable(user.email ?? user.id)
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
