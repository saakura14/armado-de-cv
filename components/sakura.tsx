/** Sakura, Valeria's anime avatar, talking through a speech bubble. */
export function SakuraSays({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-end gap-3 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/sakura.svg" alt="Sakura" width={72} height={72} className="h-16 w-16 shrink-0 rounded-full shadow-[0_10px_24px_-14px_rgba(67,32,44,0.6)] sm:h-[72px] sm:w-[72px]" />
      <div className="relative rounded-3xl rounded-bl-md bg-white px-4 py-3 text-sm leading-relaxed text-ink shadow-[0_14px_30px_-24px_rgba(67,32,44,0.6)]">
        <p className="font-script text-2xl leading-none text-rosa">Sakura</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  )
}
