'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, FlaskConical, Sprout } from 'lucide-react'
import { useIonDroplet } from '@/hooks/use-iondroplet'
import { useParcela } from '@/hooks/use-parcela'
import { HumedadCard } from '@/components/humedad-card'
import { ParcelaCard } from '@/components/parcela-card'
import { ParcelaForm } from '@/components/parcela-form'
import { UmbralCard } from '@/components/umbral-card'
import { PropuestaUmbral } from '@/components/propuesta-umbral'
import { AvisoSinConexion } from '@/components/aviso-sin-conexion'
import { Aparece } from '@/components/aparece'
import { ConsejoIA } from '@/components/consejo-ia'
import { EsqueletoParcela, EsqueletoHumedad } from '@/components/esqueletos'

export default function PantallaParcela() {
  const { humedad, sensorActivo, ultimaLectura } = useIonDroplet({ conHistorial: false })
  const { parcela, umbralRiego, cargando, conectado, guardando, guardarParcela, guardarUmbral } = useParcela()
  const [editando, setEditando] = useState(false)

  return (
    <main className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-4">
      <h1 className="text-xl font-bold leading-tight">Mi parcela</h1>

      {!conectado && !cargando && <AvisoSinConexion />}

      <ConsejoIA pantalla="parcela" />

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
          className="tarjeta flex flex-col gap-4 items-center text-center"
          aria-label="Todavía no hay parcela registrada"
        >
          <Sprout size={28} style={{ color: 'var(--verde)' }} aria-hidden />
          <p className="text-lg font-bold">Todavía no me has dicho qué siembras</p>
          <p className="text-base" style={{ color: 'var(--tinta-suave)' }}>
            Con eso puedo avisarte mejor cuándo le toca agua a tu tierra.
          </p>
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="boton boton-primario boton-ancho"
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

          {/* Se entra desde aquí, como a Plagas: es cosa de la parcela, y la
              barra de abajo ya tiene cinco destinos. */}
          <Aparece><Link
            href="/fertirriego"
            className="fila-enlace"
          >
            <span className="flex items-center gap-3">
              <FlaskConical size={18} style={{ color: 'var(--verde)' }} aria-hidden />
              <span className="flex flex-col">
                Lo que le he puesto
                <span className="text-base font-normal" style={{ color: 'var(--tinta-suave)' }}>
                  Anota lo que le echas y en qué etapa
                </span>
              </span>
            </span>
            <ChevronRight size={18} style={{ color: 'var(--tinta-suave)' }} aria-hidden />
          </Link></Aparece>
        </>
      )}
    </main>
  )
}
