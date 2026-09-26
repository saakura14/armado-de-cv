// Reads a transfer receipt for a digital-only order and decides whether the e-books can be unlocked
// right away. Approves only when the receipt goes to the store's account, for the exact amount, with a
// plausible date and no signs of editing. Anything doubtful stays for the admin to review.
// Needs the ANTHROPIC_API_KEY secret; without it only the basic file checks apply.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const MODEL = 'claude-sonnet-5'

type Reading = {
  es_comprobante: boolean
  destinatario_nombre: string | null
  destinatario_alias: string | null
  destinatario_cbu_cvu: string | null
  monto: number | null
  fecha: string | null          // YYYY-MM-DD
  numero_operacion: string | null
  senales_de_edicion: string[]
  motivo: string
}

const digits = (value: string | null | undefined) => (value ?? '').replace(/\D/g, '')
const plain = (value: string | null | undefined) => (value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function toBase64(bytes: Uint8Array) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

async function readReceipt(apiKey: string, bytes: Uint8Array, mime: string): Promise<Reading> {
  const file = mime === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: toBase64(bytes) } }
    : { type: 'image', source: { type: 'base64', media_type: mime, data: toBase64(bytes) } }
  const prompt = `Sos un verificador de comprobantes de transferencias bancarias argentinas (bancos, Mercado Pago, billeteras).
Leé el comprobante y respondé SOLO con un objeto JSON, sin texto extra, con estas claves:
{"es_comprobante": boolean (true si es un comprobante real de transferencia o pago enviado, no una captura de otra cosa),
 "destinatario_nombre": string|null, "destinatario_alias": string|null, "destinatario_cbu_cvu": string|null (solo dígitos si se ven),
 "monto": number|null (en pesos, sin separadores de miles; usá punto para decimales),
 "fecha": "YYYY-MM-DD"|null, "numero_operacion": string|null (número de operación, transacción, comprobante o ID),
 "senales_de_edicion": string[] (señales concretas de que la imagen fue editada o armada: tipografías o tamaños que no coinciden, números desalineados, recortes, fondos distintos, pixelado solo en una zona, montos o nombres pegados encima; lista vacía si no ves ninguna),
 "motivo": string (una frase en español explicando lo que viste)}
No inventes datos: si algo no se lee, poné null.`
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 800, messages: [{ role: 'user', content: [file, { type: 'text', text: prompt }] }] }),
  })
  if (!response.ok) throw new Error(`Lectura no disponible (${response.status})`)
  const body = await response.json()
  const text: string = body.content?.find((block: { type: string }) => block.type === 'text')?.text ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No se pudo interpretar la lectura')
  return JSON.parse(match[0]) as Reading
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' })

  const url = Deno.env.get('SUPABASE_URL')!
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json(401, { error: 'Iniciá sesión' })

  let orderId = ''
  try { orderId = String((await req.json()).order_id ?? '') } catch { /* handled below */ }
  if (!orderId) return json(400, { error: 'Falta el pedido' })

  const { data: order } = await admin.from('orders').select('id, user_id, total, created_at, receipt_path, status').eq('id', orderId).maybeSingle()
  if (!order || order.user_id !== user.id) return json(404, { error: 'Pedido no encontrado' })
  if (order.status !== 'payment_review' || !order.receipt_path) return json(200, { status: order.status })

  const { data: eligible } = await admin.rpc('instant_eligible', { p_order: orderId })
  if (!eligible) return json(200, { status: order.status })   // CV packs, repeated files, etc.: the admin reviews

  const finish = async (result: Record<string, unknown>, operationId: string | null, approve: boolean) => {
    const { data: status, error } = await admin.rpc('finish_receipt_check', { p_order: orderId, p_result: result, p_operation_id: operationId, p_approve: approve })
    if (error) return json(500, { error: 'No se pudo registrar la verificación' })
    return json(200, { status })
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return finish({ veredicto: 'aprobar', motivo: 'Lectura automática no configurada: solo controles básicos del archivo.' }, null, true)

  const { data: file } = await admin.storage.from('receipts').download(order.receipt_path)
  if (!file) return finish({ veredicto: 'revisar', motivo: 'No se pudo abrir el comprobante.' }, null, false)
  const mime = file.type || 'image/jpeg'

  const { data: pay } = await admin.from('payment_settings').select('alias, cbu, holder').maybeSingle()

  let reading: Reading
  try {
    reading = await readReceipt(apiKey, new Uint8Array(await file.arrayBuffer()), mime)
  } catch (error) {
    return finish({ veredicto: 'revisar', motivo: (error as Error).message }, null, false)
  }

  // The decision is made here with the extracted data, not by the reader.
  const problems: string[] = []
  if (!reading.es_comprobante) problems.push('No parece un comprobante de transferencia.')

  const holderWords = plain(pay?.holder).split(/\s+/).filter((word) => word.length > 2)
  const name = plain(reading.destinatario_nombre)
  const nameOk = holderWords.length > 0 && holderWords.filter((word) => name.includes(word)).length >= 2
  const aliasOk = !!pay?.alias && plain(reading.destinatario_alias) === plain(pay.alias)
  const cbuRead = digits(reading.destinatario_cbu_cvu)
  const cbuOk = !!pay?.cbu && cbuRead.length >= 6 && digits(pay.cbu).endsWith(cbuRead.slice(-6))
  if (!nameOk && !aliasOk && !cbuOk) problems.push('El destinatario no coincide con tu cuenta (titular, alias o CBU).')

  if (reading.monto == null || Math.abs(Number(reading.monto) - order.total) > 1) problems.push(`El monto no coincide: se leyó ${reading.monto ?? 'nada'} y el pedido es ${order.total}.`)

  const created = new Date(order.created_at)
  const earliest = new Date(created.getTime() - 24 * 3600 * 1000).toISOString().slice(0, 10)
  const latest = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10)
  if (!reading.fecha || reading.fecha < earliest || reading.fecha > latest) problems.push(`La fecha del comprobante (${reading.fecha ?? 'no se lee'}) no corresponde al pedido.`)

  if ((reading.senales_de_edicion ?? []).length > 0) problems.push(`Posible edición: ${reading.senales_de_edicion.join('; ')}.`)

  const approve = problems.length === 0
  const result = {
    veredicto: approve ? 'aprobar' : 'revisar',
    motivo: approve ? reading.motivo : problems.join(' '),
    leido: { destinatario: reading.destinatario_nombre, alias: reading.destinatario_alias, cbu: reading.destinatario_cbu_cvu, monto: reading.monto, fecha: reading.fecha, operacion: reading.numero_operacion },
    modelo: MODEL,
  }
  return finish(result, reading.numero_operacion, approve)
})
