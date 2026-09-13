import type { Metadata, Viewport } from 'next'
import './globals.css'
import { RegistrarSW } from '@/components/registrar-sw'
import { GuardiaSesion } from '@/components/guardia-sesion'

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
        {/* Sin sesión, la guardia manda a /entrar y no monta el resto */}
        <GuardiaSesion>{children}</GuardiaSesion>
        <RegistrarSW />
      </body>
    </html>
  )
}
