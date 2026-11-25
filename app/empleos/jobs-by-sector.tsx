'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export type JobCard = { slug: string; title: string; logo: string; logoSize: [number, number]; alt: string; count: string; sector: string }
export type Sector = { id: string; label: string }

/**
 * Búsquedas laborales by sector: chips on top to filter ("Todas" shows every sector with its title), and a card per
 * job page with its logo and today's count. Works the same on phone, tablet and computer.
 */
export function JobsBySector({ sectors, cards }: { sectors: Sector[]; cards: JobCard[] }) {
  const [filter, setFilter] = useState('todas')
  const used = sectors.filter((sector) => cards.some((card) => card.sector === sector.id))
  const shown = filter === 'todas' ? used : used.filter((sector) => sector.id === filter)
  const chip = (current: boolean) => `shrink-0 rounded-full px-4 py-2 font-display text-sm font-bold transition-colors ${current ? 'bg-ciruela text-white' : 'bg-white text-piedra shadow-sm hover:text-ciruela'}`

  return (
    <div className="mx-auto max-w-5xl">
      <div role="group" aria-label="Filtrar por sector" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <button type="button" aria-pressed={filter === 'todas'} onClick={() => setFilter('todas')} className={chip(filter === 'todas')}>Todas</button>
        {used.map((sector) => (
          <button key={sector.id} type="button" aria-pressed={filter === sector.id} onClick={() => setFilter(sector.id)} className={chip(filter === sector.id)}>{sector.label}</button>
        ))}
      </div>

      {shown.map((sector) => (
        <section key={sector.id} aria-labelledby={`sector-${sector.id}`} className="mt-8">
          <h2 id={`sector-${sector.id}`} className="font-display text-xl font-extrabold text-ciruela">{sector.label}</h2>
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.filter((card) => card.sector === sector.id).map((card) => (
              <li key={card.slug}>
                <Link href={`/empleos/${card.slug}`} className="group flex h-full flex-col rounded-[28px] bg-white p-5 shadow-[0_22px_44px_-30px_rgba(67,32,44,0.55)] transition-transform hover:-translate-y-1">
                  {/* Always a white card: the brand logos are dark and must stay readable in the dark theme. */}
                  <span className="flex h-28 items-center justify-center rounded-2xl bg-[#fff]">
                    <Image src={card.logo} alt={card.alt} width={card.logoSize[0]} height={card.logoSize[1]} className="h-auto max-h-24 w-auto max-w-[180px]" />
                  </span>
                  <span className="mt-4 font-display text-xl font-bold text-ciruela">{card.title}</span>
                  <span className="mt-1 text-sm text-piedra">{card.count}</span>
                  <span className="mt-auto inline-flex items-center gap-1 pt-4 font-display text-sm font-bold text-rosa-deep">Ver búsquedas y postularme<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
