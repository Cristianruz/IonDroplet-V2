// Catálogo de cultivos y etapas.
//
// DOS NIVELES, A PROPÓSITO:
//
// 1. Las seis FASES (siembra, crecimiento, floración, fruto, cosecha,
//    descanso) son el modelo interno. Con ellas trabajan el coeficiente de
//    cultivo (Kc) del backend, los rangos de humedad de la guía agronómica y
//    la escena 3D. No se tocan sin migrar la base y la tabla de FAO.
//
// 2. Las ETAPAS son lo que ve y escoge el agricultor, con el nombre que se
//    usa en el campo: "llenado de almendra", "espigado", "tuberización". Cada
//    una declara a qué fase pertenece. Así la pantalla habla como la parcela
//    y el cálculo sigue siendo el mismo.
//
// El icono es emoji a propósito: la regla 10 permite emojis como icono de
// catálogo (cultivo, plaga, aparato) definidos aquí.
//
// PENDIENTE DE REVISIÓN AGRONÓMICA: los nombres de etapa y su reparto por
// fase los redactó Claude a partir de la literatura de FAO-56 y del manejo
// habitual en Chihuahua. Falta que un agrónomo los valide, igual que la tabla
// Kc del backend (`guia-cultivos.js`).

export type GrupoCultivo =
  | 'Nogal y frutales'
  | 'Granos y forrajes'
  | 'Hortalizas'
  | 'Otros'

export interface Cultivo {
  id: string
  nombre: string
  icono: string
  grupo: GrupoCultivo
  /** Qué juego de etapas le toca. */
  ciclo: CicloId
}

export type CicloId =
  | 'nogal'
  | 'frutal'
  | 'grano'
  | 'forraje_perenne'
  | 'hortaliza_fruto'
  | 'hortaliza_raiz'
  | 'hortaliza_hoja'
  | 'algodon'
  | 'generico'

export const CULTIVOS: Cultivo[] = [
  // Nogal y frutales
  { id: 'nogal', nombre: 'Nogal pecanero', icono: '🌰', grupo: 'Nogal y frutales', ciclo: 'nogal' },
  { id: 'manzana', nombre: 'Manzano', icono: '🍎', grupo: 'Nogal y frutales', ciclo: 'frutal' },
  { id: 'durazno', nombre: 'Durazno', icono: '🍑', grupo: 'Nogal y frutales', ciclo: 'frutal' },
  { id: 'vid', nombre: 'Vid (uva)', icono: '🍇', grupo: 'Nogal y frutales', ciclo: 'frutal' },
  { id: 'ciruela', nombre: 'Ciruelo', icono: '🫐', grupo: 'Nogal y frutales', ciclo: 'frutal' },

  // Granos y forrajes
  { id: 'maiz', nombre: 'Maíz', icono: '🌽', grupo: 'Granos y forrajes', ciclo: 'grano' },
  { id: 'sorgo', nombre: 'Sorgo', icono: '🌾', grupo: 'Granos y forrajes', ciclo: 'grano' },
  { id: 'trigo', nombre: 'Trigo', icono: '🌾', grupo: 'Granos y forrajes', ciclo: 'grano' },
  { id: 'cebada', nombre: 'Cebada', icono: '🌾', grupo: 'Granos y forrajes', ciclo: 'grano' },
  { id: 'avena', nombre: 'Avena forrajera', icono: '🌾', grupo: 'Granos y forrajes', ciclo: 'grano' },
  { id: 'frijol', nombre: 'Frijol', icono: '🫘', grupo: 'Granos y forrajes', ciclo: 'grano' },
  { id: 'alfalfa', nombre: 'Alfalfa', icono: '🌿', grupo: 'Granos y forrajes', ciclo: 'forraje_perenne' },
  { id: 'pastizal', nombre: 'Pradera o pastizal', icono: '🌱', grupo: 'Granos y forrajes', ciclo: 'forraje_perenne' },
  { id: 'algodon', nombre: 'Algodón', icono: '☁️', grupo: 'Granos y forrajes', ciclo: 'algodon' },

  // Hortalizas
  { id: 'chile', nombre: 'Chile', icono: '🌶️', grupo: 'Hortalizas', ciclo: 'hortaliza_fruto' },
  { id: 'jitomate', nombre: 'Jitomate', icono: '🍅', grupo: 'Hortalizas', ciclo: 'hortaliza_fruto' },
  { id: 'sandia', nombre: 'Sandía', icono: '🍉', grupo: 'Hortalizas', ciclo: 'hortaliza_fruto' },
  { id: 'melon', nombre: 'Melón', icono: '🍈', grupo: 'Hortalizas', ciclo: 'hortaliza_fruto' },
  { id: 'calabaza', nombre: 'Calabaza', icono: '🎃', grupo: 'Hortalizas', ciclo: 'hortaliza_fruto' },
  { id: 'pepino', nombre: 'Pepino', icono: '🥒', grupo: 'Hortalizas', ciclo: 'hortaliza_fruto' },
  { id: 'papa', nombre: 'Papa', icono: '🥔', grupo: 'Hortalizas', ciclo: 'hortaliza_raiz' },
  { id: 'cebolla', nombre: 'Cebolla', icono: '🧅', grupo: 'Hortalizas', ciclo: 'hortaliza_raiz' },
  { id: 'ajo', nombre: 'Ajo', icono: '🧄', grupo: 'Hortalizas', ciclo: 'hortaliza_raiz' },
  { id: 'zanahoria', nombre: 'Zanahoria', icono: '🥕', grupo: 'Hortalizas', ciclo: 'hortaliza_raiz' },
  { id: 'lechuga', nombre: 'Lechuga', icono: '🥬', grupo: 'Hortalizas', ciclo: 'hortaliza_hoja' },
  { id: 'esparrago', nombre: 'Espárrago', icono: '🌱', grupo: 'Hortalizas', ciclo: 'hortaliza_raiz' },

  // Otros
  { id: 'otro', nombre: 'Otro cultivo', icono: '🌱', grupo: 'Otros', ciclo: 'generico' },
]

export const GRUPOS: GrupoCultivo[] = ['Nogal y frutales', 'Granos y forrajes', 'Hortalizas', 'Otros']

// Se busca por id y también por nombre: las filas que ya están en la base
// guardan el nombre ("Nogal"), no el id.
export function cultivoPorId(valor: string | null | undefined): Cultivo | null {
  if (!valor) return null
  const buscado = normalizar(valor)
  return (
    CULTIVOS.find(c => c.id === buscado || normalizar(c.nombre) === buscado) ??
    // "Nogal pecanero" guardado como "nogal pecanero", "Pradera o pastizal"…
    CULTIVOS.find(c => normalizar(c.nombre).startsWith(buscado) && buscado.length >= 4) ??
    null
  )
}

export function normalizar(valor: string): string {
  return valor.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// --- Fases (el modelo interno; no cambiar sin migrar la base) ---

export type FaseId = 'siembra' | 'crecimiento' | 'floracion' | 'fruto' | 'cosecha' | 'descanso'

export interface Etapa {
  id: string
  nombre: string
  /** Qué significa para el riego. La etapa nunca se enseña sola. */
  explicacion: string
  /** La fase de la que depende el Kc y la escena 3D. */
  fase: FaseId
}

/** Las seis fases, con nombre genérico. Sirven de respaldo y de vocabulario. */
export const FASES: Etapa[] = [
  { id: 'siembra', nombre: 'Siembra o establecimiento', explicacion: 'riegos cortos y frecuentes para que prenda', fase: 'siembra' },
  { id: 'crecimiento', nombre: 'Desarrollo vegetativo', explicacion: 'está formando hoja y raíz; la demanda va subiendo', fase: 'crecimiento' },
  { id: 'floracion', nombre: 'Floración', explicacion: 'la etapa más sensible: un estrés aquí se paga en rendimiento', fase: 'floracion' },
  { id: 'fruto', nombre: 'Llenado de fruto o grano', explicacion: 'máxima demanda de agua; no debe secarse', fase: 'fruto' },
  { id: 'cosecha', nombre: 'Maduración y cosecha', explicacion: 'se reduce el riego para favorecer la madurez', fase: 'cosecha' },
  { id: 'descanso', nombre: 'Reposo', explicacion: 'demanda mínima', fase: 'descanso' },
]

/** Compatibilidad: el resto de la app llamaba ETAPAS a las seis fases. */
export const ETAPAS: Etapa[] = FASES

// --- Etapas por tipo de ciclo, con el nombre que se usa en el campo ---

const CICLOS: Record<CicloId, Etapa[]> = {
  nogal: [
    { id: 'establecimiento', nombre: 'Huerta recién plantada', explicacion: 'el árbol joven pide riegos cortos y seguidos', fase: 'siembra' },
    { id: 'brotacion', nombre: 'Brotación', explicacion: 'abre la yema y saca hoja nueva; riesgo alto de helada tardía', fase: 'crecimiento' },
    { id: 'floracion', nombre: 'Floración y amarre', explicacion: 'define cuánta nuez va a cuajar; el suelo no debe secarse', fase: 'floracion' },
    { id: 'crecimiento_nuez', nombre: 'Crecimiento de la nuez', explicacion: 'crece el fruto; aquí se define el calibre', fase: 'fruto' },
    { id: 'llenado_almendra', nombre: 'Llenado de almendra', explicacion: 'la etapa de mayor demanda del año', fase: 'fruto' },
    { id: 'madurez_cosecha', nombre: 'Madurez y cosecha', explicacion: 'abre el ruezno; se baja el riego para poder cosechar', fase: 'cosecha' },
    { id: 'postcosecha', nombre: 'Postcosecha y caída de hoja', explicacion: 'riego de mantenimiento para la reserva del año que entra', fase: 'descanso' },
    { id: 'reposo_invernal', nombre: 'Reposo invernal', explicacion: 'el árbol está dormido; demanda mínima', fase: 'descanso' },
  ],
  frutal: [
    { id: 'plantacion', nombre: 'Plantación reciente', explicacion: 'árbol joven: riegos cortos y seguidos', fase: 'siembra' },
    { id: 'yema_hinchada', nombre: 'Hinchamiento de yema', explicacion: 'arranca el ciclo; empieza el riesgo de helada', fase: 'crecimiento' },
    { id: 'floracion', nombre: 'Floración', explicacion: 'una helada o un estrés aquí se lleva la cosecha', fase: 'floracion' },
    { id: 'amarre', nombre: 'Amarre de fruto', explicacion: 'cuaja el fruto y cae el sobrante natural', fase: 'fruto' },
    { id: 'crecimiento_fruto', nombre: 'Crecimiento del fruto', explicacion: 'máxima demanda; el riego desparejo raja la fruta', fase: 'fruto' },
    { id: 'maduracion', nombre: 'Maduración y cosecha', explicacion: 'toma color y azúcar; se ajusta el riego a la baja', fase: 'cosecha' },
    { id: 'postcosecha', nombre: 'Postcosecha', explicacion: 'recupera reservas antes de la caída de hoja', fase: 'descanso' },
    { id: 'reposo_invernal', nombre: 'Reposo invernal', explicacion: 'árbol dormido; demanda mínima', fase: 'descanso' },
  ],
  grano: [
    { id: 'siembra_emergencia', nombre: 'Siembra y emergencia', explicacion: 'humedad pareja en la capa de arriba para que nazca parejo', fase: 'siembra' },
    { id: 'vegetativo', nombre: 'Desarrollo vegetativo', explicacion: 'macolla y crece; la demanda va subiendo', fase: 'crecimiento' },
    { id: 'espigado_floracion', nombre: 'Espigado y floración', explicacion: 'la etapa crítica: falta de agua aquí tira el rendimiento', fase: 'floracion' },
    { id: 'llenado_grano', nombre: 'Llenado de grano', explicacion: 'máxima demanda; define el peso del grano', fase: 'fruto' },
    { id: 'madurez', nombre: 'Madurez fisiológica', explicacion: 'el grano ya no gana peso; se suspende el riego', fase: 'cosecha' },
    { id: 'cosecha', nombre: 'Cosecha', explicacion: 'sin riego, se busca que el terreno entre seco', fase: 'cosecha' },
    { id: 'barbecho', nombre: 'Terreno en descanso', explicacion: 'entre ciclos; no se riega', fase: 'descanso' },
  ],
  forraje_perenne: [
    { id: 'establecimiento', nombre: 'Establecimiento', explicacion: 'siembra nueva: riegos cortos y seguidos hasta que cubra', fase: 'siembra' },
    { id: 'rebrote', nombre: 'Rebrote', explicacion: 'después del corte vuelve a crecer; la demanda sube rápido', fase: 'crecimiento' },
    { id: 'precorte', nombre: 'Antes del corte (botón floral)', explicacion: 'máximo volumen de forraje; es cuando más agua pide', fase: 'floracion' },
    { id: 'corte', nombre: 'Corte', explicacion: 'se suspende el riego para poder entrar a cortar y henificar', fase: 'cosecha' },
    { id: 'reposo_invernal', nombre: 'Reposo invernal', explicacion: 'la planta se frena por frío; demanda mínima', fase: 'descanso' },
  ],
  hortaliza_fruto: [
    { id: 'siembra_transplante', nombre: 'Siembra o trasplante', explicacion: 'riegos cortos y seguidos para que prenda la planta', fase: 'siembra' },
    { id: 'desarrollo', nombre: 'Desarrollo de planta', explicacion: 'forma follaje y raíz; la demanda va subiendo', fase: 'crecimiento' },
    { id: 'floracion', nombre: 'Floración', explicacion: 'si le falta agua, tira flor y baja el amarre', fase: 'floracion' },
    { id: 'llenado_fruto', nombre: 'Amarre y llenado de fruto', explicacion: 'máxima demanda; el riego desparejo parte el fruto', fase: 'fruto' },
    { id: 'cosecha_escalonada', nombre: 'Cosecha', explicacion: 'se cosecha por cortes; se mantiene riego moderado', fase: 'cosecha' },
    { id: 'fin_ciclo', nombre: 'Fin de ciclo', explicacion: 'último corte; se retira el riego', fase: 'descanso' },
  ],
  hortaliza_raiz: [
    { id: 'siembra_transplante', nombre: 'Siembra o trasplante', explicacion: 'humedad pareja arriba para una nacencia pareja', fase: 'siembra' },
    { id: 'desarrollo_follaje', nombre: 'Desarrollo de follaje', explicacion: 'primero hace hoja; de ahí sale lo que va a engordar abajo', fase: 'crecimiento' },
    { id: 'formacion', nombre: 'Formación de bulbo o raíz', explicacion: 'empieza a engordar el producto; no debe faltar agua', fase: 'floracion' },
    { id: 'llenado', nombre: 'Engrosamiento', explicacion: 'máxima demanda; define el calibre y el rendimiento', fase: 'fruto' },
    { id: 'maduracion', nombre: 'Maduración y cosecha', explicacion: 'se corta el riego para que la piel cure y aguante el manejo', fase: 'cosecha' },
    { id: 'fin_ciclo', nombre: 'Fin de ciclo', explicacion: 'terreno cosechado; no se riega', fase: 'descanso' },
  ],
  hortaliza_hoja: [
    { id: 'siembra_transplante', nombre: 'Siembra o trasplante', explicacion: 'riegos cortos y seguidos para que prenda', fase: 'siembra' },
    { id: 'desarrollo_follaje', nombre: 'Desarrollo de follaje', explicacion: 'crece la planta; la demanda va subiendo', fase: 'crecimiento' },
    { id: 'formacion_cabeza', nombre: 'Formación de cabeza', explicacion: 'cierra la cabeza; el estrés aquí la deja chica o amarga', fase: 'fruto' },
    { id: 'cosecha', nombre: 'Cosecha', explicacion: 'riego ligero hasta el corte', fase: 'cosecha' },
    { id: 'fin_ciclo', nombre: 'Fin de ciclo', explicacion: 'terreno cosechado; no se riega', fase: 'descanso' },
  ],
  algodon: [
    { id: 'siembra_emergencia', nombre: 'Siembra y emergencia', explicacion: 'humedad pareja para una nacencia pareja', fase: 'siembra' },
    { id: 'desarrollo', nombre: 'Desarrollo vegetativo', explicacion: 'forma planta y ramas; demanda en aumento', fase: 'crecimiento' },
    { id: 'cuadreo_floracion', nombre: 'Cuadreo y floración', explicacion: 'etapa crítica: la falta de agua tira cuadros y flores', fase: 'floracion' },
    { id: 'formacion_bellota', nombre: 'Formación de bellota', explicacion: 'máxima demanda; define el rendimiento de fibra', fase: 'fruto' },
    { id: 'apertura', nombre: 'Apertura y cosecha', explicacion: 'se suspende el riego para que abra y se pueda cosechar', fase: 'cosecha' },
    { id: 'fin_ciclo', nombre: 'Fin de ciclo', explicacion: 'terreno cosechado; no se riega', fase: 'descanso' },
  ],
  generico: FASES,
}

/** Las etapas que le tocan a un cultivo. Sin cultivo, las seis fases. */
export function etapasDeCultivo(cultivoId: string | null | undefined): Etapa[] {
  const cultivo = cultivoPorId(cultivoId)
  if (!cultivo) return FASES
  return CICLOS[cultivo.ciclo] ?? FASES
}

/**
 * Busca una etapa por id (o por nombre), primero entre las del cultivo y
 * luego en todo el catálogo. Así una parcela que guardó "floracion" con el
 * catálogo viejo sigue leyéndose bien.
 */
export function etapaPorId(
  valor: string | null | undefined,
  cultivoId?: string | null
): Etapa | null {
  if (!valor) return null
  const buscado = normalizar(valor)
  const encontrar = (lista: Etapa[]) =>
    lista.find(e => e.id === buscado || normalizar(e.nombre) === buscado) ?? null

  if (cultivoId) {
    const propia = encontrar(etapasDeCultivo(cultivoId))
    if (propia) return propia
  }
  for (const lista of Object.values(CICLOS)) {
    const hallada = encontrar(lista)
    if (hallada) return hallada
  }
  return encontrar(FASES)
}

/**
 * La etapa del cultivo equivalente a lo que se guardó.
 *
 * Las parcelas viejas guardaron una de las seis fases ("descanso"). Con el
 * catálogo nuevo esa fase no está en la lista del nogal, que tiene "reposo
 * invernal". Esto traduce una en otra para que el formulario abra con la
 * etapa marcada y no parezca que se perdió el dato.
 */
export function etapaEquivalente(
  valor: string | null | undefined,
  cultivoId: string | null | undefined
): Etapa | null {
  if (!valor) return null
  const etapas = etapasDeCultivo(cultivoId)
  const buscado = normalizar(valor)
  const propia = etapas.find(e => e.id === buscado || normalizar(e.nombre) === buscado)
  if (propia) return propia

  const fase = etapaPorId(valor, cultivoId)?.fase
  if (!fase) return null
  // La ÚLTIMA de esa fase es la representativa: "descanso" en el nogal es el
  // reposo invernal, no la postcosecha; "fruto" es el llenado de almendra,
  // que es la etapa de mayor demanda.
  const deLaFase = etapas.filter(e => e.fase === fase)
  return deLaFase.length > 0 ? deLaFase[deLaFase.length - 1] : null
}

/**
 * La fase de una etapa: lo que entienden el Kc del backend y la escena 3D.
 * Si no se reconoce la etapa, devuelve null y quien llama dice que falta el
 * dato en vez de suponer una.
 */
export function faseDeEtapa(
  valor: string | null | undefined,
  cultivoId?: string | null
): FaseId | null {
  return etapaPorId(valor, cultivoId)?.fase ?? null
}

// --- Sistema de riego ---
// La base vieja guarda 'suelo' por omisión, que no es ninguno de estos: se
// trata como "no lo ha dicho", no se adivina.

export interface SistemaRiego {
  id: 'goteo' | 'aspersion' | 'gravedad'
  nombre: string
  explicacion: string
}

export const SISTEMAS_RIEGO: SistemaRiego[] = [
  { id: 'goteo', nombre: 'Goteo', explicacion: 'cintilla o manguera con goteros en la línea de plantas' },
  { id: 'aspersion', nombre: 'Aspersión', explicacion: 'aspersores o pivote que mojan por arriba' },
  { id: 'gravedad', nombre: 'Rodado o gravedad', explicacion: 'el agua corre por surcos o melgas' },
]

export function sistemaPorId(valor: string | null | undefined): SistemaRiego | null {
  if (!valor) return null
  const buscado = normalizar(valor)
  return SISTEMAS_RIEGO.find(s => s.id === buscado) ?? null
}
