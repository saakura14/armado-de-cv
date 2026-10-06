/**
 * Free ATS test (/test-ats). Everything runs in the visitor's browser: the PDF is read with pdf.js and
 * never leaves the device. The score is a guide built from the same points Vale checks by hand; real ATS
 * systems differ, so the copy always says "orientativo".
 */

export type PdfItem = { x: number; w: number; str: string }
export type PdfLine = { page: number; y: number; items: PdfItem[] }
export type PdfData = { pages: number; pageWidth: number; lines: PdfLine[]; text: string; images: number }

export type CheckId =
  | 'legible' | 'columnas' | 'contacto' | 'secciones' | 'perfil' | 'largo'
  | 'fechas' | 'logros' | 'datos' | 'imagenes' | 'encabezado' | 'palabras'

export type Check = { id: CheckId; ok: boolean; points: number; max: number; title: string; detail: string }
export type AtsResult = { score: number; checks: Check[]; failed: CheckId[]; keywords?: { found: string[]; missing: string[] } }

/** Short names for the admin list. */
export const CHECK_LABELS: Record<CheckId, string> = {
  legible: 'No se puede leer (imagen o escaneo)',
  columnas: 'Columnas o tablas',
  contacto: 'Faltan datos de contacto',
  secciones: 'Faltan secciones clave',
  perfil: 'Sin perfil profesional',
  largo: 'Largo inadecuado',
  fechas: 'Sin fechas en la experiencia',
  logros: 'Sin logros medibles',
  datos: 'Datos personales de más',
  imagenes: 'Íconos o gráficos',
  encabezado: 'Título "Curriculum Vitae"',
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
      if (gap > width * 0.08 && prev.x < width * 0.5 && cur.x > width * 0.3) { split++; break }
    }
  }
  return { split, ratio: data.lines.length ? split / data.lines.length : 0 }
}

/** Runs every check and returns a 0–100 score (each check weighs its `max`). */
export function analyzeCv(data: PdfData, jobAd = ''): AtsResult {
  const text = data.text
  const plain = strip(text)
  const words = plain.split(/\s+/).filter(Boolean).length
  const checks: Check[] = []
  const add = (id: CheckId, ok: boolean, max: number, title: string, detail: string, points = ok ? max : 0) => checks.push({ id, ok, points, max, title, detail })

  const readable = text.replace(/\s/g, '').length >= 300
  add('legible', readable, 25,
    readable ? 'El sistema puede leer el texto de tu CV' : 'El sistema no puede leer tu CV',
    readable ? 'Tu PDF tiene texto real, no una foto. Es el primer requisito para pasar un ATS.'
      : 'Parece una imagen o un escaneo: para un ATS es una hoja en blanco y te descarta sin leerte. Exportalo como PDF desde Word, Google Docs o Canva (no como imagen).')

  if (readable) {
    const { split, ratio } = columnRatio(data)
    const columns = split >= 6 && ratio > 0.25
    add('columnas', !columns, 15,
      columns ? 'Tu CV tiene columnas o tablas' : 'Formato en una sola columna',
      columns ? 'Muchos ATS leen de izquierda a derecha y mezclan las columnas: tu experiencia puede quedar desordenada o incompleta. Para postular en portales usá una versión en una sola columna.'
        : 'El texto sigue un orden simple de arriba hacia abajo, como lo lee un ATS.')

    const email = /[\w.+-]+@[\w-]+\.[\w.]+/.test(text)
    const phone = /(\+?\d[\d\s\-().]{7,}\d)/.test(text.replace(/\b(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}\b/g, ''))
    add('contacto', email && phone, 10,
      email && phone ? 'Tus datos de contacto están completos' : 'Faltan datos de contacto',
      email && phone ? 'Encontré tu email y tu teléfono escritos como texto.'
        : `No encontré ${!email && !phone ? 'tu email ni tu teléfono' : !email ? 'tu email' : 'tu teléfono'} como texto. Si están en un ícono o en una imagen, el sistema no los ve y no te pueden llamar.`,
      email || phone ? 5 : 0)

    const sections = { experiencia: /experiencia|trayectoria|antecedentes laborales|historial laboral/, educacion: /educacion|formacion|estudios/, habilidades: /habilidades|competencias|aptitudes|conocimientos|skills|herramientas/ }
    const missing = Object.entries(sections).filter(([, re]) => !re.test(plain)).map(([name]) => name === 'educacion' ? 'Educación' : name[0].toUpperCase() + name.slice(1))
    add('secciones', missing.length === 0, 15,
      missing.length === 0 ? 'Tiene las secciones que busca un ATS' : 'Faltan secciones clave',
      missing.length === 0 ? 'Encontré Experiencia, Educación y Habilidades con títulos claros.'
        : `No encontré: ${missing.join(', ')}. Los ATS ubican tu información por esos títulos; si no están o tienen nombres creativos, la pierden.`,
      (3 - missing.length) * 5)

    const profile = /perfil|resumen|sobre mi|acerca de|objetivo|extracto/.test(plain)
    add('perfil', profile, 5,
      profile ? 'Tiene perfil profesional' : 'No tiene perfil profesional',
      profile ? 'Un perfil de 3 líneas arriba de todo ayuda a que el reclutador entienda qué buscás en segundos.'
        : 'Sumá un perfil de 3 líneas arriba de todo: quién sos, en qué tenés experiencia y qué buscás. Es lo primero que lee el reclutador.')

    const lengthOk = data.pages <= 2 && words >= 180 && words <= 1100
    add('largo', lengthOk, 10,
      lengthOk ? 'El largo es adecuado' : data.pages > 2 || words > 1100 ? 'Tu CV es demasiado largo' : 'Tu CV es muy corto',
      lengthOk ? `${data.pages} ${data.pages === 1 ? 'hoja' : 'hojas'} y unas ${words} palabras: justo para que se lea completo.`
        : data.pages > 2 || words > 1100 ? `${data.pages} hojas y unas ${words} palabras. Lo ideal es 1 o 2 hojas con la experiencia más relevante para el puesto.`
          : `Unas ${words} palabras: le falta contenido para que el sistema encuentre tus habilidades. Contá logros y tareas concretas.`,
      lengthOk ? 10 : 4)

    const years = text.match(/\b(19[89]\d|20[0-3]\d)\b/g) ?? []
    add('fechas', years.length >= 2, 5,
      years.length >= 2 ? 'Tu experiencia tiene fechas' : 'Faltan fechas',
      years.length >= 2 ? 'Los ATS calculan tus años de experiencia con las fechas de cada trabajo.'
        : 'Poné mes y año de inicio y fin de cada trabajo y estudio: los ATS calculan tu experiencia con eso.')

    const achievements = (text.match(/\d+\s?%|\+\s?\d+|\$\s?\d|\b(aument|reduj|reduc|logr|mejor|increment|optimic|ahorr|super)\w*/gi) ?? []).length
    add('logros', achievements >= 3, 5,
      achievements >= 3 ? 'Mostrás logros, no solo tareas' : 'Faltan logros medibles',
      achievements >= 3 ? 'Encontré resultados concretos: es lo que diferencia tu CV del resto.'
        : 'Casi todo describe tareas. Sumá resultados con números: "reduje los reclamos un 20%", "atendí 80 clientes por día".')

    const personal = plain.match(/\b(dni|cuil|estado civil|soltero|soltera|casado|casada|hijos|religion|nacionalidad)\b/g) ?? []
    add('datos', personal.length === 0, 5,
      personal.length === 0 ? 'Sin datos personales de más' : 'Tiene datos personales que no hacen falta',
      personal.length === 0 ? 'No incluiste DNI, estado civil ni hijos: bien, no suman y ocupan lugar.'
        : `Encontré: ${[...new Set(personal)].join(', ')}. Sacalos: no suman al filtro y pueden generar sesgos. Se dan después, si te los piden.`)

    const manyImages = data.images > 3
    add('imagenes', !manyImages, 5,
      manyImages ? 'Usa íconos o gráficos' : data.images === 1 ? 'Solo una imagen (tu foto)' : 'Sin gráficos que confundan',
      manyImages ? `Tu PDF tiene ${data.images} imágenes o íconos. Los ATS no los leen: si tu teléfono, tus idiomas o tus habilidades están en íconos o barritas, se pierden.`
        : data.images === 1 ? 'Una foto está bien en el CV moderno; en la versión para portales conviene sacarla.'
          : 'No usás íconos ni barritas: el sistema lee todo tu contenido.')

    const titled = /^\s*(curriculum|curriculo|cv)\b/.test(strip(text.slice(0, 120)))
    add('encabezado', !titled, 5,
      titled ? 'Arranca con "Curriculum Vitae"' : 'El encabezado está bien',
      titled ? 'El título "Curriculum Vitae" ocupa el lugar más importante. Arriba de todo va tu nombre y el puesto que buscás.'
        : 'Tu CV no pierde el primer renglón con "Curriculum Vitae".')
  }

  let keywords: AtsResult['keywords']
  const terms = jobAd.trim().length > 40 ? adKeywords(jobAd) : []
  if (readable && terms.length >= 5) {
    const found = terms.filter((term) => plain.includes(term))
    const missing = terms.filter((term) => !plain.includes(term))
    keywords = { found, missing }
    const share = found.length / terms.length
    add('palabras', share >= 0.6, 15,
      share >= 0.6 ? 'Usás las palabras del aviso' : 'Faltan palabras del aviso',
      share >= 0.6 ? `Tu CV tiene ${found.length} de las ${terms.length} palabras más importantes del aviso.`
        : `Tu CV tiene solo ${found.length} de las ${terms.length} palabras más importantes del aviso. El ATS busca esas palabras exactas: sumalas donde correspondan, sin inventar.`,
      Math.round(share * 15))
  }

  const max = readable ? checks.reduce((sum, check) => sum + check.max, 0) : 100
  const points = checks.reduce((sum, check) => sum + check.points, 0)
  const score = readable ? Math.round((points / max) * 100) : 10
  return { score, checks, failed: checks.filter((check) => !check.ok).map((check) => check.id), keywords }
}
