'use client'

import { useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Crosshair, Minus, Plus } from 'lucide-react'
import { useIonDroplet } from '@/hooks/use-iondroplet'
import { useClima, type Clima } from '@/hooks/use-clima'
import { useComparar } from '@/hooks/use-comparar'
import { useBalance } from '@/hooks/use-balance'
import type { Parcela } from '@/hooks/use-parcela'
import { FASES, cultivoPorId, etapaEquivalente, faseDeEtapa, sistemaPorId } from '@/lib/cultivos'
import { Diorama3D, type AtributosDiorama, type ControlDiorama } from './diorama-3d'

// "Mi parcela" en 3D, del diseño Parcela 3D. Lo que se ve en la escena es
// dato: el color de la tierra sale del sensor, las plantas de la etapa que
// capturó el agricultor, el agua del estado de la bomba. Lo que falta se dice
// que falta, en la escena (gris, chip punteado) y en la ficha de abajo.

type Procedencia = 'medido' | 'calculado' | 'pronosticado' | 'registrado' | 'falta'

interface Renglon {
  etiqueta: string
  valor: string
  procedencia: Procedencia
  textoProcedencia: string
  color?: string
}

// Riego de cada etapa, corto: cabe junto al nombre de la etapa.
const RIEGO_ETAPA = [
  'pide agua seguido y poquita',
  'es cuando más crece',
  'es cuando más agua pide',
  'no la dejes secar',
  'se riega menos',
  'no pide casi agua',
]

function semaforo(h: number | null, umbral: number) {
  if (h === null) return { texto: 'Sin lectura', color: 'var(--apagado)' }
  if (h < umbral) return { texto: 'Tierra seca', color: 'var(--alerta)' }
  if (h > 75) return { texto: 'Muy húmeda', color: 'var(--agua)' }
  return { texto: 'Humedad bien', color: 'var(--verde)' }
}

// El cielo de la escena. Open-Meteo no manda nubosidad en lo que pedimos, así
// que sólo se distinguen tres: lluvia (cae agua ahorita), noche y soleado.
function cieloDe(clima: Clima | null): AtributosDiorama['clima'] {
  const hora = new Date().getHours()
  if (hora < 7 || hora >= 20) return 'noche'
  if (clima && clima.ahora.precipitation > 0.1) return 'lluvia'
  return 'soleado'
}

function posicion(i: number) {
  return `calc(10px + ${(i / 5) * 100}% - ${(i / 5) * 20}px)`
}

interface Props {
  parcela: Parcela
  umbral: number
  onEditar: () => void
  onAgregar: () => void
  /** La lectura del asistente, debajo del título. */
  consejo?: ReactNode
}

export function VistaParcela({ parcela, umbral, onEditar, onAgregar, consejo }: Props) {
  const { humedad, sensorActivo, ultimaLectura, estadoEsp, conectado } = useIonDroplet({ conHistorial: false })
  const { clima } = useClima(parcela.id)
  const { series } = useComparar(24, 2)
  const { balance } = useBalance(7)

  const escena = useRef<ControlDiorama>(null)
  const [modo, setModo] = useState<'parcela' | 'mapa'>('parcela')
  const [foco, setFoco] = useState<number | null>(null)
  const [preview, setPreview] = useState<number | null>(null)
  const arrastrando = useRef(false)

  const cultivo = cultivoPorId(parcela.cultivo)
  // La etapa es la del cultivo ("llenado de almendra"); la escena se mueve
  // con su fase, que es lo que sabe dibujar.
  const etapa = etapaEquivalente(parcela.etapa, parcela.cultivo)
  const sistema = sistemaPorId(parcela.tipo_sistema)
  const capturada = etapa !== null
  const faseReal = faseDeEtapa(parcela.etapa, parcela.cultivo)
  const iReal = faseReal ? FASES.findIndex(f => f.id === faseReal) : 1
  const iVis = preview ?? iReal
  const previsualizando = preview !== null && preview !== iReal

  const regando = estadoEsp.pumpState === 1
  // Un solo relé prende la bomba y las varillas: si riega, se le pidió ionizar.
  const ionizando = regando
  const sinDato = humedad === null
  const superficie = parcela.area_ha !== null && parcela.area_ha !== undefined

  // Las demás parcelas del campo, con su última lectura de 24 h.
  const otras = useMemo(
    () =>
      series
        .filter(s => s.parcela_id !== parcela.id)
        .map(s => ({
          id: s.parcela_id,
          nombre: s.nombre,
          cultivo: cultivoPorId(s.cultivo),
          etapa: s.etapa,
          humedad: s.puntos.length > 0 ? s.puntos[s.puntos.length - 1].humedad : null,
        })),
    [series, parcela.id]
  )
  const vecinas = otras.slice(0, 2)

  const atributos: AtributosDiorama = {
    cultivo: cultivo?.id ?? 'otro',
    etapa: FASES[iReal].id,
    preview: preview !== null ? FASES[preview].id : '',
    humedad: sinDato ? null : humedad,
    umbral,
    sistema: sistema?.id ?? '',
    regando,
    ionizando,
    clima: cieloDe(clima),
    sensorActivo,
    capturada,
    superficie,
    hileras: parcela.num_hileras && parcela.num_hileras > 0 ? parcela.num_hileras : null,
    modo,
    vecinas: vecinas.map(v => ({
      cultivo: v.cultivo?.id ?? 'otro',
      etapa: v.etapa,
      humedad: v.humedad,
      umbral,
    })),
    lectura: ultimaLectura ? ultimaLectura.toISOString() : '',
  }

  // --- Línea de etapas: se arrastra para ver otra etapa y al soltar regresa.
  function indiceDesde(e: PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const t = (e.clientX - r.left - 10) / Math.max(1, r.width - 20)
    return Math.max(0, Math.min(5, Math.round(t * 5)))
  }

  const etiquetaEtapa = !capturada
    ? 'Etapa sin capturar — las plantas van en gris hasta que la registres'
    : previsualizando
      ? `Así se vería en ${FASES[iVis].nombre.toLowerCase()}`
      : `Etapa: ${etapa!.nombre}`

  const notaEtapa = previsualizando
    ? 'Es una ilustración de cómo se vería en esa etapa. No es un pronóstico de fechas. Suelta y vuelve a la etapa real.'
    : capturada
      ? 'Arrastra para ver cómo se verá en otra etapa. Al soltar regresa a la etapa registrada.'
      : 'Sin etapa capturada no puedo dibujar el cultivo: te lo enseño en gris, no lo invento.'

  const colorVista = previsualizando ? 'var(--agua)' : capturada ? 'var(--verde)' : 'var(--apagado)'

  // --- La ficha: cada dato dice de dónde salió.
  const litros =
    balance?.totales.deficit_litros_parcela ?? balance?.totales.deficit_litros_por_ha ?? null
  const litrosPorParcela = balance?.totales.deficit_litros_parcela != null

  const ficha: Renglon[] = [
    {
      etiqueta: 'Cultivo',
      valor: cultivo?.nombre ?? (parcela.cultivo || 'Sin capturar'),
      procedencia: parcela.cultivo ? 'registrado' : 'falta',
      textoProcedencia: parcela.cultivo ? 'registrado' : 'no disponible',
    },
    {
      etiqueta: 'Humedad del suelo',
      valor: sinDato ? 'Sin dato' : `${Math.round(humedad)}%`,
      procedencia: sinDato ? 'falta' : 'medido',
      textoProcedencia: sinDato ? 'no disponible' : sensorActivo ? 'medido' : 'última lectura',
      color: sinDato ? undefined : semaforo(humedad, umbral).color,
    },
    {
      etiqueta: 'Punto de riego',
      valor: `${umbral}%`,
      procedencia: 'registrado',
      textoProcedencia: 'registrado',
    },
    {
      etiqueta: 'Superficie',
      valor: superficie ? `${parcela.area_ha} ha` : 'Sin capturar',
      procedencia: superficie ? 'registrado' : 'falta',
      textoProcedencia: superficie ? 'registrado' : 'no disponible',
    },
    {
      etiqueta: 'Caudal',
      valor: parcela.caudal_lpm ? `${parcela.caudal_lpm} L/min` : 'Sin capturar',
      procedencia: parcela.caudal_lpm ? 'registrado' : 'falta',
      textoProcedencia: parcela.caudal_lpm ? 'medido por ti' : 'no disponible',
    },
    {
      etiqueta: 'Sistema',
      valor: sistema?.nombre ?? 'Sin capturar',
      procedencia: sistema ? 'registrado' : 'falta',
      textoProcedencia: sistema ? 'registrado' : 'no disponible',
    },
    {
      etiqueta: 'Agua de la semana',
      valor: litros !== null ? `≈ ${Math.round(litros).toLocaleString('es-MX')} L` : 'Sin calcular',
      procedencia: litros !== null ? 'pronosticado' : 'falta',
      textoProcedencia:
        litros === null ? 'no disponible' : litrosPorParcela ? 'proyección' : 'proyección a 1 ha',
    },
  ]

  function verCampo() {
    setFoco(null)
    setModo('mapa')
    setTimeout(() => escena.current?.enfocar(-2), 0)
  }
  function verParcela() {
    setFoco(null)
    setModo('parcela')
    setTimeout(() => escena.current?.enfocar(-1), 0)
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2.5">
        <h1 className="titulo-pantalla">Cultivo</h1>
        {conectado && (
          <span className="flex items-center gap-1.5 text-[13px] font-semibold texto-suave" role="status">
            <span className="punto" style={{ background: 'var(--verde)' }} aria-hidden />
            Conectado
          </span>
        )}
      </div>

      {consejo}

      <div className="segmentado" role="group" aria-label="Qué ver">
        <button type="button" aria-pressed={modo === 'mapa'} onClick={verCampo}>Todos los cultivos</button>
        <button type="button" aria-pressed={modo === 'parcela'} onClick={verParcela}>Este cultivo</button>
      </div>

      <section className="tarjeta" style={{ padding: 0, overflow: 'hidden' }} aria-label="Cultivo en 3D">
        <div className="escena-3d">
          <Diorama3D ref={escena} atributos={atributos} />

          <div className="absolute top-2.5 left-2.5 right-2.5 flex flex-wrap gap-1.5 pointer-events-none">
            <span className={`chip-escena ${sinDato ? 'chip-falta' : ''}`} style={{ color: sinDato ? '#3a4f45' : '#11794a' }}>
              <span className="punto" style={{ background: 'currentColor' }} aria-hidden />
              {sinDato ? 'Sin lectura del sensor' : 'Color de la tierra: medido'}
            </span>
            {!superficie && (
              <span className="chip-escena chip-falta" style={{ color: '#7a5004' }}>
                Superficie sin capturar
              </span>
            )}
            {ionizando && (
              <span className="chip-escena" style={{ color: '#7a5004' }}>
                <span className="punto" style={{ background: 'currentColor' }} aria-hidden />
                Ionizador: se le pidió encender
              </span>
            )}
          </div>

          {regando && (
            <div className="banda-riego" role="status">
              <span className="punto regando" style={{ background: '#fff', width: 8, height: 8 }} aria-hidden />
              Regando ahora
            </div>
          )}

          {!capturada && (
            <div
              className="absolute left-3 right-3 bottom-3 flex flex-col gap-2"
              style={{
                padding: 12, borderRadius: 'var(--radio-sm)',
                background: 'var(--tarjeta-solida)', border: '1px solid var(--borde)',
                boxShadow: 'var(--sombra-elevada)',
              }}
            >
              <p className="text-sm font-bold">No sé en qué etapa va tu cultivo</p>
              <button type="button" onClick={onEditar} className="boton boton-primario boton-ancho" style={{ minHeight: 52, fontSize: 16 }}>
                Dime en qué etapa va tu cultivo
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-[13px]" style={{ padding: 14 }}>
          <div className="flex items-start gap-2">
            <span
              className="punto"
              style={{ width: 9, height: 9, marginTop: 6, background: !capturada ? 'var(--apagado)' : colorVista }}
              aria-hidden
            />
            <p className="text-base font-semibold leading-snug">{etiquetaEtapa}</p>
          </div>

          {/* Botones grandes para girar: con guantes no se hace un gesto fino. */}
          <div className="grid grid-cols-3 gap-2">
            <button type="button" className="boton boton-secundario control-escena" onClick={() => escena.current?.girar(-0.5)}>
              <ChevronLeft size={18} aria-hidden /> Girar
            </button>
            <button type="button" className="boton boton-secundario control-escena" onClick={() => escena.current?.reiniciar()}>
              <Crosshair size={16} aria-hidden /> Centrar
            </button>
            <button type="button" className="boton boton-secundario control-escena" onClick={() => escena.current?.girar(0.5)}>
              Girar <ChevronRight size={18} aria-hidden />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="boton boton-secundario" style={{ minHeight: 52 }} onClick={() => escena.current?.acercar(0.8)} aria-label="Alejar">
              <Minus size={20} aria-hidden />
            </button>
            <button type="button" className="boton boton-secundario" style={{ minHeight: 52 }} onClick={() => escena.current?.acercar(1.25)} aria-label="Acercar">
              <Plus size={20} aria-hidden />
            </button>
          </div>

          <hr className="divisor" />

          {modo === 'mapa' ? (
            <div className="flex flex-col gap-2">
              <span className="etiqueta">Cultivos registrados</span>
              {[{ id: parcela.id, nombre: parcela.nombre, cultivo, etapa: parcela.etapa, humedad, mia: true },
                ...otras.map(o => ({ ...o, mia: false }))].map((p, i) => {
                const s = semaforo(p.humedad, umbral)
                const activa = p.mia ? false : foco === i - 1
                const detalle = p.humedad === null
                  ? 'Sin lectura del sensor'
                  : `${Math.round(p.humedad)}% medido${p.mia && superficie ? ` · ${parcela.area_ha} ha` : ''}`
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="ficha-parcela"
                    aria-pressed={activa}
                    onClick={() => {
                      if (p.mia) verParcela()
                      else if (i - 1 < 2) { setFoco(i - 1); escena.current?.enfocar(i - 1) }
                    }}
                  >
                    <span className="text-[22px] leading-none" aria-hidden>{p.cultivo?.icono ?? '🌱'}</span>
                    <span className="flex-1 min-w-0 flex flex-col gap-0.5 text-left">
                      <span className="text-[15px] font-bold truncate">{p.nombre || 'Cultivo sin nombre'}</span>
                      <span className="text-[12.5px] texto-suave">{detalle}</span>
                    </span>
                    <span
                      className="flex items-center gap-1.5 whitespace-nowrap text-[11.5px] font-bold"
                      style={{
                        padding: '5px 9px', borderRadius: 'var(--radio-pill)', color: s.color,
                        background: `color-mix(in srgb, ${s.color} 14%, transparent)`,
                      }}
                    >
                      <span className="punto" style={{ background: 'currentColor' }} aria-hidden />
                      {s.texto}
                    </span>
                  </button>
                )
              })}
              <p className="text-[13px] leading-snug texto-suave">
                {foco !== null
                  ? 'Estás viendo de cerca ese cultivo. Su suelo se pinta con su propia lectura; el detalle en vivo está en el principal.'
                  : otras.length > 0
                    ? 'Toca un cultivo y la escena se acerca a él. El color del suelo de cada ficha es dato medido de su propio sensor.'
                    : 'Por ahora hay un solo cultivo registrado. Al agregar otro, aquí se muestran lado a lado.'}
                {otras.length > 2 && ' En la escena caben las dos primeras.'}
              </p>
              {foco !== null && (
                <button
                  type="button"
                  className="boton boton-secundario"
                  style={{ minHeight: 52 }}
                  onClick={() => { setFoco(null); escena.current?.enfocar(-2) }}
                >
                  Ver todo el campo
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-[9px]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="etiqueta">Línea de etapas</span>
                <span className="text-xs texto-suave">ilustrativa</span>
              </div>

              <div
                className="linea-etapas"
                role="slider"
                aria-label="Ver cómo se vería en otra etapa"
                aria-valuemin={1}
                aria-valuemax={6}
                aria-valuenow={iVis + 1}
                aria-valuetext={FASES[iVis].nombre}
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'ArrowRight') setPreview(Math.min(5, iVis + 1))
                  else if (e.key === 'ArrowLeft') setPreview(Math.max(0, iVis - 1))
                  else if (e.key === 'Escape' || e.key === 'Enter') setPreview(null)
                }}
                onPointerDown={e => {
                  e.currentTarget.setPointerCapture?.(e.pointerId)
                  arrastrando.current = true
                  setPreview(indiceDesde(e))
                }}
                onPointerMove={e => {
                  if (!arrastrando.current) return
                  const i = indiceDesde(e)
                  if (i !== preview) setPreview(i)
                }}
                onPointerUp={() => { arrastrando.current = false; setPreview(null) }}
                onPointerCancel={() => { arrastrando.current = false; setPreview(null) }}
              >
                <div className="absolute left-2.5 right-2.5 h-2 rounded-full" style={{ background: 'var(--pista)' }} />
                <div
                  className="absolute left-2.5 h-2 rounded-full"
                  style={{ background: colorVista, width: `calc(${(iVis / 5) * 100}% - ${(iVis / 5) * 20}px)` }}
                />
                {FASES.map((e, i) => (
                  <span
                    key={e.id}
                    className="absolute rounded-full"
                    style={{
                      left: posicion(i),
                      transform: 'translateX(-50%)',
                      width: i === iReal ? 14 : 10,
                      height: i === iReal ? 14 : 10,
                      background: i === iReal && capturada ? 'var(--verde)' : i < iVis ? 'color-mix(in srgb, var(--verde) 45%, transparent)' : 'var(--borde)',
                      border: '2px solid #fff',
                      boxShadow: '0 1px 4px rgba(22,60,45,.3)',
                    }}
                    aria-hidden
                  />
                ))}
                <span
                  className="absolute rounded-full"
                  style={{
                    left: posicion(iVis),
                    transform: 'translateX(-50%)',
                    width: 34, height: 34,
                    background: '#fff',
                    border: `3px solid ${colorVista}`,
                    boxShadow: '0 4px 12px rgba(22,60,45,.28)',
                    transition: arrastrando.current ? 'none' : 'left var(--normal) var(--curva)',
                  }}
                  aria-hidden
                />
              </div>

              <div className="flex justify-between gap-2 px-0.5 text-[12.5px] font-semibold texto-suave">
                <span>Siembra</span><span>Floración</span><span>Descanso</span>
              </div>

              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xl leading-none" aria-hidden>{cultivo?.icono ?? '🌱'}</span>
                <span className="text-[19px] font-bold" style={{ letterSpacing: '-.02em', color: colorVista }}>
                  {FASES[iVis].nombre}
                </span>
                <span className="text-[13px] texto-suave">{RIEGO_ETAPA[iVis]}</span>
              </div>

              <p className="text-[13.5px] leading-snug texto-suave">{notaEtapa}</p>

              {previsualizando && (
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="boton"
                  style={{
                    minHeight: 52, border: '1px solid var(--agua)', color: 'var(--agua)',
                    background: 'color-mix(in srgb, var(--agua) 10%, transparent)',
                  }}
                >
                  Volver a la etapa real
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="tarjeta flex flex-col gap-3" aria-label="Datos de este cultivo">
        <h2 className="titulo-bloque">Datos de este cultivo</h2>
        <dl className="flex flex-col">
          {ficha.map(f => (
            <div
              key={f.etiqueta}
              className="flex items-baseline justify-between gap-2.5"
              style={{ padding: '7px 0', borderBottom: '1px solid var(--pista)' }}
            >
              <dt className="text-sm texto-suave">{f.etiqueta}</dt>
              <dd className="flex items-center gap-[7px] text-right m-0">
                <span className="text-[15px] font-bold" style={{ color: f.color ?? (f.procedencia === 'falta' ? 'var(--tinta-suave)' : 'var(--tinta)'), fontVariantNumeric: 'tabular-nums' }}>
                  {f.valor}
                </span>
                <span className="procedencia" data-tipo={f.procedencia}>{f.textoProcedencia}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-[13px] leading-snug texto-suave">
          Los litros son proyección{litrosPorParcela ? ' con tu superficie' : ' a 1 ha'}, medida sobre prototipo.
          {!sensorActivo && !sinDato && ' El sensor lleva rato callado: la humedad es la última que mandó.'}
        </p>
      </section>

      <button type="button" onClick={onAgregar} className="boton agregar-parcela">
        + Agregar cultivo
      </button>
    </>
  )
}
