-- "Textos con Claude" takes audio too (WhatsApp voice notes, recordings): the panel uploads it to cv-sources, the
-- transcribe-audio function turns it into text with Whisper (Groq) and saves "<path>.txt" next to it for the Claude task.
-- Up to 25 MB, Groq's limit on the free plan.
update storage.buckets
set file_size_limit = 26214400,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/heic',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/flac', 'audio/aac',
      'text/plain'
    ]
where id = 'cv-sources';
