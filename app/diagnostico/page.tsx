'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Leaf, ScanSearch } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { leerLlave } from '@/lib/dueno'
import { VincularAparato } from '@/components/ia/vincular-aparato'
import { cultivoPorId, etapaPorId } from '@/lib/cultivos'
import { plagasDeCultivo } from '@/lib/plagas'
import { PARTES, type ParteId } from '@/lib/diagnostico'
import { useDiagnostico } from '@/hooks/use-diagnostico'
import type { Parcela } from '@/hooks/use-parcela'
import { SelectorFotos } from '@/components/diagnostico/selector-fotos'
import { VistaReporte } from '@/components/diagnostico/vista-reporte'

// "Otra planta": la del traspatio, una maleza, algo que no está registrado.
const OTRA = 'otra'

// Lo que se va diciendo mientras analiza. No son pasos reales del servidor:
// es para que un minuto de espera no parezca un teléfono trabado.
const MIENTRAS_ANALIZA = [
  'Revisando que las fotos se vean bien…',
  'Identificando la planta y la parte dañada…',
  'Describiendo manchas, colores y patrón…',
  'Comparando con plagas, hongos, deficiencias y daño por clima…',
  'Cruzando con la humedad y los riegos de tu cultivo…',
  'Armando el reporte…',
]

export default function PantallaDiagnostico() {
  const d = useDiagnostico()
  const [parcelas, setParcelas] = useState<Parcela[] | null>(null)
  const [eleccion, setEleccion] = useState<string>('')
  const [plantaDeclarada, setPlantaDeclarada] = useState('')
  const [parte, setParte] = useState<ParteId | null>(null)
  const [nota, setNota] = useState('')
  const arriba = useRef<HTMLDivElement | null>(null)
  // Sin la llave del dueño el backend contesta 403. Se avisa ANTES de que
  // alguien arme todo y espere, no después.
  const [tieneLlave, setTieneLlave] = useState(true)
  useEffect(() => setTieneLlave(leerLlave() !== null), [])

  // Lo elegido antes de una recarga vuelve a su lugar.
  const recuperado = useRef(d.borradorRecuperado)
  recuperado.current = d.borradorRecuperado
  useEffect(() => {
    const b = d.borradorRecuperado
    if (!b) return
    setPlantaDeclarada(b.plantaDeclarada ?? '')
    setParte(b.parte ?? null)
    setNota(b.nota ?? '')
    if (b.eleccion) setEleccion(prev => prev || b.eleccion)
  }, [d.borradorRecuperado])

  // Y cada cambio se guarda, por si la página se recarga.
  const { guardarBorrador } = d
  useEffect(() => {
    if (eleccion === '') return
    guardarBorrador({ eleccion, plantaDeclarada, parte, nota })
  }, [eleccion, plantaDeclarada, parte, nota, guardarBorrador])

  // Los cultivos registrados. ?parcela=N preselecciona uno (viene de Plagas).
  useEffect(() => {
    let vivo = true
    apiFetch('/api/parcelas')
      .then(r => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((lista: Parcela[]) => {
        if (!vivo) return
        setParcelas(lista)
        // Si la página se recargó (la cámara de Android lo provoca), se
        // respeta lo que ya se había elegido.
        const previa = recuperado.current?.eleccion
        if (previa && (previa === OTRA || lista.some(p => String(p.id) === previa))) {
          setEleccion(previa)
          return
        }
        const pedida = new URLSearchParams(window.location.search).get('parcela')
        const inicial = lista.find(p => String(p.id) === pedida) ?? lista[0]
        setEleccion(inicial ? String(inicial.id) : OTRA)
      })
    return () => {
      vivo = false
    }
  }, [])

  const parcela = parcelas?.find(p => String(p.id) === eleccion) ?? null
  const cultivo = cultivoPorId(parcela?.cultivo)
  const catalogo = useMemo(() => plagasDeCultivo(parcela?.cultivo).map(p => p.nombre), [parcela?.cultivo])

  // Al cambiar de estado, la pantalla vuelve arriba: el reporte empieza ahí.
  useEffect(() => {
    arriba.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [d.estado])

  const etapaMensaje = MIENTRAS_ANALIZA[Math.min(MIENTRAS_ANALIZA.length - 1, Math.floor(d.segundos / 8))]

  return (
    <main className="max-w-3xl mx-auto px-4 py-3 flex flex-col gap-4">
      <div ref={arriba} />
      <header className="flex flex-col gap-2">
        <Link
          href="/plagas"
          className="flex items-center gap-2 text-base font-semibold w-fit"
          style={{ color: 'var(--verde)' }}
        >
          <ArrowLeft size={18} aria-hidden />
          Plagas
        </Link>
        <h1 className="titulo-pantalla">Diagnóstico por foto</h1>
        <p className="text-base texto-suave">
          Plagas, enfermedades, falta de nutrientes, daño por clima o por agua, de cualquier planta.
        </p>
      </header>

      {d.estado === 'analizando' && (
        <section className="tarjeta flex flex-col items-center gap-4 py-10 text-center" role="status" aria-live="polite">
          <ScanSearch size={36} className="regando" style={{ color: 'var(--verde)' }} aria-hidden />
          <p className="text-lg font-bold">{etapaMensaje}</p>
          <p className="text-sm texto-suave">
            {d.segundos} s · Un análisis a fondo tarda entre medio minuto y un minuto y medio. Mantén la pantalla encendida y la app abierta.
          </p>
        </section>
      )}

      {d.estado === 'listo' && d.reporte && (
        <VistaReporte
          reporte={d.reporte}
          cultivoDeclarado={cultivo?.nombre ?? null}
          onAgregarFoto={d.corregir}
          onEmpezarDeNuevo={d.empezarDeNuevo}
        />
      )}

      {d.estado === 'armando' && (
        <>
          {!tieneLlave && (
            <div className="aviso flex flex-col gap-3" role="note">
              <p>
                <strong>El análisis con IA es del dueño.</strong> Este aparato todavía no está
                vinculado; se hace una sola vez.
              </p>
              <VincularAparato compacto onVinculado={() => setTieneLlave(true)} />
            </div>
          )}

          {/* --- 1. De qué planta --- */}
          <section className="tarjeta flex flex-col gap-3" aria-label="De qué planta es">
            <h2 className="titulo-bloque">1. ¿De qué planta es?</h2>
            {parcelas === null ? (
              <p className="text-sm texto-suave">Buscando tus cultivos…</p>
            ) : (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Planta">
                {parcelas.map(p => {
                  const c = cultivoPorId(p.cultivo)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="pastilla"
                      aria-pressed={eleccion === String(p.id)}
                      onClick={() => setEleccion(String(p.id))}
                    >
                      <span aria-hidden>{c?.icono ?? '🌱'}</span>
                      {p.nombre || `Cultivo ${p.id}`}
                      {c && <span style={{ opacity: 0.8 }}>· {c.nombre}</span>}
                    </button>
                  )
                })}
                <button
                  type="button"
                  className="pastilla"
                  aria-pressed={eleccion === OTRA}
                  onClick={() => setEleccion(OTRA)}
                >
                  <Leaf size={16} aria-hidden />
                  Otra planta
                </button>
              </div>
            )}

            {parcela && (
              <p className="text-sm texto-suave">
                {cultivo ? cultivo.nombre : 'Sin cultivo registrado'}
                {parcela.etapa && ` · ${etapaPorId(parcela.etapa, parcela.cultivo)?.nombre ?? parcela.etapa}`}. El
                análisis usa la humedad y los riegos de este cultivo.
              </p>
            )}
            {eleccion === OTRA && (
              <input
                className="campo"
                value={plantaDeclarada}
                onChange={e => setPlantaDeclarada(e.target.value)}
                maxLength={60}
                placeholder="¿Qué planta es? Si no sabes, déjalo vacío"
                aria-label="Qué planta es"
              />
            )}
          </section>

          {/* --- 2. Qué parte --- */}
          <section className="tarjeta flex flex-col gap-3" aria-label="Qué parte fotografías">
            <h2 className="titulo-bloque">2. ¿Qué vas a fotografiar?</h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Parte de la planta">
              {PARTES.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className="pastilla"
                  aria-pressed={parte === p.id}
                  onClick={() => setParte(parte === p.id ? null : p.id)}
                >
                  {p.nombre}
                </button>
              ))}
            </div>
            {parte && <p className="text-sm texto-suave">{PARTES.find(p => p.id === parte)?.consejo}</p>}
          </section>

          {/* --- 3. Fotos --- */}
          <section className="tarjeta flex flex-col gap-3" aria-label="Fotos">
            <h2 className="titulo-bloque">3. Las fotos</h2>
            <SelectorFotos
              fotos={d.fotos}
              preparando={d.preparando}
              onAgregar={d.agregarFotos}
              onQuitar={d.quitarFoto}
            />
          </section>

          {/* --- 4. Lo que notó --- */}
          <section className="tarjeta flex flex-col gap-3" aria-label="Lo que notaste">
            <h2 className="titulo-bloque">4. ¿Qué notaste? <span className="texto-apagado font-normal">(opcional)</span></h2>
            <textarea
              className="campo"
              rows={3}
              maxLength={500}
              value={nota}
              onChange={e => setNota(e.target.value)}
              placeholder="Desde cuándo, cuántas plantas, si fue después de una helada, de regar o de aplicar algo…"
              aria-label="Lo que notaste"
            />
          </section>

          {d.aviso && (
            <p className="aviso aviso-peligro" role="alert">
              {d.aviso}
            </p>
          )}

          <button
            type="button"
            className="boton boton-primario boton-ancho"
            disabled={d.fotos.length === 0 || d.preparando}
            onClick={() =>
              d.analizar({
                parcelaId: parcela?.id ?? null,
                plantaDeclarada: eleccion === OTRA ? plantaDeclarada : '',
                parte,
                nota,
                catalogo: parcela ? catalogo : [],
              })
            }
          >
            <ScanSearch size={18} aria-hidden />
            {d.fotos.length === 0 ? 'Toma al menos una foto' : `Analizar ${d.fotos.length === 1 ? 'la foto' : `las ${d.fotos.length} fotos`}`}
          </button>
        </>
      )}
    </main>
  )
}
