// "Tus datos para el CV" (armadodecv.com/datos/<token>): the questions of Vale's old Google form, shared by the
// customer's page and the panel, and the text that goes to "Textos con Claude".
import { SITE_URL } from './catalog'
import { supabase } from './supabase'
import { ATS_ONLY_PACKS, LINKEDIN_PACKS, PACKS_WITH_LETTER, TEAM_PACKS } from './team'

export type Answers = Partial<Record<QuestionId, string>> & { first_job?: boolean }

export type ClientForm = {
  token: string
  answers: Answers
  files: string[]
  photo: string | null
  submitted_at: string | null
  seen_at?: string | null
  updated_at?: string | null
}

/** What the order needs: a CV pack (with or without the modern design and the letter) and/or the LinkedIn profile. */
export type FormNeeds = { cv: boolean; modern: boolean; letter: boolean; linkedin: boolean }

export function formNeeds(productIds: string[]): FormNeeds {
  const cvPacks = productIds.filter((id) => TEAM_PACKS.includes(id))
  return {
    cv: cvPacks.length > 0,
    modern: cvPacks.some((id) => !ATS_ONLY_PACKS.includes(id)),
    letter: productIds.some((id) => PACKS_WITH_LETTER.includes(id)),
    linkedin: productIds.some((id) => LINKEDIN_PACKS.includes(id)),
  }
}

/** Orders that get the form: the ones Vale writes texts for (CV packs and the LinkedIn profile). */
export const takesForm = (productIds: string[]) => {
  const needs = formNeeds(productIds)
  return needs.cv || needs.linkedin
}

type QuestionId = 'full_name' | 'phone' | 'email' | 'city' | 'target' | 'about' | 'experience' | 'education' | 'courses' | 'languages' | 'tools' | 'strengths' | 'letter_for' | 'linkedin_url' | 'linkedin_goal' | 'extra'

export type Question = {
  id: QuestionId
  label: string
  help?: string
  placeholder?: string
  /** Short answers go on one line; the rest are boxes. */
  short?: boolean
  inputMode?: 'tel' | 'email' | 'url'
  required?: boolean
  /** Only for orders that need it. */
  when?: keyof FormNeeds
  section: 'contacto' | 'perfil' | 'experiencia' | 'pack'
}

export const SECTIONS: { id: Question['section']; title: string; text?: string }[] = [
  { id: 'contacto', title: 'Tus datos de contacto', text: 'Van en el encabezado del CV.' },
  { id: 'perfil', title: 'Qué buscás', text: 'Con esto armo tu perfil y elijo las palabras clave para los filtros ATS.' },
  { id: 'experiencia', title: 'Tu recorrido', text: 'Contame todo con detalle: después yo elijo qué va y cómo se escribe. Si ya me subís tu CV actual, completá solo lo que no esté ahí o lo que cambió.' },
  { id: 'pack', title: 'Para tu pack' },
]

export const QUESTIONS: Question[] = [
  { id: 'full_name', section: 'contacto', label: 'Nombre y apellido', short: true, required: true },
  { id: 'phone', section: 'contacto', label: 'Teléfono', short: true, inputMode: 'tel', required: true },
  { id: 'email', section: 'contacto', label: 'Email', short: true, inputMode: 'email', required: true },
  { id: 'city', section: 'contacto', label: 'Localidad', placeholder: 'Ej.: San Martín, Buenos Aires', short: true, required: true },
  { id: 'target', section: 'perfil', label: '¿Para qué puesto o rubro querés el CV?', help: 'Si apuntás a un público en particular o es general. Ej.: IT, abogacía, comunicación, cadenas de comida, primer empleo. Si tenés un aviso que te interesa, pegá el link.', required: true },
  { id: 'about', section: 'perfil', label: 'Una breve descripción sobre vos', help: 'Cómo sos trabajando, qué te gusta hacer y qué te diferencia.' },
  { id: 'strengths', section: 'perfil', label: 'Tus fortalezas', help: '¿Por qué alguien debería contratarte?' },
  { id: 'experience', section: 'experiencia', label: 'Experiencia laboral', help: 'Por cada trabajo: empresa, puesto, desde y hasta (mes y año), qué hacías y algún logro. Valen también changas, trabajos por tu cuenta, pasantías y voluntariado.', placeholder: 'Ej.: Supermercado Día · Cajera · mar 2022 a hoy · Cobro, cierre de caja, atención al cliente. Me eligieron para capacitar a las chicas nuevas.' },
  { id: 'education', section: 'experiencia', label: 'Estudios', help: 'Secundario, terciario, universidad: institución, título y años (o en qué año vas).', required: true },
  { id: 'courses', section: 'experiencia', label: 'Cursos y certificaciones', help: 'Nombre del curso, dónde lo hiciste y el año.' },
  { id: 'languages', section: 'experiencia', label: 'Idiomas', help: 'Y tu nivel: básico, intermedio, avanzado o nativo.' },
  { id: 'tools', section: 'experiencia', label: 'Herramientas informáticas', help: 'Excel, Word, sistemas de gestión, programas de diseño, redes sociales… y qué tan bien los manejás.' },
  { id: 'letter_for', section: 'pack', when: 'letter', label: 'Carta de presentación: ¿para quién es?', help: 'Si es para una empresa o búsqueda puntual, contame cuál (o pegá el aviso). Si no, la armo general para tu rubro.' },
  { id: 'linkedin_url', section: 'pack', when: 'linkedin', label: 'Link de tu perfil de LinkedIn (si ya tenés)', short: true, inputMode: 'url', placeholder: 'linkedin.com/in/…' },
  { id: 'linkedin_goal', section: 'pack', when: 'linkedin', label: 'LinkedIn: ¿qué te gustaría que te ofrezcan los reclutadores?', help: 'Puestos, modalidad (presencial, híbrido, remoto) y zona.' },
  { id: 'extra', section: 'pack', label: '¿Algo más que quieras contarme?', help: 'Lo que no entró arriba: licencia de conducir, disponibilidad horaria, si no querés foto en el CV, colores que te gustan…' },
]

export const questionsFor = (needs: FormNeeds) => QUESTIONS.filter((question) => !question.when || needs[question.when])

const filled = (value: string | undefined) => Boolean(value?.trim())

/** What still has to be answered before sending (experience can be skipped by a first job). */
export function missingAnswers(answers: Answers, needs: FormNeeds): Question[] {
  return questionsFor(needs).filter((question) => question.required && !filled(answers[question.id]))
    .concat(needs.cv && !answers.first_job && !filled(answers.experience) ? QUESTIONS.filter((question) => question.id === 'experience') : [])
}

/** The answers as Claude and Vale read them: one block per question, in the form's order. */
export function formatAnswers(answers: Answers, needs: FormNeeds): string {
  const blocks = questionsFor(needs).flatMap((question) => {
    if (question.id === 'target') return []
    const value = answers[question.id]?.trim() ?? ''
    const text = question.id === 'experience' && answers.first_job ? [value, 'Busca su primer empleo (sin experiencia laboral formal).'].filter(Boolean).join('\n') : value
    return text ? [`${question.label.replace(/\s*\(si ya tenés\)$/, '')}:\n${text}`] : []
  })
  return blocks.length ? `RESPUESTAS DEL FORMULARIO DEL CLIENTE\n\n${blocks.join('\n\n')}` : ''
}

/** "Puesto objetivo y lo que pidió el cliente" in Textos con Claude. */
export function formTarget(answers: Answers): string {
  return [
    filled(answers.target) ? answers.target!.trim() : '',
    filled(answers.letter_for) ? `Carta: ${answers.letter_for!.trim()}` : '',
    filled(answers.linkedin_goal) ? `LinkedIn: ${answers.linkedin_goal!.trim()}` : '',
  ].filter(Boolean).join('\n')
}

export const hasContent = (form: Pick<ClientForm, 'answers' | 'files' | 'photo'> | null | undefined) =>
  Boolean(form && (Object.values(form.answers ?? {}).some((value) => typeof value === 'string' ? value.trim() : value) || form.files.length || form.photo))

/** Sent and not opened by Vale since (a new submission after she looked counts again). */
export const unseenForm = (form: Pick<ClientForm, 'submitted_at' | 'seen_at'> | null | undefined) =>
  Boolean(form?.submitted_at && (!form.seen_at || form.seen_at < form.submitted_at))

export const clientFormUrl = (token: string) => `${SITE_URL}/datos/${token}`

/** PostgREST returns a one-to-one embed as an object (or a list on older relations): either way, one form or none. */
export const oneForm = <T>(value: T | T[] | null | undefined): T | null => (Array.isArray(value) ? value[0] ?? null : value ?? null)

/** "forms/<token>/1731…-mi_cv.pdf" → "mi_cv.pdf". */
export const formFileLabel = (path: string) => path.split('/').pop()!.replace(/^\d+-/, '')

/** Accepted on the form: the CV (PDF, Word or photos) and the photo for the CV. */
export const FORM_CV_ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*'
export const FORM_MAX_BYTES = 15 * 1024 * 1024

/**
 * The customer's form as material for "Textos con Claude" (CV and LinkedIn): the answers as text, the target job and
 * the CV they uploaded. null when they haven't written anything yet. The photo stays out (it is for the design).
 */
export async function formMaterial(orderId: string, productIds: string[]): Promise<{ source: string; target: string; files: string[] } | null> {
  const { data } = await supabase.from('client_forms').select('answers, files').eq('order_id', orderId).maybeSingle()
  const form = data as Pick<ClientForm, 'answers' | 'files'> | null
  if (!form) return null
  const source = formatAnswers(form.answers ?? {}, formNeeds(productIds))
  const files = form.files ?? []
  return source || files.length ? { source, target: formTarget(form.answers ?? {}), files } : null
}
