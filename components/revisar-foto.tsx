'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { Camera, MessageCircle } from 'lucide-react'
import { useFoto, type RevisionDeFoto } from '@/hooks/use-foto'

const COLOR_URGENCIA: Record<RevisionDeFoto['urgencia'], string> = {
  alta: 'var(--peligro)',
  media: 'var(--alerta)',
  baja: 'var(--riesgo-medio)',
  ninguna: 'var(--verde)',
}

const TEXTO_URGENCIA: Record<RevisionDeFoto['urgencia'], string> = {
  alta: 'Atiéndelo pronto',
  media: 'Vale la pena revisarlo',
  baja: 'Nada urgente',
  ninguna: 'No se ve problema',
}

export function RevisarFoto() {
  const { revision, vistaPrevia, revisando, aviso, revisarFoto, limpiar } = useFoto()
  const entrada = useRef<HTMLInputElement | null>(null)

  return (
    <section
      className="rounded-2xl p-5 sm:p-6 shadow-sm border border-black/5 flex flex-col gap-5"
      style={{ background: 'var(--tarjeta)' }}
      aria-label="Revisar una foto de la planta"
    >
      <div className="flex items-center gap-3">
        <Camera size={24} style={{ color: 'var(--verde)' }} aria-hidden />
        <h2 className="text-xl font-semibold">¿Ves algo raro en la planta?</h2>
      </div>

      {/* La cámara del celular, sin librerías: es HTML de toda la vida. */}
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={e => {
          const archivo = e.target.files?.[0]
          if (archivo) revisarFoto(archivo)
          e.target.value = ''
        }}
      />

      {revision === null && !revisando && (
        <>
          <p className="text-xl" style={{ color: 'var(--tinta-suave)' }}>
            Tómale una foto de cerca a la hoja o al fruto, con luz de día. Te digo a qué se parece
            y cómo salir de dudas.
          </p>
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            className="rounded-2xl py-5 text-xl font-bold text-white shadow-md active:scale-95 transition-transform flex items-center justify-center gap-3"
            style={{ background: 'var(--verde)' }}
          >
            <Camera size={24} aria-hidden />
            TOMAR FOTO
          </button>
        </>
      )}

      {revisando && (
        <p className="text-xl font-bold py-4" style={{ color: 'var(--tinta-suave)' }} role="status">
          Viendo tu foto…
        </p>
      )}

      {vistaPrevia && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={vistaPrevia}
          alt="La foto que tomaste"
          className="rounded-2xl w-full"
          style={{ maxHeight: 260, objectFit: 'cover' }}
        />
      )}

      {revision && (
        <>
          <p className="text-xl">{revision.resumen}</p>

          {/* Sin planta en la foto no hay diagnóstico que dar. */}
          {revision.esPlanta && revision.posible !== '' && (
            <div>
              <p
                className="text-lg font-bold"
                style={{ color: COLOR_URGENCIA[revision.urgencia] }}
                role="status"
              >
                {TEXTO_URGENCIA[revision.urgencia]}
              </p>
              <p className="text-xl mt-1">{revision.posible}</p>
            </div>
          )}

          {revision.comoConfirmarlo && (
            <div>
              <p className="text-lg font-bold" style={{ color: 'var(--tinta-suave)' }}>
                Cómo salir de dudas
              </p>
              <p className="text-xl">{revision.comoConfirmarlo}</p>
            </div>
          )}

          {revision.esPlanta && revision.posible !== '' && (
            <Link
              href={`/asistente?pregunta=${encodeURIComponent(
                `En la foto de mi cultivo se ve esto: ${revision.posible}. ¿Qué hago?`
              )}`}
              className="rounded-2xl py-4 text-lg font-bold border-4 flex items-center justify-center gap-3"
              style={{ background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta-suave)' }}
            >
              <MessageCircle size={24} aria-hidden />
              Preguntar más sobre esto
            </Link>
          )}

          <button
            type="button"
            onClick={() => {
              limpiar()
              entrada.current?.click()
            }}
            className="rounded-2xl py-4 text-lg font-bold border-4"
            style={{ background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta-suave)' }}
          >
            Tomar otra foto
          </button>

          <p className="text-lg" style={{ color: 'var(--tinta-suave)' }}>
            Una foto no basta para estar seguro. Esto es una pista para que revises la planta, no
            un diagnóstico.
          </p>
        </>
      )}

      {aviso && (
        <p
          className="text-xl font-semibold rounded-2xl p-4"
          style={{ background: 'var(--fondo-alerta)', color: 'var(--alerta)' }}
          role="alert"
        >
          {aviso}
        </p>
      )}
    </section>
  )
}
