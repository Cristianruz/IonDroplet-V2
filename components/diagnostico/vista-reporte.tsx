'use client'

import Link from 'next/link'
import { AlertTriangle, Camera, CheckCircle2, MessageCircle, Microscope, Search, Stethoscope, XCircle } from 'lucide-react'
import { colorEstado } from '@/lib/estilo'
import {
  NIVEL_PROBABILIDAD,
  TEXTO_PROBABILIDAD,
  TEXTO_SEVERIDAD,
  TEXTO_TIPO,
  TEXTO_URGENCIA,
  colorDeUrgencia,
  preguntaDeSeguimiento,
  type Hipotesis,
  type ReporteDiagnostico,
} from '@/lib/diagnostico'

interface Props {
  reporte: ReporteDiagnostico
  cultivoDeclarado: string | null
  onAgregarFoto: () => void
  onEmpezarDeNuevo: () => void
}

function Bloque({ titulo, icono, children }: { titulo: string; icono: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="tarjeta flex flex-col gap-3" aria-label={titulo}>
      <div className="flex items-center gap-2">
        {icono}
        <h2 className="titulo-bloque">{titulo}</h2>
      </div>
      {children}
    </section>
  )
}

function Lista({ elementos }: { elementos: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5 text-[0.95rem] leading-snug">
      {elementos.map((e, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden className="texto-apagado">•</span>
          <span>{e}</span>
        </li>
      ))}
    </ul>
  )
}

function BarraProbabilidad({ h }: { h: Hipotesis }) {
  const nivel = NIVEL_PROBABILIDAD[h.probabilidad]
  return (
    <div className="flex items-center gap-2" aria-label={`Probabilidad: ${TEXTO_PROBABILIDAD[h.probabilidad]}`}>
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3].map(n => (
          <span
            key={n}
            style={{
              width: 18,
              height: 6,
              borderRadius: 3,
              background: n <= nivel ? 'var(--verde)' : 'var(--pista)',
            }}
          />
        ))}
      </div>
      <span className="text-sm font-bold">{TEXTO_PROBABILIDAD[h.probabilidad]}</span>
    </div>
  )
}

function TarjetaHipotesis({ h, orden }: { h: Hipotesis; orden: number }) {
  const benefico = h.tipo === 'insecto_benefico'
  return (
    <article
      className="flex flex-col gap-3 p-4"
      style={{ borderRadius: 'var(--radio-sm)', background: 'var(--cristal-suave)', border: '1px solid var(--borde)' }}
    >
      <div className="flex flex-col gap-1">
        <p className="etiqueta">
          {orden === 1 ? 'Lo más probable' : `Posibilidad ${orden}`} · {TEXTO_TIPO[h.tipo]}
        </p>
        <h3 className="text-lg font-bold leading-tight">{h.nombre}</h3>
        {h.nombreCientifico && <p className="text-sm italic texto-suave">{h.nombreCientifico}</p>}
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <BarraProbabilidad h={h} />
          {h.delCatalogo && <span className="marca">En tu lista de plagas</span>}
          {benefico && <span className="capsula capsula-nivel" style={colorEstado('var(--verde)')}>Te ayuda: no lo combatas</span>}
        </div>
      </div>

      {h.aFavor.length > 0 && (
        <div>
          <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--verde)' }}>
            <CheckCircle2 size={15} aria-hidden /> Lo que apunta a esto
          </p>
          <Lista elementos={h.aFavor} />
        </div>
      )}
      {h.enContra.length > 0 && (
        <div>
          <p className="text-sm font-bold flex items-center gap-1.5 texto-suave">
            <XCircle size={15} aria-hidden /> Lo que no cuadra
          </p>
          <Lista elementos={h.enContra} />
        </div>
      )}
      {h.comoConfirmarlo && (
        <div>
          <p className="text-sm font-bold flex items-center gap-1.5">
            <Search size={15} aria-hidden /> Cómo confirmarlo en campo
          </p>
          <p className="text-[0.95rem] leading-snug">{h.comoConfirmarlo}</p>
        </div>
      )}
    </article>
  )
}

export function VistaReporte({ reporte: r, cultivoDeclarado, onAgregarFoto, onEmpezarDeNuevo }: Props) {
  const color = colorDeUrgencia(r.urgencia)
  const hayProblema = r.hipotesis.length > 0 && r.severidad !== 'ninguna'

  return (
    <div className="flex flex-col gap-4">
      {/* La foto no sirvió: eso va primero, antes que cualquier conclusión. */}
      {!r.fotoUtil && (
        <div className="aviso aviso-peligro flex gap-2" role="alert">
          <AlertTriangle size={18} aria-hidden style={{ color: 'var(--peligro)', flexShrink: 0 }} />
          <div>
            <p className="font-bold">Con esta foto no se puede analizar bien</p>
            {r.problemaDeFoto && <p>{r.problemaDeFoto}</p>}
          </div>
        </div>
      )}

      <section className="tarjeta flex flex-col gap-3" aria-label="Resultado">
        <div className="flex flex-wrap items-center gap-2">
          <span className="capsula" style={colorEstado(color)}>{TEXTO_URGENCIA[r.urgencia]}</span>
          {hayProblema && <span className="marca">{TEXTO_SEVERIDAD[r.severidad]}</span>}
        </div>
        <p className="text-lg font-semibold leading-snug">{r.resumen}</p>
        {r.plantaVista && (
          <p className="text-sm texto-suave">
            Planta que se ve: <strong>{r.plantaVista}</strong>
            {r.coincideConCultivo === 'no' && cultivoDeclarado && (
              <> — no parece {cultivoDeclarado.toLowerCase()}. Revisa que la foto corresponda al cultivo seleccionado.</>
            )}
          </p>
        )}
      </section>

      {r.observaciones.length > 0 && (
        <Bloque titulo="Lo que se observa" icono={<Microscope size={18} aria-hidden style={{ color: 'var(--verde)' }} />}>
          <Lista elementos={r.observaciones} />
        </Bloque>
      )}

      {r.hipotesis.length > 0 && (
        <Bloque titulo="Posibles causas" icono={<Stethoscope size={18} aria-hidden style={{ color: 'var(--verde)' }} />}>
          <div className="flex flex-col gap-3">
            {r.hipotesis.map((h, i) => (
              <TarjetaHipotesis key={`${h.nombre}-${i}`} h={h} orden={i + 1} />
            ))}
          </div>
        </Bloque>
      )}

      {(r.accionesInmediatas.length > 0 || r.relacionConElRiego || r.cuandoLlamarATecnico) && (
        <Bloque titulo="Qué hacer" icono={<CheckCircle2 size={18} aria-hidden style={{ color: 'var(--verde)' }} />}>
          {r.accionesInmediatas.length > 0 && <Lista elementos={r.accionesInmediatas} />}
          {r.relacionConElRiego && (
            <div>
              <p className="etiqueta mb-1">Y el riego</p>
              <p className="text-[0.95rem] leading-snug">{r.relacionConElRiego}</p>
            </div>
          )}
          {r.cuandoLlamarATecnico && (
            <div>
              <p className="etiqueta mb-1">Cuándo llamar a un técnico</p>
              <p className="text-[0.95rem] leading-snug">{r.cuandoLlamarATecnico}</p>
            </div>
          )}
        </Bloque>
      )}

      {r.siguienteFoto && (
        <div className="aviso flex flex-col gap-3">
          <p>
            <strong>Para afinar el análisis:</strong> {r.siguienteFoto}
          </p>
          <button type="button" onClick={onAgregarFoto} className="boton boton-secundario">
            <Camera size={18} aria-hidden />
            Agregar esa foto y volver a analizar
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Link
          href={`/asistente?pregunta=${encodeURIComponent(preguntaDeSeguimiento(r))}`}
          className="boton boton-primario"
        >
          <MessageCircle size={18} aria-hidden />
          Preguntarle al asistente
        </Link>
        <button type="button" onClick={onEmpezarDeNuevo} className="boton boton-secundario">
          Revisar otra planta
        </button>
      </div>

      <p className="text-sm text-center texto-suave">
        Es un análisis a partir de fotos, no un diagnóstico de laboratorio. Antes de aplicar
        cualquier producto, confírmalo con un técnico.
      </p>
    </div>
  )
}
