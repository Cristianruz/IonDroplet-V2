'use client'

import { RefreshCw, TriangleAlert, ListChecks, CloudSun, Info, Zap } from 'lucide-react'
import { useAnalisis, type Nivel, type Confianza } from '@/hooks/use-analisis'
import { useIonDroplet } from '@/hooks/use-iondroplet'
import { AvisoSinConexion } from '@/components/aviso-sin-conexion'
import { Aparece } from '@/components/aparece'
import { haceCuanto } from '@/lib/tiempo'

// El análisis del cultivo. Esta pantalla ocupa el lugar que antes tenía
// Ionización, que era una pestaña entera para un solo botón.
//
// CÓMO ESTÁ REPARTIDO EL TRABAJO: los indicadores los calcula el servidor con
// datos reales; la IA los interpreta y los ordena. Por eso cada riesgo enseña
// EL NÚMERO que lo sostiene: para que se pueda verificar en vez de creer.

const COLOR_NIVEL: Record<Nivel, string> = {
  alto: 'var(--peligro)',
  medio: 'var(--alerta)',
  bajo: 'var(--verde)',
}

const TEXTO_CONFIANZA: Record<Confianza, string> = {
  alta: 'Datos completos',
  media: 'Faltan algunos datos',
  baja: 'Faltan datos importantes',
}

const COLOR_CONFIANZA: Record<Confianza, string> = {
  alta: 'var(--verde)',
  media: 'var(--alerta)',
  baja: 'var(--peligro)',
}

export default function PantallaAnalisis() {
  const { analisis, indicadores, cuando, estado, refrescando, refrescar } = useAnalisis()
  const { conectado, ionizacion, cambiarIonizacion } = useIonDroplet({ conHistorial: false })

  return (
    <main className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="titulo-pantalla">Análisis</h1>
        <button
          type="button"
          onClick={refrescar}
          disabled={refrescando || estado === 'cargando'}
          className="boton boton-sutil"
        >
          <RefreshCw
            size={15}
            aria-hidden
            style={{ animation: refrescando ? 'girar 1s linear infinite' : undefined }}
          />
          {refrescando ? 'Revisando…' : 'Revisar de nuevo'}
        </button>
      </header>

      {!conectado && <AvisoSinConexion />}

      {(estado === 'cargando' || refrescando) && (
        <div className="flex flex-col gap-3">
          {/* Revisar todo tarda cerca de medio minuto. Decirlo evita que
              parezca que se colgó. Después queda guardado 20 minutos y
              abre al instante. */}
          <p className="text-sm texto-suave" role="status">
            Revisando el cultivo, el clima y el riego. Tarda unos segundos.
          </p>
          <div className="esqueleto" style={{ width: '100%', height: 92 }} aria-hidden />
          <div className="esqueleto" style={{ width: '100%', height: 140 }} aria-hidden />
        </div>
      )}

      {estado === 'sin_configurar' && (
        <p className="aviso">El asistente no está configurado en esta computadora.</p>
      )}

      {estado === 'error' && (
        <p className="aviso aviso-peligro">
          No se pudo armar el análisis. Revisa que la computadora del riego esté encendida.
        </p>
      )}

      {estado === 'listo' && !analisis && (
        <p className="aviso">
          El asistente respondió, pero no en el formato esperado. Los indicadores de abajo sí son
          confiables: los calcula el sistema, no la IA.
        </p>
      )}

      {/* --- Resumen --- */}
      {analisis && (
        <Aparece>
          <section className="tarjeta flex flex-col gap-3" aria-label="Resumen">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="etiqueta">Lo que veo</span>
              <span className="flex items-center gap-1.5 text-xs texto-suave">
                <span className="punto" style={{ background: COLOR_CONFIANZA[analisis.confianza] ?? 'var(--apagado)' }} aria-hidden />
                {TEXTO_CONFIANZA[analisis.confianza] ?? analisis.confianza}
              </span>
            </div>
            <p className="text-sm leading-relaxed">{analisis.resumen}</p>
            <p className="text-xs texto-apagado">{analisis.porque_confianza}</p>
            {cuando && (
              <p className="text-xs texto-apagado">
                Revisado {haceCuanto(new Date(cuando))?.replace('hace', 'hace') ?? ''}
              </p>
            )}
          </section>
        </Aparece>
      )}

      {/* --- Riesgos --- */}
      {analisis && analisis.riesgos?.length > 0 && (
        <Aparece>
          <section className="flex flex-col gap-2" aria-label="Riesgos">
            <span className="etiqueta flex items-center gap-1.5">
              <TriangleAlert size={13} aria-hidden />
              Riesgos
            </span>
            {analisis.riesgos.map(r => (
              <article
                className="tarjeta flex flex-col gap-2"
                key={r.nombre}
                style={{ borderLeft: `3px solid ${COLOR_NIVEL[r.nivel] ?? 'var(--borde)'}` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="titulo-bloque">{r.nombre}</span>
                  <span
                    className="text-xs font-bold uppercase tracking-wide"
                    style={{ color: COLOR_NIVEL[r.nivel] ?? 'var(--tinta-suave)' }}
                  >
                    {r.nivel}
                  </span>
                </div>
                {/* El número que sostiene el nivel. Sin esto sería una opinión. */}
                {r.dato && <p className="text-xs texto-apagado">{r.dato}</p>}
                <p className="text-sm texto-suave">{r.porque}</p>
                <p className="text-sm font-semibold">{r.quehacer}</p>
              </article>
            ))}
          </section>
        </Aparece>
      )}

      {/* --- Qué esperar --- */}
      {analisis?.pronostico && (
        <Aparece>
          <section className="tarjeta flex flex-col gap-2" aria-label="Qué esperar">
            <span className="etiqueta flex items-center gap-1.5">
              <CloudSun size={13} aria-hidden />
              Qué esperar estos días
            </span>
            <p className="text-sm leading-relaxed">{analisis.pronostico}</p>
          </section>
        </Aparece>
      )}

      {/* --- Acciones --- */}
      {analisis && analisis.acciones?.length > 0 && (
        <Aparece>
          <section className="tarjeta flex flex-col gap-3" aria-label="Qué conviene hacer">
            <span className="etiqueta flex items-center gap-1.5">
              <ListChecks size={13} aria-hidden />
              Qué conviene hacer
            </span>
            <ol className="flex flex-col gap-3">
              {analisis.acciones.map((a, i) => (
                <li key={i} className="flex gap-2.5">
                  <span
                    className="punto"
                    style={{ background: COLOR_NIVEL[a.prioridad] ?? 'var(--apagado)', marginTop: 7 }}
                    aria-hidden
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{a.texto}</span>
                    <span className="text-xs texto-suave">{a.porque}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </Aparece>
      )}

      {/* --- Ionización ---
          Vive aquí y ya no en su propia pestaña: es una decisión de riego, y
          ahora la IA dice si conviene. Lo que NO cambia: el aparato no
          confirma su estado, y eso se sigue diciendo con todas sus letras. */}
      <Aparece>
        <section className="tarjeta flex flex-col gap-3" aria-label="Agua ionizada">
          <div className="flex items-center justify-between gap-2">
            <span className="etiqueta flex items-center gap-1.5">
              <Zap size={13} aria-hidden />
              Agua ionizada
            </span>
            <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: ionizacion ? 'var(--oro)' : 'var(--tinta-suave)' }}>
              <span className="punto" style={{ background: ionizacion ? 'var(--oro)' : 'var(--apagado)' }} aria-hidden />
              {ionizacion ? 'Encendida' : 'Apagada'}
            </span>
          </div>

          {analisis?.ionizacion && (
            <p className="text-sm texto-suave">
              <strong style={{ color: analisis.ionizacion.recomendada ? 'var(--verde)' : 'var(--tinta)' }}>
                {analisis.ionizacion.recomendada ? 'Conviene encenderla.' : 'Ahorita no hace falta.'}
              </strong>{' '}
              {analisis.ionizacion.porque}
            </p>
          )}

          {indicadores?.riego7d?.pct_con_ionizacion !== null &&
            indicadores?.riego7d?.pct_con_ionizacion !== undefined && (
              <p className="text-sm">
                De lo que regaste esta semana,{' '}
                <strong>{indicadores.riego7d.pct_con_ionizacion}%</strong> llevó agua ionizada.
              </p>
            )}

          <button
            type="button"
            onClick={cambiarIonizacion}
            className={`boton boton-ancho ${ionizacion ? 'boton-secundario' : 'boton-primario'}`}
            aria-pressed={ionizacion}
          >
            {ionizacion ? 'Apagar la ionización' : 'Encender la ionización'}
          </button>

          <p className="text-xs texto-apagado">
            El ionizador no avisa su estado por su cuenta: aquí se ve lo último que se le pidió
            desde esta aplicación. Tampoco se mide ninguna propiedad del agua, así que el sistema
            no puede demostrar su efecto.
          </p>
        </section>
      </Aparece>

      {/* --- Lo que falta --- */}
      {analisis && analisis.faltantes?.length > 0 && (
        <Aparece>
          <section className="tarjeta flex flex-col gap-2" aria-label="Lo que le falta al análisis">
            <span className="etiqueta flex items-center gap-1.5">
              <Info size={13} aria-hidden />
              Con qué mejoraría este análisis
            </span>
            <ul className="flex flex-col gap-1.5">
              {analisis.faltantes.map((f, i) => (
                <li key={i} className="text-sm texto-suave flex gap-2">
                  <span className="punto" style={{ background: 'var(--apagado)', marginTop: 7 }} aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
          </section>
        </Aparece>
      )}
    </main>
  )
}
