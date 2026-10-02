'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

// Envoltorio de React para <parcela-diorama> (el web component de diorama.js).
//
// La escena se carga con import() dinámico dentro de un efecto: three.js no
// entra al paquete de ninguna otra pantalla y nunca corre en el servidor.
// Los atributos se ponen a mano sobre el nodo; así React no tiene que saber
// nada del elemento y no hay tipos de JSX que inventar.

export interface AtributosDiorama {
  cultivo: string
  etapa: string
  preview: string
  humedad: number | null
  umbral: number
  sistema: string
  regando: boolean
  ionizando: boolean
  clima: 'soleado' | 'nublado' | 'lluvia' | 'noche'
  /** El clima de ESTE momento (Open-Meteo). Sin dato, la escena queda despejada. */
  codigo: number | null
  /** Milímetros de lluvia de ahora. */
  lluvia: number | null
  /** Viento de ahora, en km/h: mueve las plantas y ladea la lluvia. */
  viento: number | null
  sensorActivo: boolean
  capturada: boolean
  superficie: boolean
  hileras: number | null
  modo: 'parcela' | 'mapa'
  vecinas: Array<{ cultivo: string; etapa: string | null; humedad: number | null; umbral: number }>
  /** Marca de la última lectura: cada vez que cambia, el sensor da un pulso. */
  lectura: string
}

export interface ControlDiorama {
  girar: (radianes: number) => void
  acercar: (factor: number) => void
  reiniciar: () => void
  /** -2 = todo el campo, -1 = esta parcela, 0/1 = vecinas. */
  enfocar: (i: number) => void
}

interface NodoDiorama extends HTMLElement {
  girar?: (d: number) => void
  acercar?: (f: number) => void
  reiniciar?: () => void
  enfocar?: (i: number) => void
}

function aTexto(a: AtributosDiorama): Record<string, string> {
  return {
    cultivo: a.cultivo,
    etapa: a.etapa,
    preview: a.preview,
    humedad: a.humedad === null ? '' : String(a.humedad),
    umbral: String(a.umbral),
    sistema: a.sistema,
    regando: a.regando ? 'si' : 'no',
    ionizando: a.ionizando ? 'si' : 'no',
    clima: a.clima,
    codigo: a.codigo === null ? '' : String(a.codigo),
    lluvia: a.lluvia === null ? '' : String(a.lluvia),
    viento: a.viento === null ? '' : String(a.viento),
    sensor: a.sensorActivo ? 'activo' : 'callado',
    capturada: a.capturada ? 'si' : 'no',
    superficie: a.superficie ? 'si' : 'no',
    hileras: a.hileras ? String(a.hileras) : '0',
    modo: a.modo,
    vecinas: JSON.stringify(a.vecinas),
    lectura: a.lectura,
  }
}

export const Diorama3D = forwardRef<ControlDiorama, { atributos: AtributosDiorama }>(
  function Diorama3D({ atributos }, ref) {
    const caja = useRef<HTMLDivElement>(null)
    const nodo = useRef<NodoDiorama | null>(null)
    const [fallo, setFallo] = useState(false)
    const ultimos = useRef(atributos)
    ultimos.current = atributos

    useImperativeHandle(ref, () => ({
      girar: d => nodo.current?.girar?.(d),
      acercar: f => nodo.current?.acercar?.(f),
      reiniciar: () => nodo.current?.reiniciar?.(),
      enfocar: i => nodo.current?.enfocar?.(i),
    }), [])

    // Montar la escena una sola vez.
    useEffect(() => {
      let vivo = true
      import('./diorama.js')
        .then(() => {
          if (!vivo || !caja.current) return
          const el = document.createElement('parcela-diorama') as NodoDiorama
          // Los atributos van ANTES de conectar: la escena arranca ya con los
          // datos reales y no hace una primera animación desde valores falsos.
          for (const [k, v] of Object.entries(aTexto(ultimos.current))) el.setAttribute(k, v)
          caja.current.appendChild(el)
          nodo.current = el
        })
        .catch(() => { if (vivo) setFallo(true) })
      return () => {
        vivo = false
        nodo.current?.remove()
        nodo.current = null
      }
    }, [])

    // Después, sólo se cambian los atributos que cambiaron.
    useEffect(() => {
      const el = nodo.current
      if (!el) return
      for (const [k, v] of Object.entries(aTexto(atributos))) {
        if (el.getAttribute(k) !== v) el.setAttribute(k, v)
      }
    })

    return (
      <div ref={caja} className="absolute inset-0" aria-hidden={!fallo}>
        {fallo && (
          <p
            className="absolute left-3 right-3 bottom-3 text-center text-[12.5px] font-semibold"
            style={{ background: 'var(--tarjeta)', borderRadius: 10, padding: '8px 10px' }}
          >
            No se pudo cargar la vista 3D en este equipo. Los datos de abajo siguen siendo los reales.
          </p>
        )}
      </div>
    )
  }
)
