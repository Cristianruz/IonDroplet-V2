// Lo que en el sistema real contesta la IA, en la demostración.
//
// En internet no se llama a Claude: costaría dinero cada visita y pediría la
// llave del dueño. Estos textos se arman con los números del sistema
// simulado, en el mismo tono que usa el asistente de verdad. El diagnóstico
// por foto dice claramente que es un ejemplo: ahí la foto no se mira.
//
// Sin React ni navegador: se prueba con node --test.

import { cultivoPorId, etapaPorId } from '../cultivos.ts'
import { plagasDeCultivo } from '../plagas.ts'
import { balanceDeDias, diaDeLaSemana, diasDeClima } from './clima.ts'
import {
  DIA,
  HORA,
  MIN,
  humedadActual,
  kcDe,
  puntoIdeal,
  redondear,
  sensorMudo,
  textoDuracion,
  ultimaLectura,
  type Estado,
  type ParcelaDemo,
} from './simulacion.ts'

function principal(e: Estado): ParcelaDemo {
  return e.parcelas.find(p => p.id === 1) ?? e.parcelas[0]
}

function nombreEtapa(p: ParcelaDemo): string {
  return etapaPorId(p.etapa, p.cultivo)?.nombre ?? 'sin etapa'
}

function nombreCultivo(p: ParcelaDemo): string {
  return (cultivoPorId(p.cultivo)?.nombre ?? p.cultivo).toLowerCase()
}

/** Lo que el cultivo pide esta semana contra lo que va a llover. */
export function pronosticoSemana(e: Estado, ahora: number) {
  const p = principal(e)
  const dias = balanceDeDias(ahora, kcDe(p.cultivo, p.etapa), 7)
  return {
    etcSemana: dias.reduce((s, d) => s + (d.etc_mm ?? 0), 0),
    lluviaSemana: dias.reduce((s, d) => s + d.lluvia_mm, 0),
  }
}

function riegosDeLaSemana(e: Estado, ahora: number) {
  return e.registros.filter(r => r.tipo === 'riego' && r.parcela_id === 1 && r.t > ahora - 7 * DIA)
}

function textoRiegoHoy(e: Estado, ahora: number): string {
  const h = humedadActual(e)
  const u = e.umbral
  if (e.bomba) {
    return e.auto
      ? `Ahora mismo está regando: la tierra marca ${h}% y el riego se detiene solo en cuanto pase de ${u}%.`
      : `Está regando porque lo pediste a mano. La tierra marca ${h}%; acuérdate de detenerlo o se corta solo a los 20 minutos.`
  }
  if (!e.auto) {
    return `El riego automático está apagado: la tierra marca ${h}% y nadie va a regar hasta que tú lo pidas. Si quieres que decida el sistema, vuelve a "Solo".`
  }
  if (h < u + 5) {
    return h < u
      ? `Le toca agua: la tierra marca ${h}%, abajo del punto de riego de ${u}%. El riego entra solo en unos segundos.`
      : `Todavía no, pero hoy le va a tocar: la tierra marca ${h}%, apenas arriba del punto de riego de ${u}%. En cuanto baje de ahí, el riego entra solo.`
  }
  const hora = new Date(ahora).getHours()
  const despues =
    hora >= 7 && hora < 16
      ? 'Con el calor de la tarde va a bajar unos 7 puntos'
      : 'De noche casi no se seca; mañana por la tarde volverá a bajar'
  return `Hoy no hace falta regar: la tierra marca ${h}%, arriba del punto de riego de ${u}%. ${despues}, y el riego entra solo si llega a ${u}%.`
}

export function consejo(e: Estado, pantalla: string, ahora: number): string {
  const p = principal(e)
  const etapa = etapaPorId(p.etapa, p.cultivo)
  const h = humedadActual(e)
  if (pantalla === 'parcela') {
    const porque = etapa ? `En ${etapa.nombre.toLowerCase()} ${etapa.explicacion}.` : 'Dime la etapa del cultivo para afinar el riego.'
    return `${porque} Por eso el punto de riego está en ${e.umbral}%, y con ${h}% la tierra está bien para la etapa.`
  }
  if (pantalla === 'historial') {
    const riegos = riegosDeLaSemana(e, ahora)
    const minutos = riegos.length
      ? Math.round(riegos.reduce((s, r) => s + (r.duracion_seg ?? 0), 0) / 60 / riegos.length)
      : 0
    return riegos.length
      ? `En los últimos 7 días hubo ${riegos.length} riegos de unos ${minutos} minutos cada uno, casi siempre por la tarde, que es cuando más se seca la tierra. La humedad no se quedó abajo del punto de riego.`
      : 'En los últimos 7 días no hubo riegos: la humedad se mantuvo arriba del punto de riego.'
  }
  if (pantalla === 'plagas') {
    const plaga = plagasDeCultivo(p.cultivo)[0]
    const vigila = plaga ? `vigila ${plaga.nombre.toLowerCase()}` : 'revisa el envés de las hojas'
    return `Con la tierra en ${h}% y tardes de 25 °C, ${vigila} esta semana. Las lluvias del fin de semana pueden traer hongos: después de que llueva, date una vuelta.`
  }
  return loQueViene(e, ahora)
}

/** Para Inicio: lo que va a pasar, sin repetir los números del medidor. */
function loQueViene(e: Estado, ahora: number): string {
  if (sensorMudo(e)) {
    return 'Casi siempre es un cable flojo o el aparato sin corriente. En cuanto vuelvan las lecturas, el riego sigue decidiendo solo.'
  }
  const h = humedadActual(e)
  const tarde = new Date(ahora).getHours() >= 7 && new Date(ahora).getHours() < 16
  if (e.bomba) {
    return e.auto
      ? `Va a regar hasta que la tierra pase de ${e.umbral}% y ahí se detiene solo. Después descansa hasta que vuelva a hacer falta.`
      : 'Estás regando a mano. Si se te olvida detenerlo, se corta solo a los 20 minutos.'
  }
  if (!e.auto) return 'Con el riego automático apagado nadie vigila la tierra. Te recomiendo dejar que decida el sistema.'
  if (h < e.umbral + 5) {
    return tarde
      ? 'Con el calor de la tarde hoy le va a tocar un riego. No tienes que hacer nada: entra solo.'
      : 'De noche casi no se seca. Lo más probable es que mañana por la tarde le toque un riego, y entra solo.'
  }
  // La lluvia solo se menciona si el pronóstico la trae, y como posibilidad.
  // Es el mismo día que avisa la tarjeta del clima: el que más agua trae.
  const dias = diasDeClima(ahora)
  const i = dias.precipitation_sum.reduce((m, v, k, a) => (v > a[m] ? k : m), 0)
  return i > 0 && dias.precipitation_sum[i] > 0 && dias.precipitation_probability_max[i] >= 30
    ? `Hoy no le toca agua. Puede llover el ${diaDeLaSemana(ahora + i * DIA)}: si llueve, el riego va a trabajar menos.`
    : 'Hoy no le toca agua. La tierra está arriba del punto de riego y el sistema la sigue vigilando.'
}

/** El análisis completo: los indicadores son números, el texto los explica. */
export function analisis(e: Estado, ahora: number) {
  const p = principal(e)
  const h = humedadActual(e)
  const dias = diasDeClima(ahora)
  const { etcSemana, lluviaSemana } = pronosticoSemana(e, ahora)
  const deficit = balanceDeDias(ahora, kcDe(p.cultivo, p.etapa), 7).reduce((s, d) => s + (d.deficit_mm ?? 0), 0)
  const minima = Math.min(...dias.temperature_2m_min)
  const iMinima = dias.temperature_2m_min.indexOf(minima)
  const maxima = Math.max(...dias.temperature_2m_max)
  const probabilidad = Math.max(...dias.precipitation_probability_max)
  const riegos = riegosDeLaSemana(e, ahora)
  const minutos = Math.round(riegos.reduce((s, r) => s + (r.duracion_seg ?? 0), 0) / 60)
  const conIon = riegos.length ? 100 : null

  const indicadores = {
    sensor: sensorMudo(e)
      ? { humedad: Math.round(ultimaLectura(e)?.h ?? h), minutos: Math.round((ahora - (ultimaLectura(e)?.t ?? ahora)) / MIN), vigente: false }
      : { humedad: h, minutos: 0, vigente: true },
    parcela: { nombre: p.nombre, cultivo: p.cultivo, etapa: p.etapa, area_ha: p.area_ha },
    umbral: e.umbral,
    helada: {
      nivel: 'bajo',
      minima_pronosticada: minima,
      dia: dias.time[iMinima],
      critica_del_cultivo: 0,
      margen_grados: redondear(minima),
      etapa_sensible: false,
    },
    calor: { nivel: 'bajo', maxima_pronosticada: maxima, estres_del_cultivo: 38 },
    lluvia: {
      probabilidad_maxima_pct: probabilidad,
      mm_esperados_7d: redondear(lluviaSemana),
      es_probabilidad_real: true,
    },
    agua: {
      etc_mm_7d: redondear(etcSemana),
      lluvia_mm_7d: redondear(lluviaSemana),
      deficit_mm_7d: redondear(deficit),
      puntos_sobre_umbral: h - e.umbral,
    },
    riego7d: { eventos: riegos.length, minutos, pct_con_ionizacion: conIon },
    ionizacion: {
      ultimo_pedido: e.ion.encendida ? 'encendida' : 'apagada',
      desde: new Date(e.ion.desde).toISOString(),
      confirmada_por_el_aparato: false,
    },
    fertirriego90d: e.fertirriego.flatMap(f => f.nutrientes).reduce<Array<{ nutriente: string; total: number; unidad: string | null }>>(
      (lista, n) => {
        const fila = lista.find(x => x.nutriente === n.nutriente && x.unidad === n.unidad)
        if (fila) fila.total = redondear(fila.total + (n.cantidad ?? 0), 2)
        else lista.push({ nutriente: n.nutriente, total: n.cantidad ?? 0, unidad: n.unidad })
        return lista
      },
      []
    ),
    faltantes: [],
  }

  const analisisTexto = {
    resumen:
      `${p.nombre} está en ${nombreEtapa(p).toLowerCase()} con la tierra en ${h}%, ${h >= e.umbral ? 'arriba' : 'abajo'} del punto de riego de ${e.umbral}%. ` +
      `Esta semana el cultivo pide ${redondear(etcSemana)} mm y se esperan ${redondear(lluviaSemana)} mm de lluvia, casi todos del cuarto día en adelante. ` +
      `Los tres primeros días los cubre el riego automático.`,
    confianza: 'alta',
    porque_confianza: 'El sensor reporta al momento y el pronóstico es de hoy.',
    riesgos: [
      {
        nombre: 'Tres días secos antes de la lluvia',
        nivel: 'medio',
        dato: `${redondear(deficit)} mm de déficit en la semana`,
        porque: 'Los primeros días son los de más evaporación y no trae lluvia.',
        quehacer: 'Nada extra: el riego automático lo cubre. Revisa que los goteros no estén tapados.',
      },
      {
        nombre: 'Hongos después de la lluvia',
        nivel: 'bajo',
        dato: `Hasta ${probabilidad}% de probabilidad de lluvia`,
        porque: 'Con el ruezno abriendo, la humedad sobre la nuez favorece manchas.',
        quehacer: 'Date una vuelta después de que llueva y revisa la nuez de la parte baja.',
      },
      {
        nombre: 'Helada',
        nivel: 'bajo',
        dato: `Mínima de ${minima} °C el ${diaDeLaSemana(ahora + iMinima * DIA)}`,
        porque: 'Faltan semanas para las primeras heladas de la región.',
        quehacer: 'No hace falta hacer nada.',
      },
    ],
    pronostico: `Días templados, máximas de ${Math.min(...dias.temperature_2m_max)} a ${maxima} °C. La lluvia llega del cuarto día en adelante.`,
    acciones: [
      {
        prioridad: 'medio',
        texto: 'Deja el riego en automático esta semana.',
        porque: `El punto de ${e.umbral}% es el que pide la etapa y el agente lo revisa cada día.`,
      },
      {
        prioridad: 'bajo',
        texto: 'Prepara la cosecha: no subas el punto de riego.',
        porque: 'Con la tierra muy húmeda cuesta entrar con la maquinaria y la nuez se mancha.',
      },
    ],
    ionizacion: {
      recomendada: false,
      porque: 'Todavía no hay mediciones que digan cuánto ayuda en esta etapa. Se puede seguir usando, pero no hay un número que lo sostenga.',
    },
    faltantes: [],
  }

  return { analisis: analisisTexto, indicadores, cuando: new Date(ahora - 20 * 60000).toISOString() }
}

export function propuestaDeUmbral(e: Estado, ahora: number) {
  const p = principal(e)
  const ideal = puntoIdeal(p.cultivo, p.etapa)
  const { etcSemana, lluviaSemana } = pronosticoSemana(e, ahora)
  const razon =
    ideal === e.umbral
      ? `El punto de ${e.umbral}% ya es el que pide ${nombreEtapa(p).toLowerCase()}. Esta semana el cultivo pide ${redondear(etcSemana)} mm y se esperan ${redondear(lluviaSemana)} mm de lluvia: no hace falta moverlo.`
      : `Para ${nombreEtapa(p).toLowerCase()} conviene un punto de ${ideal}%. Esta semana el cultivo pide ${redondear(etcSemana)} mm y se esperan ${redondear(lluviaSemana)} mm de lluvia.`
  return { sugerido: ideal, razon, confianza: 78 }
}

function haceCuanto(ms: number): string {
  if (ms < 2 * MIN) return 'hace un momento'
  if (ms < HORA) return `hace ${Math.round(ms / MIN)} minutos`
  if (ms < DIA) {
    const horas = Math.round(ms / HORA)
    return horas === 1 ? 'hace una hora' : `hace ${horas} horas`
  }
  const dias = Math.round(ms / DIA)
  return dias === 1 ? 'ayer' : `hace ${dias} días`
}

/** "¿Por qué regó?": el último riego, contado con sus números. */
function porQueRego(e: Estado, ahora: number): string {
  const p = principal(e)
  const riego = [...e.registros].reverse().find(r => r.tipo === 'riego' && r.parcela_id === 1)
  if (!riego) return 'Todavía no ha regado: la tierra no ha bajado del punto de riego.'
  const antes = [...(e.lecturas[1] ?? [])].reverse().find(l => l.t <= riego.t)
  const etapa = etapaPorId(p.etapa, p.cultivo)
  // El punto de riego es cuándo EMPIEZA; dónde para es otro número.
  const porLaEtapa = etapa ? ` El punto de riego de ${e.umbral}% es el que pide ${etapa.nombre.toLowerCase()}: ${etapa.explicacion}.` : ''
  // La lectura de antes del riego puede redondear justo al punto (39.6 da 40):
  // entonces se dice que bajó del punto, sin un número que se contradiga.
  const valor = antes ? Math.round(antes.h) : null
  const bajo = valor !== null && valor < e.umbral
    ? `la tierra bajó a ${valor}%, abajo del punto de riego de ${e.umbral}%`
    : `la tierra bajó del punto de riego de ${e.umbral}%`

  if (riego.origen === 'usuario') {
    return riego.duracion_seg === null
      ? `Está regando porque tú lo pediste a mano. Si se te olvida detenerlo, se corta solo a los 20 minutos.`
      : `El último riego lo pediste tú a mano, ${haceCuanto(ahora - riego.t)}, y duró ${textoDuracion(riego.duracion_seg)}.`
  }
  if (riego.duracion_seg === null) {
    return `Está regando porque ${bajo}. Nadie lo tuvo que prender, y se va a apagar solo en cuanto la tierra pase de ${e.umbral}%.${porLaEtapa}`
  }
  return `Regó ${haceCuanto(ahora - riego.t)} porque ${bajo}. Duró ${textoDuracion(riego.duracion_seg)} y se apagó solo en cuanto la tierra pasó de ${e.umbral}%.${porLaEtapa}`
}

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function responderChat(e: Estado, pregunta: string, ahora: number): { respuesta: string; accion: string | null } {
  const q = normalizar(pregunta)
  const p = principal(e)
  const h = humedadActual(e)
  const dias = diasDeClima(ahora)
  const tiene = (...palabras: string[]) => palabras.some(w => q.includes(w))

  if (tiene('por que', 'porque') && tiene('rego', 'rieg', 'regar', 'prendio', 'bomba')) {
    return { respuesta: porQueRego(e, ahora), accion: null }
  }

  if (tiene('deten', 'para el riego', 'apaga', 'parale', 'corta')) {
    return e.bomba
      ? { respuesta: `Está regando y la tierra ya marca ${h}%. Si quieres detenerlo, toca el botón y lo apago.`, accion: 'detener' }
      : { respuesta: 'La bomba ya está apagada. No hay ningún riego en curso.', accion: null }
  }
  if (tiene('automatic', 'solo', 'que decida')) {
    return e.auto
      ? { respuesta: `Ya está en automático: el riego entra solo cuando la tierra baja de ${e.umbral}%.`, accion: null }
      : { respuesta: `Ahora está en manual. Si lo pongo en automático, el riego entrará solo cuando la tierra baje de ${e.umbral}%.`, accion: 'automatico' }
  }
  if (tiene('manual', 'yo decido')) {
    return e.auto
      ? { respuesta: 'Si pasas a manual, el sistema no va a regar solo aunque la tierra se seque. ¿Lo cambio?', accion: 'manual' }
      : { respuesta: 'Ya está en manual: solo riega cuando tú lo pidas.', accion: null }
  }
  if (tiene('helada', 'frio', 'congel')) {
    const minima = Math.min(...dias.temperature_2m_min)
    const i = dias.temperature_2m_min.indexOf(minima)
    return {
      respuesta: `No hay riesgo de helada esta semana. La mínima más baja es de ${minima} °C el ${diaDeLaSemana(ahora + i * DIA)}, muy lejos de 0 °C. Si el pronóstico cambia, te llega una alerta.`,
      accion: null,
    }
  }
  if (tiene('manana')) {
    return {
      respuesta: `Mañana se esperan ${dias.temperature_2m_max[1]} °C de máxima y ${dias.precipitation_probability_max[1]}% de probabilidad de lluvia. El cultivo va a pedir unos ${redondear(dias.et0_fao_evapotranspiration[1] * kcDe(p.cultivo, p.etapa))} mm: lo más probable es un riego por la tarde.`,
      accion: null,
    }
  }
  if (tiene('lluv', 'llov')) {
    const total = redondear(dias.precipitation_sum.reduce((s, v) => s + v, 0))
    return {
      respuesta: `Se esperan unos ${total} mm en la semana, casi todo del ${diaDeLaSemana(ahora + 3 * DIA)} en adelante. Con esa lluvia el riego automático va a trabajar menos, sin que tengas que tocar nada.`,
      accion: null,
    }
  }
  if (tiene('sensor', 'mide', 'medir', 'calibr')) {
    return {
      respuesta: 'Para saber si el sensor mide bien: mételo en un vaso con agua y el número debe subir en unos segundos; sácalo y sécalo y debe bajar. Si se queda fijo en el mismo número, revisa que esté conectado a 5 V y que el cable no esté flojo.',
      accion: null,
    }
  }
  if (tiene('plaga', 'bicho', 'gusano', 'pulgon', 'hongo', 'mancha', 'hoja')) {
    const plagas = plagasDeCultivo(p.cultivo).slice(0, 2).map(x => x.nombre.toLowerCase())
    const lista = plagas.length ? `En esta temporada vigila ${plagas.join(' y ')}. ` : ''
    return {
      respuesta: `${lista}Si ves algo raro, tómale una foto desde Plagas, en "Diagnóstico por foto": te digo qué puede ser y cómo confirmarlo en el campo.`,
      accion: null,
    }
  }
  if (tiene('ioniz')) {
    return {
      respuesta: `La ionización está ${e.ion.encendida ? 'encendida' : 'apagada'}. El aparato la prende junto con la bomba en cada riego. Todavía no hay mediciones de cuánto ayuda al cultivo: es lo siguiente que se va a medir.`,
      accion: null,
    }
  }
  if (tiene('fertil', 'nutri', 'abono', 'nitrog', 'potasio')) {
    const ultima = [...e.fertirriego].sort((a, b) => b.aplicado.localeCompare(a.aplicado))[0]
    const texto = ultima
      ? `La última aplicación fue hace ${Math.round((ahora - new Date(ultima.aplicado.replace(' ', 'T') + 'Z').getTime()) / DIA)} días, con ${ultima.nutrientes.map(n => `${n.cantidad} ${n.unidad} de ${n.nutriente}`).join(' y ')}. `
      : ''
    return {
      respuesta: `${texto}En ${nombreEtapa(p).toLowerCase()} ya no conviene meter nitrógeno: el árbol está terminando el ciclo. El potasio sí ayuda al llenado final.`,
      accion: null,
    }
  }
  if (tiene('litro', 'cuanta agua', 'cuanto riego', 'cuanto regar')) {
    const { etcSemana, lluviaSemana } = pronosticoSemana(e, ahora)
    return {
      respuesta: `Esta semana el cultivo pide ${redondear(etcSemana)} mm, que en ${p.area_ha} hectáreas son unos ${Math.round(etcSemana * (p.area_ha ?? 1) * 10)} mil litros. Se esperan ${redondear(lluviaSemana)} mm de lluvia; el resto lo pone el riego automático.`,
      accion: null,
    }
  }
  if (tiene('etapa', 'requiere', 'necesita', 'pide')) {
    const etapa = etapaPorId(p.etapa, p.cultivo)
    return {
      respuesta: etapa
        ? `Tu ${nombreCultivo(p)} está en ${etapa.nombre.toLowerCase()}: ${etapa.explicacion}. Por eso el punto de riego está en ${e.umbral}%. Esta semana pide unos ${redondear(pronosticoSemana(e, ahora).etcSemana)} mm de agua.`
        : 'Todavía no me has dicho en qué etapa va el cultivo. Ponla en la ficha del cultivo y afino el riego.',
      accion: null,
    }
  }
  if (tiene('regar', 'riego', 'riega', 'agua')) {
    const ofrecer = !e.bomba && h < e.umbral + 3
    return {
      respuesta: textoRiegoHoy(e, ahora) + (ofrecer ? ' Si no quieres esperar, puedo regar ahora.' : ''),
      accion: ofrecer ? 'regar' : null,
    }
  }
  return {
    respuesta:
      'En la demostración contesto preguntas de ejemplo: si conviene regar, el clima, la helada, la etapa del cultivo, plagas, fertilizante y el sensor. En el sistema real contesta la IA con los datos de tu cultivo, y puedes preguntarle lo que quieras.',
    accion: null,
  }
}

/** El reporte de ejemplo. Dice desde la primera línea que la foto no se miró. */
export function reporteDeFoto(e: Estado, cuerpo: Record<string, unknown>) {
  const p = e.parcelas.find(x => x.id === Number(cuerpo.parcelaId)) ?? null
  const declarada = typeof cuerpo.plantaDeclarada === 'string' ? cuerpo.plantaDeclarada.trim() : ''
  const planta = p ? nombreCultivo(p) : declarada || 'la planta'
  const plagas = p ? plagasDeCultivo(p.cultivo) : []
  const [primera, segunda] = plagas

  const hipotesis = [
    primera
      ? {
          nombre: primera.nombre,
          nombreCientifico: '',
          tipo: 'plaga',
          probabilidad: 'media',
          aFavor: ['Es la plaga más común de este cultivo en esta temporada.'],
          enContra: ['En una foto real se buscarían los insectos o el daño que deja.'],
          comoConfirmarlo: primera.comoReconocerla,
          delCatalogo: true,
        }
      : {
          nombre: 'Mancha por hongo',
          nombreCientifico: '',
          tipo: 'hongo',
          probabilidad: 'media',
          aFavor: ['Las lluvias de la semana favorecen hongos en la hoja.'],
          enContra: ['En una foto real se revisaría si la mancha tiene borde amarillo.'],
          comoConfirmarlo: 'Mira el envés de la hoja con buena luz: el hongo suele dejar un polvo o puntos oscuros.',
          delCatalogo: false,
        },
    {
      nombre: 'Falta de agua por la tarde',
      nombreCientifico: '',
      tipo: 'estres_hidrico',
      probabilidad: 'baja',
      aFavor: ['Las tardes son las horas de más evaporación.'],
      enContra: [`El sensor marca ${humedadActual(e)}%, arriba del punto de riego.`],
      comoConfirmarlo: 'Si la hoja se ve caída a las 4 de la tarde y se recupera en la mañana, es agua.',
      delCatalogo: false,
    },
  ]
  if (segunda) {
    hipotesis.push({
      nombre: segunda.nombre,
      nombreCientifico: '',
      tipo: 'plaga',
      probabilidad: 'baja',
      aFavor: ['También anda activa en esta temporada.'],
      enContra: ['Es menos común que la primera.'],
      comoConfirmarlo: segunda.comoReconocerla,
      delCatalogo: true,
    })
  }

  return {
    fotoUtil: true,
    problemaDeFoto: '',
    esPlanta: true,
    plantaVista: planta,
    coincideConCultivo: 'no_se_puede_saber',
    resumen:
      `Reporte de ejemplo: en la demostración la foto no se analiza. Así se ve el reporte que da la IA en el sistema real, armado con lo que se sabe de ${planta} en esta temporada.`,
    observaciones: [
      'En la demostración la foto no sale de tu teléfono ni se mira.',
      'En el sistema real, aquí se describe lo que se ve en la foto: color, forma y tamaño del daño.',
    ],
    hipotesis,
    severidad: 'leve',
    urgencia: 'baja',
    relacionConElRiego: `La tierra está en ${humedadActual(e)}% y el riego va bien para la etapa: no parece un problema de agua.`,
    accionesInmediatas: [
      'Revisa 10 hojas de la parte baja y cuenta en cuántas ves el daño.',
      'Toma la foto de cerca, con luz de día y sin flash.',
    ],
    cuandoLlamarATecnico: 'Si el daño aparece en más de la mitad de las hojas que revises, o avanza de una semana a otra.',
    siguienteFoto: 'Una foto del envés de la hoja, de cerca.',
  }
}

