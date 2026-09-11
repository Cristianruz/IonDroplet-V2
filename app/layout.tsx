import type { Metadata, Viewport } from 'next'
import './globals.css'
import { NavInferior } from '@/components/nav-inferior'
import { VolverArriba } from '@/components/volver-arriba'
import { BurbujaAsistente } from '@/components/burbuja-asistente'
import { RegistrarSW } from '@/components/registrar-sw'
import { ProveedorDatos } from '@/hooks/datos-provider'

export const metadata: Metadata = {
  title: 'IonDroplet — Riego Inteligente',
  description: 'Sistema de monitoreo y riego agrícola con ionización de agua',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Se deja hacer zoom: hay quien lo necesita para leer.
  maximumScale: 5,
  // El color de la barra del navegador acompaña al tema.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7f4' },
    { media: '(prefers-color-scheme: dark)', color: '#10160f' },
  ],
}

// Corre ANTES de pintar. Sin esto, quien escogió oscuro vería un
// destello blanco en cada carga.
const TEMA_SIN_PARPADEO = `
try {
  var t = localStorage.getItem('iondroplet.tema');
  if (t === 'claro' || t === 'oscuro') document.documentElement.setAttribute('data-tema', t);
} catch (e) {}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_SIN_PARPADEO }} />
      </head>
      <body>
        {/* Un solo proveedor arriba de todo: los datos sobreviven al cambio de
            pantalla, así no hay que volver a pedirlos ni enseñar "Buscando…" */}
        <ProveedorDatos>
          {/* Hueco para que la barra fija de abajo no tape el final de la página */}
          <div style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom))' }}>
            {children}
          </div>
          <BurbujaAsistente />
          <RegistrarSW />
          <VolverArriba />
          <NavInferior />
        </ProveedorDatos>
      </body>
    </html>
  )
}
