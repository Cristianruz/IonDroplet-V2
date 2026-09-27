'use client'

import { useState } from 'react'
import { BrainCircuit, Undo2, Play, Check, Minus } from 'lucide-react'
import { useAgente, type Decision } from '@/hooks/use-agente'
import { fechaCorta } from '@/lib/tiempo'

// Lo que el agente decidió, en la pantalla del agricultor.
//
// POR QUÉ SE ENSEÑA: un sistema que mueve el punto de riego sin que se note
// es un sistema en el que no se puede confiar. Aquí se ve qué cambió, con qué
// razón, y hay un botón para regresarlo.

const NOMBRE_HERRAMIENTA: Record<string, string> = {
  actualizar_umbral_riego: 'Movió el punto de riego',
  mantener_umbral: 'Lo dejó como estaba',
  pedir_dato_al_agricultor: 'Te pidió un dato',
  levantar_aviso: 'Levantó un aviso',
  no_evaluable: 'No quiso decidir',
}

function Fila({ d, onDeshacer }: { d: Decision; onDeshacer: (id: number) => Promise<boolean> }) {
  const [ocupado, setOcupado] = useState(false)
  const cambio = d.herramienta === 'actualizar_umbral_riego' && d.aplicada
  const revertida = !!d.revertida_en

  return (
    <article
      className="tarjeta flex flex-col gap-2"
      style={{
        borderLeft: `3px solid ${cambio && !revertida ? 'var(--verde)' : 'var(--borde)'}`,
        opacity: revertida ? 0.6 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <span className="titulo-bloque">{NOMBRE_HERRAMIENTA[d.herramienta] ?? d.herramienta}</span>
        <span className="text-xs texto-apagado">{fechaCorta(d.cuando)}</span>
      </div>

      {cambio && (
        <p className="text-sm">
          De <strong>{d.valor_antes}%</strong> a{' '}
          <strong style={{ color: 'var(--verde)' }}>{d.valor_despues}%</strong>
          {/* Si el modelo pidió más de lo permitido, se dice. Es la prueba
              visible de que el límite existe y funciona. */}
          {d.acotada && <span className="texto-suave"> · pidió más y el sistema lo recortó al límite</span>}
        </p>
      )}

      {d.justificacion && <p className="text-sm texto-suave">{d.justificacion}</p>}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs texto-apagado">
          {d.confianza != null && `Confianza ${d.confianza}%`}
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
            className="boton boton-secundario"
            style={{ minHeight: 34 }}
          >
            <Undo2 size={14} aria-hidden />
            Regresarlo como estaba
          </button>
        )}
      </div>
    </article>
  )
}

export function AgenteCard() {
  const { decisiones, habilitado, limites, cargando, corriendo, correr, deshacer, cambiarHabilitado } = useAgente()

  if (cargando) {
    return <div className="esqueleto" style={{ width: '100%', height: 110 }} aria-hidden />
  }

  return (
    <section className="flex flex-col gap-3" aria-label="El agente que ajusta el riego">
      <div className="tarjeta flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <span className="etiqueta flex items-center gap-1.5">
            <BrainCircuit size={13} aria-hidden />
            El sistema ajustando solo
          </span>
          <span className="flex items-center gap-1.5 text-sm texto-suave">
            <span
              className="punto"
              style={{ background: habilitado ? 'var(--verde)' : 'var(--apagado)' }}
              aria-hidden
            />
            {habilitado ? 'Encendido' : 'Apagado'}
          </span>
        </div>

        <p className="text-sm texto-suave">
          Revisa el clima, lo que pide tu cultivo y lo que midió el sensor, y ajusta el punto de
          riego si hace falta.{' '}
          {limites && (
            <>
              Nunca lo mueve más de <strong>{limites.DELTA_MAXIMO} puntos por vez</strong>, nunca
              sale de {limites.RANGO.min}–{limites.RANGO.max}%, y{' '}
              <strong>no decide si el sensor no está reportando</strong>.
            </>
          )}
        </p>

        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={correr} disabled={corriendo || !habilitado} className="boton boton-primario">
            <Play size={14} aria-hidden />
            {corriendo ? 'Revisando…' : 'Que revise ahora'}
          </button>
          <button
            type="button"
            onClick={() => cambiarHabilitado(!habilitado)}
            className="boton boton-secundario"
          >
            {habilitado ? <Minus size={14} aria-hidden /> : <Check size={14} aria-hidden />}
            {habilitado ? 'Apagarlo' : 'Encenderlo'}
          </button>
        </div>
      </div>

      {decisiones.length === 0 ? (
        <p className="text-sm texto-apagado">
          Todavía no ha decidido nada. Revisa cada seis horas y sólo actúa cuando el sensor está
          reportando.
        </p>
      ) : (
        decisiones.map(d => <Fila key={d.id} d={d} onDeshacer={deshacer} />)
      )}
    </section>
  )
}
