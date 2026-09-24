import Image from 'next/image'
import { Camera, Clock, FileCheck2, Mail, Megaphone, MessageCircle, ShieldCheck, Star } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { ProductGrid } from '@/components/product-grid'
import { CONTACT, DELIVERY_NOTE, PRODUCTS, TRANSFER, formatARS, whatsappUrl } from '@/lib/catalog'

const cvProducts = PRODUCTS.filter((product) => product.category === 'cv')
const interviewProducts = PRODUCTS.filter((product) => product.category === 'asesorias')
const vocational = PRODUCTS.find((product) => product.category === 'vocacional')!

// iconos.webp is a 2x2 sheet: people · info · payment · handshake
const promises = [
  { position: '0% 0%', title: 'Atención personalizada', text: 'Trabajo sobre tu experiencia real y tu rubro, sin plantillas genéricas.' },
  { position: '100% 0%', title: 'Todo claro desde el inicio', text: 'Sabés qué incluye cada pack, cuánto cuesta y cuándo lo recibís.' },
  { position: '0% 100%', title: 'Pago simple', text: 'Transferencia bancaria y comprobante por WhatsApp.' },
  { position: '100% 100%', title: 'Acompañamiento', text: 'Te acompaño hasta la entrega y respondo tus dudas.' },
]

const steps = [
  { title: 'Elegí tu pack', text: 'Tocá "Lo quiero", sumá los extras que necesites y mirá el total.' },
  { title: 'Enviá el pedido', text: 'Se abre WhatsApp con tu pedido ya escrito. Solo lo enviás.' },
  { title: 'Transferí', text: `Al alias ${TRANSFER.alias} y mandame el comprobante.` },
  { title: 'Recibí tu material', text: 'CV en 3 a 4 días hábiles (Express en 24 hs hábiles); e-books apenas se confirma el pago.' },
]

const topics = [
  { title: 'Checklist de preparación', items: ['Checklists + errores frecuentes', 'Guía del día de la evaluación laboral, paso a paso', 'Qué hacer mientras esperás los resultados', 'Manejo de ansiedad en entrevistas y tests'] },
  { title: 'Contenido de los e-books', items: ['Guía para entrevistas laborales', 'Guía para psicotécnicos laborales', 'Personalidad laboral', 'Aptos laborales', 'Ejercitación práctica incluida'] },
  { title: 'Sesión 1 a 1 de feedback (Google Meet)', items: ['Simulacro guiado de entrevista y/o psicotécnico', 'Observación en tiempo real de tu abordaje', 'Feedback inmediato y personalizado', 'Identificación de fortalezas reales', 'Trabajo específico sobre la ansiedad (antes, durante y después)'] },
]

const faqs = [
  { q: '¿Qué es un CV optimizado para filtros ATS?', a: 'Muchas empresas usan sistemas (ATS) que leen los CV automáticamente antes de que los vea una persona. El CV ATS está armado con la estructura y las palabras clave que esos sistemas reconocen, para que tu postulación no quede descartada por el formato.' },
  { q: '¿Cuánto tarda mi CV?', a: 'Cualquier pack de CV se entrega en 3 a 4 días hábiles desde que se confirma el pago. Si lo necesitás antes, la Versión Express lo entrega dentro de las 24 hs hábiles por $15.000 extra.' },
  { q: '¿Hacen el CV en otros idiomas?', a: 'Sí: inglés, italiano, portugués, francés, español, alemán y otros a consultar. Cada idioma es un extra de $15.000.' },
  { q: '¿Cómo recibo los e-books?', a: 'Son archivos Word que podés leer desde el celular, la tablet o la computadora. Te los envío apenas completás el consentimiento informado y la transferencia total.' },
  { q: '¿Cómo es la sesión 1 a 1?', a: 'Es una videollamada por Google Meet con turno previo. Una vez confirmado el pago, coordinamos día y horario por WhatsApp y te paso el link de la reunión.' },
  { q: '¿El test vocacional es un diagnóstico?', a: 'No. Es una herramienta de orientación: no constituye diagnóstico ni evaluación psicométrica estandarizada.' },
  { q: '¿Cómo pago?', a: `Por transferencia bancaria al alias ${TRANSFER.alias} (titular ${TRANSFER.holder}). Después me mandás el comprobante por WhatsApp.` },
]

function SectionTitle({ script, title, text, id }: { script: string; title: string; text?: string; id?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="font-script text-5xl leading-none text-stone sm:text-6xl" aria-hidden="true">{script}</p>
      <h2 id={id} className="mt-2 text-sm font-semibold uppercase tracking-[0.35em] text-plum sm:text-base">{title}</h2>
      {text && <p className="mt-4 text-[15px] leading-relaxed text-stone">{text}</p>}
    </div>
  )
}

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="inicio">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-20">
            <div>
              <Image src="/img/logo-asesorias.webp" alt="Armado de CV — Asesorías" width={220} height={220} className="h-auto w-40 sm:w-48" priority />
              <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.1] text-plum sm:text-5xl">Tu CV listo para pasar los filtros y llegar a la entrevista</h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone">CV modernos y optimizados para ATS, perfil de LinkedIn, cartas de presentación y preparación para entrevistas y psicotécnicos. Sin plantillas genéricas: armado para vos.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="#cv" className="inline-flex items-center justify-center rounded-full bg-plum px-6 py-3.5 font-bold text-white transition-colors hover:bg-rose">Ver packs y precios</a>
                <a href={whatsappUrl('¡Hola! Quiero consultar por el armado de mi CV.')} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-whatsapp px-6 py-3 font-bold text-whatsapp hover:bg-whatsapp hover:text-white"><MessageCircle className="h-5 w-5" />Consultar por WhatsApp</a>
              </div>
              <p className="mt-6 flex items-center gap-2 text-sm text-stone"><Clock className="h-4 w-4 text-rose" />Entrega en 3 a 4 días hábiles · Express en 24 hs hábiles</p>
            </div>
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="absolute -inset-4 -z-10 rounded-[40px] bg-rose-wash" aria-hidden="true" />
              <Image src="/img/valeria-cv.webp" alt="Valeria sosteniendo un CV" width={768} height={1344} className="mx-auto h-auto max-h-[560px] w-auto rounded-[32px] object-cover" priority />
              <div className="absolute bottom-6 left-0 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-lg sm:-left-6">
                <FileCheck2 className="h-8 w-8 text-rose" />
                <div><p className="text-sm font-bold text-plum">2 CV por pack</p><p className="text-xs text-stone">Moderno + optimizado ATS</p></div>
              </div>
            </div>
          </div>
        </section>

        {/* Promises */}
        <section aria-label="Por qué elegirme" className="border-y border-line bg-white">
          <ul className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {promises.map((item) => (
              <li key={item.title} className="flex items-start gap-4">
                <span aria-hidden="true" className="h-16 w-16 shrink-0 rounded-full bg-no-repeat" style={{ backgroundImage: 'url(/img/iconos.webp)', backgroundSize: '200% 200%', backgroundPosition: item.position }} />
                <div><h3 className="font-bold text-plum">{item.title}</h3><p className="mt-1 text-sm leading-relaxed text-stone">{item.text}</p></div>
              </li>
            ))}
          </ul>
        </section>

        {/* CV packs */}
        <section id="cv" className="scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24" aria-labelledby="cv-title">
          <div className="mx-auto max-w-6xl">
            <SectionTitle id="cv-title" script="Catálogo" title="Armado de CV" text="Cada pack incluye dos CV: uno con diseño moderno y otro optimizado para los filtros ATS que usan las empresas." />
            <ProductGrid products={cvProducts} />
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <p className="rounded-3xl bg-rose-wash px-6 py-4 text-center text-sm font-semibold text-rose">{DELIVERY_NOTE}</p>
              <p className="rounded-3xl bg-rose-wash px-6 py-4 text-center text-sm font-semibold text-rose">Sumá a cualquier pack: versión en inglés, italiano, portugués, francés, alemán u otro idioma, y carga de perfil en Zonajobs, Bumeran, Computrabajo, HiringRoom, Indeed u otras. {formatARS(15000)} cada uno.</p>
            </div>
          </div>
        </section>

        {/* Interview prep */}
        <section id="entrevistas" className="scroll-mt-20 bg-white px-4 py-16 sm:px-6 lg:py-24" aria-labelledby="entrevistas-title">
          <div className="mx-auto max-w-6xl">
            <SectionTitle id="entrevistas-title" script="Asesorías" title="Entrevistas y psicotécnicos" text="¿Tenés una entrevista o un psicotécnico y no sabés qué esperar? Preparate con guías prácticas y ejercitación, sin falsear nada." />
            <ProductGrid products={interviewProducts} />
            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {topics.map((topic) => (
                <div key={topic.title} className="rounded-3xl border border-line bg-paper p-6">
                  <h3 className="font-bold uppercase tracking-wide text-stone">{topic.title}</h3>
                  <ul className="mt-3 space-y-1.5 text-sm text-ink/85">{topic.items.map((item) => <li key={item}>· {item}</li>)}</ul>
                </div>
              ))}
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                { title: 'Para quién es', text: 'Personas en búsqueda laboral, con ansiedad ante entrevistas o psicotécnicos, que quieren entender el proceso y sentirse más seguras.' },
                { title: 'Qué cambia después', text: 'Menos ansiedad, más claridad, mejor actitud frente al proceso, más coherencia al responder y más confianza en tu recorrido.' },
                { title: 'Formato', text: 'E-book en Word, para leer desde el celular, la tablet o la computadora. Acceso apenas se confirma el pago.' },
              ].map((item) => <div key={item.title} className="rounded-3xl bg-sand p-6"><h3 className="text-sm font-bold uppercase tracking-wide text-plum">{item.title}</h3><p className="mt-2 text-sm leading-relaxed text-ink/85">{item.text}</p></div>)}
            </div>
            <p className="mt-6 text-center text-sm italic text-stone">Prepararte no garantiza un resultado, pero sí te permite mostrarte mejor.</p>
          </div>
        </section>

        {/* Vocational test */}
        <section id="vocacional" className="scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24" aria-labelledby="vocacional-title">
          <div className="mx-auto max-w-6xl">
            <SectionTitle id="vocacional-title" script="Catálogo" title="Test vocacional" text="Una batería de tests para orientarte a la hora de elegir tu camino, con devolución por email o en un encuentro personalizado por Google Meet." />
            <div className="mx-auto max-w-md"><ProductGrid products={[vocational]} /></div>
            <p className="mx-auto mt-8 max-w-2xl rounded-3xl bg-sand px-6 py-4 text-center text-sm text-stone">{vocational.notes?.[0]}</p>
          </div>
        </section>

        {/* How to buy */}
        <section id="como-comprar" className="scroll-mt-20 bg-plum px-4 py-16 text-white sm:px-6 lg:py-20" aria-labelledby="como-title">
          <div className="mx-auto max-w-6xl">
            <p className="text-center font-script text-5xl text-rose-soft" aria-hidden="true">Cómo comprar</p>
            <h2 id="como-title" className="mt-1 text-center text-sm font-semibold uppercase tracking-[0.35em]">En 4 pasos</h2>
            <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <li key={step.title} className="rounded-3xl bg-white/10 p-6">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-soft font-bold text-plum">{index + 1}</span>
                  <h3 className="mt-4 font-bold">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/80">{step.text}</p>
                </li>
              ))}
            </ol>
            <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-2 rounded-3xl bg-white/10 px-6 py-5 text-center text-sm sm:flex-row sm:justify-center sm:gap-6">
              <span>Alias: <b className="font-mono">{TRANSFER.alias}</b></span>
              <span className="hidden sm:inline" aria-hidden="true">·</span>
              <span>Titular: <b>{TRANSFER.holder}</b></span>
            </div>
            <p className="mx-auto mt-4 flex max-w-2xl items-start justify-center gap-2 text-center text-xs text-white/70"><ShieldCheck className="h-4 w-4 shrink-0" />El material de asesorías se envía únicamente luego de completar el consentimiento informado y la transferencia total.</p>
          </div>
        </section>

        {/* About */}
        <section id="sobre-mi" className="scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24" aria-labelledby="sobre-title">
          <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[0.9fr_1.1fr]">
            <Image src="/img/valeria-retrato.webp" alt="Valeria, de Armado de CV" width={768} height={1344} className="mx-auto h-auto max-h-[520px] w-auto rounded-[32px] object-cover" />
            <div>
              <p className="font-script text-5xl text-stone" aria-hidden="true">Sobre mí</p>
              <h2 id="sobre-title" className="mt-2 text-3xl font-extrabold text-plum">¡Hola! Soy Valeria</h2>
              <p className="mt-4 leading-relaxed text-stone">Soy <b className="text-plum">Técnica en Programación recibida de la UTN</b> y me apasiona el mundo laboral. Conozco los procesos de selección desde adentro: cómo leen tu CV los sistemas ATS, qué buscan los reclutadores y cómo usar la inteligencia artificial y las plataformas de empleo a tu favor.</p>
              <p className="mt-3 leading-relaxed text-stone">Me formé con certificaciones en <b className="text-plum">RR.HH. IT, LinkedIn, redes sociales y marketing digital</b>, y hoy pongo todo eso al servicio de algo que me importa de verdad: que encuentres trabajo y te presentes con confianza.</p>
              <p className="mt-3 leading-relaxed text-stone">Trabajo de forma cercana y clara: sabés qué vas a recibir, cuándo y cuánto cuesta. Tu experiencia vale; mi trabajo es que se note.</p>
              <ul className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-plum">
                {['Técnica en Programación · UTN', 'IA aplicada', 'Sistemas ATS', 'RR.HH. IT', 'LinkedIn', 'Marketing digital', 'Plataformas laborales'].map((tag) => <li key={tag} className="rounded-full bg-rose-wash px-3 py-1.5">{tag}</li>)}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={`https://instagram.com/${CONTACT.instagram}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-plum hover:border-rose"><Camera className="h-4 w-4 text-rose" />@{CONTACT.instagram}</a>
                <a href={whatsappUrl('¡Hola Valeria! Quiero hacerte una consulta.')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-whatsapp px-4 py-2.5 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4" />{CONTACT.whatsappLabel}</a>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials + community */}
        <section className="bg-white px-4 py-16 sm:px-6" aria-labelledby="comunidad-title">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-[32px] bg-rose-wash px-6 py-10 text-center">
              <p className="font-script text-5xl leading-none text-rose" aria-hidden="true">Testimonios</p>
              <h2 className="mt-2 text-sm font-semibold uppercase tracking-[0.35em] text-plum">Lo que dicen mis clientes</h2>
              <p className="mx-auto mt-4 max-w-xl text-stone">Personas que armaron su CV, se prepararon para su entrevista y hoy están trabajando. Mirá sus experiencias en mi Instagram.</p>
              <a href={CONTACT.testimonials} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full bg-plum px-6 py-3 font-bold text-white transition-colors hover:bg-rose"><Star className="h-4 w-4" />Ver testimonios</a>
            </div>

            <h2 id="comunidad-title" className="mt-14 text-center text-sm font-semibold uppercase tracking-[0.35em] text-plum">Sumate a la comunidad</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              <a href={CONTACT.whatsappChannel} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-paper p-6 text-center hover:border-whatsapp">
                <Image src="/img/qr-canal-whatsapp.jpg" alt="" width={90} height={160} className="h-28 w-auto rounded-xl" />
                <p className="font-bold text-plum">Ofertas laborales</p>
                <p className="text-sm text-stone">Canal de WhatsApp con búsquedas en Buenos Aires y Argentina.</p>
                <span className="mt-auto inline-flex items-center gap-2 rounded-full bg-whatsapp px-4 py-2 text-sm font-bold text-white"><MessageCircle className="h-4 w-4" />Seguir el canal</span>
              </a>
              <a href={CONTACT.instagramChannel} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-paper p-6 text-center hover:border-rose">
                <span className="flex h-28 w-28 items-center justify-center rounded-full bg-rose-wash"><Megaphone className="h-12 w-12 text-rose" /></span>
                <p className="font-bold text-plum">Canal de Instagram</p>
                <p className="text-sm text-stone">Tips de búsqueda laboral, novedades y promos antes que nadie.</p>
                <span className="mt-auto inline-flex items-center gap-2 rounded-full bg-rose px-4 py-2 text-sm font-bold text-white">Unirme al canal</span>
              </a>
              <a href={`https://instagram.com/${CONTACT.instagram}`} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-paper p-6 text-center hover:border-rose">
                <Image src="/img/qr-instagram.jpg" alt="" width={120} height={160} className="h-28 w-auto rounded-xl" />
                <p className="font-bold text-plum">@{CONTACT.instagram}</p>
                <p className="text-sm text-stone">Seguime en Instagram.</p>
                <span className="mt-auto inline-flex items-center gap-2 rounded-full border border-plum px-4 py-2 text-sm font-bold text-plum"><Camera className="h-4 w-4" />Seguir</span>
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="preguntas" className="scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24" aria-labelledby="faq-title">
          <div className="mx-auto max-w-3xl">
            <SectionTitle id="faq-title" script="Preguntas" title="Frecuentes" />
            <div className="mt-10 space-y-3">
              {faqs.map((item) => (
                <details key={item.q} className="group rounded-2xl border border-line bg-white px-5 py-4 open:border-rose">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-plum">{item.q}<span className="text-xl text-rose transition-transform group-open:rotate-45" aria-hidden="true">+</span></summary>
                  <p className="mt-3 text-sm leading-relaxed text-stone">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-sand px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
          <div className="flex items-center gap-3">
            <Image src="/img/isotipo.webp" alt="" width={56} height={56} className="h-14 w-14 rounded-full" />
            <div><p className="font-script text-3xl leading-none text-rose">Armado de CV</p><p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone">Asesorías</p></div>
          </div>
          <div className="flex flex-col items-center gap-2 text-sm text-stone md:items-end">
            <a href={`mailto:${CONTACT.email}`} className="inline-flex items-center gap-2 hover:text-rose"><Mail className="h-4 w-4" />{CONTACT.email}</a>
            <a href={`https://instagram.com/${CONTACT.instagram}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-rose"><Camera className="h-4 w-4" />@{CONTACT.instagram}</a>
            <p className="text-xs">© {new Date().getFullYear()} Armado de CV · Asesorías</p>
          </div>
        </div>
      </footer>

      <a href={whatsappUrl('¡Hola! Quiero hacer una consulta.')} target="_blank" rel="noreferrer" className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-xl transition-transform hover:scale-105" aria-label="Escribime por WhatsApp">
        <MessageCircle className="h-7 w-7" />
      </a>
    </>
  )
}
