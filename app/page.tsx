import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Camera, Clock, Megaphone, MessageCircle, Star } from 'lucide-react'
import { ProductGrid } from '@/components/product-grid'
import { Faq, HowToBuy, SectionTitle } from '@/components/sections'
import { CONTACT, DELIVERY_NOTE, PRODUCTS, formatARS, whatsappUrl } from '@/lib/catalog'

const cvProducts = PRODUCTS.filter((product) => product.category === 'cv')

// iconos.webp is a 2x2 sheet: people · info · payment · handshake
const promises = [
  { position: '0% 0%', title: 'Atención personalizada', text: 'Trabajo sobre tu experiencia real y tu rubro, sin plantillas genéricas.' },
  { position: '100% 0%', title: 'Todo claro desde el inicio', text: 'Sabés qué incluye cada pack, cuánto cuesta y cuándo lo recibís.' },
  { position: '0% 100%', title: 'Pago simple', text: 'Transferencia bancaria y comprobante por WhatsApp.' },
  { position: '100% 100%', title: 'Acompañamiento', text: 'Te acompaño hasta la entrega y respondo tus dudas.' },
]

const steps = [
  { title: 'Elegí tu pack', text: 'Tocá "Lo quiero", sumá idiomas, plataformas o entrega express y mirá el total.' },
  { title: 'Enviá el pedido', text: 'Se abre WhatsApp con tu pedido ya escrito. Solo lo enviás.' },
  { title: 'Transferí', text: 'Al alias armado.cv y mandame el comprobante.' },
  { title: 'Recibí tu CV', text: 'En 3 a 4 días hábiles, o en 24 hs hábiles con la versión Express.' },
]

const faqs = [
  { q: '¿Qué es un CV optimizado para filtros ATS?', a: 'Muchas empresas usan sistemas (ATS) que leen los CV automáticamente antes de que los vea una persona. El CV ATS está armado con la estructura y las palabras clave que esos sistemas reconocen, para que tu postulación no quede descartada por el formato.' },
  { q: '¿Cuánto tarda mi CV?', a: 'Cualquier pack se entrega en 3 a 4 días hábiles desde que se confirma el pago. Con la versión Express, dentro de las 24 hs hábiles por $15.000 extra.' },
  { q: '¿Hacen el CV en otros idiomas?', a: 'Sí: inglés, italiano, portugués, francés, español, alemán y otros a consultar. Cada idioma suma $15.000.' },
  { q: '¿En qué plataformas cargan mi perfil?', a: 'Zonajobs, Bumeran, Computrabajo, HiringRoom, Indeed y otras a consultar: $15.000 cada una, sumadas a cualquier pack. LinkedIn sin pack cuesta $40.000; el Pack Premium ya lo incluye.' },
  { q: '¿Cómo pago?', a: 'Por transferencia bancaria al alias armado.cv (titular Valeria Yanina Gil). Después me mandás el comprobante por WhatsApp y arrancamos.' },
]

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="relative mx-auto max-w-6xl lg:min-h-[560px]">
          <Image src="/img/hero-banner.webp" alt="" width={1472} height={704} priority className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-auto max-w-none object-cover object-right lg:block" />
          <div className="relative z-10 px-4 pb-6 pt-10 sm:px-6 lg:max-w-[560px] lg:py-24">
            <p className="font-script text-4xl leading-none text-rosa">Hola, soy Valeria</p>
            <h1 className="mt-3 text-[34px] font-extrabold leading-[1.1] text-ciruela sm:text-5xl">Tu CV listo para pasar los filtros y llegar a la entrevista</h1>
            <p className="mt-5 text-lg leading-relaxed text-piedra">CV modernos y optimizados para ATS, perfil de LinkedIn, cartas de presentación y carga en plataformas de empleo. Armado para vos, no con plantillas.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#precios" className="inline-flex min-h-12 items-center justify-center rounded-full bg-rosa px-7 py-3.5 font-display font-bold text-white shadow-lg shadow-rosa/25 transition-colors hover:bg-rosa-deep">Ver packs y precios</a>
              <a href={whatsappUrl('¡Hola! Quiero consultar por el armado de mi CV.')} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-ciruela/15 px-6 py-3 font-display font-bold text-ciruela hover:border-whatsapp hover:text-whatsapp"><MessageCircle className="h-5 w-5" />Consultar</a>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-piedra"><Clock className="h-4 w-4 text-rosa" />3 a 4 días hábiles · Express en 24 hs hábiles</p>
          </div>
          <Image src="/img/hero-banner.webp" alt="Valeria mostrando un CV y un perfil de LinkedIn en el celular" width={1472} height={704} priority className="h-64 w-full object-cover object-[78%_center] sm:h-80 lg:hidden" />
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
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-petalo-wash px-6 py-5">
              <h3 className="font-bold text-ciruela">Idiomas y plataformas</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink">Sumá a cualquier pack versiones en inglés, italiano, portugués, francés, alemán u otro idioma, y la carga de tu perfil en Zonajobs, Bumeran, Computrabajo, HiringRoom, Indeed u otras. <b>{formatARS(15000)} cada uno.</b></p>
            </div>
            <div className="rounded-3xl bg-petalo-wash px-6 py-5">
              <h3 className="font-bold text-ciruela">Plazos de entrega</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink">{DELIVERY_NOTE}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Cross-link to the Asesorías line */}
      <section className="px-4 sm:px-6">
        <Link href="/asesorias" className="group mx-auto flex max-w-6xl flex-col items-center gap-6 rounded-[32px] bg-arena p-6 sm:flex-row sm:p-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/asesorias-vertical.svg" alt="" className="w-40 shrink-0" />
          <div className="flex-1 text-center sm:text-left">
            <p className="font-script text-4xl leading-none text-rosa">¿Tenés una entrevista o un psicotécnico?</p>
            <p className="mt-2 text-piedra">E-books de preparación, sesiones 1 a 1 por Google Meet y test vocacional en la sección Asesorías.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-ciruela px-5 py-3 font-display text-sm font-bold text-white transition-transform group-hover:translate-x-1">Ver Asesorías<ArrowRight className="h-4 w-4" /></span>
        </Link>
      </section>

      {/* About */}
      <section id="sobre-mi" className="scroll-mt-28 px-4 py-16 sm:px-6 lg:py-24" aria-labelledby="sobre-title">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[0.85fr_1.15fr]">
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-3 -z-10 rotate-2 rounded-[36px] bg-papel" aria-hidden="true" />
            <Image src="/img/valeria-retrato.webp" alt="Valeria, de Armado de CV" width={768} height={1344} className="h-auto w-full rounded-[32px] object-cover" />
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

      {/* Testimonials + community */}
      <section className="bg-white px-4 py-16 sm:px-6" aria-labelledby="comunidad-title">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[32px] bg-papel px-6 py-10 text-center">
            <p className="font-script text-[52px] leading-none text-rosa" aria-hidden="true">Testimonios</p>
            <h2 className="mt-1 text-xs font-semibold uppercase tracking-[0.35em] text-ciruela sm:text-sm">Lo que dicen mis clientes</h2>
            <p className="mx-auto mt-4 max-w-xl text-piedra">Personas que armaron su CV, se prepararon para su entrevista y hoy están trabajando.</p>
            <a href={CONTACT.testimonials} target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-ciruela px-6 py-3 font-display font-bold text-white transition-colors hover:bg-rosa"><Star className="h-4 w-4" />Ver testimonios en Instagram</a>
          </div>

          <h2 id="comunidad-title" className="mt-14 text-center text-xs font-semibold uppercase tracking-[0.35em] text-ciruela sm:text-sm">Sumate a la comunidad</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <a href={CONTACT.whatsappChannel} target="_blank" rel="noreferrer" className="flex items-center gap-4 rounded-3xl border border-line bg-blanco p-5 hover:border-whatsapp md:flex-col md:text-center">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-whatsapp/10"><MessageCircle className="h-7 w-7 text-whatsapp" /></span>
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

      <HowToBuy steps={steps} />
      <Faq items={faqs} />
    </>
  )
}
