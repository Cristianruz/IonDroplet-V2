'use client'

import { useState } from 'react'
import { Check, ChevronDown, Plus } from 'lucide-react'
import { NUTRIENTES, UNIDADES, nombreNutriente } from '@/lib/nutrientes'
import type { DatosAplicacion } from '@/hooks/use-fertirriego'

// Anotar lo que se le echó a la parcela. Todo en palabras del campo: no dice
// "fertirriego" ni "conductividad eléctrica" en la parte de arriba.
//
// Los tres de siempre (nitrógeno, fósforo, potasio) van a la vista. Los otros
// nueve quedan detrás de un botón, porque casi nadie los aplica y llenarían
// la pantalla de opciones que estorban.
//
// EC y pH van escondidos a propósito: hacen falta un medidor que casi nadie
// tiene. Quien lo tenga los encuentra; a quien no, no le estorban ni lo
// hacen sentir que le falta llenar algo.

interface Props {
  guardando: boolean
  onGuardar: (datos: DatosAplicacion) => Promise<string | null>
  onListo?: () => void
}

interface Renglon {
  nutriente: string
  cantidad: string
  unidad: string
}

function ErrorCampo({ texto }: { texto?: string }) {
  if (!texto) return null
  return (
    <p className="text-lg font-semibold mt-2 aparece visible" style={{ color: 'var(--peligro)' }} role="alert">
      {texto}
    </p>
  )
}

export function FertirriegoForm({ guardando, onGuardar, onListo }: Props) {
  const [renglones, setRenglones] = useState<Renglon[]>([])
  const [verTodos, setVerTodos] = useState(false)
  const [verMasDatos, setVerMasDatos] = useState(false)
  const [litros, setLitros] = useState('')
  const [minutos, setMinutos] = useState('')
  const [ec, setEc] = useState('')
  const [ph, setPh] = useState('')
  const [notas, setNotas] = useState('')
  const [errores, setErrores] = useState<{ nutrientes?: string; ph?: string }>({})
  const [aviso, setAviso] = useState<string | null>(null)

  const principales = NUTRIENTES.filter(n => n.principal)
  const resto = NUTRIENTES.filter(n => !n.principal)
  const elegidos = new Set(renglones.map(r => r.nutriente))

  function alternar(id: string) {
    setErrores(e => ({ ...e, nutrientes: undefined }))
    setRenglones(actuales =>
      actuales.some(r => r.nutriente === id)
        ? actuales.filter(r => r.nutriente !== id)
        : [...actuales, { nutriente: id, cantidad: '', unidad: 'kg' }]
    )
  }

  function cambiar(id: string, campo: 'cantidad' | 'unidad', valor: string) {
    setRenglones(actuales => actuales.map(r => (r.nutriente === id ? { ...r, [campo]: valor } : r)))
  }

  async function enviar() {
    const fallas: typeof errores = {}
    if (renglones.length === 0) fallas.nutrientes = 'Dime al menos qué le pusiste.'

    const phNum = ph.trim() === '' ? null : Number(ph)
    if (phNum !== null && (!Number.isFinite(phNum) || phNum < 0 || phNum > 14)) {
      fallas.ph = 'El pH va de 0 a 14.'
    }

    setErrores(fallas)
    if (Object.keys(fallas).length > 0) {
      // Llevar la vista al primer campo que falta, en vez de dejar al
      // agricultor buscando dónde está el error.
      document.getElementById(fallas.nutrientes ? 'campo-nutrientes' : 'campo-ph')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      return
    }

    const motivo = await onGuardar({
      duracion_min: minutos.trim() === '' ? null : Number(minutos),
      volumen_litros: litros.trim() === '' ? null : Number(litros),
      ec_ds_m: ec.trim() === '' ? null : Number(ec),
      ph: phNum,
      notas: notas.trim() === '' ? null : notas.trim(),
      nutrientes: renglones.map(r => ({
        nutriente: r.nutriente,
        cantidad: r.cantidad.trim() === '' ? null : Number(r.cantidad),
        unidad: r.unidad,
      })),
    })

    if (motivo) {
      setAviso(motivo)
      return
    }

    setRenglones([])
    setLitros('')
    setMinutos('')
    setEc('')
    setPh('')
    setNotas('')
    setAviso(null)
    onListo?.()
  }

  const estiloChip = (activo: boolean) => ({
    background: activo ? 'var(--verde)' : 'var(--tarjeta)',
    color: activo ? '#fff' : 'var(--tinta)',
    borderColor: activo ? 'var(--verde)' : 'var(--borde)',
  })

  return (
    <section
      className="rounded-2xl p-5 sm:p-6 shadow-sm border border-black/5 flex flex-col gap-5"
      style={{ background: 'var(--tarjeta)' }}
      aria-label="Anotar lo que le pusiste a la parcela"
    >
      <div id="campo-nutrientes">
        <h2 className="text-xl font-semibold mb-1">¿Qué le pusiste?</h2>
        <p className="text-lg mb-3" style={{ color: 'var(--tinta-suave)' }}>
          Puedes marcar varios.
        </p>

        <div className="flex flex-wrap gap-2">
          {principales.map(n => (
            <button
              key={n.id}
              type="button"
              onClick={() => alternar(n.id)}
              aria-pressed={elegidos.has(n.id)}
              className="rounded-2xl border-4 px-5 py-4 text-xl font-bold flex items-center gap-2 active:scale-95 transition-transform"
              style={estiloChip(elegidos.has(n.id))}
            >
              {elegidos.has(n.id) && <Check size={22} aria-hidden />}
              {n.nombre}
            </button>
          ))}
        </div>

        {verTodos && (
          <div className="flex flex-wrap gap-2 mt-2 aparece visible">
            {resto.map(n => (
              <button
                key={n.id}
                type="button"
                onClick={() => alternar(n.id)}
                aria-pressed={elegidos.has(n.id)}
                className="rounded-2xl border-4 px-4 py-3 text-lg font-bold flex items-center gap-2 active:scale-95 transition-transform"
                style={estiloChip(elegidos.has(n.id))}
              >
                {elegidos.has(n.id) && <Check size={18} aria-hidden />}
                {n.nombre}
              </button>
            ))}
          </div>
        )}

        {!verTodos && (
          <button
            type="button"
            onClick={() => setVerTodos(true)}
            className="mt-3 text-lg font-semibold flex items-center gap-1.5"
            style={{ color: 'var(--verde)' }}
          >
            <Plus size={20} aria-hidden />
            Ver los demás
          </button>
        )}

        <ErrorCampo texto={errores.nutrientes} />
      </div>

      {renglones.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold">¿Cuánto de cada uno?</h3>
          <p className="text-base" style={{ color: 'var(--tinta-suave)' }}>
            Si no te acuerdas de la cantidad, déjala en blanco: se guarda igual que lo pusiste.
          </p>
          {renglones.map(r => (
            <div key={r.nutriente} className="flex items-center gap-2 flex-wrap">
              <span className="text-xl font-semibold" style={{ minWidth: 130 }}>
                {nombreNutriente(r.nutriente)}
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={r.cantidad}
                onChange={e => cambiar(r.nutriente, 'cantidad', e.target.value)}
                placeholder="cuánto"
                aria-label={`Cantidad de ${nombreNutriente(r.nutriente)}`}
                className="rounded-2xl border-4 px-4 py-3 text-xl"
                style={{ background: 'var(--fondo)', borderColor: 'var(--borde)', color: 'var(--tinta)', width: 130 }}
              />
              <select
                value={r.unidad}
                onChange={e => cambiar(r.nutriente, 'unidad', e.target.value)}
                aria-label={`Unidad de ${nombreNutriente(r.nutriente)}`}
                className="rounded-2xl border-4 px-4 py-3 text-xl font-semibold"
                style={{ background: 'var(--fondo)', borderColor: 'var(--borde)', color: 'var(--tinta)' }}
              >
                {UNIDADES.map(u => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <label className="text-lg font-semibold" htmlFor="campo-litros">
          ¿Cuánta agua llevó? <span style={{ color: 'var(--tinta-suave)' }}>(si lo sabes)</span>
        </label>
        <input
          id="campo-litros"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={litros}
          onChange={e => setLitros(e.target.value)}
          placeholder="litros"
          className="rounded-2xl border-4 px-4 py-3 text-xl"
          style={{ background: 'var(--fondo)', borderColor: 'var(--borde)', color: 'var(--tinta)' }}
        />
      </div>

      {!verMasDatos ? (
        <button
          type="button"
          onClick={() => setVerMasDatos(true)}
          className="text-lg font-semibold flex items-center gap-1.5 self-start"
          style={{ color: 'var(--verde)' }}
        >
          <ChevronDown size={20} aria-hidden />
          Tengo medidor de agua
        </button>
      ) : (
        <div className="flex flex-col gap-3 aparece visible">
          <p className="text-base" style={{ color: 'var(--tinta-suave)' }}>
            Solo si mediste la solución antes de aplicarla. Si no, déjalo en blanco.
          </p>
          <div className="flex gap-3 flex-wrap">
            <div className="flex flex-col gap-2">
              <label className="text-lg font-semibold" htmlFor="campo-ec">
                Sales en el agua (EC)
              </label>
              <input
                id="campo-ec"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={ec}
                onChange={e => setEc(e.target.value)}
                placeholder="dS/m"
                className="rounded-2xl border-4 px-4 py-3 text-xl"
                style={{ background: 'var(--fondo)', borderColor: 'var(--borde)', color: 'var(--tinta)', width: 160 }}
              />
            </div>
            <div className="flex flex-col gap-2" id="campo-ph">
              <label className="text-lg font-semibold" htmlFor="campo-ph-input">
                Qué tan ácida (pH)
              </label>
              <input
                id="campo-ph-input"
                type="number"
                inputMode="decimal"
                min="0"
                max="14"
                step="any"
                value={ph}
                onChange={e => {
                  setPh(e.target.value)
                  setErrores(x => ({ ...x, ph: undefined }))
                }}
                placeholder="0 a 14"
                className="rounded-2xl border-4 px-4 py-3 text-xl"
                style={{ background: 'var(--fondo)', borderColor: 'var(--borde)', color: 'var(--tinta)', width: 160 }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-lg font-semibold" htmlFor="campo-minutos">
                Cuánto duró
              </label>
              <input
                id="campo-minutos"
                type="number"
                inputMode="numeric"
                min="0"
                step="any"
                value={minutos}
                onChange={e => setMinutos(e.target.value)}
                placeholder="minutos"
                className="rounded-2xl border-4 px-4 py-3 text-xl"
                style={{ background: 'var(--fondo)', borderColor: 'var(--borde)', color: 'var(--tinta)', width: 160 }}
              />
            </div>
          </div>
          <ErrorCampo texto={errores.ph} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-lg font-semibold" htmlFor="campo-notas">
          Notas <span style={{ color: 'var(--tinta-suave)' }}>(opcional)</span>
        </label>
        <textarea
          id="campo-notas"
          value={notas}
          onChange={e => setNotas(e.target.value)}
          rows={2}
          placeholder="Lo que quieras acordarte después"
          className="rounded-2xl border-4 px-4 py-3 text-xl"
          style={{ background: 'var(--fondo)', borderColor: 'var(--borde)', color: 'var(--tinta)' }}
        />
      </div>

      {aviso && (
        <p className="text-lg font-semibold aparece visible" style={{ color: 'var(--peligro)' }} role="alert">
          {aviso}
        </p>
      )}

      <button
        type="button"
        onClick={enviar}
        disabled={guardando}
        className="w-full rounded-2xl py-5 text-2xl font-bold text-white shadow-md active:scale-95 transition-transform disabled:opacity-60"
        style={{ background: 'var(--verde)' }}
      >
        {guardando ? 'Guardando…' : 'Anotar lo que le puse'}
      </button>
    </section>
  )
}
