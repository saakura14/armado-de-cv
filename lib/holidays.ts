/**
 * Argentine national holidays and non-working bridge days: Vale doesn't work them, so delivery deadlines skip them
 * like weekends. Keep this list in sync with the public.holidays table (migration holidays) and add each year's
 * bridge days when the government announces them.
 */
export const HOLIDAYS: Record<string, string> = {
  '2026-01-01': 'Año Nuevo',
  '2026-02-16': 'Carnaval',
  '2026-02-17': 'Carnaval',
  '2026-03-23': 'Día no laborable con fines turísticos',
  '2026-03-24': 'Día de la Memoria',
  '2026-04-02': 'Malvinas',
  '2026-04-03': 'Viernes Santo',
  '2026-05-01': 'Día del Trabajador',
  '2026-05-25': 'Revolución de Mayo',
  '2026-06-15': 'Paso a la Inmortalidad de Güemes',
  '2026-06-20': 'Día de la Bandera',
  '2026-07-09': 'Día de la Independencia',
  '2026-07-10': 'Día no laborable con fines turísticos',
  '2026-08-17': 'Paso a la Inmortalidad de San Martín',
  '2026-10-12': 'Día del Respeto a la Diversidad Cultural',
  '2026-11-23': 'Día de la Soberanía Nacional',
  '2026-12-07': 'Día no laborable con fines turísticos',
  '2026-12-08': 'Inmaculada Concepción',
  '2026-12-25': 'Navidad',
  '2027-01-01': 'Año Nuevo',
  '2027-02-08': 'Carnaval',
  '2027-02-09': 'Carnaval',
  '2027-03-24': 'Día de la Memoria',
  '2027-03-26': 'Viernes Santo',
  '2027-04-02': 'Malvinas',
  '2027-05-25': 'Revolución de Mayo',
  '2027-06-21': 'Paso a la Inmortalidad de Güemes',
  '2027-07-09': 'Día de la Independencia',
  '2027-08-16': 'Paso a la Inmortalidad de San Martín',
  '2027-10-11': 'Día del Respeto a la Diversidad Cultural',
  '2027-12-08': 'Inmaculada Concepción',
}

/** Saturday, Sunday or a holiday (the date is a UTC-midnight Date for an Argentine calendar day). */
export function isDayOff(day: Date) {
  return day.getUTCDay() === 0 || day.getUTCDay() === 6 || day.toISOString().slice(0, 10) in HOLIDAYS
}
