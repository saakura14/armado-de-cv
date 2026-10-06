/**
 * Free ATS test (/test-ats). Everything runs in the visitor's browser: the PDF is read with pdf.js and
 * never leaves the device. The score is a guide built from the same points Vale checks by hand; real ATS
 * systems differ, so the copy always says "orientativo".
 *
 * Scoring is strict on purpose: nothing is given for free, sections only count as real titles, and a
 * serious problem (columns, no contact, no visible experience, an image instead of text) caps the score
 * no matter how well the rest scores.
 */

export type PdfItem = { x: number; w: number; str: string }
export type PdfLine = { page: number; y: number; items: PdfItem[] }
export type PdfData = { pages: number; pageWidth: number; lines: PdfLine[]; text: string; images: number }

export type CheckId =
  | 'legible' | 'columnas' | 'contacto' | 'secciones' | 'perfil' | 'largo'
  | 'fechas' | 'logros' | 'vinetas' | 'datos' | 'imagenes' | 'encabezado' | 'frases' | 'palabras'

export type Check = { id: CheckId; ok: boolean; points: number; max: number; title: string; detail: string }
export type AtsResult = { score: number; checks: Check[]; failed: CheckId[]; cap?: string; keywords?: { found: string[]; missing: string[] } }

/** Short names for the admin list. */
export const CHECK_LABELS: Record<CheckId, string> = {
  legible: 'No se puede leer (imagen o escaneo)',
  columnas: 'Columnas o tablas',
  contacto: 'Contacto incompleto',
  secciones: 'Faltan secciones clave',
  perfil: 'Sin perfil profesional',
  largo: 'Largo inadecuado',
  fechas: 'Experiencia sin fechas',
  logros: 'Sin logros medibles',
  vinetas: 'Tareas sin viñetas ni verbos',
  datos: 'Datos personales de más',
  imagenes: 'Íconos o gráficos',
  encabezado: 'Título "Curriculum Vitae"',
  frases: 'Frases genéricas',
  palabras: 'Pocas palabras del aviso',
}

const PDFJS_VERSION = '4.4.168'
const PDFJS_BASE = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`

// Minimal shape of the pdf.js API used here.
type TextItem = { str: string; transform: number[]; width: number }
type PdfPage = {
  view: number[]
  getTextContent: () => Promise<{ items: TextItem[] }>
  getOperatorList: () => Promise<{ fnArray: number[] }>
}
type PdfJs = {
  GlobalWorkerOptions: { workerSrc: string }
  OPS: Record<string, number>
  getDocument: (source: { data: ArrayBuffer }) => { promise: Promise<{ numPages: number; getPage: (n: number) => Promise<PdfPage> }> }
}

/** Reads the PDF in the browser: text lines with their horizontal position, and how many images it draws. */
export async function readPdf(file: File): Promise<PdfData> {
  const pdfjs = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${PDFJS_BASE}/pdf.min.mjs`)) as PdfJs
  pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/pdf.worker.min.mjs`
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const imageOps = new Set([pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintInlineImageXObject, pdfjs.OPS.paintImageMaskXObject].filter((op) => op !== undefined))
  const lines: PdfLine[] = []
  let images = 0
  let pageWidth = 595
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    pageWidth = page.view[2] - page.view[0]
    const content = await page.getTextContent()
    const byY = new Map<number, PdfItem[]>()
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue
      const y = Math.round(item.transform[5] / 3) * 3
      const list = byY.get(y) ?? []
      list.push({ x: item.transform[4] - page.view[0], w: item.width, str: item.str })
      byY.set(y, list)
    }
    for (const [y, items] of [...byY.entries()].sort((a, b) => b[0] - a[0])) lines.push({ page: n, y, items: items.sort((a, b) => a.x - b.x) })
    const ops = await page.getOperatorList()
    images += ops.fnArray.filter((op) => imageOps.has(op)).length
  }
  const text = lines.map((line) => line.items.map((item) => item.str).join(' ')).join('\n')
  return { pages: doc.numPages, pageWidth, lines, text, images }
}

const strip = (value: string) => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const STOPWORDS = new Set(strip(`a al algo algun alguna algunas alguno algunos ante antes aquel aquella aquellas aquello aquellos aqui asi aun aunque bajo bien cada como con conmigo contra cual cuales cualquier cuando cuanto de del desde donde dos el ella ellas ello ellos en entre era eramos eran eres es esa esas ese eso esos esta estaba estado estamos estan estar estas este esto estos fue fueron ha hace hacia han hasta hay la las le les lo los mas me mi mis mucho muy nada ni no nos nosotros nuestra nuestro nuestros o otra otro otros para pero poco por porque puede pueden que quien quienes se sea segun ser si sin sobre solo son su sus tambien tanto te tener tiene tienen todo todos tu tus un una unas uno unos usted ustedes y ya
  buscamos busca buscando requisitos requerimos requisito excluyente excluyentes deseable deseables valorable valorables empresa empresas importante lider puesto posicion vacante candidato candidata candidatos persona personas equipo trabajo trabajar tareas funciones responsabilidades ofrecemos ofrece beneficios beneficio horario horarios lunes viernes sabado domingo zona dias dia anos ano experiencia minima minimo mayor menor nivel conocimiento conocimientos manejo capacidad buen buena buenas buenos excelente sueldo remuneracion contratacion relacion dependencia full time part jornada postulate postularse enviar cv curriculum interesados interesadas mail correo whatsapp`).split(/\s+/))

/** The words that matter in a job ad: the most repeated ones that are not filler. */
export function adKeywords(ad: string): string[] {
  const counts = new Map<string, number>()
  for (const raw of ad.split(/[^\p{L}\p{N}+#.]+/u)) {
    const word = strip(raw).replace(/\.+$/, '')
    if (word.length < 4 || STOPWORDS.has(word) || /^\d+$/.test(word)) continue
    counts.set(word, (counts.get(word) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([word]) => word)
}

/** Share of lines whose text is split in two blocks far apart: the sign of columns or tables. */
function columnRatio(data: PdfData) {
  const width = data.pageWidth || 595
  let split = 0
  for (const line of data.lines) {
    for (let i = 1; i < line.items.length; i++) {
      const prev = line.items[i - 1], cur = line.items[i]
      const gap = cur.x - (prev.x + prev.w)
      // Right-aligned dates or places next to a job title are fine; two blocks of real text are not.
      const right = line.items.slice(i).map((item) => item.str).join(' ').trim()
      if (gap > width * 0.06 && prev.x < width * 0.5 && cur.x > width * 0.25 && words(right) >= 4 && !RANGE_TEST.test(strip(right))) { split++; break }
    }
  }
  // A sidebar layout can also come out as separate lines: many lines that start far to the right
  // while others start at the left margin.
  const starts = data.lines.map((line) => line.items[0].x / width)
  const left = starts.filter((x) => x < 0.2).length
  const right = starts.filter((x) => x > 0.28 && x < 0.6).length
  const sidebar = data.lines.length >= 20 && left >= 6 && right / data.lines.length > 0.2
  return { split, ratio: data.lines.length ? split / data.lines.length : 0, sidebar }
}

// Section titles: a short line (or a short piece of a line) that starts with one of these words.
const HEADINGS = {
  experiencia: /^(experiencia|trayectoria|antecedentes laborales|historia laboral|historial laboral|empleos|experience|work experience)\b/,
  educacion: /^(educacion|formacion|estudios|education)\b/,
  habilidades: /^(habilidades|competencias|aptitudes|conocimientos|skills|herramientas|informatica)\b/,
  perfil: /^(perfil|resumen|sobre mi|acerca de mi|objetivo|extracto|presentacion|profile|summary)\b/,
}
type Heading = keyof typeof HEADINGS

const MONTH = '(?:ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)[a-z]*\\.?'
const DATE = `(?:(?:0?[1-9]|1[0-2])\\s?[/.-]\\s?|${MONTH}\\s*(?:de\\s*)?)?(?:19|20)\\d{2}`
const RANGE_SOURCE = `${DATE}\\s*(?:-|–|—|a|al|hasta)\\s*(?:${DATE}|actual(?:idad|mente)?|presente|hoy|la fecha|en curso)`
const RANGE = new RegExp(RANGE_SOURCE, 'g')
const RANGE_TEST = new RegExp(RANGE_SOURCE)

const METRICS = /\d+(?:[.,]\d+)?\s?%|\$\s?\d|\b\d+(?:[.,]\d+)?\s?(?:k|mil|millones)\b|\b\d+\+?\s(?:clientes|personas|empleados|colaboradores|ventas|pedidos|llamadas|productos|proyectos|sucursales|locales|alumnos|estudiantes|pacientes|usuarios|operaciones|horas|unidades|tickets|casos|reclamos|cuentas|camiones|envios|kg|toneladas|vendedores|chicos|ninos|mesas|cubiertos|socios|proveedores|facturas)\b/g

const ACTION_VERB = /^(gestion|coordin|atend|atiend|realic|realiz|lider|implement|desarroll|organic|organiz|logr|administr|supervis|control|elabor|disen|planific|ejecut|brind|asesor|vend|cobr|capacit|redact|analic|analiz|mejor|optimic|optimiz|reduj|reduc|aument|increment|resolv|negoci|prepar|registr|carg|mantuv|manten|repar|instal|oper|acompan|ensen|dict|cuid|recib|despach|factur|liquid|concili|confeccion|repus|repon|clasific|archiv|program|ensambl|conduj|manej|entreg|asist|colabor|particip|dirig|evalu|selecc|reclut|entrevist|promov|difund|comunic|respond|solucion|verific|inspeccion|audit|calcul|presupuest)[a-z]*$/
// Job titles share the stems ("Operario", "Vendedor", "Coordinadora"), so those endings don't count as verbs.
const NOT_VERB = /(ario|aria|ero|era|dor|dora|ista|ivo|iva|ente|ante|or|ora)$/
const BULLET = /^[•·●▪■◦\-–*✓✔►>➢❖]/
const isTaskLine = (line: string) => {
  if (BULLET.test(line)) return true
  const first = strip(line).split(/\s+/)[0]?.replace(/[^a-z]/g, '') ?? ''
  return words(line) >= 3 && ACTION_VERB.test(first) && !NOT_VERB.test(first)
}

const CLICHES = [/responsable/, /proactiv[oa]/, /trabajo en equipo/, /buena predisposicion/, /ganas de (aprender|trabajar|crecer)/, /puntual/, /honest[oa]|honestidad/, /dinamic[oa]/, /comprometid[oa]/, /buena presencia/, /facilidad (de|para) (aprendizaje|aprender)/, /capacidad de aprendizaje/, /buen trato/, /orientad[oa] a (resultados|objetivos)/, /resolutiv[oa]/, /perseverante/, /respetuos[oa]/, /ordenad[oa]/, /emprendedor[a]?/, /creativ[oa]/, /amable/, /educad[oa]/, /trabajador[a]?\b/]

const LOCATION = /\b(caba|capital federal|ciudad autonoma|buenos aires|gba|provincia|cordoba|rosario|santa fe|mendoza|tucuman|salta|jujuy|neuquen|mar del plata|la plata|bahia blanca|parana|corrientes|misiones|posadas|chaco|resistencia|san juan|san luis|santiago del estero|catamarca|la rioja|rio negro|chubut|santa cruz|tierra del fuego|entre rios|la pampa|formosa|argentina|uruguay|localidad|barrio|partido de|zona (norte|sur|oeste)|conurbano)\b/
const SILLY_EMAIL = /(bebe|beba|love|princes|sexy|angel|diabl|loc[oa]|kpo|capo|kitty|cute|hot|fachero|chiqui|reina|bombon|lind[oa]|gord[oa]|petis|xx|69|666|crack|nena|nene|bichi|cheto|chet[ao]|maldit|dark|hell)/

const words = (value: string) => value.split(/\s+/).filter(Boolean).length

/** Runs every check and returns a 0–100 score (each check weighs its `max`), capped by any serious problem. */
export function analyzeCv(data: PdfData, jobAd = ''): AtsResult {
  const text = data.text
  const plain = strip(text)
  const totalWords = words(plain)
  const checks: Check[] = []
  const add = (id: CheckId, ok: boolean, max: number, title: string, detail: string, points = ok ? max : 0) => checks.push({ id, ok, points: Math.max(0, Math.min(max, points)), max, title, detail })
  const caps: { at: number; why: string }[] = []

  const chars = text.replace(/\s/g, '').length
  const readable = chars >= 150
  // Mostly an image with a few text bits (a Canva export as picture, a scan with a typed name).
  const thin = readable && data.images > 0 && chars / data.pages < 450
  add('legible', readable && !thin, 10,
    !readable ? 'El sistema no puede leer tu CV' : thin ? 'El sistema lee solo una parte de tu CV' : 'El sistema puede leer el texto de tu CV',
    !readable ? 'Parece una imagen o un escaneo: para un ATS es una hoja en blanco y te descarta sin leerte. Exportalo como PDF desde Word, Google Docs o Canva (no como imagen).'
      : thin ? 'Hay muy poco texto por hoja: es probable que parte del CV esté como imagen. Lo que está en imágenes el sistema no lo ve.'
        : 'Tu PDF tiene texto real, no una foto. Es el primer requisito para pasar un ATS.',
    readable ? (thin ? 3 : 10) : 0)
  if (!readable) return { score: 5, checks, failed: ['legible'], cap: 'Un ATS no puede leer tu CV: todo lo demás no cuenta hasta que lo exportes con texto.' }
  if (thin) caps.push({ at: 45, why: 'Gran parte de tu CV no se puede leer como texto.' })

  // Section titles found as short lines or short pieces of a line (a sidebar shares the line with the main column).
  const shortPieces = data.lines.flatMap((line) => {
    const joined = strip(line.items.map((item) => item.str).join(' ')).replace(/[:|•·\-–]/g, ' ').replace(/\s+/g, ' ').trim()
    return [joined, ...line.items.map((item) => strip(item.str).replace(/[:|•·\-–]/g, ' ').replace(/\s+/g, ' ').trim())]
  }).filter((piece) => piece && words(piece) <= 5 && piece.length <= 45)
  const has = (name: Heading) => shortPieces.some((piece) => HEADINGS[name].test(piece))

  // Columns or tables.
  const { split, ratio, sidebar } = columnRatio(data)
  const columns = (split >= 4 && ratio > 0.12) || sidebar
  add('columnas', !columns, 15,
    columns ? 'Tu CV tiene columnas o tablas' : 'Formato en una sola columna',
    columns ? 'Muchos ATS leen de izquierda a derecha y mezclan las columnas: tu experiencia puede quedar desordenada o incompleta. Para postular en portales usá una versión en una sola columna.'
      : 'El texto sigue un orden simple de arriba hacia abajo, como lo lee un ATS.')
  if (columns) caps.push({ at: 60, why: 'Con columnas o tablas, muchos ATS mezclan tu información.' })

  // Contact: email, phone and city, as text.
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/)
  const email = Boolean(emailMatch)
  const silly = email && SILLY_EMAIL.test(strip(emailMatch![0].split('@')[0]))
  const phone = /(\+?\d[\d\s\-().]{7,}\d)/.test(text.replace(/\b(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}\b/g, ''))
  const city = LOCATION.test(plain)
  const contactPoints = (email ? 3 : 0) + (phone ? 3 : 0) + (city ? 2 : 0) - (silly ? 2 : 0)
  const lacking = [!email && 'tu email', !phone && 'tu teléfono', !city && 'tu ciudad o zona'].filter(Boolean) as string[]
  add('contacto', contactPoints === 8, 8,
    contactPoints === 8 ? 'Tus datos de contacto están completos' : silly && lacking.length === 0 ? 'Tu email no se ve profesional' : 'Tus datos de contacto están incompletos',
    contactPoints === 8 ? 'Encontré tu email, tu teléfono y tu zona escritos como texto.'
      : `${lacking.length ? `No encontré ${lacking.join(', ').replace(/, ([^,]*)$/, ' ni $1')} como texto. Si están en un ícono o en una imagen, el sistema no los ve; y muchos filtran por zona. ` : ''}${silly ? 'Tu email tiene un apodo o una palabra informal: usá uno con tu nombre y apellido.' : ''}`.trim(),
    contactPoints)
  if (!email && !phone) caps.push({ at: 45, why: 'No encontré cómo contactarte: sin email ni teléfono, no te pueden llamar.' })

  // Sections, as real titles.
  const found = { experiencia: has('experiencia'), educacion: has('educacion'), habilidades: has('habilidades') }
  const missingSections = (Object.keys(found) as (keyof typeof found)[]).filter((name) => !found[name]).map((name) => name === 'educacion' ? 'Educación' : name[0].toUpperCase() + name.slice(1))
  add('secciones', missingSections.length === 0, 14,
    missingSections.length === 0 ? 'Tiene las secciones que busca un ATS' : 'Faltan secciones clave',
    missingSections.length === 0 ? 'Encontré los títulos Experiencia, Educación y Habilidades.'
      : `No encontré un título claro para: ${missingSections.join(', ')}. Los ATS ubican tu información por esos títulos ("Experiencia laboral", "Educación", "Habilidades"); si no están o tienen nombres creativos, la pierden.`,
    (found.experiencia ? 6 : 0) + (found.educacion ? 5 : 0) + (found.habilidades ? 3 : 0))
  if (!found.experiencia) caps.push({ at: 70, why: 'El sistema no encuentra el título de tu experiencia laboral, que es lo primero que busca.' })

  // Profile: a title with a few lines under it, or a short paragraph between the header and the first section.
  const lineText = (line: PdfLine) => line.items.map((item) => item.str).join(' ').trim()
  const isHeadingLine = (raw: string) => {
    const joined = strip(raw).replace(/[:|]/g, ' ').trim()
    return words(joined) <= 5 && (Object.values(HEADINGS).some((re) => re.test(joined)) || (/[A-ZÁÉÍÓÚÑ]/.test(raw) && raw === raw.toUpperCase()))
  }
  // Header lines: contact data, or a name written with spaced letters ("D A N I E L A").
  const isHeaderLine = (raw: string) => /@|\d{6,}|\+?\d[\d\s\-().]{7,}\d|linkedin/i.test(raw) || raw.split(/\s+/).filter((token) => token.length === 1).length >= 5
  const profileIndex = data.lines.findIndex((line) => {
    const joined = strip(lineText(line)).replace(/[:|]/g, ' ').trim()
    return line.items.some((item) => HEADINGS.perfil.test(strip(item.str).trim())) || (words(joined) <= 5 && HEADINGS.perfil.test(joined))
  })
  let profileWords = 0
  if (profileIndex >= 0) {
    for (const line of data.lines.slice(profileIndex + 1, profileIndex + 12)) {
      if (isHeadingLine(lineText(line))) break
      profileWords += words(lineText(line))
    }
  } else {
    const firstSection = data.lines.findIndex((line) => isHeadingLine(lineText(line)) && Object.values(HEADINGS).some((re) => re.test(strip(lineText(line)))))
    for (const line of data.lines.slice(0, firstSection > 0 ? firstSection : 0)) {
      const raw = lineText(line)
      if (!isHeaderLine(raw) && words(raw) >= 6) profileWords += words(raw)
    }
  }
  const profileOk = profileWords >= 25 && profileWords <= 130
  const hasProfile = profileIndex >= 0 || profileWords >= 25
  add('perfil', profileOk, 6,
    profileOk ? 'Tiene un perfil profesional claro' : hasProfile ? 'Tu perfil profesional no está bien armado' : 'No tiene perfil profesional',
    profileOk ? 'Un perfil de pocas líneas arriba de todo ayuda a que el reclutador entienda qué buscás en segundos.'
      : hasProfile ? (profileWords < 25 ? 'Tu perfil es demasiado corto: en 3 o 4 líneas contá quién sos, en qué tenés experiencia y qué buscás.' : 'Tu perfil es demasiado largo: el reclutador lo saltea. Dejalo en 3 o 4 líneas.')
        : 'Sumá un perfil de 3 o 4 líneas arriba de todo: quién sos, en qué tenés experiencia y qué buscás. Es lo primero que lee el reclutador.',
    profileOk ? 6 : hasProfile ? 3 : 0)

  // Dates of each job and study, as ranges.
  const ranges = plain.match(RANGE)?.length ?? 0
  add('fechas', ranges >= 2, 12,
    ranges >= 2 ? 'Tu experiencia tiene fechas' : ranges === 1 ? 'Faltan fechas en tu experiencia' : 'Tu experiencia no tiene fechas',
    ranges >= 2 ? 'Encontré los períodos de cada trabajo o estudio: los ATS calculan tus años de experiencia con eso.'
      : 'Poné mes y año de inicio y de fin de cada trabajo y estudio (por ejemplo "03/2021 – actualidad"). Los ATS calculan tu experiencia con eso y sin fechas te ordenan abajo.',
    ranges >= 2 ? 12 : ranges === 1 ? 6 : 0)
  if (!found.experiencia && ranges === 0) caps.push({ at: 45, why: 'No se distingue tu experiencia: no hay un título "Experiencia" ni fechas de trabajos.' })

  // Measurable results (contact lines aside, so the phone does not count).
  const body = strip(text.split('\n').filter((line) => !isHeaderLine(line)).join('\n'))
  const metrics = body.match(METRICS)?.length ?? 0
  const results = body.match(/\b(logr|aument|reduj|reduc|mejor|optimic|supere|supero|alcanc|increment|ahorr|premiad|reconocid|ascend|promovid)\w*/g)?.length ?? 0
  const logros = metrics >= 3 ? 8 : Math.max(metrics > 0 ? 4 : 0, results >= 2 ? 4 : 0)
  add('logros', logros === 8, 8,
    logros === 8 ? 'Mostrás logros con números' : 'Faltan logros medibles',
    logros === 8 ? `Encontré ${metrics} resultados concretos con números: es lo que diferencia tu CV del resto.`
      : `${metrics === 0 ? 'No encontré ningún resultado con números' : 'Encontré muy pocos resultados con números'}. Casi todo describe tareas. Sumá cifras: "reduje los reclamos un 20%", "atendía 80 clientes por día", "manejé una caja de $500.000".`,
    logros)

  // Tasks as bullets that start with an action verb.
  const lineTexts = data.lines.map((line) => line.items.map((item) => item.str).join(' ').trim())
  const bulletLines = lineTexts.filter(isTaskLine).length
  add('vinetas', bulletLines >= 5, 7,
    bulletLines >= 5 ? 'Contás tus tareas en viñetas claras' : 'Tus tareas no se leen fácil',
    bulletLines >= 5 ? 'Usás viñetas o arrancás con verbos de acción: el reclutador lo escanea rápido.'
      : 'Escribí cada tarea en una viñeta que arranque con un verbo ("Atendí", "Coordiné", "Organicé"). Los párrafos largos o las listas sueltas se saltean.',
    bulletLines >= 5 ? 7 : bulletLines >= 2 ? 3 : 0)

  // Length.
  const lengthOk = data.pages <= 2 && totalWords >= 200 && totalWords <= 900
  const lengthNear = data.pages <= 2 && totalWords >= 150 && totalWords <= 1100
  add('largo', lengthOk, 8,
    lengthOk ? 'El largo es adecuado' : data.pages > 2 || totalWords > 900 ? 'Tu CV es demasiado largo' : 'Tu CV es muy corto',
    lengthOk ? `${data.pages} ${data.pages === 1 ? 'hoja' : 'hojas'} y unas ${totalWords} palabras: justo para que se lea completo.`
      : data.pages > 2 || totalWords > 900 ? `${data.pages} ${data.pages === 1 ? 'hoja' : 'hojas'} y unas ${totalWords} palabras. Lo ideal es 1 o 2 hojas con la experiencia más relevante para el puesto.`
        : `Unas ${totalWords} palabras: le falta contenido para que el sistema encuentre tus habilidades. Contá tareas y logros concretos.`,
    lengthOk ? 8 : lengthNear ? 4 : 0)
  if (data.pages > 3) caps.push({ at: 55, why: `Tiene ${data.pages} hojas: nadie lo lee completo.` })

  // Personal data that should not be there.
  const personal = [...new Set(plain.match(/\b(dni|d\.n\.i|cuil|cuit|estado civil|solter[oa]|casad[oa]|divorciad[oa]|hijos|religion|nacionalidad|fecha de nacimiento|lugar de nacimiento|edad)\b/g) ?? [])]
  add('datos', personal.length === 0, 4,
    personal.length === 0 ? 'Sin datos personales de más' : 'Tiene datos personales que no hacen falta',
    personal.length === 0 ? 'No incluiste DNI, estado civil ni hijos: bien, no suman y ocupan lugar.'
      : `Encontré: ${personal.join(', ')}. Sacalos: no suman al filtro y pueden generar sesgos. Se dan después, si te los piden.`,
    4 - personal.length * 2)

  // Icons and graphics.
  const manyImages = data.images > 3
  add('imagenes', !manyImages, 4,
    manyImages ? 'Usa íconos o gráficos' : data.images === 1 ? 'Solo una imagen (tu foto)' : 'Sin gráficos que confundan',
    manyImages ? `Tu PDF tiene ${data.images} imágenes o íconos. Los ATS no los leen: si tu teléfono, tus idiomas o tus habilidades están en íconos o barritas, se pierden.`
      : data.images === 1 ? 'Una foto está bien en el CV moderno; en la versión para portales conviene sacarla.'
        : 'No usás íconos ni barritas: el sistema lee todo tu contenido.')

  const titled = /^\s*(curriculum|curriculo|cv)\b/.test(strip(text.slice(0, 120)))
  add('encabezado', !titled, 2,
    titled ? 'Arranca con "Curriculum Vitae"' : 'El encabezado está bien',
    titled ? 'El título "Curriculum Vitae" ocupa el lugar más importante. Arriba de todo va tu nombre y el puesto que buscás.'
      : 'Tu CV no pierde el primer renglón con "Curriculum Vitae".')

  // Generic adjectives instead of facts.
  const cliches = CLICHES.filter((re) => re.test(plain)).length
  add('frases', cliches <= 3, 2,
    cliches <= 3 ? 'Sin frases de relleno' : 'Usás muchas frases genéricas',
    cliches <= 3 ? 'No abusás de adjetivos como "responsable" o "proactiva": mostrás hechos.'
      : `Encontré ${cliches} adjetivos genéricos ("responsable", "proactiva", "trabajo en equipo"...). Todos los CV los dicen: reemplazalos por ejemplos concretos de lo que hiciste.`,
    cliches <= 3 ? 2 : cliches <= 5 ? 1 : 0)

  // Words of the job ad, when one was pasted.
  let keywords: AtsResult['keywords']
  const terms = jobAd.trim().length > 40 ? adKeywords(jobAd) : []
  if (terms.length >= 5) {
    const hits = terms.filter((term) => plain.includes(term))
    const missing = terms.filter((term) => !plain.includes(term))
    keywords = { found: hits, missing }
    const share = hits.length / terms.length
    add('palabras', share >= 0.6, 20,
      share >= 0.6 ? 'Usás las palabras del aviso' : 'Faltan palabras del aviso',
      share >= 0.6 ? `Tu CV tiene ${hits.length} de las ${terms.length} palabras más importantes del aviso.`
        : `Tu CV tiene solo ${hits.length} de las ${terms.length} palabras más importantes del aviso. El ATS busca esas palabras exactas: sumalas donde correspondan, sin inventar.`,
      Math.round(share * 20))
    if (share < 0.3) caps.push({ at: 60, why: 'Tu CV casi no tiene las palabras del aviso: el ATS lo ordena abajo de todo.' })
  }

  const failedCount = checks.filter((check) => !check.ok).length
  if (failedCount >= 6) caps.push({ at: 40, why: `Encontré ${failedCount} problemas a la vez: así como está, lo más probable es que quede afuera.` })

  const max = checks.reduce((sum, check) => sum + check.max, 0)
  const points = checks.reduce((sum, check) => sum + check.points, 0)
  let score = Math.round((points / max) * 100)
  const cap = caps.sort((a, b) => a.at - b.at)[0]
  if (cap && score > cap.at) score = cap.at
  return { score, checks, failed: checks.filter((check) => !check.ok).map((check) => check.id), cap: cap && score >= cap.at ? cap.why : undefined, keywords }
}
