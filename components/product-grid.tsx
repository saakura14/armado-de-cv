'use client'

import { useCallback, useState } from 'react'
import { Check, ShoppingBag } from 'lucide-react'
import { formatARS, type Product } from '@/lib/catalog'
import { OrderDialog } from './order-dialog'

export function ProductGrid({ products }: { products: Product[] }) {
  const [selected, setSelected] = useState<Product | null>(null)
  const close = useCallback(() => setSelected(null), [])

  return (
    <>
      <div className={`mt-12 grid gap-x-6 gap-y-12 ${products.length >= 4 ? 'md:grid-cols-2 xl:grid-cols-4' : products.length === 3 ? 'md:grid-cols-3' : ''}`}>
        {products.map((product) => (
          <article key={product.id} className={`relative flex flex-col rounded-[28px] bg-sand p-6 pt-10 shadow-[0_18px_40px_-28px_rgba(63,29,43,0.45)] ${product.popular ? 'ring-2 ring-rose' : ''}`}>
            {product.popular && <span className="absolute left-6 top-0 -translate-y-1/2 rounded-full bg-rose px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">Más elegido</span>}
            <div className="absolute -top-7 right-5 flex h-[88px] w-[88px] flex-col items-center justify-center rounded-full border-[6px] border-sand bg-white text-center shadow-sm">
              <span className="text-lg font-extrabold leading-none text-stone">{formatARS(product.price).replace(/\s/g, '')}</span>
              {product.priceNote && <span className="text-[11px] font-semibold text-stone">{product.priceNote}</span>}
            </div>
            <h3 className="pr-20 text-xl font-bold uppercase leading-tight tracking-wide text-stone">{product.name}</h3>
            {product.subtitle && <p className="mt-1 pr-16 text-sm font-semibold uppercase tracking-wide text-plum/80">{product.subtitle}</p>}
            <ul className="mt-5 flex-1 space-y-2.5 text-[15px] leading-snug text-ink/85">
              {product.features.map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-rose" />{feature}</li>)}
              {product.choice && <li className="flex gap-2 text-sm text-stone"><Check className="mt-0.5 h-4 w-4 shrink-0 text-rose" />Elegís entre: {product.choice.options.join(' · ')}</li>}
            </ul>
            {product.highlight && <p className="mt-4 self-start rounded-full bg-white px-3 py-1 text-xs font-semibold text-plum">{product.highlight}</p>}
            <button type="button" onClick={() => setSelected(product)} className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-plum px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-rose">
              <ShoppingBag className="h-4 w-4" />Lo quiero
            </button>
          </article>
        ))}
      </div>
      {selected && <OrderDialog product={selected} onClose={close} />}
    </>
  )
}
