'use client'

import { useState } from 'react'
import { useIonDroplet } from '@/hooks/use-iondroplet'
import { useParcela } from '@/hooks/use-parcela'
import { HumedadCard } from '@/components/humedad-card'
import { ParcelaCard } from '@/components/parcela-card'
import { ParcelaForm } from '@/components/parcela-form'
import { UmbralCard } from '@/components/umbral-card'
import { PropuestaUmbral } from '@/components/propuesta-umbral'
import { AvisoSinConexion } from '@/components/aviso-sin-conexion'
import { Aparece } from '@/components/aparece'
import { EsqueletoParcela, EsqueletoHumedad } from '@/components/esqueletos'

export default function PantallaParcela() {
  const { humedad, sensorActivo, ultimaLectura } = useIonDroplet({ conHistorial: false })
  const { parcela, umbralRiego, cargando, conectado, guardando, guardarParcela, guardarUmbral } = useParcela()
  const [editando, setEditando] = useState(false)

  return (
    <main className="max-w-5xl mx-auto px-4 py-5 flex flex-col gap-4">
      <h1 className="text-3xl font-bold leading-tight">Mi parcela</h1>

      {!conectado && !cargando && <AvisoSinConexion />}

      {cargando ? (
        <>
          <EsqueletoParcela />
          <EsqueletoHumedad />
        </>
      ) : editando ? (
        <ParcelaForm
          parcela={parcela}
          umbralActual={umbralRiego ?? 40}
          guardando={guardando}
          onGuardar={async datos => {
            const listo = await guardarParcela(datos)
            if (listo) setEditando(false)
            return listo
          }}
          onCancelar={() => setEditando(false)}
        />
      ) : parcela === null ? (
        // Todavía no hay parcela: tarjeta vacía, no el formulario de golpe.
        <section
          className="rounded-2xl p-5 sm:p-6 shadow-sm border border-black/5 flex flex-col gap-6 items-center text-center"
          style={{ background: 'var(--tarjeta)' }}
          aria-label="Todavía no hay parcela registrada"
        >
          <span className="text-6xl leading-none" aria-hidden>🌱</span>
          <p className="text-2xl font-bold">Todavía no me has dicho qué siembras</p>
          <p className="text-xl" style={{ color: 'var(--tinta-suave)' }}>
            Con eso puedo avisarte mejor cuándo le toca agua a tu tierra.
          </p>
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="w-full rounded-2xl py-5 text-2xl font-bold text-white shadow-md active:scale-95 transition-transform"
            style={{ background: 'var(--verde)' }}
          >
            Registrar mi parcela
          </button>
        </section>
      ) : (
        <>
          <Aparece><ParcelaCard parcela={parcela} onEditar={() => setEditando(true)} /></Aparece>

          <div className="grid md:grid-cols-2 gap-4">
            <HumedadCard
              humedad={humedad}
              sensorActivo={sensorActivo}
              ultimaLectura={ultimaLectura}
              umbral={umbralRiego ?? 40}
            />
            <UmbralCard
              umbral={umbralRiego}
              humedad={humedad}
              guardando={guardando}
              onGuardar={guardarUmbral}
            />
          </div>

          <Aparece><PropuestaUmbral umbralActual={umbralRiego} onAplicado={() => window.location.reload()} /></Aparece>
        </>
      )}
    </main>
  )
}
