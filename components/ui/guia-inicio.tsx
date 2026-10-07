'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bot, Brain, Camera, ChevronLeft, Droplet, Droplets, Eye, House, MessageCircle,
  Settings, Sprout, TrendingUp, X, type LucideIcon,
} from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { EVENTO_ABRIR_PRUEBAS, MODO_DEMO } from '@/lib/modo'
import { colorEstado } from '@/lib/estilo'

// La bienvenida y la guía rápida.
//
// Sale sola la primera vez que alguien abre la app en un aparato y se vuelve
// a ver con el botón "?" de Inicio o desde Ajustes. Primero dice QUÉ ES
// IonDroplet en tres renglones; después, quien quiera, ve cuatro pasos con un
// dibujo de la pantalla de verdad. No sale en el panel de operación ni en la
// pantalla de entrar.
//
// Lo que ya se vio vive en el navegador: no hay tabla para esto.

const CLAVE = 'iondroplet.bienvenida-v2'
/** Otra pantalla (Inicio, Ajustes) la abre mandando este evento. */
export const EVENTO_ABRIR_GUIA = 'iondroplet:abrir-guia'

// En la página pública se abre en cada visita, en cualquier celular: cada
// quien que escanea el código la ve. Se guarda por pestaña (sessionStorage),
// así no reaparece al cambiar de pantalla ni cuando la cámara recarga la
// página. En la computadora del riego sale una sola vez (localStorage).
function almacen(): Storage {
  return MODO_DEMO ? sessionStorage : localStorage
}

function yaSeVio(): boolean {
  try {
    return almacen().getItem(CLAVE) === '1'
  } catch {
    // Sin almacenamiento (modo privado) no se insiste en cada pantalla.
    return true
  }
}

function marcarVista() {
  try {
    almacen().setItem(CLAVE, '1')
  } catch {}
}

// --- Los dibujos de cada paso: piezas de la app, en chiquito ---

function Maqueta({ children }: { children: ReactNode }) {
  return (
    <div
      className="w-full rounded-[20px] p-4 flex flex-col gap-3"
      style={{ background: 'var(--tarjeta)', border: '1px solid var(--borde)', boxShadow: 'var(--sombra-tarjeta)' }}
      aria-hidden
    >
      {children}
    </div>
  )
}

function DibujoMedidor() {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <Maqueta>
      <div className="flex items-center gap-4">
        <svg width="84" height="84" viewBox="0 0 84 84">
          <circle cx="42" cy="42" r={r} fill="none" stroke="var(--pista)" strokeWidth="9" />
          <circle cx="42" cy="42" r={r} fill="none" stroke="var(--ok)" strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${0.52 * c} ${c}`} transform="rotate(-90 42 42)" />
          <text x="42" y="48" textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--tinta)">52%</text>
        </svg>
        <div className="flex flex-col gap-1 text-left">
          <span className="font-bold text-[17px]">Tu tierra está bien</span>
          <span className="text-sm texto-suave">No necesita agua ahora.</span>
        </div>
      </div>
      <div className="flex gap-2 text-xs font-semibold">
        <span className="capsula capsula-nivel" style={colorEstado('var(--ok)')}>Bien</span>
        <span className="capsula capsula-nivel" style={colorEstado('var(--alerta)')}>Le falta agua</span>
        <span className="capsula capsula-nivel" style={colorEstado('var(--agua)')}>Regando</span>
      </div>
    </Maqueta>
  )
}

function DibujoRiego() {
  return (
    <Maqueta>
      <div className="flex flex-col gap-2 text-left">
        <span className="text-sm font-semibold texto-suave">Humedad de la tierra</span>
        <div className="relative h-3 rounded-full" style={{ background: 'var(--pista)' }}>
          <div className="h-full rounded-full" style={{ width: '58%', background: 'var(--ok)' }} />
          <span className="absolute" style={{ left: '40%', top: -5, width: 3, height: 22, borderRadius: 2, background: 'var(--tinta)' }} />
        </div>
        <span className="text-xs texto-apagado" style={{ paddingLeft: 'calc(40% - 40px)' }}>punto de riego</span>
      </div>
      <div className="flex items-center gap-2 rounded-[12px] px-3 py-2" style={{ background: 'var(--acento-suave)' }}>
        <Bot size={18} style={{ color: 'var(--acento)' }} />
        <span className="text-sm text-left">Si baja de la raya, riega solo.</span>
      </div>
      <span className="boton boton-secundario boton-ancho" style={{ pointerEvents: 'none' }}>
        <Droplet size={17} /> Regar ahora
      </span>
    </Maqueta>
  )
}

function DibujoAyuda() {
  return (
    <Maqueta>
      <div className="flex flex-col gap-2">
        <span className="self-end rounded-[14px] px-3 py-2 text-sm" style={{ background: 'var(--acento)', color: 'var(--sobre-estado)' }}>
          ¿Conviene regar hoy?
        </span>
        <span className="self-start rounded-[14px] px-3 py-2 text-sm text-left" style={{ background: 'var(--pista)', maxWidth: '85%' }}>
          Hoy no: tu tierra está en 52% y mañana viene lluvia.
        </span>
      </div>
      <div className="flex items-center gap-3 rounded-[14px] p-3" style={{ border: '1px solid var(--borde)' }}>
        <span className="icono-redondo"><Camera size={19} /></span>
        <span className="text-sm text-left"><strong>Revisar una planta</strong><br /><span className="texto-suave">Toma una foto y te digo qué puede ser.</span></span>
      </div>
    </Maqueta>
  )
}

function DibujoSecciones() {
  const secciones: Array<[LucideIcon, string, string]> = [
    [House, 'Inicio', 'Cómo está hoy'],
    [Sprout, 'Cultivo', 'Su ficha y el punto de riego'],
    [Brain, 'Análisis', 'Riesgos y qué hacer'],
    [TrendingUp, 'Historial', 'Humedad y riegos'],
    [Settings, 'Ajustes', 'Tema y la guía'],
  ]
  return (
    <Maqueta>
      {secciones.map(([Icono, nombre, detalle]) => (
        <div key={nombre} className="flex items-center gap-3 text-left">
          <span className="icono-redondo" style={{ width: 34, height: 34 }}><Icono size={17} /></span>
          <span className="text-[15px]"><strong>{nombre}</strong> <span className="texto-suave">· {detalle}</span></span>
        </div>
      ))}
    </Maqueta>
  )
}

const PASOS: Array<{ titulo: string; texto: string; Dibujo: () => ReactNode }> = [
  {
    titulo: 'Mira cómo está tu cultivo',
    texto: 'Al abrir la app ves la humedad de la tierra en un círculo y una frase que te dice si todo está bien o si le falta agua.',
    Dibujo: DibujoMedidor,
  },
  {
    titulo: 'El riego es automático',
    texto: 'Cuando la tierra baja del punto de riego, el sistema riega solo y se detiene al llegar a su punto. Si lo necesitas, también puedes regar tú.',
    Dibujo: DibujoRiego,
  },
  {
    titulo: '¿Dudas? Pregunta o toma una foto',
    texto: 'El asistente contesta sobre riego, clima y plagas. Si ves algo raro en una planta, tómale una foto y te dice qué puede ser.',
    Dibujo: DibujoAyuda,
  },
  {
    titulo: 'Todo a la mano',
    texto: 'Abajo de la pantalla están las secciones. Si te pierdes, toca el signo de pregunta en Inicio y vuelves a ver esta guía.',
    Dibujo: DibujoSecciones,
  },
]

const QUE_HACE: Array<[LucideIcon, string, string]> = [
  [Droplets, 'Mide la humedad de tu tierra', 'Un sensor en el campo, todo el día.'],
  [Bot, 'Riega cuando hace falta', 'Según el clima y la etapa de tu cultivo.'],
  [MessageCircle, 'Asistente con IA', 'Resuelve tus dudas y te avisa si viene helada o lluvia.'],
]

export function GuiaInicio() {
  const ruta = usePathname()
  const router = useRouter()
  const [abierta, setAbierta] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  // -1 es la bienvenida; 0 a 3, los pasos de la guía.
  const [paso, setPaso] = useState(-1)
  const principal = useRef<HTMLButtonElement | null>(null)

  const excluida = ruta?.startsWith('/operacion') || ruta?.startsWith('/entrar')

  // La primera vez, sola. Después, solo si alguien la pide. Dentro del
  // celular de la vista de presentación no sale sola: el panel de al lado ya
  // explica qué es IonDroplet y la bienvenida taparía lo que se demuestra.
  useEffect(() => {
    if (!excluida && !yaSeVio() && window.parent === window) setAbierta(true)
  }, [excluida])

  useEffect(() => {
    const abrir = () => {
      setPaso(-1)
      setAbierta(true)
    }
    window.addEventListener(EVENTO_ABRIR_GUIA, abrir)
    return () => window.removeEventListener(EVENTO_ABRIR_GUIA, abrir)
  }, [])

  // Al cerrar o terminar, siempre a Inicio: la guía puede haberse abierto
  // encima de otra pantalla. El velo se queda un instante mientras se
  // desvanece porque en el celular el mismo toque a veces "caía" después
  // sobre la barra de abajo, justo en Análisis.
  const cerrar = useCallback(() => {
    marcarVista()
    if (window.location.pathname !== '/') router.replace('/')
    setSaliendo(true)
    setTimeout(() => {
      setAbierta(false)
      setSaliendo(false)
    }, 350)
  }, [router])

  // Mientras está abierta, la pantalla de atrás no se mueve.
  useEffect(() => {
    if (!abierta) return
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = antes }
  }, [abierta])

  // Teclado: Escape cierra, flechas avanzan y regresan.
  useEffect(() => {
    if (!abierta) return
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar()
      if (e.key === 'ArrowRight') setPaso(p => Math.min(PASOS.length - 1, p + 1))
      if (e.key === 'ArrowLeft') setPaso(p => Math.max(-1, p - 1))
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [abierta, cerrar])

  useEffect(() => {
    if (abierta) principal.current?.focus()
  }, [abierta, paso])

  if (!abierta || excluida) return null

  const enGuia = paso >= 0
  const ultimo = paso === PASOS.length - 1

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="guia-titulo"
      className="fixed inset-0 z-[70] overflow-y-auto"
      style={{ background: 'var(--fondo)', opacity: saliendo ? 0 : 1, transition: 'opacity 300ms var(--curva)' }}
    >
      <div
        className="mx-auto flex flex-col min-h-full px-5"
        style={{ maxWidth: 460, paddingTop: 'max(16px, env(safe-area-inset-top))', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
      >
        {/* Barra de arriba: regresar y saltar */}
        <div className="flex items-center justify-between" style={{ minHeight: 48 }}>
          {enGuia ? (
            <button type="button" onClick={() => setPaso(p => p - 1)} className="boton boton-sutil" style={{ paddingLeft: 4 }}>
              <ChevronLeft size={20} aria-hidden />
              Atrás
            </button>
          ) : <span />}
          <button type="button" onClick={cerrar} className="boton boton-sutil">
            {enGuia ? 'Saltar' : <><X size={18} aria-hidden /> Cerrar</>}
          </button>
        </div>

        {!enGuia ? (
          // --- La bienvenida: qué es IonDroplet ---
          <div key="bienvenida" className="flex-1 flex flex-col gap-5 py-3" style={{ animation: 'subir-hoja var(--lento) var(--curva)' }}>
            <div className="flex flex-col items-center text-center gap-4">
              <Logo tamano={72} />
              <div className="flex flex-col gap-2">
                <h2 id="guia-titulo" className="font-extrabold" style={{ fontSize: 28, letterSpacing: '-.025em', lineHeight: 1.15 }}>
                  Bienvenido a IonDroplet
                </h2>
                <p className="font-bold" style={{ fontSize: 19, lineHeight: 1.3 }}>
                  Agua exacta, en el <span style={{ color: 'var(--acento)' }}>momento exacto.</span>
                </p>
              </div>
              <p className="text-[16px] texto-suave leading-relaxed">
                Somos un sistema de riego inteligente. Cuidamos el agua de tu cultivo para que no
                le falte ni le sobre.
              </p>
            </div>

            <ul className="flex flex-col gap-4">
              {QUE_HACE.map(([Icono, titulo, detalle]) => (
                <li key={titulo} className="flex items-center gap-4">
                  <span className="icono-redondo" style={{ width: 48, height: 48 }}>
                    <Icono size={23} aria-hidden />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[16px] font-bold">{titulo}</span>
                    <span className="text-sm texto-suave">{detalle}</span>
                  </span>
                </li>
              ))}
            </ul>

            {MODO_DEMO && (
              <p className="text-sm flex items-start gap-2.5 rounded-[14px] p-3.5" style={{ background: 'var(--acento-suave)', color: 'var(--tinta)' }}>
                <Eye size={18} aria-hidden style={{ color: 'var(--acento)', flexShrink: 0, marginTop: 1 }} />
                <span>
                  Aquí puedes ver el sistema funcionando con un cultivo de prueba en Chihuahua. El
                  clima y la IA están funcionando en tiempo real para que lo pruebes.
                </span>
              </p>
            )}

            <div className="mt-auto flex flex-col gap-2">
              {MODO_DEMO ? (
                // En la demostración lo primero es verlo trabajar: abre la
                // hoja de Pruébalo encima de Inicio. La guía queda de segunda.
                <>
                  <button
                    ref={principal}
                    type="button"
                    onClick={() => {
                      cerrar()
                      window.dispatchEvent(new Event(EVENTO_ABRIR_PRUEBAS))
                    }}
                    className="boton boton-primario boton-ancho"
                    style={{ minHeight: 54, fontSize: 17 }}
                  >
                    <Droplets size={19} aria-hidden />
                    Ver al sistema regar
                  </button>
                  <button type="button" onClick={() => setPaso(0)} className="boton boton-secundario boton-ancho">
                    Ver guía rápida · 1 minuto
                  </button>
                </>
              ) : (
                <button ref={principal} type="button" onClick={() => setPaso(0)} className="boton boton-primario boton-ancho" style={{ minHeight: 54, fontSize: 17 }}>
                  Ver guía rápida · 1 minuto
                </button>
              )}
              <button type="button" onClick={cerrar} className="boton boton-sutil boton-ancho">
                Ir directo a la app
              </button>
            </div>
          </div>
        ) : (
          // --- La guía rápida: un paso a la vez ---
          <div key={paso} className="flex-1 flex flex-col gap-6 py-4" style={{ animation: 'subir-hoja var(--lento) var(--curva)' }}>
            {(() => { const { Dibujo } = PASOS[paso]; return <Dibujo /> })()}
            <div className="flex flex-col gap-2">
              <h2 id="guia-titulo" className="font-extrabold" style={{ fontSize: 24, letterSpacing: '-.02em', lineHeight: 1.2 }}>
                {PASOS[paso].titulo}
              </h2>
              <p className="text-[16px] texto-suave leading-relaxed" aria-live="polite">{PASOS[paso].texto}</p>
            </div>

            <div className="mt-auto flex flex-col gap-5">
              <p className="text-sm texto-apagado text-center -mb-2">Paso {paso + 1} de {PASOS.length}</p>
              <div className="flex justify-center gap-2" role="group" aria-label="Pasos de la guía">
                {PASOS.map((p, i) => (
                  <button
                    key={p.titulo}
                    type="button"
                    onClick={() => setPaso(i)}
                    aria-label={`Paso ${i + 1}: ${p.titulo}`}
                    aria-current={i === paso ? 'step' : undefined}
                    style={{
                      width: i === paso ? 26 : 9,
                      height: 9,
                      borderRadius: 5,
                      background: i <= paso ? 'var(--acento)' : 'var(--pista)',
                      transition: 'background-color var(--normal)',
                    }}
                  />
                ))}
              </div>
              <button
                ref={principal}
                type="button"
                onClick={() => (ultimo ? cerrar() : setPaso(p => p + 1))}
                className="boton boton-primario boton-ancho"
                style={{ minHeight: 54, fontSize: 17 }}
              >
                {ultimo ? '¡Listo, empezar!' : 'Siguiente'}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
