'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, Camera, ChevronLeft, ChevronRight, House, MessageCircle, Sprout, X } from 'lucide-react'

// La guía de inicio.
//
// Sale sola la primera vez que alguien abre la app en un aparato, y se puede
// volver a ver desde Ajustes. Seis pasos cortos: qué es el sistema y dónde
// está cada cosa. No sale en el panel de operación (es para el jurado) ni en
// la pantalla de entrar.
//
// Lo que ya se vio vive en el navegador: no hay tabla para esto.

const CLAVE = 'iondroplet.guia-vista'
/** Otra pantalla (Ajustes) la abre mandando este evento. */
export const EVENTO_ABRIR_GUIA = 'iondroplet:abrir-guia'

const PASOS = [
  {
    Icono: Sprout,
    titulo: 'Bienvenido a IonDroplet',
    texto:
      'El sistema mide la humedad del suelo de tu parcela, controla el riego con agua ionizada y te ayuda a decidir con datos. Esta guía toma un minuto.',
  },
  {
    Icono: House,
    titulo: 'Inicio: el estado de tu parcela',
    texto:
      'Aquí ves la humedad actual, si el sistema está regando y por qué. En modo automático riega cuando la humedad baja del punto de riego; con «Regar ahora» inicias un riego cuando lo necesites.',
  },
  {
    Icono: Sprout,
    titulo: 'Parcela: tu cultivo',
    texto:
      'Registra cultivo, etapa, superficie y caudal de la bomba: con esos datos se calculan el agua y las recomendaciones. Ahí también ajustas el punto de riego y consultas las plagas de temporada.',
  },
  {
    Icono: Camera,
    titulo: 'Diagnóstico por foto',
    texto:
      'Si notas algo extraño en una planta, toma hasta tres fotos. Recibes las causas más probables, cómo confirmarlas en campo y qué hacer. Lo encuentras en Parcela y en Plagas.',
  },
  {
    Icono: MessageCircle,
    titulo: 'El asistente',
    texto:
      'El botón verde abre al asistente. Pregúntale sobre riego, clima, plagas o nutrición; también puede proponerte regar o detener el riego, y tú lo confirmas con un toque. La primera vez, vincula el aparato con el código que aparece en la computadora del riego.',
  },
  {
    Icono: Bell,
    titulo: 'Avisos, Análisis e Historial',
    texto:
      'La campana te avisa de heladas, lluvia o fallas del sensor. En Análisis está la evaluación completa de la semana y en Historial, la humedad y los riegos registrados.',
  },
]

function yaSeVio(): boolean {
  try {
    return localStorage.getItem(CLAVE) === '1'
  } catch {
    // Sin almacenamiento (modo privado) no se insiste en cada pantalla.
    return true
  }
}

function marcarVista() {
  try {
    localStorage.setItem(CLAVE, '1')
  } catch {}
}

export function GuiaInicio() {
  const ruta = usePathname()
  const [abierta, setAbierta] = useState(false)
  const [paso, setPaso] = useState(0)
  const principal = useRef<HTMLButtonElement | null>(null)

  const excluida = ruta?.startsWith('/operacion') || ruta?.startsWith('/entrar')

  // La primera vez, sola. Después, solo si Ajustes la pide.
  useEffect(() => {
    if (!excluida && !yaSeVio()) setAbierta(true)
  }, [excluida])

  useEffect(() => {
    const abrir = () => {
      setPaso(0)
      setAbierta(true)
    }
    window.addEventListener(EVENTO_ABRIR_GUIA, abrir)
    return () => window.removeEventListener(EVENTO_ABRIR_GUIA, abrir)
  }, [])

  const cerrar = useCallback(() => {
    marcarVista()
    setAbierta(false)
  }, [])

  // Teclado: Escape cierra, flechas avanzan y regresan.
  useEffect(() => {
    if (!abierta) return
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar()
      if (e.key === 'ArrowRight') setPaso(p => Math.min(PASOS.length - 1, p + 1))
      if (e.key === 'ArrowLeft') setPaso(p => Math.max(0, p - 1))
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [abierta, cerrar])

  useEffect(() => {
    if (abierta) principal.current?.focus()
  }, [abierta, paso])

  if (!abierta || excluida) return null

  const { Icono, titulo, texto } = PASOS[paso]
  const ultimo = paso === PASOS.length - 1

  return (
    <>
      <div className="fixed inset-0 z-[70]" style={{ background: 'rgba(0,0,0,.5)' }} aria-hidden onClick={cerrar} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="guia-titulo"
        className="fixed z-[71] panel-vidrio flex flex-col gap-5"
        style={{
          left: 16,
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          maxWidth: 440,
          margin: '0 auto',
          padding: 24,
          borderRadius: 'var(--radio)',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="etiqueta">
            Guía de inicio · {paso + 1} de {PASOS.length}
          </span>
          <button type="button" onClick={cerrar} className="boton boton-sutil" style={{ minHeight: 32, padding: '0 8px' }}>
            <X size={16} aria-hidden />
            Saltar
          </button>
        </div>

        <div className="flex flex-col items-center text-center gap-3">
          <span
            className="flex items-center justify-center"
            style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--verde-suave)', color: 'var(--verde)' }}
            aria-hidden
          >
            <Icono size={30} />
          </span>
          <h2 id="guia-titulo" className="titulo-pantalla">{titulo}</h2>
          <p className="text-base texto-suave leading-relaxed" aria-live="polite">{texto}</p>
        </div>

        {/* Los puntos del avance; también sirven para saltar a un paso. */}
        <div className="flex justify-center gap-2" role="group" aria-label="Pasos de la guía">
          {PASOS.map((p, i) => (
            <button
              key={p.titulo}
              type="button"
              onClick={() => setPaso(i)}
              aria-label={`Paso ${i + 1}: ${p.titulo}`}
              aria-current={i === paso ? 'step' : undefined}
              style={{
                width: i === paso ? 22 : 8,
                height: 8,
                borderRadius: 4,
                background: i === paso ? 'var(--verde)' : 'var(--pista)',
                transition: 'width var(--normal) var(--curva)',
              }}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPaso(p => p - 1)}
            disabled={paso === 0}
            className="boton boton-secundario"
          >
            <ChevronLeft size={18} aria-hidden />
            Anterior
          </button>
          <button
            ref={principal}
            type="button"
            onClick={() => (ultimo ? cerrar() : setPaso(p => p + 1))}
            className="boton boton-primario"
          >
            {ultimo ? 'Comenzar' : 'Siguiente'}
            {!ultimo && <ChevronRight size={18} aria-hidden />}
          </button>
        </div>
      </section>
    </>
  )
}
