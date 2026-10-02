'use client'

import { useState } from 'react'
import { ChevronDown, Undo2, Play, Check, Minus } from 'lucide-react'
import { useAgente, type Decision } from '@/hooks/use-agente'
import { fechaCorta } from '@/lib/tiempo'

// Lo que el agente decidió, en la pantalla del agricultor.
//
// POR QUÉ SE ENSEÑA: un sistema que mueve el punto de riego sin que se note
// es un sistema en el que no se puede confiar. Aquí se ve qué cambió, con qué
// razón, y hay un botón para regresarlo. Todo va en una sola tarjeta: las dos
// decisiones más recientes a la vista y las demás detrás de "Ver todas".

const NOMBRE_HERRAMIENTA: Record<string, string> = {
  actualizar_umbral_riego: 'Movió el punto de riego',
  mantener_umbral: 'Lo dejó como estaba',
  pedir_dato_al_agricultor: 'Te pidió un dato',
  levantar_aviso: 'Levantó un aviso',
  no_evaluable: 'No quiso decidir',
}

const A_LA_VISTA = 2

function Fila({ d, onDeshacer }: { d: Decision; onDeshacer: (id: number) => Promise<boolean> }) {
  const [ocupado, setOcupado] = useState(false)
  const cambio = d.herramienta === 'actualizar_umbral_riego' && d.aplicada
  const revertida = !!d.revertida_en

  return (
    <li className="flex flex-col gap-1.5 py-3.5" style={{ borderTop: '1px solid var(--borde)', opacity: revertida ? 0.6 : 1 }}>
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <span className="text-[15px] font-semibold">
          {NOMBRE_HERRAMIENTA[d.herramienta] ?? d.herramienta}
          {cambio && (
            <>
              {': '}
              {d.valor_antes}% → <span style={{ color: 'var(--acento)' }}>{d.valor_despues}%</span>
            </>
          )}
        </span>
        <span className="text-xs texto-apagado">{fechaCorta(d.cuando)}</span>
      </div>

      {/* Si el modelo pidió más de lo permitido, se dice. Es la prueba
          visible de que el límite existe y funciona. */}
      {cambio && d.acotada && <p className="text-sm texto-suave">Pidió moverlo más y el sistema lo recortó al límite.</p>}

      {d.justificacion && <p className="text-sm texto-suave">{d.justificacion}</p>}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs texto-apagado">
          {d.confianza != null && `Seguridad ${d.confianza}%`}
          {revertida && ` · Deshecho${d.revertida_por ? ` por ${d.revertida_por}` : ''}`}
        </span>

        {cambio && !revertida && (
          <button
            type="button"
            disabled={ocupado}
            onClick={async () => {
              setOcupado(true)
              await onDeshacer(d.id)
              setOcupado(false)
            }}
            className="boton boton-sutil"
            style={{ minHeight: 36, color: 'var(--acento-fuerte)' }}
          >
            <Undo2 size={15} aria-hidden />
            Regresarlo como estaba
          </button>
        )}
      </div>
    </li>
  )
}

export function AgenteCard() {
  const { decisiones, habilitado, limites, cargando, corriendo, correr, deshacer, cambiarHabilitado } = useAgente()
  const [todas, setTodas] = useState(false)

  if (cargando) {
    return <div className="esqueleto" style={{ width: '100%', height: 110 }} aria-hidden />
  }

  const visibles = todas ? decisiones : decisiones.slice(0, A_LA_VISTA)

  return (
    <section className="tarjeta flex flex-col gap-3" aria-label="La IA que ajusta el riego">
      <div className="flex items-start justify-between gap-3">
        <h2 className="titulo-bloque">La IA ajusta el punto de riego</h2>
        <span className="flex items-center gap-1.5 text-sm texto-suave whitespace-nowrap mt-0.5">
          <span className="punto" style={{ background: habilitado ? 'var(--ok)' : 'var(--apagado)' }} aria-hidden />
          {habilitado ? 'Encendida' : 'Apagada'}
        </span>
      </div>

      <p className="text-[15px] texto-suave">
        Revisa el clima, lo que pide tu cultivo y lo que midió el sensor, y mueve el punto de riego
        si hace falta.
        {limites && (
          <>
            {' '}Nunca más de {limites.DELTA_MAXIMO} puntos por vez, nunca fuera de {limites.RANGO.min} a {limites.RANGO.max}%, y no
            decide si el sensor no reporta.
          </>
        )}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={correr} disabled={corriendo || !habilitado} className="boton boton-primario">
          <Play size={15} aria-hidden />
          {corriendo ? 'Revisando…' : 'Revisar ahora'}
        </button>
        <button type="button" onClick={() => cambiarHabilitado(!habilitado)} className="boton boton-secundario">
          {habilitado ? <Minus size={15} aria-hidden /> : <Check size={15} aria-hidden />}
          {habilitado ? 'Apagarla' : 'Encenderla'}
        </button>
      </div>

      {decisiones.length === 0 ? (
        <p className="text-sm texto-apagado pt-1">
          Todavía no ha decidido nada. Revisa cada seis horas y solo actúa cuando el sensor está
          reportando.
        </p>
      ) : (
        <>
          <h3 className="text-sm font-semibold texto-suave pt-2">Lo último que decidió</h3>
          <ul className="flex flex-col -mt-1">
            {visibles.map(d => <Fila key={d.id} d={d} onDeshacer={deshacer} />)}
          </ul>
          {decisiones.length > A_LA_VISTA && (
            <button type="button" onClick={() => setTodas(t => !t)} aria-expanded={todas} className="boton boton-sutil self-center">
              {todas ? 'Ver menos' : `Ver todas (${decisiones.length})`}
              <ChevronDown size={17} aria-hidden style={{ transform: todas ? 'rotate(180deg)' : 'none' }} />
            </button>
          )}
        </>
      )}
    </section>
  )
}
