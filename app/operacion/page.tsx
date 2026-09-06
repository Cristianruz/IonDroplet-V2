'use client'

import Link from 'next/link'
import { ArrowLeft, Activity, Database, Gauge, TriangleAlert, CircleCheck, CircleSlash } from 'lucide-react'
import { useIonDroplet } from '@/hooks/use-iondroplet'
import { useParcela } from '@/hooks/use-parcela'
import { useBalance } from '@/hooks/use-balance'
import { useRegistro } from '@/hooks/use-registro'
import { SerieDensa } from '@/components/serie-densa'
import { haceCuanto, fechaCorta, duracionLarga } from '@/lib/tiempo'
import { CULTIVOS } from '@/lib/cultivos'

// PANEL DE OPERACIÓN — la misma información que ve el agricultor, dicha en
// ingeniero. No sustituye a ninguna pantalla: es una vista aparte, para el
// jurado, los profesores y quien tenga que auditar de dónde salió cada número.
//
// POR QUÉ EXISTE (viene de ANALISIS.md): la app está diseñada para un
// agricultor de 45-50 años, en el campo, bajo el sol, con guantes. Un dato
// grande por pantalla y lenguaje llano. Eso funciona para él y se lee como app
// de consumo para un evaluador técnico. Son dos audiencias con necesidades
// opuestas, y forzar una sola pantalla las empeora a las dos.
//
// El Modo Campo NO se toca. Esta ruta es aditiva.

const ETAPAS: Record<string, string> = {
  siembra: 'Siembra',
  crecimiento: 'Desarrollo vegetativo',
  floracion: 'Floración',
  fruto: 'Llenado de fruto',
  cosecha: 'Maduración / cosecha',
  descanso: 'Reposo',
}

function nombreCultivo(id: string | null): string {
  if (!id) return '—'
  return CULTIVOS.find(c => c.id === id)?.nombre ?? id
}

/** Una cifra del encabezado. Sin dato es una raya, nunca un cero inventado. */
function Kpi({
  etiqueta,
  valor,
  unidad,
  nota,
  tono,
}: {
  etiqueta: string
  valor: string | number | null
  unidad?: string
  nota?: string
  tono?: 'agua' | 'alerta' | 'verde'
}) {
  const color =
    tono === 'agua' ? 'var(--agua)' : tono === 'alerta' ? 'var(--alerta)' : tono === 'verde' ? 'var(--verde)' : 'var(--tinta)'
  return (
    <div className="op-kpi">
      <span className="op-kpi-etiqueta">{etiqueta}</span>
      <span className="op-kpi-valor" style={{ color: valor === null ? 'var(--apagado)' : color }}>
        {valor === null ? '—' : valor}
        {valor !== null && unidad && <span className="op-kpi-unidad">{unidad}</span>}
      </span>
      {nota && <span className="op-kpi-nota">{nota}</span>}
    </div>
  )
}

/** Punto de estado: color y texto, sin fondo de semáforo. */
function Estado({ ok, texto }: { ok: boolean | null; texto: string }) {
  const color = ok === null ? 'var(--apagado)' : ok ? 'var(--verde)' : 'var(--peligro)'
  return (
    <span className="op-estado">
      <span className="op-punto" style={{ background: color }} aria-hidden />
      {texto}
    </span>
  )
}

export default function PanelOperacion() {
  const { parcela, umbralRiego } = useParcela()
  const { humedad, ultimaLectura, conectado, sensorActivo, estadoEsp, historial } = useIonDroplet()
  const { balance, estado: estadoBalance } = useBalance(7)
  const { acciones, cargando: cargandoRegistro } = useRegistro(24 * 7)

  const riegos7d = acciones.filter(a => a.tipo === 'riego')
  const segundosRiego = riegos7d.reduce((s, a) => s + (a.duracion_seg ?? 0), 0)

  return (
    <main className="op">
      <header className="op-header">
        <div className="op-header-izq">
          <Link href="/" className="op-volver" aria-label="Volver al modo campo">
            <ArrowLeft size={16} aria-hidden />
            Modo campo
          </Link>
          <h1 className="op-titulo">Panel de operación</h1>
          <p className="op-sub">
            Vista técnica del sistema. Cada cifra indica su procedencia: medida, calculada,
            pronosticada o ausente.
          </p>
        </div>
        <div className="op-header-der">
          <Estado ok={conectado} texto={conectado ? 'Backend en línea' : 'Backend sin responder'} />
          <Estado
            ok={sensorActivo}
            texto={sensorActivo ? 'Sensor reportando' : 'Sensor sin reportar'}
          />
          <span className="op-sello">
            Última adquisición: {ultimaLectura ? haceCuanto(ultimaLectura) : 'sin registro'}
          </span>
        </div>
      </header>

      {/* --- RESUMEN EJECUTIVO --- */}
      <section className="op-seccion">
        <h2 className="op-h2">
          <Gauge size={15} aria-hidden /> Resumen
        </h2>
        <div className="op-kpis">
          <Kpi
            etiqueta="Humedad volumétrica"
            valor={humedad ?? null}
            unidad="%"
            nota={sensorActivo ? 'medida' : 'último valor conocido'}
            tono="agua"
          />
          <Kpi
            etiqueta="Umbral de manejo"
            valor={umbralRiego ?? null}
            unidad="%"
            nota="configurado"
          />
          <Kpi
            etiqueta="ETc acumulada 7 d"
            valor={balance?.totales.etc_mm ?? null}
            unidad=" mm"
            nota="calculada · ET₀ × Kc"
            tono="agua"
          />
          <Kpi
            etiqueta="Déficit hídrico 7 d"
            valor={balance?.totales.deficit_mm ?? null}
            unidad=" mm"
            nota={
              balance?.totales.deficit_litros_por_ha != null
                ? `${balance.totales.deficit_litros_por_ha.toLocaleString('es-MX')} L/ha`
                : undefined
            }
            tono="alerta"
          />
          <Kpi
            etiqueta="Eventos de riego 7 d"
            valor={cargandoRegistro ? null : riegos7d.length}
            nota={segundosRiego > 0 ? duracionLarga(segundosRiego) : 'sin acumulado'}
          />
          <Kpi
            etiqueta="Lámina aplicada 7 d"
            valor={null}
            unidad=" mm"
            nota="requiere caudal de bomba"
          />
        </div>
      </section>

      {/* --- BALANCE HÍDRICO --- */}
      <section className="op-seccion">
        <h2 className="op-h2">
          <Activity size={15} aria-hidden /> Balance hídrico · horizonte 7 días
        </h2>

        {estadoBalance === 'sin_ubicacion' && (
          <p className="op-vacio">
            Sin coordenadas de la parcela no hay pronóstico y, por lo tanto, no hay ET₀. Se captura
            desde Modo campo → Clima.
          </p>
        )}
        {estadoBalance === 'error' && (
          <p className="op-vacio">No se pudo consultar el servicio meteorológico.</p>
        )}

        {balance && (
          <>
            <div className="op-tabla-envoltura">
              <table className="op-tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th className="num">ET₀ (mm)</th>
                    <th className="num">Kc</th>
                    <th className="num">ETc (mm)</th>
                    <th className="num">Precipitación (mm)</th>
                    <th className="num">Déficit (mm)</th>
                  </tr>
                </thead>
                <tbody>
                  {balance.dias.map(d => (
                    <tr key={d.fecha}>
                      <td className="mono">{d.fecha}</td>
                      <td className="num mono">{d.et0_mm ?? '—'}</td>
                      <td className="num mono">{balance.kc ?? '—'}</td>
                      <td className="num mono">{d.etc_mm ?? '—'}</td>
                      <td className="num mono">{d.lluvia_mm.toFixed(2)}</td>
                      <td className="num mono" style={{ color: 'var(--alerta)', fontWeight: 700 }}>
                        {d.deficit_mm ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Acumulado</td>
                    <td className="num mono">{balance.totales.et0_mm}</td>
                    <td className="num">—</td>
                    <td className="num mono">{balance.totales.etc_mm ?? '—'}</td>
                    <td className="num mono">{balance.totales.lluvia_mm.toFixed(2)}</td>
                    <td className="num mono" style={{ color: 'var(--alerta)' }}>
                      {balance.totales.deficit_mm ?? '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="op-pie">
              ET₀ por el método FAO Penman-Monteith, entregada por Open-Meteo para{' '}
              {balance.parcela.nombre ?? 'la parcela'}. Kc de las tablas FAO-56, repartido por
              etapa fenológica en <code>guia-cultivos.js</code>; pendiente de revisión agronómica.
              Equivalencia de unidades: 1 mm sobre 1 ha = 10 000 L.
            </p>

            {balance.faltantes.length > 0 && (
              <div className="op-faltantes">
                <span className="op-faltantes-titulo">
                  <TriangleAlert size={14} aria-hidden /> Datos ausentes que acotan el cálculo
                </span>
                <ul>
                  {balance.faltantes.map(f => (
                    <li key={f.dato}>
                      <code>{f.dato}</code> — {f.porque}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      {/* --- SERIE --- */}
      <section className="op-seccion">
        <h2 className="op-h2">
          <Activity size={15} aria-hidden /> Serie de humedad volumétrica
        </h2>
        {historial.length < 2 ? (
          <p className="op-vacio">
            No hay lecturas en la ventana de 24 h.{' '}
            {ultimaLectura
              ? `La adquisición más reciente es de ${haceCuanto(ultimaLectura)}: el sensor no está reportando.`
              : 'No hay ninguna adquisición registrada.'}{' '}
            La serie no se rellena ni se interpola.
          </p>
        ) : (
          <SerieDensa historial={historial} umbral={umbralRiego ?? null} />
        )}
        <p className="op-pie">
          {historial.length.toLocaleString('es-MX')} puntos en ventana. La serie se submuestrea en
          el servidor (<code>ROW_NUMBER()</code> sobre <code>sensor_readings</code>): son lecturas
          reales, una de cada N, nunca promedios. La banda marca el intervalo por debajo del
          umbral de manejo, donde el control activa la bomba.
        </p>
      </section>

      {/* --- PARCELAS --- */}
      <section className="op-seccion">
        <h2 className="op-h2">
          <Database size={15} aria-hidden /> Unidades de manejo
        </h2>
        <div className="op-tabla-envoltura">
          <table className="op-tabla">
            <thead>
              <tr>
                <th>Parcela</th>
                <th>Cultivo</th>
                <th>Etapa</th>
                <th className="num">Superficie (ha)</th>
                <th className="num">Hileras</th>
                <th>Sistema</th>
                <th className="num">Umbral (%)</th>
                <th>Adquisición</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {parcela ? (
                <tr>
                  <td>{parcela.nombre ?? '—'}</td>
                  <td>{nombreCultivo(parcela.cultivo)}</td>
                  <td>{parcela.etapa ? (ETAPAS[parcela.etapa] ?? parcela.etapa) : '—'}</td>
                  <td className="num mono">{parcela.area_ha ?? '—'}</td>
                  <td className="num mono">{parcela.num_hileras ?? '—'}</td>
                  <td>{parcela.tipo_sistema ?? '—'}</td>
                  <td className="num mono">{umbralRiego ?? '—'}</td>
                  <td className="mono">{parcela.device_id ?? '—'}</td>
                  <td>
                    <Estado ok={sensorActivo} texto={sensorActivo ? 'Activa' : 'Sin reportar'} />
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={9} className="op-vacio-celda">
                    Sin unidades registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="op-pie">
          La tabla está construida para N unidades. Hoy existe una: el control de riego mantiene un
          único estado global de bomba en el backend, de modo que dos unidades con bomba propia se
          interferirían. Es el trabajo previo a la vista comparativa.
        </p>
      </section>

      {/* --- PROCEDENCIA --- */}
      <section className="op-seccion">
        <h2 className="op-h2">
          <CircleCheck size={15} aria-hidden /> Procedencia del dato
        </h2>
        <div className="op-tabla-envoltura">
          <table className="op-tabla">
            <thead>
              <tr>
                <th>Magnitud</th>
                <th>Origen</th>
                <th>Instrumento o fuente</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Humedad de suelo</td>
                <td>Medida</td>
                <td>Sensor capacitivo → ESP32 → serie USB 115200</td>
                <td><Estado ok={sensorActivo} texto={sensorActivo ? 'Vigente' : 'Sin reportar'} /></td>
              </tr>
              <tr>
                <td>Estado de bomba y modo</td>
                <td>Medida</td>
                <td>Estado del proceso backend</td>
                <td>
                  <Estado
                    ok={estadoEsp ? true : null}
                    texto={estadoEsp ? (estadoEsp.autoMode ? 'Automático' : 'Manual') : 'Sin dato'}
                  />
                </td>
              </tr>
              <tr>
                <td>Duración de riego</td>
                <td>Medida</td>
                <td><code>action_log.duracion_seg</code>, por transición de bomba</td>
                <td><Estado ok={true} texto="Registrada" /></td>
              </tr>
              <tr>
                <td>ET₀</td>
                <td>Pronosticada</td>
                <td>Open-Meteo, FAO Penman-Monteith</td>
                <td><Estado ok={balance ? true : null} texto={balance ? 'Vigente' : 'Sin dato'} /></td>
              </tr>
              <tr>
                <td>ETc</td>
                <td>Calculada</td>
                <td>ET₀ × Kc (FAO-56)</td>
                <td>
                  <Estado
                    ok={balance?.kc != null ? true : null}
                    texto={balance?.kc != null ? `Kc = ${balance.kc}` : 'Sin coeficiente'}
                  />
                </td>
              </tr>
              <tr>
                <td>Temperatura de suelo</td>
                <td>—</td>
                <td>Sin instrumento instalado</td>
                <td><Estado ok={false} texto="No disponible" /></td>
              </tr>
              <tr>
                <td>Tensión y corriente</td>
                <td>—</td>
                <td>Sin instrumento instalado</td>
                <td><Estado ok={false} texto="No disponible" /></td>
              </tr>
              <tr>
                <td>Lámina aplicada y volumen</td>
                <td>—</td>
                <td>Requiere caudal de bomba y superficie</td>
                <td><Estado ok={false} texto="No calculable" /></td>
              </tr>
              <tr>
                <td>Perfil de humedad por profundidad</td>
                <td>—</td>
                <td>Tablas y endpoints operativos; sin sondas instaladas</td>
                <td><Estado ok={false} texto="Sin fuente" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="op-pie">
          <CircleSlash size={13} style={{ verticalAlign: -2 }} aria-hidden /> Las magnitudes sin
          instrumento se declaran no disponibles y no se estiman. Las columnas correspondientes
          existen en el esquema y permanecen vacías.
        </p>
      </section>

      {/* --- BITÁCORA --- */}
      <section className="op-seccion">
        <h2 className="op-h2">
          <Database size={15} aria-hidden /> Bitácora de eventos · 7 días
        </h2>
        <div className="op-tabla-envoltura">
          <table className="op-tabla">
            <thead>
              <tr>
                <th>Marca de tiempo</th>
                <th>Evento</th>
                <th>Origen</th>
                <th className="num">Duración</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {acciones.length === 0 ? (
                <tr>
                  <td colSpan={5} className="op-vacio-celda">
                    {cargandoRegistro ? 'Consultando…' : 'Sin eventos en la ventana.'}
                  </td>
                </tr>
              ) : (
                acciones.map(a => (
                  <tr key={a.id}>
                    <td className="mono">{fechaCorta(a.fecha)}</td>
                    <td>{a.tipo}</td>
                    <td className="mono">{a.origen ?? '—'}</td>
                    <td className="num mono">
                      {a.duracion_seg === null ? 'abierto' : duracionLarga(a.duracion_seg)}
                    </td>
                    <td className="op-detalle">{a.detalle ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="op-pie">
          El campo <code>origen</code> distingue quién tomó la decisión: <code>usuario</code>,{' '}
          <code>ia</code> o <code>umbral</code>. Un riego que abarque un reinicio del servicio se
          reanuda y se cierra con su duración real; por encima de 12 h se marca como no medible en
          lugar de imputarle una duración.
        </p>
      </section>

      {/* --- FICHA TÉCNICA --- */}
      <section className="op-seccion">
        <h2 className="op-h2">
          <Gauge size={15} aria-hidden /> Ficha técnica
        </h2>
        <div className="op-ficha">
          <div><dt>Adquisición</dt><dd>ESP32 → serie USB 115200, o HTTP <code>/api/esp/data</code></dd></div>
          <div><dt>Cadencia de muestreo</dt><dd>~3 s en operación</dd></div>
          <div><dt>Persistencia</dt><dd>SQLite; 6 índices sobre <code>timestamp</code>, <code>device_id</code> y <code>parcela_id</code></dd></div>
          <div><dt>Transferencia de series</dt><dd>Submuestreo en servidor: 5.18 MB / 4 215 ms → 44 KB / 154 ms</dd></div>
          <div><dt>Consulta de última lectura</dt><dd>11.82 ms → 0.93 ms tras indexar</dd></div>
          <div><dt>Sondeo del cliente</dt><dd>Un temporizador único; se suspende en segundo plano</dd></div>
          <div><dt>Meteorología</dt><dd>Open-Meteo, caché de 15 min por coordenada</dd></div>
          <div><dt>Capa de inferencia</dt><dd>API Anthropic sobre contexto construido en servidor</dd></div>
          <div><dt>Dependencias de interfaz</dt><dd>Next.js, React, <code>lucide-react</code>. Sin librería de gráficas</dd></div>
        </div>
      </section>
    </main>
  )
}
