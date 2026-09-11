'use client'

import type { SerieParcela } from '@/hooks/use-comparar'

// Varias parcelas en la misma gráfica, para poder compararlas.
//
// SVG a mano, sin librería: la regla del proyecto es no agregar dependencias,
// y dibujar N líneas con rejilla no las necesita.
//
// Cada serie lleva SU PROPIO RANGO DE TIEMPO. Si una parcela tiene datos de
// hace tres meses y otra de ayer, ponerlas en el mismo eje sin decirlo haría
// creer que se midieron a la vez. El eje es común y el pie lo dice.

const COLORES = ['var(--agua)', 'var(--verde)', 'var(--alerta)', 'var(--oro)', 'var(--peligro)']

const MARGEN = { arriba: 8, derecha: 8, abajo: 22, izquierda: 30 }

interface Props {
  series: SerieParcela[]
  umbral?: number | null
  altura?: number
}

export function SerieComparada({ series, umbral = null, altura = 220 }: Props) {
  const conDatos = series.filter(s => s.puntos.length >= 2)

  if (conDatos.length === 0) {
    return (
      <p className="op-vacio">
        No hay series que comparar: ninguna unidad tiene al menos dos lecturas en la ventana.
      </p>
    )
  }

  const ancho = 1000
  const areaAncho = ancho - MARGEN.izquierda - MARGEN.derecha
  const areaAlto = altura - MARGEN.arriba - MARGEN.abajo

  // Eje de tiempo común: del primero al último de todas.
  let t0 = Infinity
  let t1 = -Infinity
  for (const s of conDatos) {
    t0 = Math.min(t0, s.puntos[0].fecha.getTime())
    t1 = Math.max(t1, s.puntos[s.puntos.length - 1].fecha.getTime())
  }
  const rango = Math.max(t1 - t0, 1)

  const x = (f: Date) => MARGEN.izquierda + ((f.getTime() - t0) / rango) * areaAncho
  const y = (h: number) => MARGEN.arriba + (1 - Math.min(Math.max(h, 0), 100) / 100) * areaAlto

  const fechaCorta = (ms: number) =>
    new Date(ms).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

  return (
    <>
      <svg
        viewBox={`0 0 ${ancho} ${altura}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: altura, display: 'block' }}
        role="img"
        aria-label={`Comparación de humedad entre ${conDatos.length} unidades de manejo`}
      >
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

        {umbral !== null && (
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
        )}

        {conDatos.map((s, i) => (
          <path
            key={s.parcela_id}
            d={s.puntos
              .map((p, j) => `${j === 0 ? 'M' : 'L'}${x(p.fecha).toFixed(1)},${y(p.humedad).toFixed(1)}`)
              .join(' ')}
            fill="none"
            stroke={COLORES[i % COLORES.length]}
            strokeWidth={1.6}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <text x={MARGEN.izquierda} y={altura - 6} textAnchor="start" className="op-eje">
          {fechaCorta(t0)}
        </text>
        <text x={ancho - MARGEN.derecha} y={altura - 6} textAnchor="end" className="op-eje">
          {fechaCorta(t1)}
        </text>
      </svg>

      <div className="flex flex-wrap gap-x-4 gap-y-1" style={{ fontSize: 12 }}>
        {conDatos.map((s, i) => (
          <span key={s.parcela_id} className="flex items-center gap-1.5 texto-suave">
            <span
              style={{
                width: 14,
                height: 2,
                background: COLORES[i % COLORES.length],
                display: 'inline-block',
              }}
              aria-hidden
            />
            {s.nombre ?? `Unidad ${s.parcela_id}`}
            {s.cultivo && ` · ${s.cultivo}`}
          </span>
        ))}
      </div>
    </>
  )
}
