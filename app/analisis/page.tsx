'use client'

import { RefreshCw, Check, CloudSun, Info, Zap } from 'lucide-react'
import { useAnalisis, type Nivel, type Confianza } from '@/hooks/use-analisis'
import { useIonDroplet } from '@/hooks/use-iondroplet'
import { AgenteCard } from '@/components/ia/agente-card'
import { haceCuanto } from '@/lib/tiempo'
import { colorEstado } from '@/lib/estilo'

// El análisis del cultivo. Esta pantalla ocupa el lugar que antes tenía
// Ionización, que era una pestaña entera para un solo botón.
//
// CÓMO ESTÁ REPARTIDO EL TRABAJO: los indicadores los calcula el servidor con
// datos reales; la IA los interpreta y los ordena. Por eso cada riesgo enseña
// EL NÚMERO que lo sostiene: para que se pueda verificar en vez de creer.

const COLOR_NIVEL: Record<Nivel, string> = {
  alto: 'var(--peligro)',
  medio: 'var(--alerta)',
  bajo: 'var(--ok)',
}

const TEXTO_NIVEL: Record<Nivel, string> = {
  alto: 'Alto',
  medio: 'Medio',
  bajo: 'Bajo',
}

const TEXTO_CONFIANZA: Record<Confianza, string> = {
  alta: 'Datos completos',
  media: 'Faltan algunos datos',
  baja: 'Faltan datos importantes',
}

const COLOR_CONFIANZA: Record<Confianza, string> = {
  alta: 'var(--ok)',
  media: 'var(--alerta)',
  baja: 'var(--peligro)',
}

export default function PantallaAnalisis() {
  const { analisis, indicadores, cuando, estado, refrescando, refrescar } = useAnalisis()
  const { conectado, estadoEsp } = useIonDroplet({ conHistorial: false })
  // Un solo relé prende la bomba y las varillas: si está regando, está ionizando.
  const ionizando = estadoEsp.pumpState === 1

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4 pb-3 flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="titulo-pantalla">Análisis</h1>
        <button
          type="button"
          onClick={refrescar}
          disabled={refrescando || estado === 'cargando'}
          className="boton boton-secundario"
          style={{ minHeight: 42, padding: '0 16px', borderRadius: 'var(--radio-pill)', fontSize: 15 }}
        >
          <RefreshCw
            size={15}
            aria-hidden
            style={{ animation: refrescando ? 'girar 1s linear infinite' : undefined }}
          />
          {refrescando ? 'Revisando…' : 'Revisar'}
        </button>
      </header>

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

      {estado === 'solo_dueno' && (
        <p className="aviso">
          El análisis con IA lo pide el dueño del sistema desde su computadora. Lo demás de esta
          pantalla son datos medidos, no opiniones de la IA.
        </p>
      )}

      {estado === 'sin_configurar' && (
        <p className="aviso">El asistente no está configurado en esta computadora.</p>
      )}

      {estado === 'error' && conectado && (
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

      {/* --- Resumen: cómo va y qué viene, en un solo lugar --- */}
      {analisis && (
        <section className="tarjeta flex flex-col gap-3" aria-label="Resumen">
          <div className="flex items-start justify-between gap-3">
            <h2 className="titulo-bloque">Cómo va tu cultivo</h2>
            <span
              className="capsula capsula-nivel"
              style={colorEstado(COLOR_CONFIANZA[analisis.confianza] ?? 'var(--apagado)')}
              title={analisis.porque_confianza}
            >
              {TEXTO_CONFIANZA[analisis.confianza] ?? analisis.confianza}
            </span>
          </div>
          <p className="text-[16px] leading-relaxed">{analisis.resumen}</p>
          {analisis.pronostico && (
            <p className="text-[15px] leading-relaxed texto-suave flex items-start gap-2">
              <CloudSun size={18} aria-hidden style={{ flexShrink: 0, marginTop: 2, color: 'var(--alerta)' }} />
              {analisis.pronostico}
            </p>
          )}
          {cuando && (
            <p className="text-xs texto-apagado">Revisado {haceCuanto(new Date(cuando)) ?? ''}</p>
          )}
        </section>
      )}

      {/* --- Qué hacer: lo primero que se busca después del resumen --- */}
      {analisis && analisis.acciones?.length > 0 && (
        <section className="tarjeta flex flex-col gap-3" aria-label="Qué te recomiendo">
          <h2 className="titulo-bloque">Qué te recomiendo</h2>
          <ol className="flex flex-col gap-3.5">
            {analisis.acciones.map((a, i) => (
              <li key={i} className="flex gap-3">
                <span className="icono-redondo" style={{ width: 30, height: 30 }} aria-hidden>
                  <Check size={16} />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[16px] font-semibold leading-snug">{a.texto}</span>
                  <span className="text-sm texto-suave">{a.porque}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* --- Riesgos: una lista, cada uno con el número que lo sostiene --- */}
      {analisis && analisis.riesgos?.length > 0 && (
        <section className="tarjeta flex flex-col" aria-label="Riesgos de la semana">
          <h2 className="titulo-bloque pb-1">Riesgos de la semana</h2>
          <ul className="flex flex-col">
            {analisis.riesgos.map((r, i) => (
              <li
                key={r.nombre}
                className="flex flex-col gap-1.5 py-3.5"
                style={{ borderTop: i > 0 ? '1px solid var(--borde)' : undefined }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[16px] font-semibold">{r.nombre}</span>
                  <span className="capsula capsula-nivel" style={colorEstado(COLOR_NIVEL[r.nivel] ?? 'var(--apagado)')}>
                    {TEXTO_NIVEL[r.nivel] ?? r.nivel}
                  </span>
                </div>
                {/* El número que sostiene el nivel. Sin esto sería una opinión. */}
                {r.dato && (
                  <span className="text-sm font-semibold texto-suave" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {r.dato}
                  </span>
                )}
                <p className="text-[15px]">{r.quehacer}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- El agente ---
          Lo que el sistema ajustó solo, con su razón y su botón de regreso.
          Se enseña a propósito: un sistema que mueve el punto de riego sin
          que se note es un sistema en el que no se puede confiar. */}
      <AgenteCard />

      {/* --- Ionización ---
          En el prototipo no es un aparato aparte: el mismo relé que prende la
          bomba le da corriente a las varillas que ionizan el agua. Por eso aquí
          no hay botón propio (antes lo había y no movía nada) y el estado sale
          del relé, no de lo último que se tocó en la app. */}
      <section className="tarjeta flex flex-col gap-3" aria-label="Agua ionizada">
        <div className="flex items-start justify-between gap-3">
          <h2 className="titulo-bloque flex items-center gap-2">
            <Zap size={18} aria-hidden style={{ color: 'var(--oro)' }} />
            Agua ionizada
          </h2>
          {ionizando ? (
            <span className="capsula" style={colorEstado('var(--oro)')}>Ionizando</span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm texto-suave mt-0.5">
              <span className="punto" style={{ background: 'var(--apagado)' }} aria-hidden />
              Apagada
            </span>
          )}
        </div>

        <p className="text-[15px] texto-suave">
          Cada vez que la bomba riega, las varillas ionizan el agua.
          {indicadores?.riego7d?.pct_con_ionizacion != null && (
            <> Esta semana, <strong style={{ color: 'var(--tinta)' }}>{indicadores.riego7d.pct_con_ionizacion}%</strong> del riego llevó agua ionizada.</>
          )}
        </p>

        {analisis?.ionizacion && (
          <p className="text-[15px]">
            <strong>{analisis.ionizacion.recomendada ? 'Conviene regar con agua ionizada.' : 'Por ahora no es necesario.'}</strong>{' '}
            <span className="texto-suave">{analisis.ionizacion.porque}</span>
          </p>
        )}

        <details className="text-sm texto-apagado">
          <summary className="cursor-pointer font-semibold">¿Qué tan seguro es este dato?</summary>
          <p className="pt-2">
            El relé no avisa su estado por su cuenta: aquí se ve la última orden que se le mandó.
            Tampoco se mide ninguna propiedad del agua, así que el sistema no puede demostrar el
            efecto de la ionización.
          </p>
        </details>
      </section>

      {/* --- Lo que falta --- */}
      {analisis && analisis.faltantes?.length > 0 && (
        <section className="tarjeta flex flex-col gap-2" aria-label="Lo que le falta al análisis">
          <h2 className="titulo-bloque flex items-center gap-2">
            <Info size={18} aria-hidden className="texto-apagado" />
            Con qué mejoraría este análisis
          </h2>
          <ul className="flex flex-col gap-1.5">
            {analisis.faltantes.map((f, i) => (
              <li key={i} className="text-[15px] texto-suave flex gap-2">
                <span className="punto" style={{ background: 'var(--apagado)', marginTop: 9 }} aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
