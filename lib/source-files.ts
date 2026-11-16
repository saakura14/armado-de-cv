import { errorMessage, supabase } from './supabase'

/**
 * The client's material for "Textos con Claude" (CV and LinkedIn), in the cv-sources bucket: PDF, Word, photos and audio.
 * Claude can't listen to audio, so each audio is turned into text on upload (transcribe-audio, Whisper on Groq) and its
 * transcription goes to the list right after it as "<audio>.txt": the Claude task reads it like any other file.
 */
export const SOURCE_ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*,audio/*,.opus,.ogg,.m4a,.mp3,.wav,.aac,.webm'

// The bucket takes these types; phones send voice notes with types it doesn't know (audio/opus, audio/x-m4a or none).
const AUDIO_TYPES: Record<string, string> = { mp3: 'audio/mpeg', mpeg: 'audio/mpeg', mpga: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav', webm: 'audio/webm', flac: 'audio/flac', aac: 'audio/aac' }
const extension = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''
export const isAudio = (name: string) => extension(name) in AUDIO_TYPES
export const isTranscript = (path: string) => /\.[a-z0-9]+\.txt$/i.test(path) && isAudio(path.slice(0, -4))

/** "1730…-nota_de_voz.opus" → "nota_de_voz.opus"; a transcription shows as "nota_de_voz.opus (transcripción)". */
export const sourceLabel = (path: string) => {
  const name = path.split('/').pop()!.replace(/^\d+-/, '')
  return isTranscript(path) ? `${name.slice(0, -4)} (transcripción)` : name
}

/** Uploads one file under `folder`; an audio also gets its transcription. Returns the stored paths, or the error to show. */
export async function uploadSource(folder: string, file: File): Promise<{ paths: string[]; error?: string }> {
  const safe = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').slice(-80)
  const path = `${folder}/${Date.now()}-${safe}`
  const audio = isAudio(file.name)
  const { error } = await supabase.storage.from('cv-sources').upload(path, file, { contentType: audio ? AUDIO_TYPES[extension(file.name)] : file.type || undefined })
  if (error) return { paths: [], error: `${file.name}: ${errorMessage(error)}` }
  if (!audio) return { paths: [path] }
  const { data, error: failure } = await supabase.functions.invoke('transcribe-audio', { body: { path } })
  if (failure) {
    // The function's own message (no Groq key, a format it can't read…) instead of the generic one.
    const detail = await (failure as { context?: Response }).context?.json?.().catch(() => null) as { error?: string } | null
    return { paths: [path], error: `${file.name}: no se pudo transcribir (${detail?.error ?? errorMessage(failure)}). Quitalo y probá de nuevo, o pegá lo que dice.` }
  }
  return { paths: [path, (data as { path: string }).path] }
}

/** What to delete when a file is removed from the list: an audio takes its transcription with it. */
export const withTranscript = (path: string) => (isAudio(path) ? [path, `${path}.txt`] : [path])
