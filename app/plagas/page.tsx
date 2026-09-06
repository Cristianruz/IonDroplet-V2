'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useIonDroplet } from '@/hooks/use-iondroplet'
import { useParcela } from '@/hooks/use-parcela'
import { PlagaCard } from '@/components/plaga-card'
import { cultivoPorId } from '@/lib/cultivos'
import { plagasDeCultivo, ordenarPorRiesgo } from '@/lib/plagas'
import { RevisarFoto } from '@/components/revisar-foto'
import { Aparece } from '@/components/aparece'
import { ConsejoIA } from '@/components/consejo-ia'
import { EsqueletoLista } from '@/components/esqueletos'

// Lo que el agricultor ya revisó vive en su teléfono: no hay tabla para esto
// y no vale la pena inventarle una.
const CLAVE_REVISADAS = 'iondroplet.plagas.revisadas'

function leerRevisadas(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_REVISADAS) ?? '{}')
  } catch {
    return {}
  }
}

export default function PantallaPlagas() {
  const { humedad, sensorActivo } = useIonDroplet({ conHistorial: false })
  const { parcela, cargando } = useParcela()
  const [revisadas, setRevisadas] = useState<Record<string, string>>({})

  useEffect(() => setRevisadas(leerRevisadas()), [])

  const cultivo = cultivoPorId(parcela?.cultivo)
  const mes = new Date().getMonth() + 1

  // Un dato viejo no sirve para juzgar la condición de hoy: si el sensor lleva
  // rato callado se calcula sin humedad, y la pantalla lo dice.
  const humedadUtil = sensorActivo ? humedad : null

  const evaluadas = useMemo(
    () => ordenarPorRiesgo(plagasDeCultivo(parcela?.cultivo), humedadUtil, mes),
    [parcela?.cultivo, humedadUtil, mes]
  )

  function marcarRevisada(id: string) {
    const nuevas = { ...revisadas, [id]: new Date().toISOString() }
    setRevisadas(nuevas)
    try {
      localStorage.setItem(CLAVE_REVISADAS, JSON.stringify(nuevas))
    } catch {}
  }

  function revisadaEl(id: string): Date | null {
    const guardada = revisadas[id]
    if (!guardada) return null
    const fecha = new Date(guardada)
    // Una revisión de hace más de una semana ya no cuenta como "revisada".
    return Date.now() - fecha.getTime() < 7 * 24 * 60 * 60 * 1000 ? fecha : null
  }

  const principal = evaluadas[0]
  const resto = evaluadas.slice(1)

  return (
    <main className="max-w-5xl mx-auto px-4 py-5 flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <Link
          href="/parcela"
          className="flex items-center gap-2 text-xl font-semibold w-fit"
          style={{ color: 'var(--verde)' }}
        >
          <ArrowLeft size={26} aria-hidden />
          Mi parcela
        </Link>
        <h1 className="text-3xl font-bold leading-tight">
          {cultivo ? `Plagas del ${cultivo.nombre.toLowerCase()}` : 'Plagas'}
        </h1>
        <p className="text-xl" style={{ color: 'var(--tinta-suave)' }}>
          {humedadUtil !== null
            ? 'Según tu humedad y la temporada'
            : 'Según la temporada. Sin lectura del sensor no se puede decir más.'}
        </p>
      </header>

      <ConsejoIA pantalla="plagas" />

      {cargando ? (
        <EsqueletoLista filas={4} />
      ) : parcela === null || !parcela.cultivo ? (
        <section
          className="rounded-2xl p-5 sm:p-6 shadow-sm border border-black/5 flex flex-col gap-6 items-center text-center"
          style={{ background: 'var(--tarjeta)' }}
          aria-label="Todavía no hay parcela registrada"
        >
          <span className="text-6xl leading-none" aria-hidden>🌱</span>
          <p className="text-2xl font-bold">Registra tu parcela para ver sus plagas</p>
          <p className="text-xl" style={{ color: 'var(--tinta-suave)' }}>
            Cada cultivo tiene las suyas. En cuanto me digas qué siembras, te aviso a cuáles
            estar atento.
          </p>
          <Link
            href="/parcela"
            className="w-full rounded-2xl py-5 text-2xl font-bold text-white shadow-md text-center"
            style={{ background: 'var(--verde)' }}
          >
            Ir a mi parcela
          </Link>
        </section>
      ) : (
        <>
          <Aparece><RevisarFoto /></Aparece>

          {principal && (
            <Aparece><PlagaCard
              plaga={principal.plaga}
              riesgo={principal.riesgo}
              destacada
              revisadaEl={revisadaEl(principal.plaga.id)}
              onRevisar={() => marcarRevisada(principal.plaga.id)}
            /></Aparece>
          )}

          {resto.length > 0 && (
            <section
              className="rounded-2xl p-5 sm:p-6 shadow-sm border border-black/5"
              style={{ background: 'var(--tarjeta)' }}
              aria-label="Otras plagas a las que estar atento"
            >
              <h2 className="text-xl font-semibold mb-2">Otras a las que estar atento</h2>
              <div className="flex flex-col">
                {resto.map(({ plaga, riesgo }) => (
                  <PlagaCard
                    key={plaga.id}
                    plaga={plaga}
                    riesgo={riesgo}
                    revisadaEl={revisadaEl(plaga.id)}
                    onRevisar={() => marcarRevisada(plaga.id)}
                  />
                ))}
              </div>
            </section>
          )}

          <p className="text-lg text-center" style={{ color: 'var(--tinta-suave)' }}>
            Guía general — no sustituye a un técnico.
          </p>
        </>
      )}
    </main>
  )
}
