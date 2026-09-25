import { Star } from 'lucide-react'
import { CONTACT } from '@/lib/catalog'
import { supabase } from '@/lib/supabase'

type Testimonial = { id: string; name: string; text: string; service: string | null; rating: number; instagram: string | null }

/** Client reviews (managed in /admin), scrollable on phones, plus the link to the Instagram post. */
export async function Testimonials() {
  const { data } = await supabase.from('testimonials').select('id, name, text, service, rating, instagram').eq('active', true).order('sort').limit(9)
  const items = (data as Testimonial[] | null) ?? []

  return (
    <div className="rounded-[32px] bg-papel px-4 py-10 sm:px-8">
      <div className="text-center">
        <p className="font-script text-[52px] leading-none text-rosa" aria-hidden="true">Testimonios</p>
        <h2 className="mt-1 text-xs font-semibold uppercase tracking-[0.35em] text-ciruela sm:text-sm">Lo que dicen mis clientes</h2>
        <p className="mx-auto mt-4 max-w-xl text-piedra">Personas que armaron su CV, se prepararon para su entrevista y hoy están trabajando.</p>
      </div>

      {items.length > 0 && (
        <ul className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="flex w-[82%] shrink-0 snap-center flex-col rounded-3xl bg-white p-6 shadow-[0_18px_40px_-34px_rgba(67,32,44,0.6)] sm:w-auto">
              <div className="flex gap-0.5 text-rosa" aria-label={`${item.rating} de 5 estrellas`}>
                {Array.from({ length: item.rating }, (_, index) => <Star key={index} className="h-4 w-4 fill-current" />)}
              </div>
              <blockquote className="mt-3 flex-1 leading-relaxed text-ink">“{item.text}”</blockquote>
              <p className="mt-4 font-display text-sm font-bold text-ciruela">{item.name}</p>
              {item.instagram && <a href={`https://www.instagram.com/${item.instagram}/`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-rosa-deep hover:underline">@{item.instagram}</a>}
              {item.service && <p className="text-xs text-piedra">{item.service}</p>}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 text-center">
        <a href={CONTACT.testimonials} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-ciruela px-6 py-3 font-display font-bold text-white transition-colors hover:bg-rosa"><Star className="h-4 w-4" />Ver más testimonios en Instagram</a>
      </div>
    </div>
  )
}
