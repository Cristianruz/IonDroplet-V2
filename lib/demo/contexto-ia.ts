// Lo que la IA de verdad necesita saber del cultivo simulado.
//
// En la demostración pública la IA ya no es de mentira: el chat, los consejos,
// el análisis, el punto de riego, el agente y la foto los contesta Claude. Lo
// que no es real es el cultivo, y la IA lo sabe: el servidor se lo dice en sus
// instrucciones. Aquí se arma, con los números de la simulación, el mismo
// texto que arma contextoDelSistema() en server.js con los de la base.
//
// El clima no va aquí: el servidor lo pide él mismo a Open-Meteo, así el
// teléfono no le puede mandar a la IA un pronóstico inventado.
//
// También aquí: los avisos de la campana que salen del pronóstico real.
//
// Sin React ni navegador: se prueba con node --test.

import { cultivoPorId, etapaPorId, sistemaPorId } from '../cultivos.ts'
import { balanceDeDias, avisosDeHoy, climaReal, diasDeClima } from './clima.ts'
import {
  DIA,
  MIN,
  humedadActual,
  kcDe,
  lloviendo,
  puntoIdeal,
  redondear,
  sensorMudo,
  sqlTs,
  textoDuracion,
  ultimaLectura,
  type AlertaDemo,
  type Estado,
  type ParcelaDemo,
} from './simulacion.ts'

function principal(e: Estado): ParcelaDemo {
  return e.parcelas.find(p => p.id === 1) ?? e.parcelas[0]
}

/** "hace 3 minutos", como ia/tiempo.js del backend. */
export function haceCuanto(ms: number): string {
  const minutos = ms / MIN
  if (!Number.isFinite(minutos) || minutos < 0) return 'hace un momento'
  if (minutos < 1) return 'hace menos de un minuto'
  if (minutos < 60) return `hace ${Math.round(minutos)} ${Math.round(minutos) === 1 ? 'minuto' : 'minutos'}`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`
  const dias = Math.floor(horas / 24)
  return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`
}

function nombreCultivo(p: ParcelaDemo): string {
  return cultivoPorId(p.cultivo)?.nombre ?? p.cultivo
}

function nombreEtapa(p: ParcelaDemo): string | null {
  return etapaPorId(p.etapa, p.cultivo)?.nombre ?? null
}

/** Humedad de los últimos 7 días del cultivo principal. */
export function humedadDeLaSemana(e: Estado, ahora: number) {
  const lista = (e.lecturas[1] ?? []).filter(l => l.t > ahora - 7 * DIA)
  if (lista.length === 0) return null
  const valores = lista.map(l => Math.round(l.h))
  return {
    n: valores.length,
    prom: Math.round(valores.reduce((s, v) => s + v, 0) / valores.length),
    minimo: Math.min(...valores),
    maximo: Math.max(...valores),
  }
}

/** El texto que lee la IA. Mismo orden y mismas frases que server.js. */
export function contextoDelSistema(e: Estado, ahora: number): string {
  const p = principal(e)
  const partes: string[] = []

  const ultima = ultimaLectura(e)
  if (sensorMudo(e) && ultima) {
    partes.push(`Humedad de la tierra: ${Math.round(ultima.h)}%, medida ${haceCuanto(ahora - ultima.t)}.`)
    partes.push('OJO: esa lectura ya está vieja. El sensor lleva rato sin reportar: el modo automático no decide sin lecturas.')
  } else if (ultima) {
    partes.push(`Humedad de la tierra: ${humedadActual(e)}%, medida hace menos de un minuto.`)
  } else {
    partes.push('No hay ninguna lectura del sensor de humedad. Este dato NO se conoce.')
  }

  partes.push(
    `Riego: la bomba está ${e.bomba === 1 ? 'ENCENDIDA' : 'apagada'} y el modo es ${e.auto ? 'automático (el sistema decide)' : 'manual (el sistema NO riega solo; decide el agricultor)'}.`
  )
  if (e.bomba === 1 && e.riego) {
    partes.push(`El riego en curso empezó ${haceCuanto(ahora - e.riego.desde)} y lo pidió ${e.riego.origen === 'usuario' ? 'el agricultor a mano' : 'el sistema solo'}.`)
  }
  partes.push(`Punto de riego: la bomba enciende sola cuando la humedad baja de ${e.umbral}% y se apaga sola en cuanto la lectura pasa de ${e.umbral}%.`)
  if (lloviendo(e, ahora)) partes.push('Está lloviendo sobre el cultivo en este momento (lo pidió la persona con la prueba "Que llueva").')

  const datos: string[] = [`se llama "${p.nombre}"`, `tiene sembrado ${nombreCultivo(p).toLowerCase()}`]
  const etapa = nombreEtapa(p)
  if (etapa) datos.push(`va en etapa de ${etapa.toLowerCase()}`)
  if (p.area_ha) datos.push(`mide ${p.area_ha} hectáreas`)
  const sistema = sistemaPorId(p.tipo_sistema)
  if (sistema) datos.push(`se riega por ${sistema.nombre.toLowerCase()}`)
  if (p.caudal_lpm) datos.push(`la bomba da ${p.caudal_lpm} litros por minuto`)
  partes.push(`El cultivo ${datos.join(', ')}. Está en la ciudad de Chihuahua.`)

  const etapaCompleta = etapaPorId(p.etapa, p.cultivo)
  if (etapaCompleta) {
    partes.push(
      `Guía de la etapa ${etapaCompleta.nombre}: ${etapaCompleta.explicacion}. Punto de riego recomendado para esta etapa: ${puntoIdeal(p.cultivo, p.etapa)}%. Coeficiente del cultivo (Kc): ${kcDe(p.cultivo, p.etapa)}.`
    )
  }

  const riegos = e.registros.filter(r => r.tipo === 'riego' && r.parcela_id === 1 && r.t > ahora - 7 * DIA && r.duracion_seg)
  if (riegos.length > 0) {
    const minutos = Math.round(riegos.reduce((s, r) => s + (r.duracion_seg ?? 0), 0) / 60)
    let linea = `En los últimos 7 días se regó ${riegos.length} ${riegos.length === 1 ? 'vez' : 'veces'}, ${minutos} minutos en total.`
    if (p.caudal_lpm) {
      const litros = Math.round(minutos * p.caudal_lpm)
      linea += ` Con una bomba de ${p.caudal_lpm} litros por minuto, son aproximadamente ${litros.toLocaleString('es-MX')} litros.`
      if (p.area_ha) linea += ` Repartidos en ${p.area_ha} hectáreas equivalen a unos ${redondear(litros / (p.area_ha * 10000), 2)} mm de lámina.`
    }
    partes.push(linea)
  } else {
    partes.push('En los últimos 7 días no hay ningún riego registrado.')
  }
  const ultimoRiego = [...e.registros].reverse().find(r => r.tipo === 'riego' && r.parcela_id === 1)
  if (ultimoRiego) {
    partes.push(
      `Último riego: ${haceCuanto(ahora - ultimoRiego.t)}, ${ultimoRiego.duracion_seg ? `duró ${textoDuracion(ultimoRiego.duracion_seg)}` : 'sigue en curso'}, lo pidió ${ultimoRiego.origen === 'usuario' ? 'el agricultor' : ultimoRiego.origen === 'ia' ? 'el agente' : 'el sistema al bajar del punto de riego'}.`
    )
  }

  const semana = humedadDeLaSemana(e, ahora)
  partes.push(
    semana
      ? `Humedad de los últimos 7 días: ${semana.n} mediciones, promedio ${semana.prom}%, mínimo ${semana.minimo}%, máximo ${semana.maximo}%.`
      : 'No hay mediciones de humedad de los últimos 7 días.'
  )

  partes.push(`Ionización del agua: ${e.ion.encendida ? 'encendida' : 'apagada'} (lo último que se pidió; el aparato no confirma su estado ni se mide su efecto).`)

  const abiertas = e.alertas.filter(a => a.estado === 'nueva' || a.estado === 'leida').slice(0, 6)
  partes.push(
    abiertas.length > 0
      ? `AVISOS ABIERTOS DE LA APP:\n${abiertas.map(a => `- (${a.severidad}) ${a.titulo}: ${a.dato}`).join('\n')}`
      : 'No hay avisos abiertos en la app.'
  )

  const fertis = e.fertirriego.filter(f => new Date(f.aplicado.replace(' ', 'T') + 'Z').getTime() > ahora - 60 * DIA).slice(0, 5)
  partes.push(
    fertis.length > 0
      ? `FERTIRRIEGO DE LOS ÚLTIMOS 60 DÍAS:\n${fertis
          .map(f => `- ${f.aplicado.slice(0, 10)}: ${f.nutrientes.map(n => `${n.nutriente} ${n.cantidad ?? ''} ${n.unidad ?? ''}`.trim()).join(', ') || 'sin detalle'}${f.ph ? `, pH ${f.ph}` : ''}${f.ec_ds_m ? `, CE ${f.ec_ds_m} dS/m` : ''}`)
          .join('\n')}`
      : 'No hay fertirriego registrado en los últimos 60 días.'
  )

  if (e.parcelas.length > 1) {
    partes.push(
      `CULTIVOS REGISTRADOS (el primero es el principal):\n${e.parcelas
        .map(x => `- ${x.nombre}: ${nombreCultivo(x).toLowerCase()}${nombreEtapa(x) ? `, etapa ${nombreEtapa(x)!.toLowerCase()}` : ''}, humedad ${humedadActual(e, x.id)}%`)
        .join('\n')}`
    )
  }

  const decision = e.decisiones[0]
  if (decision) {
    partes.push(`Última decisión del agente agrónomo (${decision.cuando.slice(0, 10)}): ${decision.justificacion}`)
  }

  return partes.join('\n')
}

// --- Indicadores del análisis: los mismos que calcula indicadores() en server.js ---

/** Temperatura de daño por helada, calor que estresa y fases donde la helada pega peor. De guia-cultivos.js. */
const UMBRALES_DEL_CULTIVO: Record<string, { helada: number; peorEn: string[]; calor: number }> = {
  nogal: { helada: -2, peorEn: ['floracion', 'fruto'], calor: 38 },
  manzana: { helada: -2, peorEn: ['floracion'], calor: 35 },
  maiz: { helada: 0, peorEn: ['siembra', 'crecimiento', 'floracion'], calor: 35 },
  chile: { helada: 2, peorEn: ['siembra', 'crecimiento', 'floracion', 'fruto'], calor: 33 },
  frijol: { helada: 0, peorEn: ['floracion', 'fruto'], calor: 32 },
  alfalfa: { helada: -5, peorEn: [], calor: 38 },
  avena: { helada: -6, peorEn: ['floracion'], calor: 30 },
  algodon: { helada: 2, peorEn: ['siembra', 'crecimiento', 'floracion', 'fruto'], calor: 40 },
}

function nivelPorMargen(margen: number | null, alto: number, medio: number): 'alto' | 'medio' | 'bajo' | null {
  if (margen === null) return null
  if (margen <= alto) return 'alto'
  if (margen <= medio) return 'medio'
  return 'bajo'
}

export function indicadores(e: Estado, ahora: number) {
  const p = principal(e)
  const faltantes: string[] = []
  const ultima = ultimaLectura(e)
  const minutos = ultima ? Math.round((ahora - ultima.t) / MIN) : null
  const sensor = {
    humedad: ultima ? Math.round(ultima.h) : null,
    minutos,
    vigente: !sensorMudo(e) && minutos !== null && minutos <= 30,
  }
  if (!sensor.vigente) faltantes.push('El sensor no está reportando: todo lo que dependa de la humedad medida va a ciegas.')

  const d = diasDeClima(ahora)
  const guia = UMBRALES_DEL_CULTIVO[p.cultivo] ?? null
  const fase = etapaPorId(p.etapa, p.cultivo)?.fase ?? null

  let peor = { minima: d.temperature_2m_min[0], dia: d.time[0] }
  d.temperature_2m_min.forEach((m, i) => {
    if (m < peor.minima) peor = { minima: m, dia: d.time[i] }
  })
  const margen = guia ? redondear(peor.minima - guia.helada) : null
  if (!guia) faltantes.push('Para este cultivo no hay temperatura crítica de helada en la guía.')
  const maxima = Math.max(...d.temperature_2m_max)
  const lluviaTotal = redondear(d.precipitation_sum.reduce((s, v) => s + v, 0))
  const etc = redondear(balanceDeDias(ahora, kcDe(p.cultivo, p.etapa), 7).reduce((s, x) => s + x.etc_mm, 0))

  const riegos = e.registros.filter(r => r.tipo === 'riego' && r.parcela_id === 1 && r.t > ahora - 7 * DIA && r.duracion_seg)
  const iones = e.registros.filter(r => r.tipo === 'ionizacion' && r.parcela_id === 1 && r.t > ahora - 7 * DIA && r.duracion_seg)
  const segRiego = riegos.reduce((s, r) => s + (r.duracion_seg ?? 0), 0)
  const segIon = iones.reduce((s, r) => s + (r.duracion_seg ?? 0), 0)
  faltantes.push('El ionizador no confirma su estado: sólo se sabe lo último que se le pidió.')
  if (!climaReal()) faltantes.push('No se pudo consultar el clima real: el pronóstico es de ejemplo.')

  return {
    sensor,
    parcela: { nombre: p.nombre, cultivo: p.cultivo, etapa: p.etapa, area_ha: p.area_ha },
    umbral: e.umbral,
    helada: {
      nivel: nivelPorMargen(margen, 0, 3),
      minima_pronosticada: peor.minima,
      dia: peor.dia,
      critica_del_cultivo: guia?.helada ?? null,
      margen_grados: margen,
      etapa_sensible: guia && fase ? guia.peorEn.includes(fase) : false,
    },
    calor: {
      nivel: guia ? nivelPorMargen(guia.calor - maxima, 0, 3) : null,
      maxima_pronosticada: maxima,
      estres_del_cultivo: guia?.calor ?? null,
    },
    lluvia: {
      probabilidad_maxima_pct: Math.max(...d.precipitation_probability_max),
      mm_esperados_7d: lluviaTotal,
      es_probabilidad_real: climaReal() !== null,
    },
    agua: {
      etc_mm_7d: etc,
      lluvia_mm_7d: lluviaTotal,
      deficit_mm_7d: Math.max(redondear(etc - lluviaTotal), 0),
      puntos_sobre_umbral: sensor.vigente && sensor.humedad !== null ? redondear(sensor.humedad - e.umbral) : null,
    },
    riego7d: {
      eventos: riegos.length,
      minutos: redondear(segRiego / 60),
      pct_con_ionizacion: segRiego > 0 ? Math.min(100, Math.round((segIon / segRiego) * 100)) : null,
    },
    ionizacion: {
      ultimo_pedido: e.ion.encendida ? 'encendida' : 'apagada',
      desde: new Date(e.ion.desde).toISOString(),
      confirmada_por_el_aparato: false,
    },
    fertirriego90d: e.fertirriego
      .filter(f => new Date(f.aplicado.replace(' ', 'T') + 'Z').getTime() > ahora - 90 * DIA)
      .flatMap(f => f.nutrientes)
      .reduce<Array<{ nutriente: string; total: number; unidad: string | null }>>((lista, n) => {
        const fila = lista.find(x => x.nutriente === n.nutriente && x.unidad === n.unidad)
        if (fila) fila.total = redondear(fila.total + (n.cantidad ?? 0), 2)
        else lista.push({ nutriente: n.nutriente, total: n.cantidad ?? 0, unidad: n.unidad })
        return lista
      }, []),
    faltantes,
  }
}

export type Indicadores = ReturnType<typeof indicadores>

// --- Lo que se sabe de un cultivo para revisar una foto ---

/** Igual que armarContexto() de ia/diagnostico-foto.js, en la parte del cultivo. */
export function contextoDeFoto(e: Estado, parcelaId: number | null, ahora: number): string | null {
  const p = parcelaId ? e.parcelas.find(x => x.id === parcelaId) : null
  if (!p) return null
  const partes: string[] = []
  const datos = [`Cultivo "${p.nombre}"`, `cultivo registrado: ${nombreCultivo(p).toLowerCase()}`]
  const etapa = nombreEtapa(p)
  if (etapa) datos.push(`etapa: ${etapa.toLowerCase()}`)
  const sistema = sistemaPorId(p.tipo_sistema)
  if (sistema) datos.push(`riego por ${sistema.nombre.toLowerCase()}`)
  partes.push(`${datos.join('; ')}.`)
  const etapaCompleta = etapaPorId(p.etapa, p.cultivo)
  if (etapaCompleta) partes.push(`La etapa ${etapaCompleta.nombre}: ${etapaCompleta.explicacion}.`)

  if (p.id === 1 && sensorMudo(e)) {
    const u = ultimaLectura(e)
    if (u) partes.push(`Humedad de suelo medida en este cultivo: ${Math.round(u.h)}%, ${haceCuanto(ahora - u.t)}. OJO: esa lectura es vieja; el sensor no ha reportado desde entonces.`)
  } else {
    partes.push(`Humedad de suelo medida en este cultivo: ${humedadActual(e, p.id)}%, hace menos de un minuto.`)
  }
  if (p.id === 1) {
    const semana = humedadDeLaSemana(e, ahora)
    if (semana) partes.push(`Humedad de los últimos 7 días: promedio ${semana.prom}%, mínimo ${semana.minimo}%, máximo ${semana.maximo}%.`)
  }
  return partes.join('\n')
}

// --- Los avisos de la campana que salen del clima ---

const ALERTA_DEL_AVISO = {
  helada: { titulo: 'Riesgo de helada', accion: 'Un riego ligero la tarde anterior ayuda a que la tierra guarde calor. Si el cultivo está en floración o con fruto, consulta a un técnico.' },
  lluvia: { titulo: 'Viene lluvia', accion: 'No hace falta hacer nada: si llueve, el riego automático trabajará menos.' },
  viento: { titulo: 'Viento fuerte', accion: 'Revisa que las mangueras y los goteros estén bien sujetos.' },
  calor: { titulo: 'Calor fuerte', accion: 'El riego automático lo cubre. Revisa que el agua llegue a todas las hileras.' },
} as const

/** Tres días seguidos que piden esta lámina sin lluvia que la cubra: aviso de días secos. */
const DEFICIT_TRES_DIAS_MM = 8

/**
 * Pone en la campana los avisos del pronóstico de hoy y da por resueltos los
 * que el pronóstico ya no trae. Lo que la visita ya marcó como visto o
 * atendido se respeta: un aviso no se repite.
 */
export function sincronizarAlertasDelClima(e: Estado, ahora: number): void {
  const p = principal(e)
  const deDondeSale = climaReal() ? 'el pronóstico real de Chihuahua (Open-Meteo)' : 'el pronóstico de ejemplo (no se pudo consultar el real)'
  const vigentes = new Set<string>()
  const siguienteId = () => e.alertas.reduce((m, a) => Math.max(m, a.id), 0) + 1

  const agregar = (a: Omit<AlertaDemo, 'id' | 'parcela_id' | 'estado' | 'creada' | 'atendida_en' | 'atendida_por'>) => {
    vigentes.add(a.clave)
    if (e.alertas.some(x => x.clave === a.clave)) return
    e.alertas.push({ ...a, id: siguienteId(), parcela_id: 1, estado: 'nueva', creada: sqlTs(ahora), atendida_en: null, atendida_por: null })
  }

  for (const aviso of avisosDeHoy(ahora)) {
    const base = ALERTA_DEL_AVISO[aviso.tipo]
    agregar({
      regla: `clima_${aviso.tipo}`,
      clave: `clima_${aviso.tipo}_${aviso.dia}`,
      severidad: aviso.nivel === 'peligro' ? 'critica' : aviso.tipo === 'lluvia' ? 'informativa' : 'atencion',
      titulo: base.titulo,
      detalle: `Lo dice ${deDondeSale}.`,
      dato: aviso.texto,
      accion: base.accion,
    })
  }

  const tres = balanceDeDias(ahora, kcDe(p.cultivo, p.etapa), 3)
  const pide = redondear(tres.reduce((s, x) => s + x.etc_mm, 0))
  const llueve = redondear(tres.reduce((s, x) => s + x.lluvia_mm, 0))
  if (tres.length > 0 && pide - llueve >= DEFICIT_TRES_DIAS_MM) {
    agregar({
      regla: 'deficit_agua',
      clave: `deficit_agua_${tres[0].fecha}`,
      severidad: 'atencion',
      titulo: 'Días secos por delante',
      detalle: `En los próximos tres días el cultivo va a pedir más agua de la que va a llover, según ${deDondeSale}.`,
      dato: `Pide ${pide} mm en tres días y se esperan ${llueve} mm de lluvia.`,
      accion: 'El riego automático lo cubre. Revisa que los goteros no estén tapados.',
    })
  }

  for (const a of e.alertas) {
    const delClima = a.regla.startsWith('clima_') || a.regla === 'deficit_agua'
    if (delClima && !vigentes.has(a.clave) && (a.estado === 'nueva' || a.estado === 'leida')) a.estado = 'resuelta'
  }
}
