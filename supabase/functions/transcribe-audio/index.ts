// Audio for "Textos con Claude": a voice note or recording Vale uploads with the client's material (bucket cv-sources) is
// turned into text with Whisper on Groq, and the text is saved next to it as "<path>.txt", so the Claude task that writes
// the CVs reads it like any other file (Claude can't listen to audio). Called from the panel right after the upload, with
// her session. Secret: GROQ_API_KEY (console.groq.com → API Keys).
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// What Groq's Whisper accepts (25 MB at most on the free plan).
const AUDIO = /\.(mp3|mp4|mpeg|mpga|m4a|ogg|oga|opus|wav|webm|flac|aac)$/i

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const url = Deno.env.get('SUPABASE_URL')!
  const session = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } } })
  const { data: isAdmin } = await session.rpc('is_admin')
  if (isAdmin !== true) return json(401, { error: 'No autorizado' })

  const { path } = await request.json().catch(() => ({})) as { path?: string }
  if (!path || !AUDIO.test(path) || path.includes('..')) return json(400, { error: 'Ese archivo no es un audio' })
  const key = Deno.env.get('GROQ_API_KEY')
  if (!key) return json(503, { error: 'Falta configurar la clave de Groq (GROQ_API_KEY) en Supabase' })

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: audio, error: downloadError } = await admin.storage.from('cv-sources').download(path)
  if (downloadError || !audio) return json(404, { error: 'No encontré el audio' })

  // WhatsApp voice notes come as .opus: Groq takes them named .ogg (same format).
  const name = path.split('/').pop()!.replace(/\.(opus|oga)$/i, '.ogg')
  const form = new FormData()
  form.append('file', new File([audio], name, { type: audio.type || 'application/octet-stream' }))
  form.append('model', 'whisper-large-v3')
  form.append('language', 'es')
  form.append('response_format', 'text')
  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form })
  const text = (await response.text()).trim()
  if (!response.ok) {
    const message = (() => { try { return JSON.parse(text).error?.message as string } catch { return text.slice(0, 200) } })()
    return json(502, { error: `Groq no pudo transcribirlo: ${message}` })
  }
  if (!text) return json(422, { error: 'El audio no tiene nada que se pueda transcribir' })

  const transcript = `Transcripción del audio "${path.split('/').pop()}" (Whisper, puede tener errores en nombres y números):\n\n${text}\n`
  const txt = `${path}.txt`
  const { error: uploadError } = await admin.storage.from('cv-sources').upload(txt, new Blob([transcript], { type: 'text/plain' }), { contentType: 'text/plain', upsert: true })
  if (uploadError) return json(500, { error: uploadError.message })
  return json(200, { path: txt, chars: text.length })
})
