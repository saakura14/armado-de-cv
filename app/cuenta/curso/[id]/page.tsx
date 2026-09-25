'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Circle, Download, Loader2, PlayCircle } from 'lucide-react'
import { AuthPanel } from '@/components/auth-panel'
import { errorMessage, supabase } from '@/lib/supabase'
import { useSession } from '@/lib/use-session'
import { embedUrl } from '@/lib/video'

type Lesson = { id: string; position: number; title: string; description: string | null; video_url: string | null; attachment_path: string | null; duration_minutes: number | null }
type Course = { id: string; title: string; description: string | null }

const SEEN_KEY = (courseId: string) => `adc-curso-${courseId}`

export default function CoursePlayerPage() {
  const { id } = useParams<{ id: string }>()
  const { user, ready } = useSession()
  const [course, setCourse] = useState<Course | null | undefined>(undefined)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [hasAccess, setHasAccess] = useState(false)
  const [current, setCurrent] = useState(0)
  const [seen, setSeen] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('courses').select('id, title, description').eq('id', id).maybeSingle(),
      supabase.from('lessons').select('*').eq('course_id', id).order('position'),
      supabase.from('course_access').select('course_id').eq('course_id', id).eq('user_id', user.id).maybeSingle(),
    ]).then(([c, l, a]) => {
      setCourse((c.data as Course | null) ?? null)
      setLessons((l.data as Lesson[] | null) ?? [])
      setHasAccess(Boolean(a.data))
    })
    try { setSeen(JSON.parse(localStorage.getItem(SEEN_KEY(id)) ?? '[]')) } catch { /* progress is optional */ }
  }, [id, user])

  function markSeen(lessonId: string) {
    setSeen((list) => {
      const next = list.includes(lessonId) ? list.filter((item) => item !== lessonId) : [...list, lessonId]
      try { localStorage.setItem(SEEN_KEY(id), JSON.stringify(next)) } catch { /* progress is optional */ }
      return next
    })
  }

  async function downloadAttachment(path: string) {
    const { data, error: urlError } = await supabase.storage.from('course-files').createSignedUrl(path, 120, { download: true })
    if (urlError || !data) setError(errorMessage(urlError))
    else window.location.href = data.signedUrl
  }

  if (!ready || (user && course === undefined)) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-rosa" /></div>
  if (!user) return <section className="px-4 py-16"><AuthPanel title="Ingresá a tu curso" text="Tus cursos están en tu cuenta. Ingresá con el email con el que compraste." /></section>
  if (!course) return <section className="mx-auto max-w-md px-4 py-20 text-center"><p className="font-script text-5xl text-rosa">Curso no encontrado</p><Link href="/cuenta" className="mt-6 inline-block font-semibold text-rosa-deep underline">Ir a Mi cuenta</Link></section>

  const lesson = lessons[current]
  const player = embedUrl(lesson?.video_url ?? null)

  return (
    <section className="bg-arena/40 px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/cuenta" className="inline-flex items-center gap-1.5 text-sm font-semibold text-piedra hover:text-ciruela"><ArrowLeft className="h-4 w-4" />Mi cuenta</Link>
        <h1 className="mt-3 text-2xl font-extrabold text-ciruela sm:text-3xl">{course.title}</h1>
        {!hasAccess && <p className="mt-3 rounded-xl bg-petalo-wash px-4 py-3 text-sm text-rosa-deep">Estás viendo las clases de muestra. Cuando confirme tu pago se habilita el curso completo.</p>}
        {error && <p role="alert" className="mt-3 rounded-xl bg-petalo-wash px-4 py-3 text-sm font-semibold text-rosa-deep">{error}</p>}

        {lessons.length === 0 ? <p className="mt-8 text-piedra">Todavía no hay clases disponibles.</p> : (
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="aspect-video overflow-hidden rounded-3xl bg-ciruela">
                {player ? <iframe key={lesson.id} src={player} title={lesson.title} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /> : <div className="flex h-full items-center justify-center p-6 text-center text-white/80">Esta clase no tiene video.</div>}
              </div>
              <div className="mt-5 rounded-[28px] bg-white p-6">
                <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-piedra">Clase {current + 1} de {lessons.length}</p>
                <h2 className="mt-1 text-xl font-bold text-ciruela">{lesson.title}</h2>
                {lesson.description && <p className="mt-3 whitespace-pre-line leading-relaxed text-ink">{lesson.description}</p>}
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" onClick={() => markSeen(lesson.id)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 py-2 font-display text-sm font-semibold text-ciruela">
                    {seen.includes(lesson.id) ? <CheckCircle2 className="h-4 w-4 text-whatsapp" /> : <Circle className="h-4 w-4" />}{seen.includes(lesson.id) ? 'Vista' : 'Marcar como vista'}
                  </button>
                  {lesson.attachment_path && <button type="button" onClick={() => downloadAttachment(lesson.attachment_path!)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 py-2 font-display text-sm font-semibold text-ciruela"><Download className="h-4 w-4" />Material de la clase</button>}
                  {current < lessons.length - 1 && <button type="button" onClick={() => { markSeen(lesson.id); setCurrent(current + 1) }} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ciruela px-4 py-2 font-display text-sm font-bold text-white">Siguiente clase</button>}
                </div>
              </div>
            </div>
            <ol className="space-y-2 rounded-[28px] bg-white p-3">
              {lessons.map((item, index) => (
                <li key={item.id}>
                  <button type="button" onClick={() => setCurrent(index)} className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left text-sm ${index === current ? 'bg-petalo-wash' : 'hover:bg-papel'}`}>
                    {seen.includes(item.id) ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-whatsapp" /> : <PlayCircle className="mt-0.5 h-5 w-5 shrink-0 text-rosa" />}
                    <span><span className="block font-semibold text-ink">{index + 1}. {item.title}</span>{item.duration_minutes && <span className="text-xs text-piedra">{item.duration_minutes} min</span>}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  )
}
