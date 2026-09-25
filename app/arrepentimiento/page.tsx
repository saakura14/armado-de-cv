import type { Metadata } from 'next'
import { Clause, LegalPage } from '@/components/legal'
import { WithdrawalForm } from './withdrawal-form'

export const metadata: Metadata = { title: 'Botón de arrepentimiento', description: 'Revocá tu compra dentro de los 10 días corridos.' }

export default function WithdrawalPage() {
  return (
    <LegalPage script="Arrepentimiento" title="Botón de arrepentimiento">
      <Clause title="¿Cuándo puedo revocar la compra?">
        <p>Tenés <b>10 días corridos</b> desde la compra para revocarla, sin costo y sin dar explicaciones (art. 34 de la Ley 24.240 y art. 1110 del Código Civil y Comercial).</p>
        <p>Por su naturaleza, <b>no aplica</b> a los trabajos personalizados que ya empecé (CV, cartas, perfiles de LinkedIn, carga en plataformas), ni a e-books o cursos que ya descargaste o a los que accediste (art. 1116 del Código Civil y Comercial).</p>
      </Clause>
      <Clause title="Pedí la revocación">
        <p>Completá tus datos y envialo por WhatsApp o email. En menos de 24 hs te respondo con el número de trámite, y si corresponde te devuelvo el total por el mismo medio de pago.</p>
        <WithdrawalForm />
      </Clause>
    </LegalPage>
  )
}
