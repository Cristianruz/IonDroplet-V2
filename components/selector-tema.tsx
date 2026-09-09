'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, SunMoon } from 'lucide-react'

export type Tema = 'sistema' | 'claro' | 'oscuro'

export const CLAVE_TEMA = 'iondroplet.tema'

const OPCIONES: Array<{ id: Tema; etiqueta: string; Icono: typeof Sun }> = [
  { id: 'claro', etiqueta: 'Claro', Icono: Sun },
  { id: 'oscuro', etiqueta: 'Oscuro', Icono: Moon },
  { id: 'sistema', etiqueta: 'Como el teléfono', Icono: SunMoon },
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
      className="rounded-lg p-4 sm:p-5 border flex flex-col gap-4"
      style={{ background: 'var(--tarjeta)', boxShadow: 'var(--sombra-tarjeta)' }}
      aria-label="Cómo se ve la pantalla"
    >
      <h2 className="text-base font-semibold">¿Cómo se ve la pantalla?</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="group">
        {OPCIONES.map(({ id, etiqueta, Icono }) => {
          const activo = tema === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => escoger(id)}
              aria-pressed={activo}
              className="rounded-lg py-3 px-4 text-base font-bold border flex items-center justify-center gap-3"
              style={
                activo
                  ? { background: 'var(--verde)', borderColor: 'var(--verde-fuerte)', color: 'white' }
                  : { background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta-suave)' }
              }
            >
              <Icono size={18} aria-hidden />
              {etiqueta}
            </button>
          )
        })}
      </div>

      <p className="text-sm" style={{ color: 'var(--tinta-suave)' }}>
        Bajo el sol se lee mejor el claro. El oscuro es para la noche o el galerón.
      </p>
    </section>
  )
}
