// Branded yearly report (.xlsx) for the admin: monthly summary, best sellers, sales and visits.
import { bestSellers, monthKey, monthLabel, monthStats, salesInYear, type Sale, type VisitRow } from './dashboard'

const BRAND = { ciruela: 'FF43202C', rosa: 'FFC9506D', papel: 'FFF5EFD9', petalo: 'FFFBEAEC', piedra: 'FF6F6A62', blanco: 'FFFFFFFF', line: 'FFE7DDD2' }
const MONEY = '"$"#,##0'
const PERCENT = '0.0%'
const FONT = 'Montserrat'

type Worksheet = import('exceljs').Worksheet

async function logoBase64() {
  const blob = await (await fetch('/brand/logo-horizontal.png')).blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/** Logo, title and subtitle on top of every sheet; the table starts on row 6. */
function header(sheet: Worksheet, logo: number, title: string, subtitle: string, columns: number) {
  sheet.views = [{ showGridLines: false, state: 'frozen', ySplit: 6 }]
  sheet.getRow(1).height = 30
  sheet.getRow(2).height = 30
  sheet.addImage(logo, { tl: { col: 0, row: 0 }, ext: { width: 250, height: 50 } })
  const titleCell = sheet.getCell(3, 1)
  titleCell.value = title
  titleCell.font = { name: FONT, size: 16, bold: true, color: { argb: BRAND.rosa } }
  const subtitleCell = sheet.getCell(4, 1)
  subtitleCell.value = subtitle
  subtitleCell.font = { name: FONT, size: 9, color: { argb: BRAND.piedra } }
  for (let col = 1; col <= columns; col++) sheet.getCell(5, col).border = { bottom: { style: 'medium', color: { argb: BRAND.rosa } } }
}

function table(sheet: Worksheet, headers: { title: string; width: number; format?: string }[], rows: (string | number | null)[][], totals?: (string | number | null)[]) {
  headers.forEach((column, index) => {
    sheet.getColumn(index + 1).width = column.width
    const cell = sheet.getCell(6, index + 1)
    cell.value = column.title
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: BRAND.blanco } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.ciruela } }
    cell.alignment = { vertical: 'middle', horizontal: index === 0 ? 'left' : 'center', wrapText: true }
  })
  sheet.getRow(6).height = 28
  const all = totals ? [...rows, totals] : rows
  all.forEach((values, rowIndex) => {
    const row = sheet.getRow(7 + rowIndex)
    const isTotal = totals && rowIndex === all.length - 1
    values.forEach((value, col) => {
      const cell = row.getCell(col + 1)
      cell.value = value
      cell.font = { name: FONT, size: 10, bold: Boolean(isTotal), color: { argb: isTotal ? BRAND.ciruela : 'FF3A2A30' } }
      if (headers[col].format) cell.numFmt = headers[col].format!
      cell.alignment = { vertical: 'middle', horizontal: col === 0 ? 'left' : typeof value === 'number' ? 'right' : 'center', wrapText: col === 0 }
      cell.border = { bottom: { style: 'thin', color: { argb: BRAND.line } } }
      if (isTotal) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.papel } }
      else if (rowIndex % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.petalo } }
    })
    row.height = 20
  })
  if (!rows.length) {
    const cell = sheet.getCell(7, 1)
    cell.value = 'Sin datos en este período.'
    cell.font = { name: FONT, size: 10, italic: true, color: { argb: BRAND.piedra } }
  }
}

export async function downloadYearReport(year: string, sales: Sale[], visits: VisitRow[]) {
  const ExcelJS = (await import('exceljs')).default
  const book = new ExcelJS.Workbook()
  book.creator = 'Armado de CV'
  book.created = new Date()
  const logo = book.addImage({ base64: await logoBase64(), extension: 'png' })
  const generated = `Armado de CV · Valeria Gil · generado el ${new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())}`
  const yearSales = salesInYear(year, sales)
  const months = Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`)
  const stats = months.map((key) => monthStats(key, sales, visits))
  const totalRevenue = yearSales.reduce((sum, sale) => sum + sale.total, 0)
  const totalVisits = stats.reduce((sum, month) => sum + month.visits, 0)

  const summary = book.addWorksheet('Resumen mensual', { properties: { tabColor: { argb: BRAND.rosa } } })
  header(summary, logo, `Reporte de ventas ${year}`, generated, 7)
  table(summary, [
    { title: 'Mes', width: 20 },
    { title: 'Ventas', width: 11 },
    { title: 'Facturado', width: 15, format: MONEY },
    { title: 'Ticket promedio', width: 15, format: MONEY },
    { title: 'Visitas', width: 11 },
    { title: 'Conversión', width: 12, format: PERCENT },
    { title: 'Más vendido', width: 30 },
  ], stats.map((month) => [monthLabel(month.key), month.sales, month.revenue, month.average, month.visits, month.conversion, month.top ?? '—']),
  ['Total del año', yearSales.length, totalRevenue, yearSales.length ? Math.round(totalRevenue / yearSales.length) : 0, totalVisits, totalVisits ? yearSales.length / totalVisits : null, bestSellers(yearSales)[0]?.name ?? '—'])
  summary.getCell(21, 1).value = 'Ventas: pedidos con pago confirmado (sin cancelados ni pedidos de prueba). Visitas: personas que entraron a la web, contadas desde el 28/09/2026. Conversión: ventas sobre visitas.'
  summary.getCell(21, 1).font = { name: FONT, size: 8, italic: true, color: { argb: BRAND.piedra } }

  const products = book.addWorksheet('Más vendidos', { properties: { tabColor: { argb: BRAND.ciruela } } })
  header(products, logo, `Lo más vendido ${year}`, generated, 4)
  table(products, [
    { title: 'Producto', width: 36 },
    { title: 'Unidades', width: 11 },
    { title: 'Facturado', width: 15, format: MONEY },
    { title: '% de lo facturado', width: 16, format: PERCENT },
  ], bestSellers(yearSales).map((product) => [product.name, product.units, product.revenue, totalRevenue ? product.revenue / totalRevenue : 0]))

  const orders = book.addWorksheet('Ventas', { properties: { tabColor: { argb: BRAND.rosa } } })
  header(orders, logo, `Detalle de ventas ${year}`, generated, 8)
  table(orders, [
    { title: 'Pedido', width: 9 },
    { title: 'Fecha de pago', width: 14 },
    { title: 'Mes', width: 16 },
    { title: 'Cliente', width: 26 },
    { title: 'Productos', width: 40 },
    { title: 'Origen', width: 12 },
    { title: 'Pago', width: 13 },
    { title: 'Total', width: 13, format: MONEY },
  ], [...yearSales].sort((a, b) => a.paid_at.localeCompare(b.paid_at)).map((sale) => [
    `#${sale.number}`,
    new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(sale.paid_at)),
    monthLabel(monthKey(sale.paid_at)),
    sale.customer_name ?? '—',
    sale.order_items.map((item) => item.product_name).join(' + '),
    sale.source === 'whatsapp' ? 'WhatsApp' : 'Web',
    sale.payment_method === 'card' ? 'Tarjeta' : 'Transferencia',
    sale.total,
  ]), ['Total', null, null, null, `${yearSales.length} ventas · ${yearSales.filter((sale) => sale.status !== 'delivered').length} sin entregar`, `${yearSales.filter((sale) => sale.source === 'whatsapp').length} por WhatsApp`, null, totalRevenue])

  const traffic = book.addWorksheet('Visitas', { properties: { tabColor: { argb: BRAND.ciruela } } })
  header(traffic, logo, `Visitas a la web ${year}`, generated, 3)
  const byDay = new Map<string, { visits: number; views: number }>()
  for (const row of visits.filter((item) => item.day.startsWith(year))) {
    const current = byDay.get(row.day) ?? { visits: 0, views: 0 }
    byDay.set(row.day, { visits: current.visits + row.visits, views: current.views + row.views })
  }
  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))
  table(traffic, [
    { title: 'Día', width: 16 },
    { title: 'Visitas', width: 12 },
    { title: 'Páginas vistas', width: 15 },
  ], days.map(([day, value]) => [day.split('-').reverse().join('/'), value.visits, value.views]),
  ['Total', days.reduce((sum, [, value]) => sum + value.visits, 0), days.reduce((sum, [, value]) => sum + value.views, 0)])

  const buffer = await book.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `Armado de CV - Reporte ${year}.xlsx`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
