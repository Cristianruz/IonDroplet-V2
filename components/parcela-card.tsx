'use client'

import { Pencil } from 'lucide-react'
import { cultivoPorId, etapaPorId } from '@/lib/cultivos'
import type { Parcela } from '@/hooks/use-parcela'

interface Props {
  parcela: Parcela
  onEditar: () => void
}

function vacio(v: string | null | undefined) {
  return v === null || v === undefined || v.trim() === ''
}

export function ParcelaCard({ parcela, onEditar }: Props) {
  const cultivo = cultivoPorId(parcela.cultivo)
  const etapa = etapaPorId(parcela.etapa)

  // "Chile · 1.2 ha" — el tamaño solo aparece si alguien lo capturó.
  const partes: string[] = []
  if (cultivo) partes.push(cultivo.nombre)
  else if (!vacio(parcela.cultivo)) partes.push(parcela.cultivo!)
  if (parcela.area_ha !== null && parcela.area_ha !== undefined) partes.push(`${parcela.area_ha} ha`)

  return (
    <section
      className="rounded-3xl p-8 shadow-sm border border-black/5 flex flex-col gap-6"
      style={{ background: 'var(--tarjeta)' }}
      aria-label="Datos de la parcela"
    >
      <div className="flex items-center gap-4">
        <span className="text-5xl leading-none" aria-hidden>
          {cultivo?.icono ?? '🌱'}
        </span>
        <div>
          <h2 className="text-4xl font-bold leading-tight">
            {vacio(parcela.nombre) ? 'Parcela sin nombre' : parcela.nombre}
          </h2>
          <p className="text-xl" style={{ color: 'var(--tinta-suave)' }}>
            {partes.length > 0 ? partes.join(' · ') : 'Falta decir qué tienes sembrado'}
          </p>
        </div>
      </div>

      {/* La etapa nunca va sola: siempre con lo que significa para el riego. */}
      <p className="text-xl" style={{ color: etapa ? 'var(--tinta)' : '#8a978a' }}>
        {etapa ? (
          <>
            <span className="font-bold">Etapa: {etapa.nombre.toLowerCase()}</span>
            {' — '}
            {etapa.explicacion}
          </>
        ) : (
          'Falta decir en qué etapa va el cultivo'
        )}
      </p>

      {!vacio(parcela.device_id) && (
        <p className="text-lg" style={{ color: 'var(--tinta-suave)' }}>
          El aparato que la mide es {parcela.device_id}
        </p>
      )}

      <button
        type="button"
        onClick={onEditar}
        className="rounded-2xl py-5 text-xl font-bold border-4 flex items-center justify-center gap-3"
        style={{ background: 'white', borderColor: '#d6ddd6', color: 'var(--tinta-suave)' }}
      >
        <Pencil size={24} aria-hidden />
        Editar parcela
      </button>
    </section>
  )
}
