'use client'

import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { CULTIVOS, ETAPAS, cultivoPorId, etapaPorId } from '@/lib/cultivos'
import type { Parcela, DatosParcela } from '@/hooks/use-parcela'

interface Props {
  parcela: Parcela | null
  umbralActual: number
  guardando: boolean
  onGuardar: (datos: DatosParcela) => Promise<boolean>
  onCancelar?: () => void
}

const UMBRAL_MINIMO = 10
const UMBRAL_MAXIMO = 90


// Mensaje de error de un campo. Entra con la misma curva que todo lo demás.
function ErrorCampo({ texto }: { texto?: string }) {
  if (!texto) return null
  return (
    <p
      className="text-lg font-semibold mt-2 aparece visible"
      style={{ color: 'var(--peligro)' }}
      role="alert"
    >
      {texto}
    </p>
  )
}

export function ParcelaForm({ parcela, umbralActual, guardando, onGuardar, onCancelar }: Props) {
  const [nombre, setNombre] = useState(parcela?.nombre ?? '')
  const [cultivo, setCultivo] = useState(cultivoPorId(parcela?.cultivo)?.id ?? '')
  const [etapa, setEtapa] = useState(etapaPorId(parcela?.etapa)?.id ?? '')
  const [area, setArea] = useState(
    parcela?.area_ha !== null && parcela?.area_ha !== undefined ? String(parcela.area_ha) : ''
  )
  const [umbral, setUmbral] = useState(umbralActual)
  const [aviso, setAviso] = useState<string | null>(null)
  // Errores por campo, para señalar exactamente cuál falta en vez de un
  // solo aviso al final que obliga a buscar.
  const [errores, setErrores] = useState<{ nombre?: string; cultivo?: string; area?: string }>({})

  function revisarCampos() {
    const fallas: typeof errores = {}
    if (nombre.trim() === '') fallas.nombre = 'Ponle un nombre para reconocerla.'
    if (cultivo === '') fallas.cultivo = 'Escoge qué tienes sembrado.'
    if (area.trim() !== '') {
      const n = Number(area.replace(',', '.'))
      if (Number.isNaN(n) || n < 0) fallas.area = 'Tiene que ser un número de hectáreas.'
    }
    return fallas
  }

  async function guardar() {
    const fallas = revisarCampos()
    setErrores(fallas)
    if (Object.keys(fallas).length > 0) {
      setAviso(null)
      // Lleva la vista al primer campo que falta: en un celular puede estar
      // fuera de pantalla y el agricultor no vería por qué no guarda.
      const id = fallas.nombre ? 'nombre-parcela' : fallas.cultivo ? 'grupo-cultivo' : 'area-parcela'
      document.getElementById(id)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }

    const areaLimpia = area.trim() === '' ? null : Number(area.replace(',', '.'))
    if (umbral < UMBRAL_MINIMO || umbral > UMBRAL_MAXIMO) {
      setAviso(`El punto de riego tiene que quedar entre ${UMBRAL_MINIMO}% y ${UMBRAL_MAXIMO}%.`)
      return
    }
    setAviso(null)

    // Si falla, el formulario NO se limpia: los datos se quedan escritos.
    const listo = await onGuardar({
      nombre: nombre.trim(),
      cultivo,
      etapa: etapa === '' ? null : etapa,
      area_ha: areaLimpia,
      hum_min: umbral,
    })
    if (!listo) setAviso('No se pudo guardar. Revisa que el sistema esté conectado.')
  }

  return (
    <section
      className="rounded-2xl p-5 sm:p-6 shadow-sm border border-black/5 flex flex-col gap-8"
      style={{ background: 'var(--tarjeta)' }}
      aria-label={parcela ? 'Editar la parcela' : 'Registrar la parcela'}
    >
      <h2 className="text-xl font-semibold">{parcela ? 'Editar parcela' : 'Registrar parcela'}</h2>

      <div>
        <label htmlFor="nombre-parcela" className="block text-xl mb-3" style={{ color: 'var(--tinta-suave)' }}>
          ¿Cómo le llamas?
        </label>
        <input
          id="nombre-parcela"
          type="text"
          value={nombre}
          onChange={e => {
            setNombre(e.target.value)
            if (errores.nombre) setErrores(p => ({ ...p, nombre: undefined }))
          }}
          placeholder="Parcela Norte"
          aria-invalid={!!errores.nombre}
          className="w-full rounded-2xl px-4 py-4 text-xl border-4 outline-none"
          style={{
            borderColor: errores.nombre ? 'var(--peligro)' : 'var(--borde)',
            background: 'var(--tarjeta)',
            color: 'var(--tinta)',
          }}
        />
        <ErrorCampo texto={errores.nombre} />
      </div>

      {/* Botones grandes, no un desplegable: esto se usa con guantes. */}
      <div>
        <p className="text-xl mb-3" style={{ color: 'var(--tinta-suave)' }}>¿Qué tienes sembrado?</p>
        <div id="grupo-cultivo" className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CULTIVOS.map(({ id, nombre: etiqueta, icono }) => {
            const activo = cultivo === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setCultivo(id)
                  if (errores.cultivo) setErrores(p => ({ ...p, cultivo: undefined }))
                }}
                className="rounded-2xl py-5 px-3 text-xl font-bold border-4 transition-colors flex flex-col items-center gap-2"
                style={
                  activo
                    ? { background: 'var(--verde)', borderColor: 'var(--verde-fuerte)', color: 'white' }
                    : { background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta-suave)' }
                }
                aria-pressed={activo}
              >
                <span className="text-3xl leading-none" aria-hidden>{icono}</span>
                {etiqueta}
              </button>
            )
          })}
        </div>
        <ErrorCampo texto={errores.cultivo} />
      </div>

      <div>
        <p className="text-xl mb-3" style={{ color: 'var(--tinta-suave)' }}>¿En qué etapa va?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ETAPAS.map(({ id, nombre: etiqueta, explicacion }) => {
            const activo = etapa === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setEtapa(activo ? '' : id)}
                className="rounded-2xl py-4 px-4 border-4 transition-colors text-left"
                style={
                  activo
                    ? { background: 'var(--verde)', borderColor: 'var(--verde-fuerte)', color: 'white' }
                    : { background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta-suave)' }
                }
                aria-pressed={activo}
              >
                <span className="text-xl font-bold block">{etiqueta}</span>
                <span className="text-lg block leading-snug" style={{ opacity: 0.85 }}>{explicacion}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label htmlFor="area-parcela" className="block text-xl mb-3" style={{ color: 'var(--tinta-suave)' }}>
          ¿Cuántas hectáreas son?
        </label>
        <input
          id="area-parcela"
          type="number"
          inputMode="decimal"
          step="0.5"
          min="0"
          value={area}
          onChange={e => {
            setArea(e.target.value)
            if (errores.area) setErrores(p => ({ ...p, area: undefined }))
          }}
          placeholder="1.2"
          aria-invalid={!!errores.area}
          className="w-full rounded-2xl px-4 py-4 text-xl border-4 outline-none"
          style={{
            borderColor: errores.area ? 'var(--peligro)' : 'var(--borde)',
            background: 'var(--tarjeta)',
            color: 'var(--tinta)',
          }}
        />
        <ErrorCampo texto={errores.area} />
        <p className="text-lg mt-2" style={{ color: 'var(--tinta-suave)' }}>
          Si no lo sabes de memoria, déjalo vacío y lo pones después.
        </p>
      </div>

      <div>
        <p className="text-xl mb-3" style={{ color: 'var(--tinta-suave)' }}>Riega solo si baja de</p>
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setUmbral(v => Math.max(UMBRAL_MINIMO, v - 5))}
            disabled={umbral <= UMBRAL_MINIMO}
            className="rounded-2xl border-4 flex items-center justify-center disabled:opacity-40"
            style={{ width: 'clamp(52px, 16vw, 62px)', height: 'clamp(52px, 16vw, 62px)', flexShrink: 0, background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta)' }}
            aria-label="Bajar el punto de riego"
          >
            <Minus size={34} aria-hidden />
          </button>
          <p className="font-bold leading-none" style={{ fontSize: 'clamp(1.75rem, 10vw, 2.5rem)', color: 'var(--agua)' }} role="status">
            {umbral}
            <span className="text-3xl">%</span>
          </p>
          <button
            type="button"
            onClick={() => setUmbral(v => Math.min(UMBRAL_MAXIMO, v + 5))}
            disabled={umbral >= UMBRAL_MAXIMO}
            className="rounded-2xl border-4 flex items-center justify-center disabled:opacity-40"
            style={{ width: 'clamp(52px, 16vw, 62px)', height: 'clamp(52px, 16vw, 62px)', flexShrink: 0, background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta)' }}
            aria-label="Subir el punto de riego"
          >
            <Plus size={34} aria-hidden />
          </button>
        </div>
      </div>

      {aviso && (
        <p className="text-xl font-semibold rounded-2xl p-4 text-white" style={{ background: 'var(--peligro)' }} role="alert">
          {aviso}
        </p>
      )}

      <button
        type="button"
        onClick={guardar}
        disabled={guardando}
        className="rounded-2xl py-5 text-xl font-bold text-white shadow-md active:scale-95 transition-transform disabled:opacity-60"
        style={{ background: 'var(--verde)' }}
      >
        {guardando ? 'GUARDANDO…' : 'GUARDAR PARCELA'}
      </button>

      <p className="text-lg text-center" style={{ color: 'var(--tinta-suave)' }}>
        El sensor se asocia solo, por el aparato que ya está midiendo.
      </p>

      {onCancelar && (
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-2xl py-4 text-lg font-bold border-4"
          style={{ background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta-suave)' }}
        >
          Dejarlo como estaba
        </button>
      )}
    </section>
  )
}
