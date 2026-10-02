'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, SunMoon } from 'lucide-react'

export type Tema = 'sistema' | 'claro' | 'oscuro'

export const CLAVE_TEMA = 'iondroplet.tema'

const OPCIONES: Array<{ id: Tema; etiqueta: string; Icono: typeof Sun }> = [
  { id: 'claro', etiqueta: 'Claro', Icono: Sun },
  { id: 'oscuro', etiqueta: 'Oscuro', Icono: Moon },
  { id: 'sistema', etiqueta: 'Automático', Icono: SunMoon },
]

export function aplicarTema(tema: Tema) {
  const raiz = document.documentElement
  if (tema === 'sistema') raiz.removeAttribute('data-tema')
  else raiz.setAttribute('data-tema', tema)
}

export function SelectorTema() {
  const [tema, setTema] = useState<Tema>('sistema')

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_TEMA) as Tema | null
      if (guardado === 'claro' || guardado === 'oscuro' || guardado === 'sistema') {
        setTema(guardado)
      }
    } catch {}
  }, [])

  function escoger(nuevo: Tema) {
    setTema(nuevo)
    aplicarTema(nuevo)
    try {
      localStorage.setItem(CLAVE_TEMA, nuevo)
    } catch {}
  }

  return (
    <section
      className="tarjeta flex flex-col gap-4"
      aria-label="Cómo se ve la pantalla"
    >
      <h2 className="titulo-bloque">¿Cómo se ve la pantalla?</h2>

      <div className="segmentado" role="group" aria-label="Tema">
        {OPCIONES.map(({ id, etiqueta, Icono }) => {
          const activo = tema === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => escoger(id)}
              aria-pressed={activo}
              className="flex items-center justify-center gap-1.5"
            >
              <Icono size={17} aria-hidden />
              {etiqueta}
            </button>
          )
        })}
      </div>

      <p className="text-sm" style={{ color: 'var(--tinta-suave)' }}>
        Bajo el sol se lee mejor el claro. El oscuro es para la noche o el galerón. Automático
        sigue lo que tenga puesto el teléfono.
      </p>
    </section>
  )
}
