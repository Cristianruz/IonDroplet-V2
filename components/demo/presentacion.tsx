'use client'

import { useEffect, useRef, useState } from 'react'
import { CircleAlert, Droplets, Maximize2, RotateCcw, Sprout, Sun } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { ListaEnlaces } from '@/components/ui/lista-enlaces'
import { colorEstado } from '@/lib/estilo'
import type { ResumenDemo } from '@/lib/demo/escenarios'
import { CodigoQR } from './codigo-qr'
import {
  escenarios,
  esMensajeEstado,
  narrar,
  type CualEscenario,
  type MensajeEscenario,
} from './escenarios'

// La demostración vista en una pantalla ancha (la laptop o el proyector).
//
// La app es para el celular: estirada a lo ancho se veía como una columna
// perdida en medio de la pantalla. Aquí va adentro de un celular, con su
// tamaño de verdad, y al lado un panel que dice qué es, deja provocar los
// escenarios y va narrando lo que pasa en la tierra. El código QR es para
// que cada quien la abra en su propio celular.

/** Solo rutas de la app: nada de otros sitios ni de volver a la presentación. */
function rutaSegura(valor: string | null): string {
  if (!valor || !valor.startsWith('/') || valor.startsWith('//') || valor.startsWith('/presentacion')) return '/'
  return valor
}

function colorDe(r: ResumenDemo): string {
  if (!r.sensor) return 'var(--alerta)'
  if (r.regando) return 'var(--agua)'
  if (r.humedad < r.umbral) return 'var(--alerta)'
  return 'var(--ok)'
}

function IconoDe({ r }: { r: ResumenDemo }) {
  const props = { size: 18, 'aria-hidden': true, style: { flexShrink: 0, marginTop: 2 } } as const
  if (!r.sensor) return <CircleAlert {...props} />
  if (r.regando) return <Droplets {...props} />
  if (r.humedad < r.umbral) return <Sun {...props} />
  return <Sprout {...props} />
}

export function Presentacion() {
  const marco = useRef<HTMLIFrameElement | null>(null)
  const [ruta, setRuta] = useState<string | null>(null)
  const [direccion, setDireccion] = useState<string | null>(null)
  const [estado, setEstado] = useState<ResumenDemo | null>(null)

  useEffect(() => {
    setRuta(rutaSegura(new URLSearchParams(window.location.search).get('ruta')))
    setDireccion(window.location.origin)
  }, [])

  // La app enmarcada cuenta cada segundo cómo va la tierra.
  useEffect(() => {
    const alRecibir = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== marco.current?.contentWindow) return
      if (esMensajeEstado(e.data)) setEstado(e.data.resumen)
    }
    window.addEventListener('message', alRecibir)
    return () => window.removeEventListener('message', alRecibir)
  }, [])

  function pedir(escenario: CualEscenario) {
    const mensaje: MensajeEscenario = { tipo: 'iondroplet:escenario', escenario }
    marco.current?.contentWindow?.postMessage(mensaje, window.location.origin)
    if (escenario === 'reiniciar') setEstado(null)
  }

  const pantallaCompleta = (() => {
    const url = new URL(ruta ?? '/', 'http://x')
    url.searchParams.set('marco', 'no')
    return url.pathname + url.search
  })()
  const sitio = direccion ? direccion.replace(/^https?:\/\//, '') : ''

  return (
    <main className="presentacion">
      <div className="presentacion-panel">
        <div className="flex items-center gap-3">
          <Logo tamano={40} />
          <span className="text-lg font-bold" style={{ letterSpacing: '-.02em' }}>IonDroplet</span>
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="presentacion-titulo">Riega solo y te explica por qué.</h1>
          <p className="presentacion-bajada">
            Un sensor mide la humedad de la tierra. El sistema decide cuándo regar y se lo cuenta al
            agricultor con palabras sencillas.
          </p>
        </div>

        <section aria-labelledby="pruebalo-titulo" className="flex flex-col gap-3">
          <h2 id="pruebalo-titulo" className="titulo-bloque">Pruébalo en el celular</h2>
          <ListaEnlaces
            etiqueta="Escenarios de prueba"
            renglones={escenarios(estado?.sensor ?? true).map(({ id, titulo, detalle, Icono }) => ({
              titulo,
              detalle,
              Icono,
              onClick: () => pedir(id),
              enCurso: id === 'secar' && estado?.regando && estado.automatico ? 'Regando' : undefined,
            }))}
          />
          <p className="franja-estado presentacion-narra" style={colorEstado(estado ? colorDe(estado) : 'var(--apagado)')} role="status" aria-live="polite">
            {estado ? <IconoDe r={estado} /> : <Sprout size={18} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />}
            <span>{estado ? narrar(estado) : 'Abriendo la app…'}</span>
          </p>
        </section>
      </div>

      {/* El código va en su propia columna en las pantallas del proyector:
          es lo que el jurado tiene que alcanzar a escanear desde su lugar. */}
      <aside className="presentacion-qr" aria-label="Abrir en el celular">
        {direccion && <CodigoQR texto={direccion} tamano={220} />}
        <div className="presentacion-qr-texto">
          <p className="presentacion-qr-titulo">Ábrela en tu celular</p>
          <p className="text-[15px] texto-suave leading-snug">
            Apunta la cámara al código o entra a <span className="font-semibold texto-acento">{sitio}</span>
          </p>
          <p className="text-sm texto-apagado mt-1">Datos de ejemplo: nada riega de verdad.</p>
          <div className="presentacion-qr-acciones">
            <button type="button" onClick={() => pedir('reiniciar')} className="boton boton-sutil">
              <RotateCcw size={16} aria-hidden />
              Empezar de nuevo
            </button>
            <a href={pantallaCompleta} className="boton boton-sutil">
              <Maximize2 size={16} aria-hidden />
              Quitar el marco
            </a>
          </div>
        </div>
      </aside>

      <div className="presentacion-telefono">
        {ruta && (
          <iframe
            ref={marco}
            src={ruta}
            title="La app de IonDroplet en un celular"
            className="presentacion-pantalla"
          />
        )}
      </div>
    </main>
  )
}
