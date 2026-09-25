// Datos de contacto y tipos del catálogo. Precios, packs, e-books y cursos se editan desde /admin.
import { supabase } from './supabase'

export const CONTACT = {
  whatsapp: '5491151060953', // 11 5106-0953 con código de país
  whatsappLabel: '11 5106-0953',
  instagram: 'armadodecv.ok',
  email: 'ayuda.armadodecv@gmail.com',
  whatsappChannel: 'https://whatsapp.com/channel/0029VbBCcipC1Fu5TJUJI01P',
  instagramChannel: 'https://www.instagram.com/channel/AbZlBmFI1h04VlJz/',
  testimonials: 'https://www.instagram.com/p/DOyrbETjlLI/',
}

export const SITE_URL = 'https://www.armadodecv.com'

export type Category = 'cv' | 'asesorias' | 'vocacional' | 'curso' | 'sesion'
export type Delivery = 'service' | 'digital' | 'session' | 'course'

export type ExtraOption = { id: string; label: string; isOther: boolean }

/** A group of add-ons priced per selected option (e.g. each language costs the same). */
export type ExtraGroup = { id: string; label: string; unitPrice: number; hint: string | null; options: ExtraOption[] }

export type Product = {
  id: string
  category: Category
  delivery: Delivery
  name: string
  subtitle: string | null
  price: number
  priceNote: string | null
  features: string[]
  highlight: string | null
  notes: string[]
  popular: boolean
  /** Options the customer picks exactly one of (which e-book). */
  choice: { label: string; options: { id: string; label: string }[] } | null
  extras: ExtraGroup[]
}

export const CATEGORY_LABEL: Record<Category, string> = { cv: 'Armado de CV', asesorias: 'Asesorías', vocacional: 'Test vocacional', curso: 'Curso', sesion: 'Sesión 1 a 1' }

type Row = {
  id: string; category: Category; delivery: Delivery; name: string; subtitle: string | null; price: number; price_note: string | null
  features: string[] | null; highlight: string | null; notes: string[] | null; popular: boolean; choice_label: string | null; sort: number
  product_extra_groups: { sort: number; extra_groups: { id: string; label: string; unit_price: number; hint: string | null; extra_options: { id: string; label: string; is_other: boolean; sort: number }[] } | null }[]
  product_ebook_choices: { sort: number; ebooks: { id: string; title: string; active: boolean } | null }[]
}

export const PRODUCT_SELECT = '*, product_extra_groups(sort, extra_groups(id, label, unit_price, hint, extra_options(id, label, is_other, sort))), product_ebook_choices(sort, ebooks(id, title, active))'

export function toProduct(row: Row): Product {
  const bySort = <T extends { sort: number }>(a: T, b: T) => a.sort - b.sort
  const choices = [...row.product_ebook_choices].sort(bySort).flatMap((c) => (c.ebooks && c.ebooks.active ? [{ id: c.ebooks.id, label: c.ebooks.title }] : []))
  return {
    id: row.id,
    category: row.category,
    delivery: row.delivery,
    name: row.name,
    subtitle: row.subtitle,
    price: row.price,
    priceNote: row.price_note,
    features: row.features ?? [],
    highlight: row.highlight,
    notes: row.notes ?? [],
    popular: row.popular,
    choice: row.choice_label ? { label: row.choice_label, options: choices } : null,
    extras: [...row.product_extra_groups].sort(bySort).flatMap(({ extra_groups: g }) => (g ? [{
      id: g.id,
      label: g.label,
      unitPrice: g.unit_price,
      hint: g.hint,
      options: [...g.extra_options].sort(bySort).map((o) => ({ id: o.id, label: o.label, isOther: o.is_other })),
    }] : [])),
  }
}

/** Active products of the given categories, in the order set in the admin panel. */
export async function getProducts(categories: Category[]): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).eq('active', true).in('category', categories).order('sort')
  if (error) {
    console.error('No se pudo cargar el catálogo', error)
    return []
  }
  return (data as unknown as Row[]).map(toProduct)
}

const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
export const formatARS = (value: number) => ars.format(value).replace(/\s/g, '')

export function whatsappUrl(message: string) {
  return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`
}
