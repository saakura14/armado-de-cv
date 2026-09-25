import type { Metadata } from 'next'
import { Clause, LegalPage } from '@/components/legal'
import { CONTACT } from '@/lib/catalog'

export const metadata: Metadata = { title: 'Política de privacidad', description: 'Cómo Armado de CV protege y usa tus datos personales, los de tu CV, e-books, cursos y test vocacional.' }

export default function PrivacyPage() {
  return (
    <LegalPage script="Privacidad" title="Política de privacidad">
      <Clause title="1. Responsable">
        <p>La responsable de tus datos es Valeria Yanina Gil (Armado de CV). Contacto: <a href={`mailto:${CONTACT.email}`} className="font-semibold text-rosa-deep underline">{CONTACT.email}</a>. Esta política cumple con la Ley 25.326 de Protección de los Datos Personales.</p>
      </Clause>

      <Clause title="2. Qué datos uso">
        <ul>
          <li><b>Cuenta:</b> nombre, email y, si ingresás con Google, tu foto de perfil. La contraseña la gestiona el proveedor de autenticación y nunca la veo.</li>
          <li><b>Pedidos:</b> lo que compraste, tu WhatsApp, las notas que me dejás y el comprobante de transferencia que subís.</li>
          <li><b>Para armar tu CV:</b> experiencia laboral, formación, habilidades, datos de contacto y la foto que elijas incluir.</li>
          <li><b>Test vocacional y sesiones:</b> tus respuestas y lo que compartas en la sesión. Los trato con estricta confidencialidad.</li>
          <li><b>Cursos:</b> a qué cursos tenés acceso. El avance de las clases vistas queda guardado solo en tu navegador.</li>
        </ul>
      </Clause>

      <Clause title="3. Para qué los uso">
        <ul>
          <li>Prestarte el servicio que contrataste y entregarte e-books, cursos y sesiones.</li>
          <li>Verificar pagos y contactarte por WhatsApp o email por tu pedido.</li>
          <li>Cumplir obligaciones legales, contables y de defensa del consumidor.</li>
        </ul>
        <p><b>No vendo, no alquilo y no cedo tus datos a terceros</b> con fines comerciales. No uso tu CV ni tus respuestas para nada distinto de lo que contrataste.</p>
      </Clause>

      <Clause title="4. Dónde se guardan">
        <p>El sitio usa proveedores tecnológicos para funcionar: Vercel (alojamiento de la web), Supabase (base de datos, archivos y cuentas de usuario) y Google (si elegís ingresar con Google, y para las videollamadas por Meet). Estos servicios pueden almacenar la información en servidores fuera de la Argentina, con medidas de seguridad adecuadas.</p>
        <p>Los comprobantes, e-books y materiales se guardan en espacios privados: solo vos y la administración pueden ver tus archivos, y las descargas usan links temporales que vencen en minutos.</p>
      </Clause>

      <Clause title="5. Cuánto tiempo">
        <p>Conservo los datos de tu cuenta mientras la tengas activa, y los de pedidos y pagos el tiempo que exigen las normas contables e impositivas. La información de tu CV y del test la puedo eliminar cuando lo pidas, una vez terminado el servicio.</p>
      </Clause>

      <Clause title="6. Cookies y almacenamiento local">
        <p>Uso solo el almacenamiento necesario para mantener tu sesión iniciada, recordar el pedido que estás armando y el avance de tus cursos. No uso cookies publicitarias ni de seguimiento.</p>
      </Clause>

      <Clause title="7. Tus derechos">
        <p>Podés pedir acceso, rectificación, actualización o supresión de tus datos escribiendo a {CONTACT.email}. El derecho de acceso es gratuito y puede ejercerse a intervalos no inferiores a seis meses, salvo interés legítimo (art. 14, inc. 3, Ley 25.326).</p>
        <p className="rounded-2xl bg-papel p-4 text-sm">La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.</p>
      </Clause>

      <Clause title="8. Cambios">
        <p>Si actualizo esta política, lo voy a publicar en esta página con la nueva fecha.</p>
      </Clause>
    </LegalPage>
  )
}
