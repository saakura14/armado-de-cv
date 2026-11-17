import { NextResponse } from 'next/server'

// Sharing to the panel app lands here only when the service worker wasn't ready yet (it normally takes the POST and
// keeps the files, see public/sw.js). The text still opens "Venta por WhatsApp"; files can't be kept on the server
// (they need Vale's session), so the panel asks to share them again.
export async function POST(request: Request) {
  const params = new URLSearchParams()
  const data = await request.formData().catch(() => null)
  if (data) {
    for (const key of ['title', 'text', 'url']) {
      const value = data.get(key)
      if (typeof value === 'string' && value.trim()) params.set(key, value)
    }
    const files = data.getAll('files').filter((file) => typeof file !== 'string' && file.size > 0)
    if (files.length) params.set('archivos_perdidos', String(files.length))
  }
  return NextResponse.redirect(new URL(`/admin${params.size ? `?${params}` : ''}`, request.url), 303)
}
