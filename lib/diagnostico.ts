// El diagnóstico por foto: la forma del reporte que devuelve el backend
// (ia/diagnostico-foto.js) y los textos con que la pantalla lo presenta.
// Sin React ni navegador: se prueba con node --test.

export type Probabilidad = 'alta' | 'media' | 'baja'
export type Severidad = 'ninguna' | 'leve' | 'moderada' | 'severa'
export type Urgencia = 'ninguna' | 'baja' | 'media' | 'alta'

export type TipoDeCausa =
  | 'plaga'
  | 'hongo'
  | 'bacteria'
  | 'virus'
  | 'nematodo'
  | 'deficiencia_nutricional'
  | 'toxicidad_o_salinidad'
  | 'estres_hidrico'
  | 'dano_ambiental'
  | 'fitotoxicidad'
  | 'dano_mecanico'
  | 'maleza'
  | 'insecto_benefico'
  | 'fisiologico'
  | 'no_identificado'

export interface Hipotesis {
  nombre: string
  nombreCientifico: string
  tipo: TipoDeCausa
  probabilidad: Probabilidad
  aFavor: string[]
  enContra: string[]
  comoConfirmarlo: string
  delCatalogo: boolean
}

export interface ReporteDiagnostico {
  fotoUtil: boolean
  problemaDeFoto: string
  esPlanta: boolean
  plantaVista: string
  coincideConCultivo: 'si' | 'no' | 'no_se_puede_saber'
  resumen: string
  observaciones: string[]
  hipotesis: Hipotesis[]
  severidad: Severidad
  urgencia: Urgencia
  relacionConElRiego: string
  accionesInmediatas: string[]
  cuandoLlamarATecnico: string
  siguienteFoto: string
}

export const MAX_FOTOS = 3

export type ParteId =
  | 'hoja'
  | 'enves'
  | 'fruto'
  | 'flor'
  | 'tallo'
  | 'raiz'
  | 'planta'
  | 'bicho'

/** Qué fotografió el productor, con el consejo para que la foto sirva. */
export const PARTES: { id: ParteId; nombre: string; consejo: string }[] = [
  { id: 'hoja', nombre: 'Hoja', consejo: 'De cerca, que la mancha llene la foto y se vea el borde sano.' },
  { id: 'enves', nombre: 'Envés', consejo: 'Voltea la hoja: ahí se esconden pulgones, ácaros y hongos.' },
  { id: 'fruto', nombre: 'Fruto o nuez', consejo: 'Uno dañado junto a uno sano, si puedes.' },
  { id: 'flor', nombre: 'Flor o yema', consejo: 'Bien enfocada, con luz de día y sin flash.' },
  { id: 'tallo', nombre: 'Tallo o rama', consejo: 'Incluye la parte donde empieza el daño.' },
  { id: 'raiz', nombre: 'Raíz o cuello', consejo: 'Sacude la tierra; que se vea el color por dentro si está podrida.' },
  { id: 'planta', nombre: 'Planta completa', consejo: 'A unos pasos, para ver el patrón: ¿de abajo, de arriba, de un lado?' },
  { id: 'bicho', nombre: 'Un bicho', consejo: 'Lo más cerca que enfoque tu celular; junto a una moneda para el tamaño.' },
]

export const TEXTO_TIPO: Record<TipoDeCausa, string> = {
  plaga: 'Plaga',
  hongo: 'Hongo',
  bacteria: 'Bacteria',
  virus: 'Virus',
  nematodo: 'Nematodo',
  deficiencia_nutricional: 'Falta de nutriente',
  toxicidad_o_salinidad: 'Exceso de sales o toxicidad',
  estres_hidrico: 'Agua: falta o exceso',
  dano_ambiental: 'Clima: helada, calor, sol o granizo',
  fitotoxicidad: 'Daño por producto o herbicida',
  dano_mecanico: 'Golpe, herida o animal',
  maleza: 'Maleza',
  insecto_benefico: 'Insecto benéfico',
  fisiologico: 'Proceso natural de la planta',
  no_identificado: 'No identificado',
}

export const TEXTO_PROBABILIDAD: Record<Probabilidad, string> = {
  alta: 'Muy probable',
  media: 'Posible',
  baja: 'Menos probable',
}

/** Qué tan llena va la barra de cada hipótesis. */
export const NIVEL_PROBABILIDAD: Record<Probabilidad, number> = { alta: 3, media: 2, baja: 1 }

export const TEXTO_SEVERIDAD: Record<Severidad, string> = {
  ninguna: 'Sin daño visible',
  leve: 'Daño leve',
  moderada: 'Daño moderado',
  severa: 'Daño severo',
}

export const TEXTO_URGENCIA: Record<Urgencia, string> = {
  ninguna: 'No hace falta hacer nada',
  baja: 'Nada urgente: vigílalo',
  media: 'Revísalo esta semana',
  alta: 'Atiéndelo hoy',
}

/** El color de la franja del reporte, con los tokens del tema. */
export function colorDeUrgencia(u: Urgencia): string {
  if (u === 'alta') return 'var(--peligro)'
  if (u === 'media') return 'var(--alerta)'
  if (u === 'baja') return 'var(--riesgo-medio)'
  return 'var(--ok)'
}

/**
 * La pregunta que se le pasa al asistente para seguir la conversación.
 * Lleva lo principal del reporte, no el reporte entero.
 */
export function preguntaDeSeguimiento(r: ReporteDiagnostico): string {
  const principal = r.hipotesis[0]
  if (!principal) return `Le tomé fotos a mi planta y el análisis dice: ${r.resumen} ¿Qué me recomiendas?`
  const otras = r.hipotesis.slice(1).map(h => h.nombre)
  const tambien = otras.length > 0 ? ` También podría ser ${otras.join(' o ')}.` : ''
  return `El análisis de mis fotos dice que lo más probable es ${principal.nombre}.${tambien} ¿Qué hago y cómo lo evito?`
}
