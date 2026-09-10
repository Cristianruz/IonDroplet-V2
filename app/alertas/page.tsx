'use client'

import { useEffect, useState } from 'react'
import { Check, X, BellOff, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useAlertas, type Severidad, type Alerta } from '@/hooks/use-alertas'
import { AvisoSinConexion } from '@/components/aviso-sin-conexion'
import { Aparece } from '@/components/aparece'
import { fechaCorta } from '@/lib/tiempo'

// Los avisos del sistema.
//
// Cada uno enseña EL DATO que lo provocó, para que se pueda verificar en vez
// de creer. Y cuando alguien lo atiende queda registrado quién y cuándo: eso
// es lo que permite rendir cuentas después, no basta con que el sistema avise.

const COLOR: Record<Severidad, string> = {
  critica: 'var(--peligro)',
  atencion: 'var(--alerta)',
  informativa: 'var(--agua)',
}

const NOMBRE: Record<Severidad, string> = {
  critica: 'Urgente',
  atencion: 'Atención',
  informativa: 'Para saber',
}

function Tarjeta({
  a,
  onEstado,
}: {
  a: Alerta
  onEstado: (id: number, estado: 'atendida' | 'descartada') => void
}) {
  const cerrada = a.estado === 'atendida' || a.estado === 'descartada' || a.estado === 'resuelta'

  return (
    <article
      className="tarjeta flex flex-col gap-2"
      style={{
        borderLeft: `3px solid ${cerrada ? 'var(--borde)' : COLOR[a.severidad]}`,
        opacity: cerrada ? 0.62 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="titulo-bloque">{a.titulo}</span>
        <span
          className="text-xs font-bold uppercase tracking-wide"
          style={{ color: cerrada ? 'var(--apagado)' : COLOR[a.severidad], whiteSpace: 'nowrap' }}
        >
          {NOMBRE[a.severidad]}
        </span>
      </div>

      {a.detalle && <p className="text-sm texto-suave">{a.detalle}</p>}

      {/* El número que la provocó. Sin esto sería una opinión del sistema. */}
      {a.dato && <p className="text-xs texto-apagado">{a.dato}</p>}

      {a.accion && !cerrada && <p className="text-sm font-semibold">{a.accion}</p>}

      <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
        <span className="text-xs texto-apagado">{fechaCorta(a.creada)}</span>

        {cerrada ? (
          <span className="text-xs texto-apagado">
            {a.estado === 'resuelta'
              ? 'Ya no aplica'
              : a.estado === 'descartada'
                ? `Descartado${a.atendida_por ? ` por ${a.atendida_por}` : ''}`
                : `Atendido${a.atendida_por ? ` por ${a.atendida_por}` : ''}${a.atendida_en ? ` · ${fechaCorta(a.atendida_en)}` : ''}`}
          </span>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={() => onEstado(a.id, 'descartada')} className="boton boton-sutil">
              <X size={14} aria-hidden />
              No aplica
            </button>
            <button type="button" onClick={() => onEstado(a.id, 'atendida')} className="boton boton-secundario" style={{ minHeight: 36 }}>
              <Check size={14} aria-hidden />
              Ya lo atendí
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

export default function PantallaAlertas() {
  const { alertas, cargando, conectado, cambiarEstado, marcarVistas } = useAlertas()
  const [verCerradas, setVerCerradas] = useState(false)

  // Al abrir, lo nuevo pasa a visto y la campanita se apaga.
  useEffect(() => {
    marcarVistas()
  }, [marcarVistas])

  const abiertas = alertas.filter(a => a.estado === 'nueva' || a.estado === 'leida')
  const cerradas = alertas.filter(a => !(a.estado === 'nueva' || a.estado === 'leida'))

  return (
    <main className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <Link href="/" className="boton boton-sutil self-start" style={{ padding: 0 }}>
          <ArrowLeft size={15} aria-hidden />
          Inicio
        </Link>
        <h1 className="titulo-pantalla">Avisos</h1>
      </header>

      {!conectado && !cargando && <AvisoSinConexion />}

      {cargando ? (
        <div className="esqueleto" style={{ width: '100%', height: 110 }} aria-hidden />
      ) : abiertas.length === 0 ? (
        <section className="tarjeta flex flex-col gap-2 items-center text-center py-8">
          <BellOff size={22} style={{ color: 'var(--apagado)' }} aria-hidden />
          <p className="titulo-bloque">No hay nada pendiente</p>
          <p className="text-sm texto-suave">
            El sistema revisa el sensor, el clima y el riego cada diez minutos. Si algo se sale de
            lo normal, aparece aquí.
          </p>
        </section>
      ) : (
        <section className="flex flex-col gap-2" aria-label="Avisos pendientes">
          {abiertas.map((a, i) => (
            <Aparece key={a.id} retraso={Math.min(i * 40, 200)}>
              <Tarjeta a={a} onEstado={cambiarEstado} />
            </Aparece>
          ))}
        </section>
      )}

      {cerradas.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setVerCerradas(v => !v)}
            className="boton boton-sutil self-start"
          >
            {verCerradas ? 'Ocultar' : `Ver ${cerradas.length} ${cerradas.length === 1 ? 'aviso ya cerrado' : 'avisos ya cerrados'}`}
          </button>

          {verCerradas && (
            <section className="flex flex-col gap-2" aria-label="Avisos cerrados">
              {cerradas.map(a => (
                <Tarjeta key={a.id} a={a} onEstado={cambiarEstado} />
              ))}
            </section>
          )}
        </>
      )}

      <p className="text-xs texto-apagado">
        Los avisos los deciden reglas del sistema, no el asistente: así uno de helada funciona
        aunque el asistente esté caído. Cada aviso enseña el número que lo provocó.
      </p>
    </main>
  )
}
