// Catálogo de Armado de CV. Para cambiar precios, textos o agregar productos, editá este archivo.

export const CONTACT = {
  whatsapp: '5491151060953', // 11 5106-0953 con código de país
  whatsappLabel: '11 5106-0953',
  instagram: 'armadodecv.ok',
  email: 'ayuda.armadodecv@gmail.com',
  whatsappChannel: 'https://whatsapp.com/channel/0029VbBCcipC1Fu5TJUJI01P',
  instagramChannel: 'https://www.instagram.com/channel/AbZlBmFI1h04VlJz/',
  testimonials: 'https://www.instagram.com/p/DOyrbETjlLI/',
}

export const TRANSFER = {
  alias: 'armado.cv',
  cbu: '3840200500000032708376',
  holder: 'Valeria Yanina Gil',
}

/** A group of add-ons priced per selected option (e.g. each language costs the same). */
export type ExtraGroup = {
  id: string
  label: string
  unitPrice: number
  options: { id: string; label: string }[]
  /** Option id that asks the customer to type what they need ("Otro"). */
  otherOptionId?: string
  hint?: string
}

export type Product = {
  id: string
  category: 'cv' | 'asesorias' | 'vocacional'
  name: string
  subtitle?: string
  price: number
  priceNote?: string
  features: string[]
  highlight?: string
  /** Options the customer picks exactly one of (e.g. which e-book). */
  choice?: { label: string; options: string[] }
  extras?: ExtraGroup[]
  notes?: string[]
  popular?: boolean
}

export const EXPRESS: ExtraGroup = {
  id: 'express',
  label: 'Entrega express',
  unitPrice: 15000,
  options: [{ id: 'express', label: 'Versión Express: dentro de las 24 hs hábiles' }],
}

export const LANGUAGES: ExtraGroup = {
  id: 'idiomas',
  label: 'Versión en otro idioma',
  unitPrice: 15000,
  hint: 'Cada idioma suma una versión completa de tu CV.',
  options: [
    { id: 'ingles', label: 'Inglés' },
    { id: 'italiano', label: 'Italiano' },
    { id: 'portugues', label: 'Portugués' },
    { id: 'frances', label: 'Francés' },
    { id: 'espanol', label: 'Español' },
    { id: 'aleman', label: 'Alemán' },
    { id: 'otro-idioma', label: 'Otro idioma' },
  ],
  otherOptionId: 'otro-idioma',
}

export const PLATFORMS: ExtraGroup = {
  id: 'plataformas',
  label: 'Carga de tu perfil en plataformas de empleo',
  unitPrice: 15000,
  hint: 'Armo y cargo tu perfil completo en cada plataforma que elijas.',
  options: [
    { id: 'zonajobs', label: 'Zonajobs' },
    { id: 'bumeran', label: 'Bumeran' },
    { id: 'computrabajo', label: 'Computrabajo' },
    { id: 'hiringroom', label: 'HiringRoom' },
    { id: 'indeed', label: 'Indeed' },
    { id: 'otra-plataforma', label: 'Otra plataforma' },
  ],
  otherOptionId: 'otra-plataforma',
}

const CV_EXTRAS = [EXPRESS, LANGUAGES, PLATFORMS]

const MEET_NOTE = 'La videollamada por Google Meet se coordina con turno previo.'
const MATERIAL_NOTE = 'El material se envía luego de completar el consentimiento informado y la transferencia total.'

export const PRODUCTS: Product[] = [
  {
    id: 'cv-simple',
    category: 'cv',
    name: 'Pack Simple',
    subtitle: 'Curriculum Vitae',
    price: 30000,
    features: [
      'Revisión de tu CV anterior',
      '2 CV nuevos: uno moderno + uno optimizado para filtros ATS (mismo rubro)',
    ],
    extras: CV_EXTRAS,
  },
  {
    id: 'cv-medium',
    category: 'cv',
    name: 'Pack Medium',
    subtitle: 'CV + carta de presentación',
    price: 32000,
    features: [
      '2 CV nuevos: uno moderno + uno optimizado para filtros ATS',
      'Carta de presentación',
    ],
    extras: CV_EXTRAS,
    popular: true,
  },
  {
    id: 'cv-premium',
    category: 'cv',
    name: 'Pack Premium',
    subtitle: 'CV + LinkedIn + carta',
    price: 60000,
    features: [
      'Armado de perfil de LinkedIn completo',
      '2 CV nuevos: uno moderno + uno optimizado para filtros ATS (mismo rubro)',
      'Carta de presentación',
    ],
    extras: CV_EXTRAS,
  },
  {
    id: 'linkedin',
    category: 'cv',
    name: 'Perfil de LinkedIn',
    subtitle: 'Sin pack de CV',
    price: 40000,
    features: [
      'Armado de tu perfil de LinkedIn completo',
      'Titular, extracto, experiencia y aptitudes pensados para que te encuentren los reclutadores',
      '¿También necesitás CV? El Pack Premium incluye LinkedIn',
    ],
    extras: [EXPRESS],
  },
  {
    id: 'ebook',
    category: 'asesorias',
    name: 'E-book individual',
    subtitle: 'Preparación a tu ritmo',
    price: 20000,
    priceNote: 'c/u',
    features: [
      'Guía práctica en formato Word',
      'Lectura desde celular, tablet o computadora',
      'Ejercitación guiada de preparación incluida',
    ],
    choice: {
      label: '¿Qué e-book querés?',
      options: [
        'Asesoría integral para entrevistas laborales',
        'Asesoría especial: entrevistas virtuales',
        'Tests laborales y psicotécnicos',
      ],
    },
    notes: [MATERIAL_NOTE],
  },
  {
    id: 'asesoria-plus',
    category: 'asesorias',
    name: 'Pack Plus',
    subtitle: '2 e-books completos',
    price: 35000,
    features: [
      'E-book de asesoría integral para entrevistas laborales',
      'E-book de asesoría integral para tests laborales',
      'Ejercitación guiada de preparación incluida',
    ],
    notes: [MATERIAL_NOTE],
    popular: true,
  },
  {
    id: 'asesoria-premium',
    category: 'asesorias',
    name: 'Pack Premium',
    subtitle: 'Pack Plus + sesión 1 a 1',
    price: 60000,
    features: [
      'Los 2 e-books completos',
      'Sesión individual por Google Meet de 60 a 90 minutos',
      'Feedback personalizado para potenciar tu perfil y gestionar tu ansiedad',
    ],
    highlight: 'Google Meet con turno previo',
    notes: [MEET_NOTE, MATERIAL_NOTE],
  },
  {
    id: 'test-vocacional',
    category: 'vocacional',
    name: 'Test de orientación vocacional',
    subtitle: 'CHASIDE + Test Vocacional versión profesional adaptada (TV-A)',
    price: 30000,
    features: [
      'Administración de la batería específica de tests',
      'Devolución de resultados por correo electrónico',
    ],
    extras: [
      {
        id: 'devolucion',
        label: 'Devolución personalizada',
        unitPrice: 30000,
        options: [{ id: 'meet', label: 'Devolución 1 a 1 por Google Meet' }],
        hint: 'Recomendaciones prácticas por ejes, tolerancia a la frustración vocacional y plan de intervención con objetivos claros. Con turno previo.',
      },
    ],
    notes: ['Este instrumento no constituye diagnóstico ni evaluación psicométrica estandarizada. Debe utilizarse como herramienta de orientación.'],
  },
]

export const DELIVERY_NOTE = 'Demora de cualquier pack de CV: 3 a 4 días hábiles. Versión Express dentro de las 24 hs hábiles: +$15.000.'

const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
export const formatARS = (value: number) => ars.format(value).replace(/\s/g, '')

export function whatsappUrl(message: string) {
  return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`
}
