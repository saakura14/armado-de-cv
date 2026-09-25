/** Converts a YouTube / Vimeo / Google Drive link into an embeddable player URL. */
export function embedUrl(url: string | null) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}?rel=0`
    if (host.endsWith('youtube.com')) {
      const id = parsed.searchParams.get('v') ?? parsed.pathname.split('/').filter(Boolean).pop()
      return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null
    }
    if (host === 'vimeo.com') {
      const [id, hash] = parsed.pathname.split('/').filter(Boolean)
      return `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ''}`
    }
    if (host === 'player.vimeo.com') return url
    if (host === 'drive.google.com') {
      const id = parsed.pathname.match(/\/d\/([^/]+)/)?.[1]
      return id ? `https://drive.google.com/file/d/${id}/preview` : null
    }
    return url
  } catch {
    return null
  }
}
