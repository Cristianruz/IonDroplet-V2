'use client'

import { useRef } from 'react'
import { Camera, ImagePlus, X } from 'lucide-react'
import { MAX_FOTOS } from '@/lib/diagnostico'
import type { FotoLista } from '@/hooks/use-diagnostico'

interface Props {
  fotos: FotoLista[]
  preparando: boolean
  onAgregar: (archivos: FileList) => void
  onQuitar: (id: string) => void
}

// Hasta tres fotos de la misma planta. La cámara y la galería son HTML de
// toda la vida: funcionan en http y sin permisos especiales.
export function SelectorFotos({ fotos, preparando, onAgregar, onQuitar }: Props) {
  const camara = useRef<HTMLInputElement | null>(null)
  const galeria = useRef<HTMLInputElement | null>(null)
  const quedan = MAX_FOTOS - fotos.length

  function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) onAgregar(e.target.files)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-3">
      <input ref={camara} type="file" accept="image/*" capture="environment" className="sr-only" onChange={alElegir} />
      <input ref={galeria} type="file" accept="image/*" multiple className="sr-only" onChange={alElegir} />

      {fotos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2" aria-label="Fotos para el análisis">
          {fotos.map((f, i) => (
            <li key={f.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.vistaPrevia}
                alt={`Foto ${i + 1}`}
                className="w-full aspect-square object-cover"
                style={{ borderRadius: 'var(--radio-sm)' }}
              />
              <button
                type="button"
                onClick={() => onQuitar(f.id)}
                className="absolute top-1 right-1 flex items-center justify-center rounded-full"
                style={{ width: 32, height: 32, background: 'rgba(0,0,0,.6)', color: '#fff' }}
                aria-label={`Quitar la foto ${i + 1}`}
              >
                <X size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {preparando && (
        <p className="text-sm texto-suave" role="status">Preparando la foto…</p>
      )}

      {quedan > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => camara.current?.click()}
            className={`boton ${fotos.length === 0 ? 'boton-primario' : 'boton-secundario'}`}
            disabled={preparando}
          >
            <Camera size={18} aria-hidden />
            {fotos.length === 0 ? 'Tomar foto' : 'Otra foto'}
          </button>
          <button
            type="button"
            onClick={() => galeria.current?.click()}
            className="boton boton-secundario"
            disabled={preparando}
          >
            <ImagePlus size={18} aria-hidden />
            Galería
          </button>
        </div>
      )}

      <p className="text-sm texto-suave">
        {fotos.length === 0
          ? `Puedes mandar hasta ${MAX_FOTOS} fotos de la misma planta: de cerca, el envés de la hoja y la planta completa. Con varias, el análisis sale mucho mejor.`
          : quedan > 0
            ? `Llevas ${fotos.length} de ${MAX_FOTOS}. Una de la planta completa ayuda a ver el patrón del daño.`
            : 'Listo: tres fotos es lo máximo.'}
      </p>
    </div>
  )
}
