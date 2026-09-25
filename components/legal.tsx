import Link from 'next/link'

export const LEGAL_UPDATED = '25 de septiembre de 2026'

export function LegalPage({ script, title, children }: { script: string; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-arena/40 px-4 py-12 sm:px-6 lg:py-16">
      <article className="mx-auto max-w-3xl rounded-[28px] bg-white p-6 shadow-[0_22px_44px_-30px_rgba(67,32,44,0.55)] sm:p-10">
        <p className="font-script text-5xl leading-none text-rosa">{script}</p>
        <h1 className="mt-2 text-2xl font-extrabold text-ciruela sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-piedra">Última actualización: {LEGAL_UPDATED}</p>
        <div className="legal mt-8 space-y-8 leading-relaxed text-ink">{children}</div>
        <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-6 text-sm font-semibold text-rosa-deep">
          <Link href="/terminos" className="hover:underline">Términos y condiciones</Link>
          <Link href="/privacidad" className="hover:underline">Política de privacidad</Link>
          <Link href="/arrepentimiento" className="hover:underline">Botón de arrepentimiento</Link>
        </nav>
      </article>
    </section>
  )
}

export function Clause({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-lg font-bold text-ciruela">{title}</h2>
      <div className="mt-2 space-y-3 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">{children}</div>
    </section>
  )
}
