'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, X } from 'lucide-react'
import { ListaEnlaces } from '@/components/ui/lista-enlaces'
import { ejecutarEscenario, escenarios, type CualEscenario } from './escenarios'

// La hoja de "Pruébalo" en el celular: lo que el jurado puede provocar para
// ver al sistema trabajar. Sube desde abajo, donde llega el pulgar, y se
// cierra sola al elegir: el efecto se ve en la pantalla de atrás.

export function HojaPruebas({ alCerrar }: { alCerrar: () => void }) {
  const router = useRouter()
  const [sensorConectado, setSensorConectado] = useState(true)
  const [regando, setRegando] = useState(false)
  const [lloviendo, setLloviendo] = useState(false)
  const cerrar = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    let vivo = true
    import('@/lib/demo').then(({ resumenDemo }) => {
      if (!vivo) return
      const r = resumenDemo()
      setSensorConectado(r.sensor)
      setRegando(r.regando && r.automatico)
      setLloviendo(r.lloviendo)
    })
    return () => {
      vivo = false
    }
  }, [])

  // Escape cierra; la pantalla de atrás no se mueve mientras está abierta.
  useEffect(() => {
    cerrar.current?.focus()
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alCerrar()
    }
    window.addEventListener('keydown', alTeclear)
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = antes
    }
  }, [alCerrar])

  function elegir(cual: CualEscenario) {
    alCerrar()
    ejecutarEscenario(cual, ruta => router.push(ruta))
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] hoja-velo" onClick={alCerrar} aria-hidden />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="hoja-pruebas-titulo"
        className="fixed inset-x-0 bottom-0 z-[81] mx-auto flex flex-col gap-4 px-4 pt-3 hoja-pruebas"
        style={{ maxWidth: 520, paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
      >
        <span aria-hidden className="mx-auto" style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--borde)' }} />
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="hoja-pruebas-titulo" className="titulo-pantalla" style={{ fontSize: '1.3rem' }}>
              Mira al sistema trabajar
            </h2>
            <p className="text-[15px] texto-suave leading-snug">
              El cultivo es simulado: toca con confianza, nada riega de verdad.
            </p>
          </div>
          <button
            ref={cerrar}
            type="button"
            onClick={alCerrar}
            className="boton boton-sutil rounded-full"
            style={{ width: 44, height: 44, padding: 0, flexShrink: 0 }}
            aria-label="Cerrar"
          >
            <X size={20} aria-hidden />
          </button>
        </header>

        <ListaEnlaces
          etiqueta="Escenarios de prueba"
          renglones={escenarios(sensorConectado).map(({ id, titulo, detalle, Icono }) => ({
            titulo,
            detalle,
            Icono,
            onClick: () => elegir(id),
            enCurso: id === 'secar' && regando ? 'Regando' : id === 'llover' && lloviendo ? 'Lloviendo' : undefined,
          }))}
        />

        <button type="button" onClick={() => elegir('reiniciar')} className="boton boton-sutil self-center">
          <RotateCcw size={17} aria-hidden />
          Empezar de nuevo
        </button>
      </section>
    </>
  )
}
