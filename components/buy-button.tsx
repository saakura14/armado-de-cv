'use client'

import { useCallback, useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { formatARS, type Product } from '@/lib/catalog'
import { OrderDialog } from './order-dialog'

/** One product, one big "buy" button that opens the same order dialog as the catalog cards (for landing pages). */
export function BuyButton({ product, label = 'Quiero la guía', className = '' }: { product: Product; label?: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ciruela px-6 py-3 font-display text-base font-bold text-white transition-colors hover:bg-rosa ${className}`}>
        <ShoppingBag className="h-5 w-5" />{label} · {formatARS(product.price)}
      </button>
      {open && <OrderDialog product={product} onClose={close} />}
    </>
  )
}
