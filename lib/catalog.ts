// Catálogo de Armado de CV. Para cambiar precios, textos o agregar productos, editá este archivo.

export const CONTACT = {
  whatsapp: '5491151060953', // 11 5106-0953 con código de país
  whatsappLabel: '11 5106-0953',
  instagram: 'armadodecv.ok',
  email: 'ayuda.armadodecv@gmail.com',
}

export const TRANSFER = {
  alias: 'armado.cv',
  cbu: '3840200500000032708376',
  holder: 'Valeria Yanina Gil',
}

export type Extra = {
  id: string
  label: string
  price: number | null // null = "a consultar"
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
  /** Opciones de las que el cliente elige una (por ejemplo, qué e-book). */
  choice?: { label: string; options: string[] }
  extras?: Extra[]
  notes?: string[]
  image?: string
  popular?: boolean
}

const CV_EXTRAS: Extra[] = [
  { id: 'express', label: 'Versión Express (entrega en 24 hs)', price: 15000 },
  { id: 'ingles', label: 'Versión en inglés', price: null, hint: 'Te paso el precio por WhatsApp' },
  { id: 'zonajobs', label: 'Carga de perfil en Zonajobs', price: 15000 },
  { id: 'bumeran', label: 'Carga de perfil en Bumeran', price: 15000 },
  { id: 'computrabajo', label: 'Carga de perfil en Computrabajo', price: 15000 },
]

const ZOOM_NOTE = 'El Zoom requiere turno previo.'
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
    image: '/img/flyer-cv.webp',
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
    subtitle: 'Pack Plus + sesión por Zoom',
    price: 60000,
    features: [
      'Los 2 e-books completos',
      'Sesión individual por Zoom de 60 a 90 minutos',
      'Feedback personalizado para potenciar tu perfil y gestionar tu ansiedad',
    ],
    highlight: 'Zoom con turno previo',
    notes: [ZOOM_NOTE, MATERIAL_NOTE],
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
        id: 'zoom',
        label: 'Devolución personalizada por Zoom (uno a uno)',
        price: 30000,
        hint: 'Recomendaciones por ejes, tolerancia a la frustración vocacional y plan de objetivos. Con turno previo.',
      },
    ],
    notes: ['Este instrumento no constituye diagnóstico ni evaluación psicométrica estandarizada. Debe utilizarse como herramienta de orientación.'],
  },
]

export const DELIVERY_NOTE = 'Demora de cualquier pack de CV: 3 a 4 días hábiles. Versión Express dentro de las 24 hs: +$15.000.'

const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
export const formatARS = (value: number) => ars.format(value)

export function whatsappUrl(message: string) {
  return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`
}
