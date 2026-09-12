'use client'

import Link from 'next/link'
import { ChevronRight, Gauge, RadioTower } from 'lucide-react'
import { useIonDroplet } from '@/hooks/use-iondroplet'
import { useParcela } from '@/hooks/use-parcela'
import { UmbralCard } from '@/components/umbral-card'
import { SelectorTema } from '@/components/selector-tema'
import { API_URL } from '@/lib/api'

export default function PantallaAjustes() {
  const { conectado, humedad } = useIonDroplet({ conHistorial: false })
  const { umbralRiego, guardando, guardarUmbral } = useParcela()

  return (
    <main className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-4">
      <h1 className="text-xl font-bold leading-tight">Ajustes</h1>

      {/* Conexión — solo lectura en esta versión */}
      <section
        className="tarjeta flex flex-col gap-4"
        aria-label="Conexión con la computadora del riego"
      >
        <h2 className="text-base font-semibold">Conexión</h2>

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
          <p className="text-base font-semibold" style={{ color: conectado ? 'var(--verde)' : 'var(--peligro)' }}>
            {conectado ? 'Conectado a la computadora del riego' : 'Sin conexión con la computadora del riego'}
          </p>
        </div>

        <p
          className="text-base rounded-lg px-3.5 py-2.5 break-all"
          style={{ background: 'var(--pista)', color: 'var(--tinta)' }}
        >
          {API_URL}
        </p>
        <p className="text-sm" style={{ color: 'var(--tinta-suave)' }}>
          Esta dirección se cambia en el archivo <code>.env.local</code> de la aplicación. Aquí solo
          se muestra.
        </p>
      </section>

      {/* Los wireframes dicen que a Dispositivos se llega desde aquí, no
          desde la barra de abajo. */}
      <Link
        href="/dispositivos"
        className="rounded-lg px-4 py-3 text-base font-bold border flex items-center justify-between"
        style={{ background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta)' }}
      >
        <span className="flex items-center gap-3">
          <RadioTower size={18} style={{ color: 'var(--tinta-suave)' }} aria-hidden />
          Aparatos del campo
        </span>
        <ChevronRight size={18} style={{ color: 'var(--tinta-suave)' }} aria-hidden />
      </Link>

      {/* La vista técnica vive aparte a propósito: esta pantalla y las demás
          están calibradas para el campo, y el panel de operación es para
          quien tiene que auditar de dónde salió cada número. */}
      <Link
        href="/operacion"
        className="rounded-lg px-4 py-3 text-base font-bold border flex items-center justify-between"
        style={{ background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta)' }}
      >
        <span className="flex items-center gap-3">
          <Gauge size={18} style={{ color: 'var(--agua)' }} aria-hidden />
          <span className="flex flex-col">
            Panel de operación
            <span className="text-base font-normal" style={{ color: 'var(--tinta-suave)' }}>
              Vista técnica, para revisar el sistema a detalle
            </span>
          </span>
        </span>
        <ChevronRight size={18} style={{ color: 'var(--tinta-suave)' }} aria-hidden />
      </Link>

      <SelectorTema />

      <UmbralCard
        umbral={umbralRiego}
        humedad={humedad}
        guardando={guardando}
        onGuardar={guardarUmbral}
      />
    </main>
  )
}
