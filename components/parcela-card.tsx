'use client'

import Link from 'next/link'
import { Pencil, ChevronRight, Bug } from 'lucide-react'
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
      className="rounded-lg p-4 sm:p-5 border flex flex-col gap-4"
      style={{ background: 'var(--tarjeta)' }}
      aria-label="Datos de la parcela"
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <h2 className="titulo-pantalla">
            {vacio(parcela.nombre) ? 'Parcela sin nombre' : parcela.nombre}
          </h2>
          <p className="text-base" style={{ color: 'var(--tinta-suave)' }}>
            {partes.length > 0 ? partes.join(' · ') : 'Falta decir qué tienes sembrado'}
          </p>
        </div>
      </div>

      {/* La etapa nunca va sola: siempre con lo que significa para el riego. */}
      <p className="text-base" style={{ color: etapa ? 'var(--tinta)' : 'var(--apagado)' }}>
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
        <p className="text-sm" style={{ color: 'var(--tinta-suave)' }}>
          El aparato que la mide es {parcela.device_id}
        </p>
      )}

      {/* Las plagas dependen del cultivo, por eso se llega desde aquí y no
          desde la barra de abajo. */}
      <Link
        href="/plagas"
        className="rounded-lg py-3 px-4 text-base font-bold border flex items-center justify-between"
        style={{ background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta)' }}
      >
        <span className="flex items-center gap-3">
          <Bug size={16} aria-hidden />
          Plagas del cultivo
        </span>
        <ChevronRight size={18} style={{ color: 'var(--tinta-suave)' }} aria-hidden />
      </Link>

      <button
        type="button"
        onClick={onEditar}
        className="rounded-lg py-2.5 text-sm font-bold border flex items-center justify-center gap-3"
        style={{ background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta-suave)' }}
      >
        <Pencil size={18} aria-hidden />
        Editar parcela
      </button>
    </section>
  )
}
