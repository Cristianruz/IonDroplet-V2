// La API de la demostración: contesta lo mismo que el backend, con la misma
// forma, pero desde el sistema simulado. Cada ruta copia el comportamiento de
// su par en server.js; si cambia una respuesta allá, hay que cambiarla aquí.
//
// Sin React ni navegador: se prueba con node --test.

import {
  DIA,
  HORA,
  MIN,
  aligerar,
  apagarBomba,
  avanzar,
  cambiarPuntoDeRiego,
  decidirAgente,
  deSqlTs,
  encenderBomba,
  humedadActual,
  kcDe,
  redondear,
  registrar,
  sensorMudo,
  sqlTs,
  ultimaLectura,
  type Estado,
  type FertiDemo,
  type ParcelaDemo,
} from './simulacion.ts'
import { balanceDeDias, clima } from './clima.ts'
import {
  analisis,
  consejo,
  pronosticoSemana,
  propuestaDeUmbral,
  reporteDeFoto,
  responderChat,
} from './textos-ia.ts'

export interface Respuesta {
  status: number
  cuerpo: unknown
}

const ok = (cuerpo: unknown): Respuesta => ({ status: 200, cuerpo })
const error = (status: number, mensaje: string, extra: object = {}): Respuesta => ({
  status,
  cuerpo: { error: mensaje, ...extra },
})

const NUTRIENTES = ['N', 'P', 'K', 'Ca', 'Mg', 'S', 'Fe', 'Zn', 'Mn', 'B', 'Cu', 'Mo', 'otro']
const UNIDADES = ['kg', 'g', 'L', 'ml']

function numero(valor: string | null, porOmision: number): number {
  const n = valor === null ? NaN : parseInt(valor, 10)
  return Number.isFinite(n) && n > 0 ? n : porOmision
}

function principal(e: Estado): ParcelaDemo {
  return e.parcelas.find(p => p.id === 1) ?? e.parcelas[0]
}

function riegosDe(e: Estado, parcelaId: number, desde: number) {
  return e.registros.filter(r => r.tipo === 'riego' && r.parcela_id === parcelaId && r.t > desde)
}

function lecturasDe(e: Estado, parcelaId: number, desde: number) {
  return (e.lecturas[parcelaId] ?? []).filter(l => l.t > desde)
}

function filaLectura(l: { t: number; h: number }, parcelaId: number, i: number) {
  return {
    id: i,
    temperature: null,
    humidity: Math.round(l.h),
    voltage: null,
    current: null,
    device_id: `ESP-DEMO-${parcelaId}`,
    timestamp: sqlTs(l.t),
    parcela_id: parcelaId,
  }
}

function eficiencia(e: Estado, ahora: number, dias: number) {
  const p = principal(e)
  const lecturas = e.lecturas[1] ?? []
  // Los riegos muy cortos (los que se prueban a mano en la demostración) no
  // dicen nada de cuánto cuesta subir un punto.
  const riegos = riegosDe(e, 1, ahora - dias * DIA).filter(r => (r.duracion_seg ?? 0) >= 300)
  const eventos = riegos.map(r => {
    const minutos = redondear((r.duracion_seg ?? 0) / 60, 2)
    const antes = [...lecturas].reverse().find(l => l.t <= r.t)?.h ?? null
    const fin = r.t + (r.duracion_seg ?? 0) * 1000
    const despues = lecturas.filter(l => l.t >= fin && l.t <= fin + 60 * MIN).reduce<number | null>(
      (m, l) => (m === null || l.h > m ? l.h : m),
      null
    )
    const puntos = antes !== null && despues !== null ? Math.round(despues - antes) : null
    const minPorPunto = puntos && puntos > 0 ? redondear(minutos / puntos, 2) : null
    const litros = p.caudal_lpm ? redondear(minutos * p.caudal_lpm, 1) : null
    return {
      id: r.id,
      cuando: sqlTs(r.t),
      minutos,
      humedad_antes: antes === null ? null : Math.round(antes),
      humedad_despues: despues === null ? null : Math.round(despues),
      puntos_ganados: puntos,
      minutos_por_punto: minPorPunto,
      litros,
      litros_por_punto: litros !== null && puntos && puntos > 0 ? redondear(litros / puntos, 1) : null,
    }
  })
  const medidos = eventos.map(x => x.minutos_por_punto).filter((x): x is number => x !== null)
  const ordenados = [...medidos].sort((a, b) => a - b)
  const referencia = ordenados.length >= 3 ? ordenados[Math.floor(ordenados.length / 2)] : null
  const ultimo = medidos.length > 0 ? medidos[medidos.length - 1] : null
  return {
    parcela: { id: p.id, nombre: p.nombre, caudal_lpm: p.caudal_lpm },
    dias,
    eventos,
    referencia_min_por_punto: referencia,
    ultimo_min_por_punto: ultimo,
    desviacion_pct: referencia && ultimo ? Math.round(((ultimo - referencia) / referencia) * 100) : null,
    faltantes:
      medidos.length >= 3
        ? []
        : [{ dato: 'historial', porque: `Hacen falta al menos 3 riegos con lectura antes y después para saber qué es normal aquí. Hay ${medidos.length}.` }],
  }
}

function balance(e: Estado, ahora: number, dias: number) {
  const p = principal(e)
  const kc = kcDe(p.cultivo, p.etapa)
  const filas = balanceDeDias(ahora, kc, dias)
  const suma = (f: (d: (typeof filas)[number]) => number) => redondear(filas.reduce((s, d) => s + f(d), 0), 2)
  const deficit = suma(d => d.deficit_mm)
  const riegos = riegosDe(e, 1, ahora - 7 * DIA)
  const minutos = Math.round(riegos.reduce((s, r) => s + (r.duracion_seg ?? 0), 0) / 60)
  return {
    parcela: { id: p.id, nombre: p.nombre, cultivo: p.cultivo, etapa: p.etapa, area_ha: p.area_ha },
    kc,
    dias: filas,
    totales: {
      et0_mm: suma(d => d.et0_mm),
      etc_mm: suma(d => d.etc_mm),
      lluvia_mm: suma(d => d.lluvia_mm),
      deficit_mm: deficit,
      deficit_litros_por_ha: Math.round(deficit * 10000),
      deficit_litros_parcela: p.area_ha ? Math.round(deficit * p.area_ha * 10000) : null,
    },
    riego: {
      eventos: riegos.length,
      minutos,
      // El backend todavía no lo calcula: siempre va en null.
      mm: null,
      sin_cerrar: riegos.filter(r => r.duracion_seg === null).length,
    },
    faltantes: [],
  }
}

function resumenFertirriego(e: Estado, ahora: number, dias: number) {
  const eventos = e.fertirriego.filter(f => deSqlTs(f.aplicado) > ahora - dias * DIA)
  const porNutriente = new Map<string, { nutriente: string; unidad: string | null; total: number; eventos: number }>()
  const porEtapa = new Map<string, number>()
  for (const ev of eventos) {
    for (const n of ev.nutrientes) {
      const clave = `${n.nutriente}|${n.unidad}`
      const fila = porNutriente.get(clave) ?? { nutriente: n.nutriente, unidad: n.unidad, total: 0, eventos: 0 }
      fila.total = redondear(fila.total + (n.cantidad ?? 0), 2)
      fila.eventos++
      porNutriente.set(clave, fila)
    }
    if (ev.etapa) porEtapa.set(ev.etapa, (porEtapa.get(ev.etapa) ?? 0) + 1)
  }
  const promedio = (vals: Array<number | null>) => {
    const v = vals.filter((x): x is number => x !== null)
    return v.length ? redondear(v.reduce((s, x) => s + x, 0) / v.length, 2) : null
  }
  const conVolumen = eventos.filter(x => x.volumen_litros !== null)
  return {
    dias,
    porNutriente: [...porNutriente.values()],
    porEtapa: [...porEtapa.entries()].map(([etapa, n]) => ({ etapa, eventos: n })),
    totales: {
      eventos: eventos.length,
      litros: conVolumen.length ? conVolumen.reduce((s, x) => s + (x.volumen_litros ?? 0), 0) : null,
      ec_promedio: promedio(eventos.map(x => x.ec_ds_m)),
      ph_promedio: promedio(eventos.map(x => x.ph)),
      sin_volumen: eventos.length - conVolumen.length,
    },
  }
}

function estadoEsp(e: Estado) {
  return { autoMode: e.auto, pumpState: e.bomba, espIp: null }
}

/**
 * Contesta una petición a la API. `ruta` va sin "/api/" y sin la consulta.
 */
export function responder(
  e: Estado,
  metodo: string,
  ruta: string,
  consulta: URLSearchParams,
  cuerpo: Record<string, unknown>,
  ahora: number
): Respuesta {
  avanzar(e, ahora)
  const partes = ruta.split('/').filter(Boolean)
  const [a, b, c] = partes
  const GET = metodo === 'GET'
  const POST = metodo === 'POST'

  // --- Sensores y bomba ---
  if (GET && ruta === 'sensors/latest') {
    // Con el sensor desconectado se entrega la última que llegó, con su hora:
    // la app ve que es vieja y avisa, igual que con el aparato de verdad.
    const ultima = sensorMudo(e) ? ultimaLectura(e) : null
    return ok(filaLectura(ultima ?? { t: ahora, h: humedadActual(e) }, 1, 1))
  }
  if (GET && ruta === 'sensors/history') {
    const horas = numero(consulta.get('hours'), 24)
    const max = consulta.get('max') ? Math.max(numero(consulta.get('max'), 2), 2) : Infinity
    const lista = lecturasDe(e, 1, ahora - horas * HORA)
    return ok(aligerar(lista, max).map((l, i) => filaLectura(l, 1, i + 1)))
  }
  if (GET && ruta === 'sensors/resumen') {
    const lista = lecturasDe(e, 1, ahora - numero(consulta.get('hours'), 24) * HORA)
    if (lista.length === 0) return ok({ lecturas: 0, promedio: null, minimo: null, maximo: null })
    const valores = lista.map(l => l.h)
    return ok({
      lecturas: lista.length,
      promedio: redondear(valores.reduce((s, v) => s + v, 0) / valores.length),
      minimo: Math.round(Math.min(...valores)),
      maximo: Math.round(Math.max(...valores)),
    })
  }
  if (GET && ruta === 'esp/status') return ok({ ...estadoEsp(e), parcela_id: 1 })
  if (POST && ruta === 'esp/control') {
    // Igual que el backend: primero el modo, y la bomba solo se obedece en manual.
    if (typeof cuerpo.autoMode === 'boolean' && cuerpo.autoMode !== e.auto) {
      e.auto = cuerpo.autoMode
      registrar(e, {
        tipo: 'modo',
        detalle: e.auto ? 'Cambió a riego automático' : 'Cambió a riego manual',
        origen: 'usuario',
        parcela_id: 1,
        t: ahora,
        duracion_seg: null,
      })
    }
    if (cuerpo.bomba !== undefined && !e.auto) {
      if (Number(cuerpo.bomba) === 1) encenderBomba(e, ahora, 'usuario')
      else apagarBomba(e, ahora)
    }
    avanzar(e, ahora)
    return ok({ success: true, settings: estadoEsp(e), parcela_id: 1 })
  }
  if (GET && ruta === 'ionization/estado') {
    return ok({ encendida: e.ion.encendida, desde: sqlTs(e.ion.desde), nunca: false })
  }
  if (POST && ruta === 'ionization/toggle') {
    if (typeof cuerpo.state !== 'boolean') return error(400, 'El estado de la ionización no es válido.')
    if (cuerpo.state !== e.ion.encendida) {
      e.ion = { encendida: cuerpo.state, desde: ahora }
      registrar(e, {
        tipo: 'ionizacion',
        detalle: cuerpo.state ? 'Encendió la ionización' : 'Apagó la ionización',
        origen: 'usuario',
        parcela_id: 1,
        t: ahora,
        duracion_seg: null,
      })
    }
    return ok({ success: true, state: cuerpo.state, timestamp: new Date(ahora).toISOString() })
  }

  // --- Punto de riego ---
  if (GET && ruta === 'thresholds') {
    return ok({ id: 1, temp_max: 24, hum_max: e.umbral, volt_min: 0, volt_max: 30, curr_max: 5 })
  }
  if (POST && ruta === 'thresholds') {
    const valor = cuerpo.hum_max
    if (typeof valor !== 'number') return error(400, 'Falta el punto de riego (hum_max).')
    if (valor < 10 || valor > 90) return error(400, 'El punto de riego tiene que estar entre 10 y 90')
    if (valor !== e.umbral) cambiarPuntoDeRiego(e, valor, 'usuario', ahora)
    return ok({ success: true })
  }

  // --- Cultivos ---
  if (a === 'parcelas') {
    if (GET && !b) return ok(e.parcelas)
    if (GET && b === 'comparar') {
      const horas = numero(consulta.get('hours'), 168)
      const max = numero(consulta.get('max'), 200)
      const desde = ahora - horas * HORA
      return ok({
        horas,
        max,
        series: e.parcelas.map(p => {
          const lista = lecturasDe(e, p.id, desde)
          const riegos = p.id === 1
            ? riegosDe(e, p.id, desde)
            : e.registros.filter(r => r.tipo === 'riego' && r.parcela_id === p.id && r.t > desde)
          return {
            parcela_id: p.id,
            nombre: p.nombre,
            cultivo: p.cultivo,
            etapa: p.etapa,
            lecturas_en_ventana: lista.length,
            puntos: aligerar(lista, max).map(l => ({ humidity: Math.round(l.h), timestamp: sqlTs(l.t) })),
            riego: {
              eventos: riegos.length,
              minutos: Math.round(riegos.reduce((s, r) => s + (r.duracion_seg ?? 0), 0) / 60),
            },
          }
        }),
      })
    }
    if (POST && !b) {
      if (typeof cuerpo.nombre !== 'string' || cuerpo.nombre.trim() === '') {
        return error(400, 'Falta el nombre del cultivo.')
      }
      const id = e.parcelas.reduce((m, p) => Math.max(m, p.id), 0) + 1
      const nueva: ParcelaDemo = {
        id,
        nombre: cuerpo.nombre.trim(),
        cultivo: String(cuerpo.cultivo ?? 'otro'),
        num_hileras: null,
        tipo_sistema: (cuerpo.tipo_sistema as string) ?? null,
        hum_min: typeof cuerpo.hum_min === 'number' ? cuerpo.hum_min : 40,
        hum_max: 80,
        device_id: null,
        creado: sqlTs(ahora),
        etapa: (cuerpo.etapa as string) ?? null,
        area_ha: (cuerpo.area_ha as number) ?? null,
        ubicacion_fuente: null,
        ubicacion_fecha: null,
        caudal_lpm: (cuerpo.caudal_lpm as number) ?? null,
      }
      e.parcelas.push(nueva)
      // Sin aparato no hay lecturas: la comparación lo dirá con cero lecturas.
      e.lecturas[id] = []
      e.h[id] = 50
      return ok(nueva)
    }
    const id = Number(b)
    const p = e.parcelas.find(x => x.id === id)
    if (!p) return error(404, 'No existe ese cultivo.')
    if (GET) return ok(p)
    if (metodo === 'PUT') {
      const campos = ['nombre', 'cultivo', 'etapa', 'area_ha', 'caudal_lpm', 'tipo_sistema', 'hum_min'] as const
      for (const campo of campos) {
        if (cuerpo[campo] !== undefined) (p as unknown as Record<string, unknown>)[campo] = cuerpo[campo]
      }
      // La ubicación se acepta pero no se guarda: en la demostración el lugar es fijo.
      if (cuerpo.latitud !== undefined) {
        p.ubicacion_fuente = 'telefono'
        p.ubicacion_fecha = sqlTs(ahora)
      }
      return ok(p)
    }
  }

  // --- Bitácora e historial ---
  if (GET && ruta === 'logs') {
    const limite = Math.min(numero(consulta.get('limit'), 50), 500)
    const horas = consulta.get('hours') ? numero(consulta.get('hours'), 24) : null
    const filas = e.registros
      .filter(r => r.parcela_id === 1 && (horas === null || r.t > ahora - horas * HORA))
      .sort((x, y) => y.t - x.t || y.id - x.id)
      .slice(0, limite)
      .map(r => ({
        id: r.id,
        tipo: r.tipo,
        detalle: r.detalle,
        origen: r.origen,
        parcela_id: r.parcela_id,
        timestamp: sqlTs(r.t),
        duracion_seg: r.duracion_seg,
      }))
    return ok(filas)
  }
  if (GET && ruta === 'logs/resumen') {
    const riegos = riegosDe(e, 1, ahora - numero(consulta.get('hours'), 24) * HORA)
    return ok({
      riegos: riegos.length,
      segundos_agua: riegos.reduce((s, r) => s + (r.duracion_seg ?? 0), 0),
      sin_duracion: riegos.filter(r => r.duracion_seg === null && !(e.riego && e.riego.idRegistro === r.id)).length,
    })
  }
  if (GET && ruta === 'riego/eficiencia') return ok(eficiencia(e, ahora, numero(consulta.get('dias'), 90)))

  // --- Fertirriego ---
  if (a === 'fertirriego') {
    if (GET && !b) {
      const limite = numero(consulta.get('limit'), 50)
      return ok([...e.fertirriego].sort((x, y) => deSqlTs(y.aplicado) - deSqlTs(x.aplicado)).slice(0, limite))
    }
    if (GET && b === 'resumen') return ok(resumenFertirriego(e, ahora, numero(consulta.get('dias'), 90)))
    if (POST && !b) {
      const nutrientes = Array.isArray(cuerpo.nutrientes) ? (cuerpo.nutrientes as FertiDemo['nutrientes']) : []
      if (nutrientes.length === 0) return error(400, 'Hay que decir al menos qué nutriente se aplicó.')
      for (const n of nutrientes) {
        if (!NUTRIENTES.includes(n.nutriente)) return error(400, `Nutriente no reconocido: ${n.nutriente}`)
        if (n.unidad && !UNIDADES.includes(n.unidad)) return error(400, `Unidad no reconocida: ${n.unidad}`)
      }
      const numeroONulo = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
      const evento: FertiDemo = {
        id: e.fertirriego.reduce((m, f) => Math.max(m, f.id), 0) + 1,
        parcela_id: 1,
        aplicado: sqlTs(ahora),
        duracion_min: numeroONulo(cuerpo.duracion_min),
        volumen_litros: numeroONulo(cuerpo.volumen_litros),
        ec_ds_m: numeroONulo(cuerpo.ec_ds_m),
        ph: numeroONulo(cuerpo.ph),
        etapa: principal(e).etapa,
        operador: null,
        notas: typeof cuerpo.notas === 'string' && cuerpo.notas.trim() !== '' ? cuerpo.notas.trim() : null,
        nutrientes: nutrientes.map(n => ({ nutriente: n.nutriente, cantidad: n.cantidad ?? null, unidad: n.unidad ?? null })),
      }
      e.fertirriego.push(evento)
      return ok(evento)
    }
    if (metodo === 'DELETE' && b) {
      const id = Number(b)
      if (!e.fertirriego.some(f => f.id === id)) return error(404, 'No existe esa aplicación.')
      e.fertirriego = e.fertirriego.filter(f => f.id !== id)
      return ok({ borrado: id })
    }
  }

  // --- Clima y agua ---
  if (GET && ruta === 'clima') return ok(clima(ahora, principal(e).ubicacion_fecha ?? sqlTs(ahora)))
  if (GET && ruta === 'agua/balance') return ok(balance(e, ahora, Math.min(numero(consulta.get('dias'), 7), 7)))

  // --- Alertas ---
  if (a === 'alertas') {
    if (GET && !b) {
      const limite = numero(consulta.get('limit'), 80)
      return ok([...e.alertas].sort((x, y) => deSqlTs(y.creada) - deSqlTs(x.creada)).slice(0, limite))
    }
    if (GET && b === 'resumen') {
      const porSeveridad = { critica: 0, atencion: 0, informativa: 0 }
      for (const al of e.alertas) if (al.estado === 'nueva') porSeveridad[al.severidad]++
      return ok({ sinVer: porSeveridad.critica + porSeveridad.atencion + porSeveridad.informativa, porSeveridad })
    }
    if (POST && b === 'vistas') {
      let marcadas = 0
      for (const al of e.alertas) {
        if (al.estado === 'nueva') {
          al.estado = 'leida'
          marcadas++
        }
      }
      return ok({ marcadas })
    }
    if (POST && c === 'estado') {
      const id = Number(b)
      const estado = cuerpo.estado as string
      if (!['nueva', 'leida', 'atendida', 'descartada'].includes(estado)) return error(400, 'Estado no reconocido.')
      const al = e.alertas.find(x => x.id === id)
      if (!al) return error(404, 'No existe esa alerta.')
      al.estado = estado as typeof al.estado
      if (estado === 'atendida') {
        al.atendida_en = sqlTs(ahora)
        al.atendida_por = 'Visita de la demostración'
      }
      return ok({ id, estado })
    }
  }

  // --- El agente agrónomo ---
  if (a === 'agente') {
    if (GET && b === 'estado') {
      const ultima = e.decisiones[0]
      return ok({
        habilitado: e.agenteHabilitado,
        limites: { RANGO: { min: 10, max: 90 }, DELTA_MAXIMO: 5, FRESCURA_MINIMA_MIN: 360, HORAS_ENTRE_CORRIDAS: 20 },
        ultima: ultima ? { cuando: ultima.cuando, herramienta: ultima.herramienta } : null,
      })
    }
    if (GET && b === 'decisiones') return ok(e.decisiones.slice(0, numero(consulta.get('limit'), 20)))
    if (POST && b === 'habilitar') {
      e.agenteHabilitado = cuerpo.habilitado !== false
      return ok({ habilitado: e.agenteHabilitado })
    }
    if (POST && b === 'correr') {
      if (!e.agenteHabilitado) return error(409, 'El agente está apagado.')
      const decision = decidirAgente(e, ahora, pronosticoSemana(e, ahora))
      return ok({ corrio: true, hechos: [{ herramienta: decision.herramienta }] })
    }
    if (POST && b === 'revertir') {
      const d = e.decisiones.find(x => x.id === Number(c))
      if (!d || !d.aplicada || d.revertida_en) return error(400, 'Esa decisión no se puede deshacer.', { ok: false })
      d.revertida_en = sqlTs(ahora)
      d.revertida_por = 'Visita de la demostración'
      cambiarPuntoDeRiego(e, d.valor_antes ?? e.umbral, 'usuario', ahora,
        `Se deshizo el cambio del agente: el punto vuelve a ${d.valor_antes}%`)
      return ok({ ok: true })
    }
  }

  // --- Lo que en el sistema real hace la IA ---
  if (GET && ruta === 'ai/consejo') {
    return ok({ consejo: consejo(e, String(consulta.get('pantalla') ?? 'inicio'), ahora), cuando: new Date(ahora).toISOString() })
  }
  if (GET && ruta === 'ai/analisis') return ok(analisis(e, ahora))
  if (POST && ruta === 'ai/umbral') return ok(propuestaDeUmbral(e, ahora))
  if (POST && ruta === 'ai/umbral/aplicar') {
    const valor = Number(cuerpo.valor)
    if (!Number.isFinite(valor) || valor < 10 || valor > 90) {
      return error(400, 'El punto de riego tiene que estar entre 10 y 90')
    }
    cambiarPuntoDeRiego(e, valor, 'ia', ahora)
    return ok({ success: true, hum_max: valor })
  }
  if (POST && ruta === 'chat') {
    if (typeof cuerpo.pregunta !== 'string' || cuerpo.pregunta.trim() === '') return error(400, 'Falta la pregunta.')
    return ok(responderChat(e, cuerpo.pregunta, ahora))
  }
  if (POST && ruta === 'ai/foto') {
    if (!Array.isArray(cuerpo.fotos) || cuerpo.fotos.length === 0) return error(400, 'Falta la foto.')
    return ok(reporteDeFoto(e, cuerpo))
  }

  // Vincular el aparato no hace falta: en la demostración no hay llave.
  if (a === 'dueno') return error(404, 'En la demostración no hace falta vincular este aparato.')

  return error(404, 'Esta parte no existe en la demostración.')
}
