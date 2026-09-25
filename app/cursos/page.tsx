import type { Metadata } from 'next'
import { Bell, PlayCircle } from 'lucide-react'
import { ProductGrid } from '@/components/product-grid'
import { SectionTitle } from '@/components/sections'
import { CONTACT, getProducts } from '@/lib/catalog'
import { supabase } from '@/lib/supabase'
import { embedUrl } from '@/lib/video'

export const metadata: Metadata = {
  title: 'Cursos pre-grabados',
  description: 'Cursos para armar tu CV, tu perfil de LinkedIn y preparar entrevistas a tu ritmo.',
}

export const revalidate = 60

type CourseRow = {
  id: string; title: string; description: string | null; product_id: string | null
  lessons: { id: string; title: string; position: number; duration_minutes: number | null; is_preview: boolean; video_url: string | null }[]
}

export default async function CoursesPage() {
  const [products, { data }] = await Promise.all([
    getProducts(['curso']),
    supabase.from('courses').select('id, title, description, product_id, lessons(id, title, position, duration_minutes, is_preview, video_url)').eq('published', true).order('created_at'),
  ])
  const courses = (data as CourseRow[] | null) ?? []

  return (
    <div className="bg-arena/40">
      <section className="px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionTitle script="Cursos" title="Aprendé a tu ritmo" text="Clases grabadas que ves cuando quieras desde el celular o la compu. Comprás una vez y quedan en tu cuenta." />

          {products.length === 0 ? (
            <div className="mx-auto mt-12 max-w-lg rounded-[28px] bg-white p-8 text-center">
              <p className="font-script text-4xl text-rosa">Próximamente</p>
              <p className="mt-2 text-piedra">Estoy preparando los primeros cursos. Sumate al canal para enterarte apenas salgan.</p>
              <a href={CONTACT.whatsappChannel} target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-whatsapp px-6 py-3 font-display text-sm font-bold text-white"><Bell className="h-4 w-4" />Seguir el canal de WhatsApp</a>
            </div>
          ) : (
            <>
              <ProductGrid products={products} tone="asesorias" />
              <div className="mt-16 space-y-8">
                {courses.map((course) => {
                  const lessons = course.lessons.slice().sort((a, b) => a.position - b.position)
                  const preview = lessons.find((lesson) => lesson.is_preview && lesson.video_url)
                  const player = embedUrl(preview?.video_url ?? null)
                  return (
                    <article key={course.id} className="grid gap-6 rounded-[28px] bg-white p-6 lg:grid-cols-[1fr_1fr] lg:p-8">
                      <div>
                        <h2 className="text-xl font-bold text-ciruela">{course.title}</h2>
                        {course.description && <p className="mt-2 whitespace-pre-line leading-relaxed text-piedra">{course.description}</p>}
                        <ol className="mt-5 space-y-2 text-sm">
                          {lessons.map((lesson, index) => (
                            <li key={lesson.id} className="flex items-center gap-2"><PlayCircle className="h-4 w-4 shrink-0 text-rosa" />{index + 1}. {lesson.title}{lesson.duration_minutes ? <span className="text-piedra"> · {lesson.duration_minutes} min</span> : null}{lesson.is_preview && <span className="rounded-full bg-petalo-wash px-2 py-0.5 text-[11px] font-bold text-rosa-deep">Muestra gratis</span>}</li>
                          ))}
                        </ol>
                      </div>
                      {player && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-piedra">Clase de muestra: {preview?.title}</p>
                          <div className="mt-2 aspect-video overflow-hidden rounded-2xl bg-ciruela"><iframe src={player} title={preview?.title} className="h-full w-full" allow="fullscreen; picture-in-picture" allowFullScreen /></div>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
