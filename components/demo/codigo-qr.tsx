'use client'

import { useMemo } from 'react'
import { encode } from 'uqr'

// El código QR de la dirección de la demostración. Se dibuja aquí mismo, sin
// pedirlo a ningún servicio: un solo trazo con un cuadrito por módulo. Va
// siempre en tinta oscura sobre blanco, también en modo noche, porque las
// cámaras leen mal un código invertido.

export function CodigoQR({ texto, tamano = 148 }: { texto: string; tamano?: number }) {
  const { trazo, lado } = useMemo(() => {
    const { data, size } = encode(texto, { ecc: 'M', border: 0 })
    let d = ''
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (data[y][x]) d += `M${x} ${y}h1v1h-1z`
      }
    }
    return { trazo: d, lado: size }
  }, [texto])

  // Cuatro módulos de margen blanco: lo que el estándar pide para leerlo.
  const margen = 4
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox={`${-margen} ${-margen} ${lado + margen * 2} ${lado + margen * 2}`}
      role="img"
      aria-label={`Código QR de ${texto}`}
      shapeRendering="crispEdges"
      className="codigo-qr"
      style={{ display: 'block', background: '#ffffff', borderRadius: 14 }}
    >
      <path d={trazo} fill="#13283d" />
    </svg>
  )
}
