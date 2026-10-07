'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Maximize, Pause, Play } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { colorEstado } from '@/lib/estilo'
import {
  DURACION_PROCESO,
  PASOS_NUMERADOS,
  PUNTO_RIEGO,
  momentoProceso,
  saltarPaso,
  type MomentoProceso,
} from '@/lib/demo/guion-proceso'
import { CodigoQR } from '../codigo-qr'
import { direccionParaQR, pantallaCompleta, usePantallaSola } from '../pantalla-sola'

// "Así riega IonDroplet": el recorrido del agua con la cámara siguiéndola,
// para el proyector del evento o para grabarlo en video. Corre solo y en
// bucle; la escena 3D (escena-proceso.js) dibuja a 60 cuadros con el mismo
// reloj que estos textos.

interface Escena {
  dibujar: (m: MomentoProceso, dt: number, anterior: MomentoProceso | null) => void
  destruir: () => void
}

/** Cuánto dura la transición de cámara entre un paso y otro. */
const TRANSICION_S = 1.4

function estadoDe(m: MomentoProceso): { texto: string; color: string } {
  if (m.rele) return { texto: 'Regando', color: 'var(--agua)' }
  if (m.humedad < PUNTO_RIEGO) return { texto: 'Tierra seca', color: 'var(--alerta)' }
  return { texto: 'Humedad bien', color: 'var(--ok)' }
}

export function Proceso() {
  const { segundo, ahora, pausado, alternarPausa, controles, mostrarControles, anterior, siguiente } =
    usePantallaSola({ saltar: saltarPaso })
  const [direccion, setDireccion] = useState<string | null>(null)
  const [fallo, setFallo] = useState(false)
  const caja = useRef<HTMLDivElement>(null)

  useEffect(() => setDireccion(direccionParaQR()), [])

  // La escena se arma una vez y se dibuja en cada cuadro con el reloj del guion.
  useEffect(() => {
    let vivo = true
    let escena: Escena | null = null
    let cuadro = 0
    import('./escena-proceso.js')
      .then(({ crearEscenaProceso }) => {
        if (!vivo || !caja.current) return
        escena = crearEscenaProceso(caja.current) as Escena
        let antes = performance.now()
        const dibujar = (ahoraMs: number) => {
          cuadro = requestAnimationFrame(dibujar)
          // El primer cuadro puede traer una marca anterior a "antes": nunca negativo.
          const dt = Math.max(0, Math.min(0.05, (ahoraMs - antes) / 1000))
          antes = ahoraMs
          const s = ahora()
          const m = momentoProceso(s)
          const enPaso = m.avance * m.duracion
          const previo = enPaso < TRANSICION_S ? momentoProceso(s - enPaso - 0.001) : null
          escena?.dibujar(m, dt, previo)
        }
        cuadro = requestAnimationFrame(dibujar)
      })
      .catch(() => { if (vivo) setFallo(true) })
    return () => {
      vivo = false
      cancelAnimationFrame(cuadro)
      escena?.destruir()
    }
  }, [ahora])

  const m = momentoProceso(segundo)
  const estado = estadoDe(m)
  const final = m.paso === 'final'
  const sitio = direccion ? direccion.replace(/^https?:\/\//, '') : ''

  return (
    <main
      className="proceso"
      data-cursor={controles ? 'si' : 'no'}
      onPointerMove={mostrarControles}
      onPointerDown={mostrarControles}
    >
      <div ref={caja} className="proceso-escena" aria-hidden />
      {fallo && <p className="proceso-fallo">No se pudo cargar la vista 3D en este equipo.</p>}

      <header className="proceso-cabeza">
        <span className="proceso-marca">
          <Logo tamano={44} />
          IonDroplet
        </span>
        <span className="chip-escena proceso-chip" style={{ color: '#7a5004' }}>
          Ilustración del proceso
        </span>
      </header>

      {!final && (
        <aside className="proceso-medidor" aria-label="Lo que mide el sensor">
          <div className="proceso-medidor-fila">
            <span className="proceso-cifra">
              {m.humedad.toFixed(1)}
              <small>%</small>
            </span>
            <span className={`capsula${m.rele ? ' regando' : ''}`} style={colorEstado(estado.color)}>
              {estado.texto}
            </span>
          </div>
          <div className="proyector-barra" style={colorEstado(estado.color)} aria-hidden>
            <div className="proyector-barra-relleno" style={{ width: `${m.humedad}%` }} />
            <div className="proyector-barra-punto" style={{ left: `${PUNTO_RIEGO}%` }} />
          </div>
          <p className="proyector-medidor-pie">
            <span>Humedad de la tierra</span>
            <span>Punto de riego: {PUNTO_RIEGO}%</span>
          </p>
          <p className="proceso-rele" style={colorEstado(m.rele ? 'var(--agua)' : 'var(--apagado)')}>
            <span className="proceso-rele-punto" aria-hidden />
            Bomba y varillas: {m.rele ? 'encendidas' : 'apagadas'}
          </p>
        </aside>
      )}

      {!final && (
        <section className="proceso-relato" key={m.paso} aria-live="polite">
          <div className="proceso-titulo-fila">
            {m.numero !== null && <span className="proceso-numero">{m.numero}</span>}
            <h1 className="proceso-titulo">{m.titulo}</h1>
          </div>
          <p className="proceso-detalle">{m.detalle}</p>
          {m.numero !== null && (
            <ol className="proyector-pasos" aria-label={`Paso ${m.numero} de ${PASOS_NUMERADOS}`}>
              {Array.from({ length: PASOS_NUMERADOS }, (_, i) => (
                <li key={i} data-paso={i + 1 < m.numero! ? 'hecho' : i + 1 === m.numero ? 'ahora' : 'falta'} />
              ))}
            </ol>
          )}
        </section>
      )}

      {final && (
        <div className="proceso-final">
          <div className="proceso-final-tarjeta">
            <div className="proceso-final-texto">
              <span className="proceso-marca">
                <Logo tamano={56} />
                IonDroplet
              </span>
              <h1 className="proceso-final-titulo">{m.titulo}</h1>
              <p className="proceso-detalle">
                Mide la tierra, decide cuándo regar, riega con agua ionizada y se apaga al llegar al punto de riego.
              </p>
              <p className="proceso-final-sitio">{sitio}</p>
            </div>
            {direccion && <CodigoQR texto={direccion} tamano={320} />}
          </div>
        </div>
      )}

      <div className="proyector-controles proceso-controles" data-visible={controles ? 'si' : 'no'}>
        <button type="button" className="proyector-control" onClick={anterior} aria-label="Paso anterior">
          <ChevronLeft size={22} aria-hidden />
        </button>
        <button type="button" className="proyector-control" onClick={alternarPausa} aria-label={pausado ? 'Seguir' : 'Pausar'}>
          {pausado ? <Play size={20} aria-hidden /> : <Pause size={20} aria-hidden />}
        </button>
        <button type="button" className="proyector-control" onClick={siguiente} aria-label="Paso siguiente">
          <ChevronRight size={22} aria-hidden />
        </button>
        <button type="button" className="proyector-control proyector-control-texto" onClick={pantallaCompleta}>
          <Maximize size={18} aria-hidden />
          Pantalla completa (F)
        </button>
      </div>
      <span className="sr-only">Dura {Math.round(DURACION_PROCESO)} segundos y se repite.</span>
    </main>
  )
}
