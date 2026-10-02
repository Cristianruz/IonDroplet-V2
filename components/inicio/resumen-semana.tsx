'use client'

import { Cloud, CloudLightning, CloudRain, CloudSun, Droplets, Snowflake, Sun, Thermometer, Wind, type LucideIcon } from 'lucide-react'
import { useClima, type AvisoClima } from '@/hooks/use-clima'
import { useBalance } from '@/hooks/use-balance'
import { colorEstado } from '@/lib/estilo'
import { ClimaCard } from '@/components/parcela/clima-card'

// El clima y el agua de la semana, en una tarjeta que se lee de un vistazo:
// hoy, los próximos días y si la lluvia va a alcanzar. El pronóstico completo
// y las cuentas del agua quedan en "Ver más detalles".

const ICONO_AVISO: Record<AvisoClima['tipo'], LucideIcon> = {
  helada: Snowflake,
  lluvia: CloudRain,
  viento: Wind,
  calor: Thermometer,
}

/** El ícono del tiempo según el código WMO que manda el pronóstico. */
export function iconoDelTiempo(codigo: number | undefined): LucideIcon {
  if (codigo === undefined) return CloudSun
  if (codigo === 0) return Sun
  if (codigo <= 3) return CloudSun
  if (codigo <= 48) return Cloud
  if (codigo >= 95) return CloudLightning
  if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) return Snowflake
  return CloudRain
}

function nombreDelDia(fecha: string, i: number) {
  if (i === 0) return 'Hoy'
  if (i === 1) return 'Mañana'
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')
}

export function ResumenSemana({ parcelaId }: { parcelaId: number | null }) {
  const { clima, estado } = useClima(parcelaId)
  const { balance } = useBalance(7)

  if (estado === 'cargando') return null
  // Sin ubicación, la tarjeta completa sabe pedirla.
  if (estado === 'sin_ubicacion') return <ClimaCard parcelaId={parcelaId} />
  if (estado === 'error' || !clima) return null

  const { ahora, dias, avisos } = clima
  const IconoHoy = iconoDelTiempo(dias.weather_code?.[0])
  const pide = balance?.totales.etc_mm ?? null
  const llueve = balance?.totales.lluvia_mm ?? null
  const cubre = pide && llueve !== null ? Math.min(100, Math.round((llueve / pide) * 100)) : null

  return (
    <section className="tarjeta flex flex-col gap-4" aria-label="El clima y el agua de la semana">
      <div className="flex items-center gap-4">
        <span className="icono-redondo" style={{ width: 52, height: 52 }}>
          <IconoHoy size={28} aria-hidden />
        </span>
        <div>
          <p className="font-extrabold" style={{ fontSize: 30, lineHeight: 1, letterSpacing: '-.03em' }}>
            {Math.round(ahora.temperature_2m)}°
          </p>
          <p className="text-sm texto-suave">
            Aire al {Math.round(ahora.relative_humidity_2m)}% · viento {Math.round(ahora.wind_speed_10m)} km/h
          </p>
        </div>
      </div>

      {avisos.slice(0, 1).map((a, i) => {
        const Icono = ICONO_AVISO[a.tipo]
        return (
          <p key={i} className="franja-estado" style={colorEstado(a.nivel === 'peligro' ? 'var(--peligro)' : a.tipo === 'lluvia' ? 'var(--agua)' : 'var(--alerta)')}>
            <Icono size={17} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
            {a.texto}
          </p>
        )
      })}

      {/* Los próximos días: solo lo que cambia una decisión. */}
      <div className="grid grid-cols-4 gap-2">
        {dias.time.slice(1, 5).map((fecha, j) => {
          const i = j + 1
          const Icono = iconoDelTiempo(dias.weather_code?.[i])
          const lluvia = Math.round(dias.precipitation_probability_max[i] ?? 0)
          return (
            <div key={fecha} className="flex flex-col items-center gap-1 rounded-[14px] py-2.5" style={{ background: 'var(--cristal-suave)' }}>
              <span className="text-xs font-semibold texto-suave capitalize">{nombreDelDia(fecha, i)}</span>
              <Icono size={20} aria-hidden style={{ color: lluvia >= 30 ? 'var(--agua)' : 'var(--tinta-suave)' }} />
              <span className="text-[15px] font-bold">{Math.round(dias.temperature_2m_max[i])}°</span>
              <span className="text-xs font-semibold" style={{ color: lluvia >= 30 ? 'var(--agua)' : 'var(--apagado)' }}>
                {lluvia}% lluvia
              </span>
            </div>
          )
        })}
      </div>

      {/* El agua de la semana en una línea y una barra. */}
      {pide !== null && llueve !== null && (
        <div className="flex flex-col gap-2 pt-1" style={{ borderTop: '1px solid var(--borde)', paddingTop: 14 }}>
          <p className="text-[15px] flex items-start gap-2">
            <Droplets size={18} aria-hidden style={{ color: 'var(--agua)', flexShrink: 0, marginTop: 2 }} />
            <span>
              Esta semana tu cultivo pide <strong>{Math.round(pide)} mm</strong> de agua y se esperan{' '}
              <strong>{Math.round(llueve)} mm</strong> de lluvia.
              {cubre !== null && cubre < 100 && ' El resto lo pone el riego.'}
            </span>
          </p>
          {cubre !== null && (
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--pista)' }} aria-hidden>
              <div className="h-full rounded-full" style={{ width: `${cubre}%`, background: 'var(--agua)' }} />
            </div>
          )}
        </div>
      )}
    </section>
  )
}
