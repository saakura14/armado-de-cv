# Armado de CV

Tienda online de **Armado de CV** (Valeria Gil): packs de CV (moderno + optimizado ATS), LinkedIn, carta de presentación, asesorías para entrevistas y psicotécnicos, test vocacional, guías digitales y cursos.

**Sitio:** https://www.armadodecv.com · Instagram [@armadodecv.ok](https://instagram.com/armadodecv.ok) · WhatsApp 11 5106-0953 · ayuda.armadodecv@gmail.com

📘 **Documentación funcional y técnica completa:** [`docs/DOCUMENTACION.md`](docs/DOCUMENTACION.md)

## Cómo funciona en pocas palabras
- El cliente elige productos y extras, crea su cuenta (Google o email) y confirma el pedido: los precios se calculan en el servidor.
- Paga por transferencia y sube el comprobante en "Mi cuenta".
- Desde `/admin`, Valeria aprueba el pago. Eso libera los e-books (con sello del comprador) y los cursos, y crea las sesiones 1 a 1 para agendar.
- Precios, e-books, cursos, preguntas de Sakura, testimonios y datos de pago se editan desde el panel, sin tocar código.

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Auth, Postgres con RLS, Storage, Edge Functions) · Vercel · dominio en GoDaddy.

```bash
npm install
npm run dev
```

## Estructura
| Carpeta | Contenido |
|---|---|
| `app/` | Páginas (inicio, asesorías, cursos, comprar, cuenta, admin, legales) |
| `components/` | Componentes de la interfaz y pestañas del panel (`admin/`) |
| `lib/` | Cliente de Supabase, catálogo, pedidos, sesión, Sakura, píxel |
| `supabase/migrations/` | Historial completo de la base de datos |
| `supabase/functions/` | Edge Functions (`ebook-download`, `admin-upload`) |
| `docs/` | Documentación |

Cada merge a `main` se despliega automáticamente en Vercel.
