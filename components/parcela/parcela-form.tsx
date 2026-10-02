'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Calculator, Minus, Play, Plus, Search, Square } from 'lucide-react'
import {
  CULTIVOS,
  GRUPOS,
  SISTEMAS_RIEGO,
  cultivoPorId,
  etapaEquivalente,
  etapasDeCultivo,
  normalizar,
  sistemaPorId,
} from '@/lib/cultivos'
import type { Parcela, DatosParcela } from '@/hooks/use-parcela'

// Ficha de la parcela.
//
// DOS COSAS QUE ESTE FORMULARIO RESUELVE Y ANTES NO:
//
// 1. Las etapas ahora son las del cultivo que se escogió, con el nombre que
//    se usa en el campo, no seis genéricas para todo.
// 2. La superficie y el caudal traen calculadora. Nadie trae en la cabeza
//    cuántas hectáreas mide su parcela ni cuántos litros por minuto echa su
//    bomba: se miden con lo que hay a la mano (un metro, una cubeta y un
//    reloj) y aquí se convierte. Sin esos dos números el sistema no enseña
//    litros ni costo; no los inventa.

interface Props {
  parcela: Parcela | null
  umbralActual: number
  guardando: boolean
  onGuardar: (datos: DatosParcela) => Promise<boolean>
  onCancelar?: () => void
}

const UMBRAL_MINIMO = 10
const UMBRAL_MAXIMO = 90
const M2_POR_HECTAREA = 10000

function Etiqueta({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-base font-semibold mb-1">
      {children}
    </label>
  )
}

function Ayuda({ children }: { children: React.ReactNode }) {
  return <p className="text-sm mt-2 texto-suave">{children}</p>
}

function ErrorCampo({ texto }: { texto?: string }) {
  if (!texto) return null
  return (
    <p className="text-sm font-semibold mt-2 aparece visible" style={{ color: 'var(--peligro)' }} role="alert">
      {texto}
    </p>
  )
}

function aNumero(v: string): number | null {
  const n = Number(v.replace(',', '.'))
  return v.trim() === '' || Number.isNaN(n) ? null : n
}

export function ParcelaForm({ parcela, umbralActual, guardando, onGuardar, onCancelar }: Props) {
  const [nombre, setNombre] = useState(parcela?.nombre ?? '')
  const [cultivo, setCultivo] = useState(cultivoPorId(parcela?.cultivo)?.id ?? '')
  // Si la parcela guardó una fase vieja ("descanso"), se abre en la etapa
  // equivalente del cultivo ("reposo invernal").
  const [etapa, setEtapa] = useState(etapaEquivalente(parcela?.etapa, parcela?.cultivo)?.id ?? '')
  const [sistema, setSistema] = useState<string>(sistemaPorId(parcela?.tipo_sistema)?.id ?? '')
  const [area, setArea] = useState(
    parcela?.area_ha !== null && parcela?.area_ha !== undefined ? String(parcela.area_ha) : ''
  )
  const [caudal, setCaudal] = useState(
    parcela?.caudal_lpm !== null && parcela?.caudal_lpm !== undefined ? String(parcela.caudal_lpm) : ''
  )
  const [umbral, setUmbral] = useState(umbralActual)
  const [aviso, setAviso] = useState<string | null>(null)
  const [errores, setErrores] = useState<{ nombre?: string; cultivo?: string; area?: string; caudal?: string }>({})

  const [busqueda, setBusqueda] = useState('')
  const [verCalcArea, setVerCalcArea] = useState(false)
  const [verCalcCaudal, setVerCalcCaudal] = useState(false)

  const etapasDisponibles = useMemo(() => etapasDeCultivo(cultivo), [cultivo])

  // Al cambiar de cultivo, la etapa anterior puede no existir en el nuevo.
  useEffect(() => {
    if (etapa !== '' && !etapasDisponibles.some(e => e.id === etapa)) setEtapa('')
  }, [etapa, etapasDisponibles])


  const cultivosFiltrados = useMemo(() => {
    const q = normalizar(busqueda)
    if (q === '') return CULTIVOS
    return CULTIVOS.filter(c => normalizar(c.nombre).includes(q) || c.id.includes(q))
  }, [busqueda])

  function revisarCampos() {
    const fallas: typeof errores = {}
    if (nombre.trim() === '') fallas.nombre = 'Ponle un nombre para reconocerla.'
    if (cultivo === '') fallas.cultivo = 'Indica qué está sembrado.'
    const c = aNumero(caudal)
    if (caudal.trim() !== '' && (c === null || c <= 0)) {
      fallas.caudal = 'Tiene que ser un número de litros por minuto.'
    }
    const a = aNumero(area)
    if (area.trim() !== '' && (a === null || a < 0)) {
      fallas.area = 'Tiene que ser un número de hectáreas.'
    }
    return fallas
  }

  async function guardar() {
    const fallas = revisarCampos()
    setErrores(fallas)
    if (Object.keys(fallas).length > 0) {
      setAviso(null)
      const id = fallas.nombre ? 'nombre-parcela' : fallas.cultivo ? 'grupo-cultivo' : 'area-parcela'
      document.getElementById(id)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
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
      area_ha: aNumero(area),
      caudal_lpm: aNumero(caudal),
      tipo_sistema: sistema === '' ? null : sistema,
      hum_min: umbral,
    })
    if (!listo) setAviso('No se pudo guardar. Revisa que el sistema esté conectado.')
  }

  return (
    <section
      className="tarjeta flex flex-col gap-7"
      aria-label={parcela ? 'Editar la ficha del cultivo' : 'Registrar un cultivo'}
    >
      <div>
        <h2 className="titulo-pantalla">{parcela ? 'Ficha del cultivo' : 'Registrar cultivo'}</h2>
        <p className="text-sm texto-suave mt-1">
          Con estos datos el sistema calcula cuánta agua pide el cultivo y cuándo regar. Lo que
          dejes vacío no se inventa: la app avisa que falta.
        </p>
      </div>

      {/* --- Identificación --- */}
      <div>
        <Etiqueta htmlFor="nombre-parcela">Nombre del cultivo</Etiqueta>
        <input
          id="nombre-parcela"
          type="text"
          value={nombre}
          onChange={e => {
            setNombre(e.target.value)
            if (errores.nombre) setErrores(p => ({ ...p, nombre: undefined }))
          }}
          placeholder="Nogal Norte"
          aria-invalid={!!errores.nombre}
          className="campo"
          style={errores.nombre ? { borderColor: 'var(--peligro)' } : undefined}
        />
        <ErrorCampo texto={errores.nombre} />
        <Ayuda>Para distinguirla de las demás cuando tengas más de una.</Ayuda>
      </div>

      {/* --- Cultivo --- */}
      <div>
        <Etiqueta>Especie</Etiqueta>
        <Ayuda>De aquí salen el coeficiente de cultivo (Kc), las etapas y las plagas de la lista.</Ayuda>

        <div className="relative mt-3">
          <Search
            size={16}
            aria-hidden
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--apagado)' }}
          />
          <input
            type="search"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar cultivo"
            aria-label="Buscar cultivo"
            className="campo"
            style={{ paddingLeft: 36 }}
          />
        </div>

        <div id="grupo-cultivo" className="flex flex-col gap-4 mt-3">
          {GRUPOS.map(grupo => {
            const delGrupo = cultivosFiltrados.filter(c => c.grupo === grupo)
            if (delGrupo.length === 0) return null
            return (
              <div key={grupo}>
                <p className="etiqueta mb-2">{grupo}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {delGrupo.map(({ id, nombre: etiqueta, icono }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setCultivo(id)
                        if (errores.cultivo) setErrores(p => ({ ...p, cultivo: undefined }))
                      }}
                      className="opcion flex items-center gap-2 px-3 text-left"
                      style={{ minHeight: 52 }}
                      aria-pressed={cultivo === id}
                    >
                      <span aria-hidden className="text-lg leading-none">{icono}</span>
                      <span className="text-sm font-bold leading-tight">{etiqueta}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
          {cultivosFiltrados.length === 0 && (
            <p className="text-sm texto-suave">
              Ningún cultivo coincide con “{busqueda}”. Si no está en la lista, escoge “Otro
              cultivo”: el sistema seguirá midiendo humedad y registrando riegos, pero no podrá
              calcular cuánta agua pide.
            </p>
          )}
        </div>
        <ErrorCampo texto={errores.cultivo} />
      </div>

      {/* --- Etapa --- */}
      <div>
        <Etiqueta>Etapa del cultivo</Etiqueta>
        <Ayuda>
          {cultivo === ''
            ? 'Escoge primero el cultivo y aquí aparecen sus etapas.'
            : 'Cada etapa pide distinta cantidad de agua. Es el dato que más afina el cálculo.'}
        </Ayuda>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
          {etapasDisponibles.map(({ id, nombre: etiqueta, explicacion }) => (
            <button
              key={id}
              type="button"
              onClick={() => setEtapa(etapa === id ? '' : id)}
              className="opcion py-2.5 px-4 text-left"
              aria-pressed={etapa === id}
            >
              <span className="text-base font-bold block">{etiqueta}</span>
              <span className="text-sm block leading-snug" style={{ opacity: 0.85 }}>{explicacion}</span>
            </button>
          ))}
        </div>
        {etapa === '' && cultivo !== '' && (
          <Ayuda>
            Sin etapa, el cálculo usa la fase intermedia del cultivo y la app lo dice en pantalla.
          </Ayuda>
        )}
      </div>

      {/* --- Sistema de riego --- */}
      <div>
        <Etiqueta>Sistema de riego</Etiqueta>
        <Ayuda>Define cómo se dibuja el cultivo y cómo se reparte el agua en el cálculo.</Ayuda>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3" role="group" aria-label="Sistema de riego">
          {SISTEMAS_RIEGO.map(({ id, nombre: etiqueta, explicacion }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSistema(sistema === id ? '' : id)}
              className="opcion py-2.5 px-4 text-left"
              aria-pressed={sistema === id}
            >
              <span className="text-base font-bold block">{etiqueta}</span>
              <span className="text-sm block leading-snug" style={{ opacity: 0.85 }}>{explicacion}</span>
            </button>
          ))}
        </div>
      </div>

      {/* --- Superficie --- */}
      <div>
        <Etiqueta htmlFor="area-parcela">Superficie (hectáreas)</Etiqueta>
        <input
          id="area-parcela"
          type="number"
          inputMode="decimal"
          step="0.1"
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
        <Ayuda>
          Sirve para convertir milímetros en litros. Una hectárea son 10,000 m², más o menos una
          cancha de fútbol y media.
        </Ayuda>
        <button
          type="button"
          onClick={() => setVerCalcArea(v => !v)}
          className="boton boton-secundario mt-3"
          aria-expanded={verCalcArea}
        >
          <Calculator size={17} aria-hidden />
          {verCalcArea ? 'Cerrar la calculadora' : 'No sé cuántas hectáreas son'}
        </button>
        {verCalcArea && <CalculadoraSuperficie onListo={ha => { setArea(ha); setVerCalcArea(false) }} />}
      </div>

      {/* --- Caudal --- */}
      <div>
        <Etiqueta htmlFor="caudal-parcela">Caudal de la bomba (litros por minuto)</Etiqueta>
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
        <Ayuda>
          Es lo que convierte los minutos de riego en litros y en costo. Mientras falte, el sistema
          registra los minutos y dice que no puede calcular el volumen.
        </Ayuda>
        <button
          type="button"
          onClick={() => setVerCalcCaudal(v => !v)}
          className="boton boton-secundario mt-3"
          aria-expanded={verCalcCaudal}
        >
          <Calculator size={17} aria-hidden />
          {verCalcCaudal ? 'Cerrar la calculadora' : 'No sé cuánto da mi bomba'}
        </button>
        {verCalcCaudal && <CalculadoraCaudal onListo={lpm => { setCaudal(lpm); setVerCalcCaudal(false) }} />}
      </div>

      {/* --- Punto de riego --- */}
      <div>
        <Etiqueta>Punto de riego</Etiqueta>
        <Ayuda>
          La bomba arranca sola cuando la humedad del suelo baja de este valor. Es el número que
          acciona el equipo, no un dato de pantalla.
        </Ayuda>
        <div className="flex items-center justify-between gap-4 mt-3">
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
          <p className="font-bold leading-none" style={{ fontSize: 'clamp(2.1rem, 10vw, 3.1rem)', color: 'var(--agua)' }} role="status">
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
        <p className="text-base font-semibold rounded-lg p-4 sobre-estado" style={{ background: 'var(--peligro)' }} role="alert">
          {aviso}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button type="button" onClick={guardar} disabled={guardando} className="boton boton-primario boton-ancho">
          {guardando ? 'Guardando…' : 'Guardar ficha'}
        </button>
        {onCancelar && (
          <button type="button" onClick={onCancelar} className="boton boton-secundario" style={{ color: 'var(--tinta-suave)' }}>
            Cancelar
          </button>
        )}
        <p className="text-sm text-center texto-suave">
          El sensor se asocia solo, por el aparato que ya está midiendo.
        </p>
      </div>
    </section>
  )
}

// --- Calculadora de superficie ---
// Se mide con lo que hay: pasos, cinta o el odómetro de la camioneta.

function CalculadoraSuperficie({ onListo }: { onListo: (hectareas: string) => void }) {
  const [largo, setLargo] = useState('')
  const [ancho, setAncho] = useState('')

  const m2 = (aNumero(largo) ?? 0) * (aNumero(ancho) ?? 0)
  const hectareas = m2 / M2_POR_HECTAREA

  return (
    <div className="hueco flex flex-col gap-3 mt-3" style={{ padding: 14, borderRadius: 'var(--radio-sm)' }}>
      <p className="text-sm texto-suave">
        Mide el largo y el ancho del terreno en metros. Si no tienes cinta, un paso normal de adulto
        mide entre 70 y 80 cm: cuenta pasos y multiplica.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="calc-largo" className="block text-sm mb-1 texto-suave">Largo (m)</label>
          <input id="calc-largo" type="number" inputMode="decimal" min="0" value={largo}
            onChange={e => setLargo(e.target.value)} className="campo" placeholder="200" />
        </div>
        <div>
          <label htmlFor="calc-ancho" className="block text-sm mb-1 texto-suave">Ancho (m)</label>
          <input id="calc-ancho" type="number" inputMode="decimal" min="0" value={ancho}
            onChange={e => setAncho(e.target.value)} className="campo" placeholder="60" />
        </div>
      </div>
      {m2 > 0 && (
        <>
          <p className="text-base" role="status">
            {m2.toLocaleString('es-MX')} m² ={' '}
            <strong style={{ color: 'var(--agua)' }}>{hectareas.toFixed(2)} hectáreas</strong>
          </p>
          <button type="button" className="boton boton-primario" onClick={() => onListo(hectareas.toFixed(2))}>
            Usar {hectareas.toFixed(2)} ha
          </button>
        </>
      )}
      <p className="text-sm texto-suave">
        Si el terreno no es rectangular, divídelo en rectángulos, calcula cada uno y súmalos.
      </p>
    </div>
  )
}

// --- Calculadora de caudal ---
// Cubeta, reloj y una división. El cronómetro va aquí para no depender de que
// alguien traiga uno.

function CalculadoraCaudal({ onListo }: { onListo: (lpm: string) => void }) {
  const [litros, setLitros] = useState('')
  const [segundos, setSegundos] = useState('')
  const [corriendo, setCorriendo] = useState(false)
  const [transcurrido, setTranscurrido] = useState(0)
  const desde = useRef<number>(0)

  useEffect(() => {
    if (!corriendo) return
    const id = setInterval(() => setTranscurrido((Date.now() - desde.current) / 1000), 100)
    return () => clearInterval(id)
  }, [corriendo])

  const l = aNumero(litros)
  const s = aNumero(segundos)
  const lpm = l !== null && s !== null && s > 0 ? (l / s) * 60 : null

  return (
    <div className="hueco flex flex-col gap-3 mt-3" style={{ padding: 14, borderRadius: 'var(--radio-sm)' }}>
      <p className="text-sm texto-suave">
        Pon una cubeta de medida conocida bajo la salida, abre la bomba y toma el tiempo que tarda
        en llenarse. Con eso sale el caudal.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="calc-litros" className="block text-sm mb-1 texto-suave">Litros juntados</label>
          <input id="calc-litros" type="number" inputMode="decimal" min="0" value={litros}
            onChange={e => setLitros(e.target.value)} className="campo" placeholder="20" />
        </div>
        <div>
          <label htmlFor="calc-segundos" className="block text-sm mb-1 texto-suave">Segundos que tardó</label>
          <input id="calc-segundos" type="number" inputMode="decimal" min="0" value={segundos}
            onChange={e => setSegundos(e.target.value)} className="campo" placeholder="30" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-base font-bold" style={{ fontVariantNumeric: 'tabular-nums' }} role="timer">
          {transcurrido.toFixed(1)} s
        </span>
        {corriendo ? (
          <button
            type="button"
            className="boton boton-primario"
            onClick={() => {
              setCorriendo(false)
              setSegundos(((Date.now() - desde.current) / 1000).toFixed(1))
            }}
          >
            <Square size={16} aria-hidden />
            Detener y usar el tiempo
          </button>
        ) : (
          <button
            type="button"
            className="boton boton-secundario"
            onClick={() => {
              desde.current = Date.now()
              setTranscurrido(0)
              setCorriendo(true)
            }}
          >
            <Play size={16} aria-hidden />
            Cronómetro
          </button>
        )}
      </div>

      {lpm !== null && (
        <>
          <p className="text-base" role="status">
            La bomba da <strong style={{ color: 'var(--agua)' }}>{lpm.toFixed(1)} litros por minuto</strong>
            {' '}({(lpm * 60 / 1000).toFixed(1)} m³ por hora).
          </p>
          <button type="button" className="boton boton-primario" onClick={() => onListo(lpm.toFixed(1))}>
            Usar {lpm.toFixed(1)} L/min
          </button>
        </>
      )}

      <p className="text-sm texto-suave">
        Hazlo dos o tres veces y usa el promedio. Si el riego es por goteo, mide en la salida de la
        bomba, no en un gotero.
      </p>
    </div>
  )
}
