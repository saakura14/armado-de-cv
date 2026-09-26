import type { Metadata } from 'next'
import Link from 'next/link'
import { Clause, LegalPage } from '@/components/legal'
import { CONTACT } from '@/lib/catalog'

export const metadata: Metadata = { title: 'Términos y condiciones', description: 'Condiciones de contratación de los packs de CV, e-books, cursos, sesiones y test vocacional de Armado de CV.' }

export default function TermsPage() {
  return (
    <LegalPage script="Condiciones" title="Términos y condiciones">
      <Clause title="1. Quién presta el servicio">
        <p>Los servicios y productos de <b>Armado de CV</b> y <b>Armado de CV · Asesorías</b> los presta Valeria Yanina Gil. Podés contactarme por email a <a href={`mailto:${CONTACT.email}`} className="font-semibold text-rosa-deep underline">{CONTACT.email}</a> o por WhatsApp al {CONTACT.whatsappLabel}.</p>
        <p>Al confirmar un pedido en este sitio declarás haber leído y aceptado estos términos, la <Link href="/privacidad" className="font-semibold text-rosa-deep underline">política de privacidad</Link> y las condiciones particulares que se muestran en cada producto antes de comprar.</p>
      </Clause>

      <Clause title="2. Precios y forma de pago">
        <ul>
          <li>Los precios están expresados en pesos argentinos y son los publicados en el sitio al momento de confirmar el pedido. El total se calcula automáticamente con los extras elegidos.</li>
          <li>El pago se realiza por transferencia bancaria. Los datos para transferir se muestran una vez confirmado el pedido.</li>
          <li>Después de transferir, subís el comprobante desde tu pedido. Los trabajos se comienzan <b>una vez abonado el monto total</b> y verificado el pago.</li>
          <li><b>Una vez realizado el pedido, no se puede cancelar.</b></li>
        </ul>
      </Clause>

      <Clause title="3. Packs de CV, LinkedIn y carga en plataformas">
        <ul>
          <li>Es <b>1 pack por persona y por rubro</b>. No es recomendable mezclar muchos rubros, porque el CV no va a funcionar con los filtros.</li>
          <li>La demora es de <b>3 a 4 días hábiles</b>, contados desde que cuento con toda la información requerida. No trabajo fines de semana. Puedo adelantar trabajo, pero si te escribo un fin de semana y te molesta, avisame y lo tengo en cuenta.</li>
          <li>Si el pack se contrata <b>después de las 17 hs</b>, se comienza el día hábil siguiente por la tarde.</li>
          <li><b>Versión Express:</b> para recibir el pack dentro de las 24 hs hábiles se abona un extra al pack contratado. Tenés que avisarlo <b>antes de comenzar</b>.</li>
          <li>Si durante el armado necesitás el CV de forma urgente, antes de la fecha de entrega normal, se abona un recargo.</li>
          <li>Armo un boceto del texto y te lo paso para que, si hay que hacer modificaciones, lo amoldemos juntos.</li>
          <li>Te entrego un link para verificar el boceto del CV y hacer todas las modificaciones que necesites. <b>Una vez entregado y pasadas las 24 hs, cualquier cambio tiene un costo de $5.000, sin excepción.</b></li>
          <li>Te entrego el formato editable (link) y los PDF. Desde el link podés descargar el PDF cuando quieras, por ejemplo si más adelante cambiás la foto o el color.</li>
          <li>Trabajo con plantillas propias, 100% realizadas por mí, con un formato limpio y profesional. Si tenés alguna preferencia de colores para los títulos del CV moderno (el que lleva foto), mencionámela.</li>
          <li>Sos responsable de que la información que me das (experiencia, formación, datos de contacto) sea verdadera.</li>
        </ul>
      </Clause>

      <Clause title="4. E-books">
        <ul>
          <li>Los e-books y guías se entregan en formato digital y se habilitan para descargar en <Link href="/cuenta" className="font-semibold text-rosa-deep underline">Mi cuenta</Link> apenas subís el comprobante de la transferencia. Cuando el pedido incluye otros servicios, se habilitan cuando se aprueba el pago.</li>
          <li>La entrega inmediata está sujeta a la acreditación de la transferencia. Si el pago no se acredita, el acceso se da de baja y el pedido se cancela. Cada descarga lleva el email de quien compró.</li>
          <li>
            <b>Consentimiento informado (Asesorías).</b> Al aceptar estos términos para comprar e-books, packs o sesiones de Asesorías, prestás tu consentimiento informado: entendés que el material y las sesiones son de preparación y orientación, que no garantizan un resultado en entrevistas ni en tests, que no constituyen diagnóstico ni reemplazan una evaluación o tratamiento psicológico o profesional, y que tu participación es voluntaria. Nada de lo que trabajamos busca falsear respuestas.
          </li>
          <li>La compra te da una licencia de uso <b>personal e intransferible</b>. No está permitido revenderlos, compartirlos, publicarlos ni distribuirlos, total o parcialmente.</li>
        </ul>
      </Clause>

      <Clause title="5. Cursos pre-grabados">
        <ul>
          <li>Los cursos se ven desde tu cuenta en este sitio, iniciando sesión con el mismo email con el que compraste. El acceso se habilita al aprobarse el pago.</li>
          <li>El acceso es personal: no compartas tu cuenta ni los links de las clases. Si detecto un uso compartido, puedo suspender el acceso.</li>
          <li>Tenés acceso al curso durante <b>12 meses</b> desde que se aprueba el pago. La fecha de vencimiento la ves en Mi cuenta.</li>
        </ul>
      </Clause>

      <Clause title="6. Sesiones 1 a 1 por Google Meet">
        <ul>
          <li>Las sesiones se coordinan por WhatsApp con turno previo, una vez confirmado el pago. El día, el horario y el link de la videollamada quedan visibles en Mi cuenta.</li>
          <li>Podés reprogramar avisando con al menos 24 hs de anticipación. <b>Si no te presentás sin avisar, la sesión se considera realizada y para una nueva sesión hay que volver a abonarla.</b></li>
          <li>Las sesiones son un espacio de preparación y acompañamiento. No reemplazan una consulta psicológica ni un tratamiento profesional.</li>
        </ul>
      </Clause>

      <Clause title="7. Test de orientación vocacional">
        <p>El test es una herramienta de orientación. <b>No constituye diagnóstico ni evaluación psicométrica estandarizada.</b> Las respuestas y los resultados son confidenciales y se usan solo para elaborar tu devolución.</p>
      </Clause>

      <Clause id="devoluciones" title="8. Cambios, cancelaciones y devoluciones">
        <ul>
          <li><b>No hay devoluciones de los packs contratados una vez iniciado el trabajo.</b> Los CV, cartas y perfiles se confeccionan de forma personalizada con tu información.</li>
          <li>Los e-books y cursos son contenido digital: una vez descargados o accedidos no admiten devolución.</li>
          <li>Esto se ajusta a las excepciones del artículo 1116 del Código Civil y Comercial de la Nación para productos personalizados y contenidos digitales.</li>
          <li>Si todavía no empecé tu trabajo, no descargaste el material y estás dentro de los 10 días corridos de la compra, podés revocarla con el <Link href="/arrepentimiento" className="font-semibold text-rosa-deep underline">botón de arrepentimiento</Link>. En ese caso te devuelvo el total por el mismo medio de pago.</li>
          <li>Si por un motivo propio no puedo prestar un servicio ya abonado, te devuelvo el total.</li>
        </ul>
      </Clause>

      <Clause title="9. Resultados">
        <p>Un buen CV y una buena preparación mejoran cómo te presentás, pero ninguna asesoría puede garantizar que consigas un empleo, que te llamen a una entrevista o que apruebes un proceso de selección. Esas decisiones dependen de cada empresa.</p>
      </Clause>

      <Clause title="10. Propiedad intelectual">
        <p>Las plantillas, los textos del sitio, los e-books y los cursos son de mi autoría. El CV y los documentos que armo para vos son para tu uso personal en la búsqueda laboral.</p>
      </Clause>

      <Clause title="11. Ley aplicable y consultas">
        <p>Estos términos se rigen por las leyes de la República Argentina, incluida la Ley 24.240 de Defensa del Consumidor. Ante cualquier duda o reclamo escribime a {CONTACT.email}. También podés acudir a la <a href="https://www.argentina.gob.ar/defensadelconsumidor" target="_blank" rel="noreferrer" className="font-semibold text-rosa-deep underline">Dirección Nacional de Defensa del Consumidor</a>.</p>
      </Clause>
    </LegalPage>
  )
}
