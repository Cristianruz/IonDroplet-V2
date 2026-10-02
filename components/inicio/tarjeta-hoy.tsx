'use client'

import { useState } from 'react'
import { Bot, Droplet, Square, TriangleAlert } from 'lucide-react'
import type { EstadoEsp } from '@/hooks/use-iondroplet'
import type { Parcela } from '@/hooks/use-parcela'
import { etapaPorId } from '@/lib/cultivos'
import { haceCuanto } from '@/lib/tiempo'
import { colorEstado } from '@/lib/estilo'
import { ConsejoIA } from '@/components/ia/consejo-ia'
import { MODO_DEMO } from '@/lib/modo'

// La tarjeta de Inicio. Contesta UNA pregunta: ¿cómo está mi cultivo y
// tengo que hacer algo? Antes eran cuatro tarjetas (lo que veo, humedad,
// riego, clima) que decían casi lo mismo con números distintos; ahora es una
// sola, con una frase grande, el medidor y, si hace falta, un botón.

interface Props {
  parcela: Parcela | null
  humedad: number | null
  sensorActivo: boolean
  ultimaLectura: Date | null
  umbral: number
  estadoEsp: EstadoEsp
  regarAhora: () => void
  terminarRiegoManual: () => void
  volverAAutomatico: boolean
  activarAutomatico: () => void
}

interface Estado {
  titulo: string
  detalle: string
  color: string
}

function estadoDelCultivo(p: Props): Estado {
  const { humedad, sensorActivo, umbral, estadoEsp } = p
  const regando = estadoEsp.pumpState === 1
  const aMano = !estadoEsp.autoMode
  if (humedad === null) {
    return { titulo: 'Esperando al sensor', detalle: 'En cuanto llegue la primera lectura la verás aquí.', color: 'var(--apagado)' }
  }
  if (regando) {
    return aMano
      ? { titulo: 'Regando ahora', detalle: 'Lo pediste tú. Detenlo cuando quieras.', color: 'var(--agua)' }
      : {
          titulo: 'Regando ahora',
          // El backend apaga la bomba en cuanto la lectura pasa el punto de
          // riego (sin margen), y la demostración hace lo mismo.
          detalle: `Se detiene solo en cuanto la tierra pase de ${umbral}%.`,
          color: 'var(--agua)',
        }
  }
  if (!sensorActivo) {
    return { titulo: 'El sensor no responde', detalle: 'Revisa que el aparato del campo esté conectado.', color: 'var(--alerta)' }
  }
  if (humedad < umbral) {
    return aMano
      ? { titulo: 'A tu tierra le falta agua', detalle: 'El riego automático está apagado: riega tú o deja que decida el sistema.', color: 'var(--alerta)' }
      : { titulo: 'A tu tierra le falta agua', detalle: 'El riego va a empezar solo en unos momentos.', color: 'var(--alerta)' }
  }
  if (humedad <= 75) {
    return aMano
      ? { titulo: 'Tu tierra está bien', detalle: 'El riego automático está apagado: no va a regar solo.', color: 'var(--ok)' }
      : { titulo: 'Tu tierra está bien', detalle: 'No necesita agua ahora.', color: 'var(--ok)' }
  }
  return { titulo: 'Tiene agua de sobra', detalle: 'No hace falta regar por ahora.', color: 'var(--agua)' }
}

/** El medidor redondo: cuánta humedad hay y dónde está el punto de riego. */
function Medidor({ humedad, umbral, color, atenuado }: { humedad: number | null; umbral: number; color: string; atenuado: boolean }) {
  const tam = 128
  const grosor = 12
  const r = (tam - grosor) / 2
  const c = 2 * Math.PI * r
  const valor = humedad === null ? 0 : Math.min(100, Math.max(0, humedad))
  // La raya del punto de riego, sobre el aro.
  const angulo = (Math.min(100, Math.max(0, umbral)) / 100) * 2 * Math.PI - Math.PI / 2
  const x1 = tam / 2 + (r - grosor / 2 - 3) * Math.cos(angulo)
  const y1 = tam / 2 + (r - grosor / 2 - 3) * Math.sin(angulo)
  const x2 = tam / 2 + (r + grosor / 2 + 3) * Math.cos(angulo)
  const y2 = tam / 2 + (r + grosor / 2 + 3) * Math.sin(angulo)

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: tam, height: tam, opacity: atenuado ? 0.5 : 1 }}
      role="img"
      aria-label={humedad === null ? 'Sin lectura de humedad' : `Humedad de la tierra ${Math.round(valor)}%, punto de riego ${umbral}%`}
    >
      <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} aria-hidden>
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke="var(--pista)" strokeWidth={grosor} />
        <circle
          cx={tam / 2}
          cy={tam / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={`${(valor / 100) * c} ${c}`}
          transform={`rotate(-90 ${tam / 2} ${tam / 2})`}
          style={{ transition: 'stroke-dasharray 600ms var(--curva), stroke var(--normal)' }}
        />
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--tinta)" strokeWidth={2.5} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold" style={{ fontSize: 34, letterSpacing: '-.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {humedad === null ? '-' : Math.round(valor)}
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--tinta-suave)' }}>%</span>
        </span>
        <span className="text-xs texto-apagado font-semibold mt-0.5">humedad</span>
      </div>
    </div>
  )
}

export function TarjetaHoy(props: Props) {
  const { parcela, humedad, sensorActivo, ultimaLectura, umbral, estadoEsp } = props
  const [confirmando, setConfirmando] = useState(false)
  const estado = estadoDelCultivo(props)
  const regando = estadoEsp.pumpState === 1
  const aMano = !estadoEsp.autoMode
  const etapa = parcela ? etapaPorId(parcela.etapa, parcela.cultivo)?.nombre : null
  const cuando = haceCuanto(ultimaLectura)

  return (
    <section className="tarjeta flex flex-col gap-5" aria-label="Tu cultivo hoy">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight truncate">
            {parcela?.nombre ?? 'Mi cultivo'}
          </h2>
          {etapa && <p className="text-sm texto-suave">{etapa}</p>}
        </div>
        {cuando && <span className="text-xs texto-apagado whitespace-nowrap mt-1">{cuando}</span>}
      </div>

      <div className="flex items-center gap-5">
        <Medidor humedad={humedad} umbral={umbral} color={estado.color} atenuado={!sensorActivo && humedad !== null} />
        <div className="flex flex-col gap-2 min-w-0">
          <p className="font-bold leading-snug" style={{ fontSize: 21, color: 'var(--tinta)' }} role="status">
            {estado.titulo}
          </p>
          <p className="text-[15px] texto-suave leading-snug">{estado.detalle}</p>
          <p className="text-xs texto-apagado flex items-center gap-1.5">
            <span aria-hidden style={{ width: 10, height: 2.5, background: 'var(--tinta)', borderRadius: 2, display: 'inline-block' }} />
            Riega sola abajo de {umbral}%
          </p>
        </div>
      </div>

      {/* El porqué, en palabras: lo que en el sistema real dice la IA. */}
      <ConsejoIA pantalla="inicio" enCaja clave={MODO_DEMO ? `${estado.titulo}|${sensorActivo}` : undefined} />

      {/* Lo único que el agricultor puede necesitar hacer aquí. */}
      {regando && aMano ? (
        <button
          type="button"
          onClick={props.terminarRiegoManual}
          className="boton boton-ancho"
          style={{ background: 'var(--peligro)', color: 'var(--sobre-estado)' }}
        >
          <Square size={16} aria-hidden />
          Detener riego
        </button>
      ) : regando ? (
        <span className="capsula regando self-start" style={colorEstado('var(--agua)')}>
          Regando · se detiene solo
        </span>
      ) : confirmando ? (
        <div className="flex flex-col gap-3">
          <p className="text-[15px] font-semibold">¿Regar ahora aunque el sistema no lo pida?</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmando(false)
                props.regarAhora()
              }}
              className="boton"
              style={{ background: 'var(--agua)', color: 'var(--sobre-estado)' }}
            >
              Sí, regar
            </button>
            <button type="button" onClick={() => setConfirmando(false)} className="boton boton-secundario">
              Mejor no
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {aMano && (
            <button type="button" onClick={props.activarAutomatico} className="boton boton-primario boton-ancho">
              <Bot size={17} aria-hidden />
              Que el sistema decida
            </button>
          )}
          <button type="button" onClick={() => setConfirmando(true)} className="boton boton-secundario boton-ancho">
            <Droplet size={17} aria-hidden />
            Regar ahora
          </button>
        </div>
      )}

      {!sensorActivo && humedad !== null && (
        <p className="text-sm font-semibold flex items-start gap-2" style={{ color: 'var(--alerta-texto)' }}>
          <TriangleAlert size={16} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
          Mientras el sensor no responda, el riego automático no puede decidir. Si hace falta, riega tú.
        </p>
      )}
    </section>
  )
}
