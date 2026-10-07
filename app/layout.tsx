import type { Metadata, Viewport } from 'next'
import './globals.css'
import { RegistrarSW } from '@/components/ui/registrar-sw'
import { GuardiaSesion } from '@/components/ui/guardia-sesion'
import { FranjaDemo } from '@/components/ui/franja-demo'
import { MODO_DEMO } from '@/lib/modo'

export const metadata: Metadata = {
  title: 'IonDroplet · Riego Inteligente',
  description: 'Sistema de monitoreo y riego agrícola con ionización de agua',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Se deja hacer zoom: hay quien lo necesita para leer.
  maximumScale: 5,
  // El color de la barra del navegador acompaña al tema.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f4ef' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1a26' },
  ],
}

// Corre ANTES de pintar. Sin esto, quien escogió oscuro vería un
// destello blanco en cada carga.
// El proyector y el recorrido siempre van en claro: un proyector deslava los
// fondos oscuros.
const TEMA_SIN_PARPADEO = `
try {
  var t = localStorage.getItem('iondroplet.tema');
  if (location.pathname.indexOf('/proyector') === 0 || location.pathname.indexOf('/proceso') === 0) t = 'claro';
  if (t === 'claro' || t === 'oscuro') document.documentElement.setAttribute('data-tema', t);
} catch (e) {}
`

// Solo en la demostración, y también antes de pintar. En una pantalla ancha
// la app se enseña adentro de un celular (/presentacion); adentro de ese
// celular se marca la página para que no repita la franja de arriba. Quien
// prefiere verla sin el marco entra con ?marco=no y la pestaña lo recuerda.
// /operacion, /entrar, /proyector y /proceso nunca se enmarcan.
const MARCO_DEMO = `
(function () {
  try {
    var d = document.documentElement, l = location;
    if (/[?&]marco=no(&|$)/.test(l.search)) sessionStorage.setItem('iondroplet.sin-marco', '1');
    if (window.self !== window.top) { d.setAttribute('data-enmarcada', 'si'); return; }
    var ancho = matchMedia('(min-width: 1024px)').matches;
    var sinMarco = sessionStorage.getItem('iondroplet.sin-marco') === '1';
    if (l.pathname.indexOf('/presentacion') === 0) {
      if (!ancho || sinMarco) {
        var r = new URLSearchParams(l.search).get('ruta') || '/';
        l.replace(r.charAt(0) === '/' && r.charAt(1) !== '/' && r.indexOf('/presentacion') !== 0 ? r : '/');
      }
      return;
    }
    if (ancho && !sinMarco && !/^\\/(operacion|entrar|proyector|proceso)/.test(l.pathname)) {
      l.replace('/presentacion?ruta=' + encodeURIComponent(l.pathname + l.search));
    }
  } catch (e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_SIN_PARPADEO }} />
        {MODO_DEMO && <script dangerouslySetInnerHTML={{ __html: MARCO_DEMO }} />}
      </head>
      <body>
        <FranjaDemo />
        {/* Sin sesión, la guardia manda a /entrar y no monta el resto */}
        <GuardiaSesion>{children}</GuardiaSesion>
        <RegistrarSW />
      </body>
    </html>
  )
}
