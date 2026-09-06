'use client'

import { Hand, Sparkles } from 'lucide-react'
import { useIonDroplet } from '@/hooks/use-iondroplet'
import { useParcela } from '@/hooks/use-parcela'
import { UmbralCard } from '@/components/umbral-card'
import { API_URL } from '@/lib/api'

export default function PantallaAjustes() {
  const { conectado, estadoEsp, humedad, cambiarModo } = useIonDroplet()
  const { umbralRiego, guardando, guardarUmbral } = useParcela()

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      <h1 className="text-3xl font-bold leading-tight">Ajustes</h1>

      {/* Conexión — solo lectura en esta versión */}
      <section
        className="rounded-3xl p-8 shadow-sm border border-black/5 flex flex-col gap-4"
        style={{ background: 'var(--tarjeta)' }}
        aria-label="Conexión con la computadora del riego"
      >
        <h2 className="text-2xl font-semibold">Conexión</h2>

        <div className="flex items-center gap-3" role="status">
          <span
            className="rounded-full"
            style={{
              width: 20,
              height: 20,
              background: conectado ? 'var(--verde)' : 'var(--peligro)',
              flexShrink: 0,
            }}
            aria-hidden
          />
          <p className="text-xl font-semibold" style={{ color: conectado ? 'var(--verde)' : 'var(--peligro)' }}>
            {conectado ? 'Conectado a la computadora del riego' : 'Sin conexión con la computadora del riego'}
          </p>
        </div>

        <p
          className="text-xl rounded-2xl px-5 py-4 break-all"
          style={{ background: '#e5e7e2', color: 'var(--tinta)' }}
        >
          {API_URL}
        </p>
        <p className="text-lg" style={{ color: 'var(--tinta-suave)' }}>
          Esta dirección se cambia en el archivo <code>.env.local</code> de la aplicación. Aquí solo
          se muestra.
        </p>
      </section>

      {/* Modo de riego — mismo control que la pantalla de inicio */}
      <section
        className="rounded-3xl p-8 shadow-sm border border-black/5 flex flex-col gap-4"
        style={{ background: 'var(--tarjeta)' }}
        aria-label="Quién decide cuándo regar"
      >
        <h2 className="text-2xl font-semibold">¿Quién decide cuándo regar?</h2>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cambiarModo(true)}
            className="rounded-2xl py-5 px-4 text-xl font-bold border-4 transition-colors flex items-center justify-center gap-2"
            style={
              estadoEsp.autoMode
                ? { background: 'var(--verde)', borderColor: 'var(--verde-fuerte)', color: 'white' }
                : { background: 'white', borderColor: '#d6ddd6', color: 'var(--tinta-suave)' }
            }
            aria-pressed={estadoEsp.autoMode}
          >
            <Sparkles size={26} aria-hidden /> Solo (automático)
          </button>
          <button
            type="button"
            onClick={() => cambiarModo(false)}
            className="rounded-2xl py-5 px-4 text-xl font-bold border-4 transition-colors flex items-center justify-center gap-2"
            style={
              !estadoEsp.autoMode
                ? { background: 'var(--verde)', borderColor: 'var(--verde-fuerte)', color: 'white' }
                : { background: 'white', borderColor: '#d6ddd6', color: 'var(--tinta-suave)' }
            }
            aria-pressed={!estadoEsp.autoMode}
          >
            <Hand size={26} aria-hidden /> Yo decido
          </button>
        </div>

        <p className="text-lg" style={{ color: 'var(--tinta-suave)' }}>
          {estadoEsp.autoMode
            ? 'El sistema riega solo cuando la tierra lo necesita.'
            : 'El sistema no riega solo: tú mandas desde la pantalla de inicio.'}
        </p>
      </section>

      <UmbralCard
        umbral={umbralRiego}
        humedad={humedad}
        guardando={guardando}
        onGuardar={guardarUmbral}
      />
    </main>
  )
}
