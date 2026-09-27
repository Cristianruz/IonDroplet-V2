'use client'

import type { PuntoHistorial } from '@/hooks/use-iondroplet'

// Serie de humedad para el panel de operación: densa, con banda de manejo y
// ejes con números. Es la misma gráfica que ve el agricultor, dicha en
// ingeniero: rejilla, escala y umbral marcado en vez de un color de semáforo.
//
// SVG a mano, sin librería de gráficas: la regla del proyecto es no agregar
// dependencias, y una serie con rejilla no las necesita.

interface Props {
  historial: PuntoHistorial[]
  /** Punto de riego: debajo de esto la bomba arranca. */
  umbral: number | null
  altura?: number
}

const MARGEN = { arriba: 8, derecha: 8, abajo: 22, izquierda: 32 }

export function SerieDensa({ historial, umbral, altura = 200 }: Props) {
  if (historial.length < 2) {
    return (
      <p className="op-vacio">
        Se necesitan al menos dos lecturas para dibujar la serie. Hay {historial.length}.
      </p>
    )
  }

  const ancho = 1000
  const areaAncho = ancho - MARGEN.izquierda - MARGEN.derecha
  const areaAlto = altura - MARGEN.arriba - MARGEN.abajo

  const t0 = historial[0].fecha.getTime()
  const t1 = historial[historial.length - 1].fecha.getTime()
  const rango = Math.max(t1 - t0, 1)

  const x = (f: Date) => MARGEN.izquierda + ((f.getTime() - t0) / rango) * areaAncho
  const y = (h: number) => MARGEN.arriba + (1 - Math.min(Math.max(h, 0), 100) / 100) * areaAlto

  const linea = historial.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.fecha).toFixed(1)},${y(p.humedad).toFixed(1)}`).join(' ')

  // Etiquetas de tiempo: primera, media y última. Más que eso se encima.
  const marcas = [historial[0], historial[Math.floor(historial.length / 2)], historial[historial.length - 1]]

  return (
    <svg
      viewBox={`0 0 ${ancho} ${altura}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: altura, display: 'block' }}
      role="img"
      aria-label={`Serie de humedad volumétrica, ${historial.length} lecturas`}
    >
      {/* Rejilla horizontal cada 20% */}
      {[0, 20, 40, 60, 80, 100].map(v => (
        <g key={v}>
          <line
            x1={MARGEN.izquierda}
            x2={ancho - MARGEN.derecha}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--pista)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <text x={MARGEN.izquierda - 6} y={y(v) + 3} textAnchor="end" className="op-eje">
            {v}
          </text>
        </g>
      ))}

      {/* Banda por debajo del punto de riego: la zona en la que arranca la bomba */}
      {umbral !== null && (
        <>
          <rect
            x={MARGEN.izquierda}
            y={y(umbral)}
            width={areaAncho}
            height={Math.max(y(0) - y(umbral), 0)}
            fill="var(--alerta)"
            opacity={0.09}
          />
          <line
            x1={MARGEN.izquierda}
            x2={ancho - MARGEN.derecha}
            y1={y(umbral)}
            y2={y(umbral)}
            stroke="var(--alerta)"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}

      <path
        d={linea}
        fill="none"
        stroke="var(--agua)"
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {marcas.map((p, i) => (
        <text
          key={i}
          x={x(p.fecha)}
          y={altura - 6}
          textAnchor={i === 0 ? 'start' : i === marcas.length - 1 ? 'end' : 'middle'}
          className="op-eje"
        >
          {p.fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </text>
      ))}
    </svg>
  )
}
