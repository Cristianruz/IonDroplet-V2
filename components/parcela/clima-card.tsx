'use client'

import { useState } from 'react'
import { Sun, MapPin, Snowflake, CloudRain, Wind, Thermometer, type LucideIcon } from 'lucide-react'
import { useClima, type AvisoClima } from '@/hooks/use-clima'
import { colorEstado } from '@/lib/estilo'

const ICONO_AVISO: Record<AvisoClima['tipo'], LucideIcon> = {
  helada: Snowflake,
  lluvia: CloudRain,
  viento: Wind,
  calor: Thermometer,
}

// Abreviado a propósito: en una columna de 62px "Mañana" no cabe y se corta.
function nombreDelDia(fecha: string, i: number) {
  if (i === 0) return 'Hoy'
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')
}

export function ClimaCard({ parcelaId }: { parcelaId: number | null }) {
  const { clima, estado, guardandoUbicacion, usarUbicacionDelTelefono } = useClima(parcelaId)
  const [aviso, setAviso] = useState<string | null>(null)

  async function pedirUbicacion() {
    setAviso(await usarUbicacionDelTelefono())
  }

  if (estado === 'cargando') return null

  if (estado === 'error') {
    return (
      <section
        className="tarjeta"
        aria-label="Clima"
      >
        <p className="text-base" style={{ color: 'var(--tinta-suave)' }}>
          No pude consultar el clima. Sin internet esto no funciona, pero el riego sigue igual.
        </p>
      </section>
    )
  }

  // Sin ubicación no se inventa un clima: se pide el dato.
  if (estado === 'sin_ubicacion') {
    return (
      <section
        className="tarjeta flex flex-col gap-4"
        aria-label="Falta la ubicación del cultivo"
      >
        <div className="flex items-center gap-3">
          <MapPin size={18} style={{ color: 'var(--acento)' }} aria-hidden />
          <h2 className="text-base font-semibold">¿Dónde está tu cultivo?</h2>
        </div>
        <p className="text-base" style={{ color: 'var(--tinta-suave)' }}>
          Con eso te puedo avisar si viene agua o si va a helar. No lo adivino: un pueblo y otro
          a 100 km tienen hasta 6 grados de diferencia, y de eso depende el aviso de helada.
        </p>
        <button
          type="button"
          onClick={pedirUbicacion}
          disabled={guardandoUbicacion || parcelaId === null}
          className="boton boton-primario boton-ancho"
          >
          {guardandoUbicacion ? 'Buscando…' : 'Usar mi ubicación actual'}
        </button>
        <p className="text-sm" style={{ color: 'var(--tinta-suave)' }}>
          Úsalo estando en el lugar del cultivo. Cuando el aparato de campo tenga GPS, la
          ubicación se tomará de ahí automáticamente.
        </p>
        {aviso && (
          <p className="text-base font-semibold" style={{ color: 'var(--peligro)' }} role="alert">
            {aviso}
          </p>
        )}
      </section>
    )
  }

  if (!clima) return null
  const { ahora, dias, avisos } = clima

  return (
    <section
      className="tarjeta flex flex-col gap-3.5"
      aria-label="Clima y pronóstico"
    >
      <div className="flex items-center gap-2">
        <Sun size={17} style={{ color: 'var(--acento)' }} aria-hidden />
        <h2 className="text-[15px] font-bold">Clima en tu cultivo</h2>
      </div>

      <div className="flex items-baseline gap-3 flex-wrap">
        <p
          className="font-bold"
          style={{ fontSize: 44, letterSpacing: '-.04em', lineHeight: .9, fontVariantNumeric: 'tabular-nums' }}
        >
          {Math.round(ahora.temperature_2m)}
          <span style={{ fontSize: 22 }}>°</span>
        </p>
        <p className="text-[13.5px] texto-suave">
          aire al {Math.round(ahora.relative_humidity_2m)}% · viento {Math.round(ahora.wind_speed_10m)} km/h
        </p>
      </div>

      {/* Los avisos van primero: son lo que cambia una decisión. */}
      {avisos.length > 0 && (
        <div className="flex flex-col gap-3">
          {avisos.map((a, i) => (
            <p
              key={i}
              className="franja-estado"
              // Mismos colores que el resumen de Inicio: la lluvia es agua, no un "ojo".
              style={colorEstado(a.nivel === 'peligro' ? 'var(--peligro)' : a.tipo === 'lluvia' ? 'var(--agua)' : 'var(--alerta)')}
              role={a.nivel === 'peligro' ? 'alert' : 'status'}
            >
              {(() => { const Icono = ICONO_AVISO[a.tipo]; return <Icono size={15} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} /> })()}
              {a.texto}
            </p>
          ))}
        </div>
      )}

      {/* Pronóstico de la semana */}
      <div style={{ overflowX: 'auto' }}>
        <div className="flex gap-[7px]" style={{ minWidth: 300 }}>
          {dias.time.slice(0, 7).map((fecha, i) => (
            <div
              key={fecha}
              className="flex-1 cristal-suave text-center"
              style={{ minWidth: 44, borderRadius: 'var(--radio-sm)', padding: '10px 6px' }}
            >
              <p className="text-xs font-bold capitalize">{nombreDelDia(fecha, i)}</p>
              <p className="text-[15px] font-bold">
                {Math.round(dias.temperature_2m_max[i])}°
              </p>
              <p className="text-xs texto-apagado">
                {Math.round(dias.temperature_2m_min[i])}°
              </p>
              <p className="text-xs font-bold" style={{ color: 'var(--agua)' }}>
                {Math.round(dias.precipitation_probability_max[i] ?? 0)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs texto-apagado">
        Máxima, mínima y probabilidad de agua.{' '}
        {clima.ubicacion.fuente === 'aparato'
          ? 'La ubicación la reporta el aparato del campo.'
          : 'Ubicación tomada de tu teléfono.'}
      </p>
    </section>
  )
}
