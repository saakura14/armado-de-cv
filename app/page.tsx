import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Camera, ClipboardCheck, Clock, Megaphone, Zap } from 'lucide-react'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { ProductGrid } from '@/components/product-grid'
import { Faq, HowToBuy, SectionTitle } from '@/components/sections'
import { CONTACT, formatARS, getProducts, whatsappUrl } from '@/lib/catalog'
import { getFaqs } from '@/lib/faq'
import { Testimonials } from '@/components/testimonials'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({ path: '/', description: 'Armado de CV profesional: CV moderno y optimizado para filtros ATS, perfil de LinkedIn, cartas de presentación y carga en plataformas de empleo. Guías para tu búsqueda laboral.' })

// Prices are edited from /admin; the page refreshes them every minute.
export const revalidate = 60

const DELIVERY_NOTE = 'Demora de cualquier pack: 3 a 4 días hábiles desde que tengo toda tu información (no trabajo fines de semana). Versión Express dentro de las 24 hs hábiles.'

// iconos.webp is a 2x2 sheet: people · info · payment · handshake
const promises = [
  { position: '0% 0%', title: 'Atención personalizada', text: 'Trabajo sobre tu experiencia real y tu rubro, sin plantillas genéricas.' },
  { position: '100% 0%', title: 'Todo claro desde el inicio', text: 'Sabés qué incluye cada pack, cuánto cuesta y cuándo lo recibís.' },
  { position: '0% 100%', title: 'Pago simple', text: 'Transferencia bancaria y subís el comprobante desde la web.' },
  { position: '100% 100%', title: 'Acompañamiento', text: 'Te acompaño hasta la entrega y respondo tus dudas.' },
]

const steps = [
  { title: 'Elegí', text: 'Un pack o una guía. Tocá "Lo quiero"; en los packs sumás idiomas, plataformas o entrega express y ves el total.' },
  { title: 'Confirmá el pedido', text: 'Creá tu cuenta o ingresá y aceptá las condiciones.' },
  { title: 'Transferí', text: 'Te muestro los datos para transferir y subís el comprobante ahí mismo.' },
  { title: 'Recibí', text: 'Pack de CV: me escribís por WhatsApp con tu número de pedido y arranco. Guía: la descargás desde "Mi cuenta" apenas confirmo tu pago, sin escribirme.' },
]

// "Ver packs · desde $X" quotes the cheapest CV work (packs and LinkedIn), not the 1 a 1 sessions listed in the same section.
function packFrom(products: Awaited<ReturnType<typeof getProducts>>) {
  const prices = products.filter((product) => product.delivery === 'service').map((product) => product.price)
  return prices.length > 0 ? Math.min(...prices) : null
}

export default async function Home() {
  const [cvProducts, guides, faqs] = await Promise.all([getProducts(['cv']), getProducts(['guias']), getFaqs({ sections: ['cv', 'general'], onPageOnly: true })])
  const extraPrice = (id: string) => cvProducts.flatMap((product) => product.extras).find((group) => group.id === id)?.unitPrice ?? 15000
  const price = { language: extraPrice('idiomas'), express: extraPrice('express'), from: packFrom(cvProducts) }
  return (
    <>
      {/* Hero */}
      {/* On desktop the photo is anchored to the viewport edge; the background matches its wall so there is no seam. */}
      <section className="relative overflow-hidden bg-white lg:bg-[#dfe3e6]">
        <Image src="/img/hero-banner.jpg" alt="" width={1472} height={704} priority className="pointer-events-none absolute inset-y-0 -right-[120px] hidden h-full w-auto max-w-none lg:block xl:right-0" />
        <div className="relative mx-auto max-w-6xl lg:min-h-[600px]">
          <div className="relative z-10 px-4 pb-6 pt-10 sm:px-6 lg:max-w-[460px] lg:py-24 xl:max-w-[500px]">
            <p className="font-script text-4xl leading-none text-rosa">Hola, soy Valeria</p>
            <h1 className="mt-3 text-[34px] font-extrabold leading-[1.1] text-ciruela sm:text-5xl">Tu CV listo para pasar los filtros y llegar a la entrevista</h1>
            <p className="mt-5 text-lg leading-relaxed text-piedra">CV modernos y optimizados para ATS, perfil de LinkedIn, cartas de presentación y carga en plataformas de empleo. Armado para vos, no con plantillas.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#precios" className="inline-flex min-h-12 items-center justify-center rounded-full bg-rosa px-7 py-3.5 font-display font-bold text-white shadow-lg shadow-rosa/25 transition-colors hover:bg-rosa-deep">{price.from ? `Ver packs · desde ${formatARS(price.from)}` : 'Ver packs y precios'}</a>
              <a href={whatsappUrl('¡Hola! Quiero consultar por el armado de mi CV.')} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-ciruela/15 px-6 py-3 font-display font-bold text-ciruela hover:border-whatsapp hover:text-whatsapp"><WhatsAppIcon className="h-5 w-5" />Consultar</a>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-piedra"><Clock className="h-4 w-4 text-rosa" />3 a 4 días hábiles · Express en 24 hs hábiles · <a href="#urgente" className="font-semibold text-rosa-deep hover:underline">¿Urgente?</a></p>
          </div>
          <Image src="/img/hero-banner.jpg" alt="Valeria mostrando un CV y un perfil de LinkedIn en el celular" width={1472} height={704} priority className="h-64 w-full object-cover object-[78%_center] sm:h-80 lg:hidden" />
        </div>
      </section>

      {/* Who does the work, right under the hero: people buy from people */}
      <section aria-label="Quién arma tu CV" className="px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-5 rounded-[28px] bg-papel p-5 sm:p-6">
          <Image src="/img/valeria-retrato.jpg" alt="Valeria, de Armado de CV" width={768} height={1060} className="h-20 w-20 shrink-0 rounded-full object-cover object-top sm:h-24 sm:w-24" />
          <div>
            <p className="leading-relaxed text-ink">Soy <b className="text-ciruela">Vale</b>, <b className="text-ciruela">Técnica en Programación de la UTN</b>, con formación en <b className="text-ciruela">RR.HH. IT y sistemas ATS</b>. Cada CV lo armo yo, sobre tu experiencia real.</p>
            <p className="mt-1.5 text-sm text-piedra">Más de <b className="text-ciruela">17.000 personas</b> siguen mis guías en <a href={`https://instagram.com/${CONTACT.instagram}`} target="_blank" rel="noreferrer" className="font-semibold text-rosa-deep hover:underline">@{CONTACT.instagram}</a></p>
            <a href="#sobre-mi" className="mt-2 inline-flex items-center gap-1 font-display text-sm font-bold text-rosa-deep hover:underline">Conocé más sobre mí<ArrowRight className="h-4 w-4" /></a>
          </div>
        </div>
      </section>

      {/* Promises */}
      <section aria-label="Por qué elegirme" className="border-y border-line bg-blanco">
        <ul className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {promises.map((item) => (
            <li key={item.title} className="flex items-start gap-4">
              <span aria-hidden="true" className="h-16 w-16 shrink-0 rounded-full bg-no-repeat" style={{ backgroundImage: 'url(/img/iconos.webp)', backgroundSize: '200% 200%', backgroundPosition: item.position }} />
              <div><h3 className="font-bold text-ciruela">{item.title}</h3><p className="mt-1 text-sm leading-relaxed text-piedra">{item.text}</p></div>
            </li>
          ))}
        </ul>
      </section>

      {/* Packs */}
      <section id="precios" className="scroll-mt-28 px-4 py-16 sm:px-6 lg:py-24" aria-labelledby="cv-title">
        <div className="mx-auto max-w-6xl">
          <SectionTitle id="cv-title" script="Catálogo" title="Packs de CV y LinkedIn" text="Cada pack incluye dos CV: uno con diseño moderno y otro optimizado para los filtros ATS que usan las empresas." />
          <ProductGrid products={cvProducts} tone="cv" />
          {/* Urgent orders: Express is picked in the order; a specific time is quoted by WhatsApp. */}
          <div id="urgente" className="mt-14 scroll-mt-28 overflow-hidden rounded-[28px] bg-ciruela text-white shadow-[0_22px_44px_-30px_rgba(67,32,44,0.8)] md:grid md:grid-cols-2">
            <div className="p-6 sm:p-8">
              <p className="font-script text-4xl leading-none text-petalo">¿Lo necesitás urgente?</p>
              <p className="mt-4 flex items-center gap-2 font-display text-lg font-bold"><Zap className="h-5 w-5 text-petalo" />Versión Express: en 24 hs hábiles</p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/80">Sumala a cualquier pack al tocar &quot;Lo quiero&quot;. <b className="text-white">+{formatARS(price.express)}</b>. Avisame antes de que empiece a trabajar.</p>
            </div>
            <div className="border-t border-white/10 bg-white/5 p-6 sm:p-8 md:border-l md:border-t-0">
              <p className="flex items-center gap-2 font-display text-lg font-bold"><Clock className="h-5 w-5 text-petalo" />¿Lo necesitás para un horario puntual?</p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/80">Por ejemplo, para hoy a la tarde o antes de una entrevista. Escribime con el horario y te cotizo en el momento según disponibilidad.</p>
              <a href={whatsappUrl('¡Hola! Necesito mi CV para un horario puntual: ____. ¿Me cotizás?')} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-whatsapp px-5 py-2.5 font-display text-sm font-bold text-white hover:brightness-95"><WhatsAppIcon className="h-4 w-4" />Consultar por WhatsApp</a>
            </div>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-3xl bg-petalo-wash px-6 py-5">
              <h3 className="font-bold text-ciruela">Idiomas y plataformas</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink">Sumá a cualquier pack versiones en inglés, italiano, portugués, francés, alemán u otro idioma, y la carga de tu perfil en Zonajobs, Bumeran, Computrabajo, HiringRoom, Indeed u otras. <b>{formatARS(price.language)} cada uno.</b></p>
            </div>
            <div className="rounded-3xl bg-petalo-wash px-6 py-5">
              <h3 className="font-bold text-ciruela">Plazos de entrega</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink">{DELIVERY_NOTE}</p>
            </div>
            <div className="rounded-3xl bg-petalo-wash px-6 py-5 md:col-span-2 lg:col-span-1">
              <h3 className="font-bold text-ciruela">Ajustes incluidos</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink">Antes de entregarte el CV te paso un boceto y lo ajustamos juntos. Ya entregado, tenés 24 hs para pedir cambios sin costo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials right after the prices: proof at the moment of deciding */}
      <section className="px-4 pb-16 sm:px-6 lg:pb-20" aria-label="Testimonios">
        <div className="mx-auto max-w-5xl">
          <Testimonials />
        </div>
      </section>

      {/* Free checklist: a first step for people who are not ready to buy yet */}
      <section className="px-4 pb-16 sm:px-6 lg:pb-20">
        <Link href="/gratis" className="group mx-auto flex max-w-5xl flex-col items-center gap-6 rounded-[32px] border-2 border-dashed border-rosa/40 bg-white p-6 sm:flex-row sm:p-8">
          <Image src="/img/checklist-gratis.jpg" alt="" width={1200} height={848} className="h-auto w-full max-w-[260px] shrink-0 rounded-2xl shadow-[0_18px_40px_-28px_rgba(67,32,44,0.6)]" />
          <div className="flex-1 text-center sm:text-left">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-rosa-deep">Gratis · sin registrarte</p>
            <p className="mt-2 font-display text-2xl font-extrabold leading-tight text-ciruela">¿No sabés si tu CV está bien?</p>
            <p className="mt-2 text-piedra">Revisalo en 10 minutos con los 24 puntos que miro en cada CV antes de que llegue a un reclutador.</p>
          </div>
          <span className="inline-flex min-h-12 items-center gap-2 rounded-full bg-rosa px-6 py-3 font-display text-sm font-bold text-white transition-transform group-hover:translate-x-1"><ClipboardCheck className="h-4 w-4" />Descargar el checklist</span>
        </Link>
      </section>

      {/* Self-service guides (only shown once at least one is published) */}
      {guides.length > 0 && (
        <section id="guias" className="scroll-mt-28 bg-arena/40 px-4 py-16 sm:px-6 lg:py-20" aria-labelledby="guias-title">
          <div className="mx-auto max-w-6xl">
            <SectionTitle id="guias-title" script="Guías" title="Para tu búsqueda laboral" text="E-books prácticos para aprovechar LinkedIn, los portales de empleo y los filtros ATS. Los descargás apenas confirmo tu pago." />
            <ProductGrid products={guides} tone="asesorias" scroll />
          </div>
        </section>
      )}

      {/* Cross-link to the Asesorías line */}
      <section className="px-4 sm:px-6">
        <Link href="/asesorias" className="group mx-auto flex max-w-6xl flex-col items-center gap-6 rounded-[32px] bg-arena p-6 sm:flex-row sm:p-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/asesorias-vertical.svg" alt="" className="only-light w-40 shrink-0" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/asesorias-vertical-blanco.svg" alt="" className="only-dark w-40 shrink-0" />
          <div className="flex-1 text-center sm:text-left">
            <p className="font-script text-4xl leading-none text-rosa">¿Tenés una entrevista o un psicotécnico?</p>
            <p className="mt-2 text-piedra">E-books de preparación, sesiones 1 a 1 por Google Meet y test vocacional en la sección Asesorías.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-ciruela px-5 py-3 font-display text-sm font-bold text-white transition-transform group-hover:translate-x-1">Ver Asesorías<ArrowRight className="h-4 w-4" /></span>
        </Link>
      </section>

      {/* About */}
      <section id="sobre-mi" className="scroll-mt-28 overflow-x-clip px-4 py-16 sm:px-6 lg:py-24" aria-labelledby="sobre-title">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[0.85fr_1.15fr]">
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-3 -z-10 rotate-2 rounded-[36px] bg-papel" aria-hidden="true" />
            <Image src="/img/valeria-retrato.jpg" alt="Valeria, de Armado de CV" width={768} height={1060} className="h-auto w-full rounded-[32px] object-cover" />
          </div>
          <div>
            <SectionTitle align="left" id="sobre-title" script="Sobre mí" title="Valeria · Armado de CV" />
            <p className="mt-5 leading-relaxed text-ink">Soy <b className="text-ciruela">Técnica en Programación recibida de la UTN</b> y me apasiona el mundo laboral. Conozco los procesos de selección desde adentro: cómo leen tu CV los sistemas ATS, qué buscan los reclutadores y cómo usar la inteligencia artificial y las plataformas de empleo a tu favor.</p>
            <p className="mt-3 leading-relaxed text-ink">Me formé con certificaciones en <b className="text-ciruela">RR.HH. IT, LinkedIn, redes sociales y marketing digital</b>, y hoy pongo todo eso al servicio de algo que me importa de verdad: que encuentres trabajo y te presentes con confianza.</p>
            <p className="mt-3 font-script text-3xl leading-tight text-rosa">Tu experiencia vale; mi trabajo es que se note.</p>
            <ul className="mt-5 flex flex-wrap gap-2 font-display text-xs font-semibold text-ciruela">
              {['Técnica en Programación · UTN', 'IA aplicada', 'Sistemas ATS', 'RR.HH. IT', 'LinkedIn', 'Marketing digital', 'Plataformas laborales'].map((tag) => <li key={tag} className="rounded-full bg-papel px-3 py-1.5">{tag}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* Community */}
      <section className="bg-white px-4 py-16 sm:px-6" aria-labelledby="comunidad-title">
        <div className="mx-auto max-w-5xl">
          <h2 id="comunidad-title" className="text-center text-xs font-semibold uppercase tracking-[0.35em] text-ciruela sm:text-sm">Sumate a la comunidad</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <a href={CONTACT.whatsappChannel} target="_blank" rel="noreferrer" className="flex items-center gap-4 rounded-3xl border border-line bg-blanco p-5 hover:border-whatsapp md:flex-col md:text-center">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-whatsapp/10"><WhatsAppIcon className="h-7 w-7 text-whatsapp" /></span>
              <span><span className="block font-bold text-ciruela">Ofertas laborales</span><span className="text-sm text-piedra">Canal de WhatsApp con búsquedas en Buenos Aires y Argentina.</span></span>
            </a>
            <a href={CONTACT.instagramChannel} target="_blank" rel="noreferrer" className="flex items-center gap-4 rounded-3xl border border-line bg-blanco p-5 hover:border-rosa md:flex-col md:text-center">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-petalo-wash"><Megaphone className="h-7 w-7 text-rosa" /></span>
              <span><span className="block font-bold text-ciruela">Canal de Instagram</span><span className="text-sm text-piedra">Tips, novedades y promos antes que nadie.</span></span>
            </a>
            <a href={`https://instagram.com/${CONTACT.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-4 rounded-3xl border border-line bg-blanco p-5 hover:border-rosa md:flex-col md:text-center">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-papel"><Camera className="h-7 w-7 text-ciruela" /></span>
              <span><span className="block font-bold text-ciruela">@{CONTACT.instagram}</span><span className="text-sm text-piedra">Seguime en Instagram.</span></span>
            </a>
          </div>
        </div>
      </section>

      <HowToBuy steps={steps} note="Al confirmar el pedido aceptás los términos y condiciones: no hay devoluciones de packs contratados una vez iniciado el trabajo." />
      <Faq items={faqs.map((faq) => ({ q: faq.question, a: faq.answer }))} />
    </>
  )
}
