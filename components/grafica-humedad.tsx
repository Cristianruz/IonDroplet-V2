'use client'

import { useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import type { PuntoHistorial } from '@/hooks/use-iondroplet'

const ANCHO = 640
const MARGEN = { arriba: 16, abajo: 34, izquierda: 44, derecha: 16 }

interface Props {
  historial: PuntoHistorial[]
  /** Título de la tarjeta. Por omisión, el de las últimas 24 horas. */
  titulo?: string
  /** Alto del SVG. La pantalla de Historial la usa más grande. */
  altura?: number
  /** Cuándo empezó cada riego, para marcarlos abajo de la línea. */
  riegos?: Date[]
}

export function GraficaHumedad({ historial, titulo, altura, riegos = [] }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const ALTO = altura ?? 240
  const encabezado = titulo ?? 'Humedad en las últimas 24 horas'

  const { puntos, path, area, tramoLargo } = useMemo(() => {
    if (historial.length < 2) return { puntos: [], path: '', area: '', tramoLargo: false }

    const t0 = historial[0].fecha.getTime()
    const t1 = historial[historial.length - 1].fecha.getTime()
    const rangoT = Math.max(1, t1 - t0)
    const anchoUtil = ANCHO - MARGEN.izquierda - MARGEN.derecha
    const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo

    const pts = historial.map(p => ({
      x: MARGEN.izquierda + ((p.fecha.getTime() - t0) / rangoT) * anchoUtil,
      y: MARGEN.arriba + (1 - Math.min(100, Math.max(0, p.humedad)) / 100) * altoUtil,
      humedad: p.humedad,
      fecha: p.fecha,
    }))

    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const baseY = MARGEN.arriba + altoUtil
    const a = `${d} L${pts[pts.length - 1].x.toFixed(1)},${baseY} L${pts[0].x.toFixed(1)},${baseY} Z`
    // Más de dos días: en el eje ya no sirve la hora, va la fecha.
    return { puntos: pts, path: d, area: a, tramoLargo: rangoT > 48 * 60 * 60 * 1000 }
  }, [historial, ALTO])

  const punto = hover !== null && puntos[hover] ? puntos[hover] : null
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo

  // Marcas de riego, solo las que caen dentro de lo que se está viendo.
  const marcasRiego = useMemo(() => {
    if (puntos.length < 2 || riegos.length === 0) return []
    const t0 = historial[0].fecha.getTime()
    const t1 = historial[historial.length - 1].fecha.getTime()
    const rangoT = Math.max(1, t1 - t0)
    const anchoUtil = ANCHO - MARGEN.izquierda - MARGEN.derecha
    return riegos
      .filter(f => f.getTime() >= t0 && f.getTime() <= t1)
      .map(f => MARGEN.izquierda + ((f.getTime() - t0) / rangoT) * anchoUtil)
  }, [riegos, historial, puntos.length])

  function etiquetaEje(fecha: Date) {
    return tramoLargo
      ? fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
      : fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  }

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    if (puntos.length === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * ANCHO
    let mejor = 0
    let dist = Infinity
    puntos.forEach((p, i) => {
      const d = Math.abs(p.x - x)
      if (d < dist) { dist = d; mejor = i }
    })
    setHover(mejor)
  }

  return (
    <section
      className="rounded-lg p-4 sm:p-5 border"
      style={{ background: 'var(--tarjeta)' }}
      aria-label={encabezado}
    >
      <div className="flex items-center gap-3 mb-4">
        <TrendingUp size={18} style={{ color: 'var(--agua)' }} aria-hidden />
        <h2 className="text-base font-semibold">{encabezado}</h2>
      </div>

      {marcasRiego.length > 0 && (
        <div className="flex items-center gap-4 mb-4 text-sm" style={{ color: 'var(--tinta-suave)' }}>
          <span className="flex items-center gap-2">
            <span className="rounded-full" style={{ width: 14, height: 14, background: 'var(--agua)' }} aria-hidden />
            humedad
          </span>
          <span className="flex items-center gap-2">
            <span className="rounded-full" style={{ width: 14, height: 14, background: 'var(--verde)' }} aria-hidden />
            riego
          </span>
        </div>
      )}

      {historial.length < 2 ? (
        <p className="text-base py-8" style={{ color: 'var(--tinta-suave)' }}>
          Todavía no hay suficientes datos. Aquí vas a ver cómo cambia la humedad durante el día.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <svg
            viewBox={`0 0 ${ANCHO} ${ALTO}`}
            className="w-full"
            style={{ minWidth: 320 }}
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
            role="img"
            aria-label="Gráfica de línea de humedad del suelo"
          >
            {/* Rejilla recesiva: 0, 50 y 100% */}
            {[0, 50, 100].map(v => {
              const y = MARGEN.arriba + (1 - v / 100) * altoUtil
              return (
                <g key={v}>
                  <line
                    x1={MARGEN.izquierda} x2={ANCHO - MARGEN.derecha} y1={y} y2={y}
                    stroke="var(--pista)" strokeWidth={1}
                  />
                  <text x={MARGEN.izquierda - 8} y={y + 5} textAnchor="end" fontSize={15} fill="var(--tinta-suave)">
                    {v}%
                  </text>
                </g>
              )
            })}

            {/* Área suave + línea delgada, un solo tono (una sola serie) */}
            <path d={area} fill="var(--agua)" opacity={0.08} />
            <path d={path} fill="none" stroke="var(--agua)" strokeWidth={2.5} strokeLinejoin="round" />

            {/* Cada riego, marcado abajo de la línea */}
            {marcasRiego.map((x, i) => (
              <circle
                key={`riego-${i}`}
                cx={x}
                cy={MARGEN.arriba + altoUtil}
                r={5}
                fill="var(--verde)"
                stroke="white"
                strokeWidth={1.5}
              />
            ))}

            {/* Etiqueta directa en el último punto */}
            {puntos.length > 0 && (
              <g>
                <circle cx={puntos[puntos.length - 1].x} cy={puntos[puntos.length - 1].y} r={5} fill="var(--agua)" stroke="white" strokeWidth={2} />
                <text
                  x={Math.min(puntos[puntos.length - 1].x + 8, ANCHO - MARGEN.derecha - 4)}
                  y={puntos[puntos.length - 1].y - 10}
                  fontSize={16} fontWeight={700} fill="var(--tinta)" textAnchor="end"
                >
                  {Math.round(puntos[puntos.length - 1].humedad)}%
                </text>
              </g>
            )}

            {/* Crosshair + tooltip al pasar el mouse/dedo */}
            {punto && (
              <g>
                <line x1={punto.x} x2={punto.x} y1={MARGEN.arriba} y2={ALTO - MARGEN.abajo} stroke="var(--apagado)" strokeWidth={1} strokeDasharray="4 3" />
                <circle cx={punto.x} cy={punto.y} r={6} fill="var(--agua)" stroke="white" strokeWidth={2} />
                <g transform={`translate(${Math.min(Math.max(punto.x - 60, MARGEN.izquierda), ANCHO - MARGEN.derecha - 120)}, ${MARGEN.arriba})`}>
                  <rect width={120} height={52} rx={10} fill="var(--tinta)" opacity={0.92} />
                  <text x={60} y={22} textAnchor="middle" fontSize={17} fontWeight={700} fill="white">
                    {Math.round(punto.humedad)}% humedad
                  </text>
                  <text x={60} y={42} textAnchor="middle" fontSize={14} fill="#c8d4c8">
                    {etiquetaEje(punto.fecha)}
                  </text>
                </g>
              </g>
            )}

            {/* Inicio, medio y fin en el eje X */}
            {puntos.length > 0 && [0, Math.floor(puntos.length / 2), puntos.length - 1].map(i => (
              <text key={i} x={puntos[i].x} y={ALTO - 10} textAnchor="middle" fontSize={15} fill="var(--tinta-suave)">
                {etiquetaEje(puntos[i].fecha)}
              </text>
            ))}
          </svg>
        </div>
      )}
    </section>
  )
}
