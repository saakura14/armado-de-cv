'use client'

import { useCallback, useState } from 'react'
import { Check, ShoppingBag } from 'lucide-react'
import { formatARS, type Product } from '@/lib/catalog'
import { OrderDialog } from './order-dialog'

export function ProductGrid({ products, tone = 'cv' }: { products: Product[]; tone?: 'cv' | 'asesorias' }) {
  const [selected, setSelected] = useState<Product | null>(null)
  const close = useCallback(() => setSelected(null), [])
  const card = tone === 'cv' ? 'bg-papel' : 'bg-white'
  const ring = tone === 'cv' ? 'border-blanco' : 'border-arena'
  const columns = products.length >= 4 ? 'md:grid-cols-2 xl:grid-cols-4' : products.length === 3 ? 'md:grid-cols-3' : products.length === 2 ? 'md:grid-cols-2' : ''

  return (
    <>
      <div className={`mt-14 grid gap-x-6 gap-y-14 ${columns}`}>
        {products.map((product) => (
          <article key={product.id} className={`relative flex flex-col rounded-[28px] ${card} p-6 pt-11 shadow-[0_22px_44px_-30px_rgba(67,32,44,0.55)] ${product.popular ? 'ring-2 ring-rosa' : ''}`}>
            {product.popular && <span className="absolute left-6 top-0 -translate-y-1/2 rounded-full bg-rosa px-3 py-1 font-display text-[11px] font-bold uppercase tracking-wider text-white">Más elegido</span>}
            <div className={`absolute -top-8 right-5 flex h-[92px] w-[92px] flex-col items-center justify-center rounded-full border-[7px] ${ring} bg-white text-center shadow-sm`}>
              <span className="font-display text-[17px] font-extrabold leading-none text-ciruela">{formatARS(product.price)}</span>
              {product.priceNote && <span className="mt-0.5 font-display text-[11px] font-semibold text-piedra">{product.priceNote}</span>}
            </div>
            <p className="pr-24 font-script text-[34px] leading-none text-rosa">{product.name}</p>
            {product.subtitle && <h3 className="mt-2 pr-16 font-display text-xs font-semibold uppercase tracking-[0.18em] text-ciruela/80">{product.subtitle}</h3>}
            <ul className="mt-5 flex-1 space-y-2.5 text-[15px] leading-snug">
              {product.features.map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-rosa" />{feature}</li>)}
              {product.choice && <li className="flex gap-2 text-sm text-piedra"><Check className="mt-0.5 h-4 w-4 shrink-0 text-rosa" />Elegís entre: {product.choice.options.join(' · ')}</li>}
            </ul>
            {product.highlight && <p className="mt-4 self-start rounded-full bg-petalo-wash px-3 py-1 font-display text-xs font-semibold text-rosa-deep">{product.highlight}</p>}
            <button type="button" onClick={() => setSelected(product)} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ciruela px-5 py-3 font-display text-sm font-bold text-white transition-colors hover:bg-rosa active:scale-[0.98]">
              <ShoppingBag className="h-4 w-4" />Lo quiero
            </button>
          </article>
        ))}
      </div>
      {selected && <OrderDialog product={selected} onClose={close} />}
    </>
  )
}
