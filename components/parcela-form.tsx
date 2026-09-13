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
      className="text-sm font-semibold mt-2 aparece visible"
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
  const [caudal, setCaudal] = useState(
    parcela?.caudal_lpm !== null && parcela?.caudal_lpm !== undefined ? String(parcela.caudal_lpm) : ''
  )
  const [umbral, setUmbral] = useState(umbralActual)
  const [aviso, setAviso] = useState<string | null>(null)
  // Errores por campo, para señalar exactamente cuál falta en vez de un
  // solo aviso al final que obliga a buscar.
  const [errores, setErrores] = useState<{ nombre?: string; cultivo?: string; area?: string; caudal?: string }>({})

  function revisarCampos() {
    const fallas: typeof errores = {}
    if (nombre.trim() === '') fallas.nombre = 'Ponle un nombre para reconocerla.'
    if (cultivo === '') fallas.cultivo = 'Escoge qué tienes sembrado.'
    if (caudal.trim() !== '') {
      const c = Number(caudal.replace(',', '.'))
      if (Number.isNaN(c) || c <= 0) fallas.caudal = 'Tiene que ser un número de litros por minuto.'
    }
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
    const caudalLimpio = caudal.trim() === '' ? null : Number(caudal.replace(',', '.'))
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
      caudal_lpm: caudalLimpio,
      hum_min: umbral,
    })
    if (!listo) setAviso('No se pudo guardar. Revisa que el sistema esté conectado.')
  }

  return (
    <section
      className="tarjeta flex flex-col gap-8"
      aria-label={parcela ? 'Editar la parcela' : 'Registrar la parcela'}
    >
      <h2 className="text-base font-semibold">{parcela ? 'Editar parcela' : 'Registrar parcela'}</h2>

      <div>
        <label htmlFor="nombre-parcela" className="block text-base mb-3" style={{ color: 'var(--tinta-suave)' }}>
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
          className="campo"
          style={{
            borderColor: errores.nombre ? 'var(--peligro)' : 'var(--borde)',
            color: 'var(--tinta)',
          }}
        />
        <ErrorCampo texto={errores.nombre} />
      </div>

      {/* Botones grandes, no un desplegable: esto se usa con guantes. */}
      <div>
        <p className="text-base mb-3" style={{ color: 'var(--tinta-suave)' }}>¿Qué tienes sembrado?</p>
        <div id="grupo-cultivo" className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CULTIVOS.map(({ id, nombre: etiqueta }) => {
            const activo = cultivo === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setCultivo(id)
                  if (errores.cultivo) setErrores(p => ({ ...p, cultivo: undefined }))
                }}
                className="opcion py-3 px-3 text-base flex flex-col items-center gap-2"
                aria-pressed={activo}
              >
                
                {etiqueta}
              </button>
            )
          })}
        </div>
        <ErrorCampo texto={errores.cultivo} />
      </div>

      <div>
        <p className="text-base mb-3" style={{ color: 'var(--tinta-suave)' }}>¿En qué etapa va?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ETAPAS.map(({ id, nombre: etiqueta, explicacion }) => {
            const activo = etapa === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setEtapa(activo ? '' : id)}
                className="opcion py-2.5 px-4 text-left"
                aria-pressed={activo}
              >
                <span className="text-base font-bold block">{etiqueta}</span>
                <span className="text-sm block leading-snug" style={{ opacity: 0.85 }}>{explicacion}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label htmlFor="area-parcela" className="block text-base mb-3" style={{ color: 'var(--tinta-suave)' }}>
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
          className="campo"
          style={errores.area ? { borderColor: 'var(--peligro)' } : undefined}
        />
        <ErrorCampo texto={errores.area} />
        <p className="text-sm mt-2" style={{ color: 'var(--tinta-suave)' }}>
          Si no lo sabes de memoria, déjalo vacío y lo pones después.
        </p>
      </div>

      {/* El caudal de la bomba. UN número que desbloquea litros, metros
          cúbicos, pesos y la eficiencia del riego. Se explica cómo medirlo
          porque casi nadie lo tiene a la mano, y se deja claro que sin él la
          app no inventa litros: simplemente no los enseña. */}
      <div>
        <label htmlFor="caudal-parcela" className="block text-base mb-3" style={{ color: 'var(--tinta-suave)' }}>
          ¿Cuánta agua echa tu bomba por minuto?
        </label>
        <input
          id="caudal-parcela"
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          value={caudal}
          onChange={e => {
            setCaudal(e.target.value)
            if (errores.caudal) setErrores(p => ({ ...p, caudal: undefined }))
          }}
          placeholder="litros por minuto"
          aria-invalid={!!errores.caudal}
          className="campo"
          style={errores.caudal ? { borderColor: 'var(--peligro)' } : undefined}
        />
        <ErrorCampo texto={errores.caudal} />
        <p className="text-sm mt-2" style={{ color: 'var(--tinta-suave)' }}>
          Para saberlo: pon la manguera en un bote de medida, déjala correr un minuto justo y mira
          cuántos litros juntó. Con eso te puedo decir cuánta agua gastas y cuánto te cuesta.
        </p>
      </div>

      <div>
        <p className="text-base mb-3" style={{ color: 'var(--tinta-suave)' }}>Riega solo si baja de</p>
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setUmbral(v => Math.max(UMBRAL_MINIMO, v - 5))}
            disabled={umbral <= UMBRAL_MINIMO}
            className="opcion flex items-center justify-center disabled:opacity-40"
            style={{ width: 'clamp(52px, 16vw, 62px)', height: 'clamp(52px, 16vw, 62px)', flexShrink: 0, color: 'var(--tinta)' }}
            aria-label="Bajar el punto de riego"
          >
            <Minus size={34} aria-hidden />
          </button>
          <p className="font-bold leading-none" style={{ fontSize: 'clamp(1.75rem, 10vw, 2.5rem)', color: 'var(--agua)' }} role="status">
            {umbral}
            <span className="text-xl">%</span>
          </p>
          <button
            type="button"
            onClick={() => setUmbral(v => Math.min(UMBRAL_MAXIMO, v + 5))}
            disabled={umbral >= UMBRAL_MAXIMO}
            className="opcion flex items-center justify-center disabled:opacity-40"
            style={{ width: 'clamp(52px, 16vw, 62px)', height: 'clamp(52px, 16vw, 62px)', flexShrink: 0, color: 'var(--tinta)' }}
            aria-label="Subir el punto de riego"
          >
            <Plus size={34} aria-hidden />
          </button>
        </div>
      </div>

      {aviso && (
        <p className="text-base font-semibold rounded-lg p-4 text-white" style={{ background: 'var(--peligro)' }} role="alert">
          {aviso}
        </p>
      )}

      <button
        type="button"
        onClick={guardar}
        disabled={guardando}
        className="boton boton-primario boton-ancho"
        >
        {guardando ? 'Guardando…' : 'Guardar parcela'}
      </button>

      <p className="text-sm text-center" style={{ color: 'var(--tinta-suave)' }}>
        El sensor se asocia solo, por el aparato que ya está midiendo.
      </p>

      {onCancelar && (
        <button
          type="button"
          onClick={onCancelar}
          className="boton boton-secundario"
          style={{ color: 'var(--tinta-suave)' }}
        >
          Dejarlo como estaba
        </button>
      )}
    </section>
  )
}
