// Catálogo de plagas por cultivo. Sin backend: todo sale de aquí más la
// humedad que mide el sensor y el mes del año.
//
// Las claves son las mismas de lib/cultivos.ts.
// Es una guía general: no sustituye a un técnico.

export type Condicion = 'seco' | 'humedo' | 'calor'
export type Riesgo = 'alto' | 'medio' | 'bajo'

export interface Plaga {
  id: string
  nombre: string
  icono: string
  comoReconocerla: string
  queHacer: string
  /** Meses del año en que la plaga anda activa (1 = enero). */
  mesesActiva: number[]
  favorecidaPor: Condicion
}

// --- Umbrales de la condición actual ---
// Por debajo de esto la tierra cuenta como seca.
export const HUMEDAD_SECA = 40
// Por arriba de esto cuenta como húmeda.
export const HUMEDAD_HUMEDA = 70
// No hay termómetro en el sistema: el calor se estima por el mes, que en
// Chihuahua es buena aproximación. Es una estimación de temporada, no una
// medición, y la pantalla lo dice.
export const MESES_CALIENTES = [5, 6, 7, 8, 9]

/**
 * ¿Se está cumpliendo ahorita la condición que favorece a la plaga?
 * Devuelve null cuando no se puede saber: sin lectura del sensor no se
 * inventa una respuesta.
 */
export function condicionSeCumple(
  condicion: Condicion,
  humedad: number | null,
  mes: number
): boolean | null {
  if (condicion === 'calor') return MESES_CALIENTES.includes(mes)
  if (humedad === null) return null
  if (condicion === 'seco') return humedad < HUMEDAD_SECA
  return humedad > HUMEDAD_HUMEDA
}

/**
 * Riesgo de una plaga: alto si coinciden la temporada y la condición,
 * medio si solo una, bajo si ninguna.
 *
 * Función pura: mismos datos, mismo resultado. Tiene pruebas en
 * lib/plagas.test.ts.
 */
export function calcularRiesgo(plaga: Plaga, humedad: number | null, mes: number): Riesgo {
  const enTemporada = plaga.mesesActiva.includes(mes)
  const condicion = condicionSeCumple(plaga.favorecidaPor, humedad, mes)

  // Sin lectura del sensor solo se puede juzgar la temporada, así que el
  // riesgo nunca sube a alto: faltaría la mitad de la información.
  if (condicion === null) return enTemporada ? 'medio' : 'bajo'

  if (enTemporada && condicion) return 'alto'
  if (enTemporada || condicion) return 'medio'
  return 'bajo'
}

const ORDEN: Record<Riesgo, number> = { alto: 0, medio: 1, bajo: 2 }

/** De mayor a menor riesgo. Empatadas, se quedan en el orden del catálogo. */
export function ordenarPorRiesgo(
  plagas: Plaga[],
  humedad: number | null,
  mes: number
): Array<{ plaga: Plaga; riesgo: Riesgo }> {
  return plagas
    .map(plaga => ({ plaga, riesgo: calcularRiesgo(plaga, humedad, mes) }))
    .sort((a, b) => ORDEN[a.riesgo] - ORDEN[b.riesgo])
}

export function plagasDeCultivo(cultivoId: string | null | undefined): Plaga[] {
  if (!cultivoId) return []
  return PLAGAS_POR_CULTIVO[cultivoId.trim().toLowerCase()] ?? PLAGAS_POR_CULTIVO.otro
}

// Plagas comunes en cualquier cultivo. Se agregan a las propias de cada uno.
const COMUNES: Plaga[] = [
  {
    id: 'arana-roja',
    nombre: 'Araña roja',
    icono: '🕷️',
    comoReconocerla: 'Puntitos rojos en el envés de la hoja y una telaraña muy fina. La hoja se pone amarilla y polvosa.',
    queHacer: 'Se da con calor y tierra seca. Riega bien y revisa el envés de las hojas de abajo, que es donde empieza.',
    mesesActiva: [5, 6, 7, 8, 9],
    favorecidaPor: 'seco',
  },
  {
    id: 'hongo-exceso-agua',
    nombre: 'Hongo por exceso de agua',
    icono: '🍄',
    comoReconocerla: 'Manchas cafés o blancas en hoja y tallo, y la planta se marchita aunque la tierra esté mojada.',
    queHacer: 'Baja el riego unos días y deja que la tierra respire. Si el agua se encharca, abre un drenaje.',
    mesesActiva: [7, 8, 9],
    favorecidaPor: 'humedo',
  },
]

export const PLAGAS_POR_CULTIVO: Record<string, Plaga[]> = {
  nogal: [
    {
      id: 'pulgon-amarillo-nogal',
      nombre: 'Pulgón amarillo',
      icono: '🪲',
      comoReconocerla: 'Bichitos amarillos en el envés de la hoja y una miel pegajosa que escurre. Después sale un tizne negro encima.',
      queHacer: 'Revisa 10 hojas de la parte baja. Si la mayoría trae pulgón, es momento de controlar; la mariquita ayuda mucho, no la mates.',
      mesesActiva: [5, 6, 7, 8, 9],
      favorecidaPor: 'calor',
    },
    {
      id: 'barrenador-ruezno',
      nombre: 'Barrenador del ruezno',
      icono: '🐛',
      comoReconocerla: 'Agujeritos en la cáscara verde de la nuez y aserrín cafecito alrededor. La nuez se cae antes de tiempo.',
      queHacer: 'Junta y saca del huerto las nueces caídas: ahí se queda el gusano para el año que entra.',
      mesesActiva: [7, 8, 9],
      favorecidaPor: 'calor',
    },
    {
      id: 'gusano-telaranero',
      nombre: 'Gusano telarañero',
      icono: '🐛',
      comoReconocerla: 'Nidos de telaraña en la punta de las ramas, con hojas comidas adentro.',
      queHacer: 'Corta la rama con el nido completo y quémala o entiérrala lejos del árbol.',
      mesesActiva: [6, 7, 8],
      favorecidaPor: 'calor',
    },
  ],
  manzana: [
    {
      id: 'palomilla-manzana',
      nombre: 'Palomilla de la manzana',
      icono: '🦋',
      comoReconocerla: 'Un agujero con excremento café en la manzana, y por dentro el gusano hizo galería hasta el corazón.',
      queHacer: 'Recoge la fruta caída cada semana. Las trampas de feromona te dicen cuándo está volando.',
      mesesActiva: [5, 6, 7, 8],
      favorecidaPor: 'calor',
    },
    {
      id: 'pulgon-lanigero',
      nombre: 'Pulgón lanígero',
      icono: '🪲',
      comoReconocerla: 'Como algodoncitos blancos pegados en ramas y heridas del tronco. Debajo la corteza se abulta.',
      queHacer: 'Revisa los injertos y las podas viejas, que es donde se esconde. No dejes heridas abiertas sin cicatrizar.',
      mesesActiva: [4, 5, 6, 9, 10],
      favorecidaPor: 'humedo',
    },
    {
      id: 'cenicilla-manzana',
      nombre: 'Cenicilla',
      icono: '🍄',
      comoReconocerla: 'Polvo blanco encima de hojas y brotes nuevos, que se enchinan y no crecen.',
      queHacer: 'Corta los brotes empolvados. Se pega más si las ramas están muy juntas: aclara el árbol en la poda.',
      mesesActiva: [4, 5, 6],
      favorecidaPor: 'humedo',
    },
  ],
  maiz: [
    {
      id: 'gusano-cogollero',
      nombre: 'Gusano cogollero',
      icono: '🐛',
      comoReconocerla: 'El cogollo se ve raspado y con aserrín húmedo. Al abrirlo está el gusano adentro.',
      queHacer: 'Revisa 20 plantas. Si más de 4 traen daño en el cogollo, controla; en planta chica es cuando más pega.',
      mesesActiva: [6, 7, 8, 9],
      favorecidaPor: 'calor',
    },
    {
      id: 'gusano-elotero',
      nombre: 'Gusano elotero',
      icono: '🐛',
      comoReconocerla: 'Se mete por los pelos del elote y se come los granos de la punta.',
      queHacer: 'Se controla cuando el elote apenas está sacando pelo. Después ya está adentro y no se alcanza.',
      mesesActiva: [7, 8, 9],
      favorecidaPor: 'calor',
    },
    {
      id: 'pulgon-cogollo',
      nombre: 'Pulgón del cogollo',
      icono: '🪲',
      comoReconocerla: 'Bolas de bichitos verdes o negros en el cogollo y en la espiga, con miel pegajosa.',
      queHacer: 'Con la planta bien regada aguanta bastante. Pega más cuando la milpa viene seca y con calor.',
      mesesActiva: [5, 6, 7],
      favorecidaPor: 'seco',
    },
  ],
  chile: [
    {
      id: 'picudo-chile',
      nombre: 'Picudo del chile',
      icono: '🪲',
      comoReconocerla: 'Un piquetito en el botón o el chile chico, que se pone amarillo y se cae. Adentro hay una larva blanca.',
      queHacer: 'Levanta y saca del terreno todo el chile caído: ahí sigue vivo el picudo. Revisa 10 plantas por surco.',
      mesesActiva: [6, 7, 8, 9],
      favorecidaPor: 'calor',
    },
    {
      id: 'gusano-fruto-chile',
      nombre: 'Gusano del fruto',
      icono: '🐛',
      comoReconocerla: 'Agujeros en el fruto y excremento oscuro cerca del tallito.',
      queHacer: 'Revisa 10 plantas. Si hay daño en más de dos, controla esta semana.',
      mesesActiva: [6, 7, 8, 9],
      favorecidaPor: 'calor',
    },
    {
      id: 'marchitez-chile',
      nombre: 'Marchitez (secadera)',
      icono: '🍄',
      comoReconocerla: 'La planta se dobla de golpe, como si le faltara agua, pero la tierra está mojada. El tallo se pone oscuro abajo.',
      queHacer: 'Es de tierra encharcada. Saca la planta enferma con todo y cepellón y baja el riego en ese surco.',
      mesesActiva: [7, 8, 9],
      favorecidaPor: 'humedo',
    },
  ],
  frijol: [
    {
      id: 'mosquita-blanca',
      nombre: 'Mosquita blanca',
      icono: '🦟',
      comoReconocerla: 'Nube de mosquitas blancas que se levanta al mover la mata. La hoja se pone amarilla y pegajosa.',
      queHacer: 'Revisa el envés de las hojas de en medio. Trae virus, así que conviene atenderla desde que aparece.',
      mesesActiva: [6, 7, 8, 9],
      favorecidaPor: 'calor',
    },
    {
      id: 'conchuela-frijol',
      nombre: 'Conchuela',
      icono: '🐞',
      comoReconocerla: 'Escarabajo café con puntos negros. Deja la hoja como encaje, con puras venas.',
      queHacer: 'Revisa por la mañana, que es cuando está quieta. Los huevecillos amarillos van pegados debajo de la hoja.',
      mesesActiva: [6, 7, 8],
      favorecidaPor: 'calor',
    },
    {
      id: 'roya-frijol',
      nombre: 'Roya',
      icono: '🍄',
      comoReconocerla: 'Puntitos color óxido en el envés de la hoja, que se desprenden con el dedo.',
      queHacer: 'Se dispara con humedad alta y noches frescas. Riega temprano para que la hoja no amanezca mojada.',
      mesesActiva: [8, 9, 10],
      favorecidaPor: 'humedo',
    },
  ],
  alfalfa: [
    {
      id: 'pulgon-manchado',
      nombre: 'Pulgón manchado',
      icono: '🪲',
      comoReconocerla: 'Bichitos verde claro con puntitos en fila. La planta se achaparra y se pone pegajosa.',
      queHacer: 'Un corte adelantado es de los mejores controles. Revisa los rebrotes después de cortar.',
      mesesActiva: [5, 6, 7, 8, 9],
      favorecidaPor: 'calor',
    },
    {
      id: 'chapulin',
      nombre: 'Chapulín',
      icono: '🦗',
      comoReconocerla: 'Se levantan a saltos al caminar el lote. Comen desde la orilla hacia adentro.',
      queHacer: 'Empieza por las orillas y los bordos, que es donde nacen. Atiéndelos chiquitos, ya grandes se mueven mucho.',
      mesesActiva: [6, 7, 8, 9],
      favorecidaPor: 'seco',
    },
    {
      id: 'gusano-soldado',
      nombre: 'Gusano soldado',
      icono: '🐛',
      comoReconocerla: 'Aparecen muchos de golpe y avanzan parejos comiendo hoja. Amanece el lote pelón por manchones.',
      queHacer: 'Recorre el lote después de una lluvia buena. Si ves manchones creciendo, atiende de inmediato.',
      mesesActiva: [7, 8, 9],
      favorecidaPor: 'humedo',
    },
  ],
  avena: [
    {
      id: 'pulgon-ruso',
      nombre: 'Pulgón ruso',
      icono: '🪲',
      comoReconocerla: 'La hoja se enrolla como popote y salen rayas blancas o moradas a lo largo.',
      queHacer: 'Revisa las plantas de las orillas del lote. La hoja enrollada esconde al pulgón, ábrela para verlo.',
      mesesActiva: [3, 4, 5, 10, 11],
      favorecidaPor: 'seco',
    },
    {
      id: 'roya-avena',
      nombre: 'Roya de la hoja',
      icono: '🍄',
      comoReconocerla: 'Puntos anaranjados en la hoja que manchan la mano al tocarlos.',
      queHacer: 'Con humedad alta se extiende rápido. Riega temprano y no dejes la hoja mojada toda la noche.',
      mesesActiva: [4, 5, 9, 10],
      favorecidaPor: 'humedo',
    },
  ],
  algodon: [
    {
      id: 'picudo-algodonero',
      nombre: 'Picudo del algodonero',
      icono: '🪲',
      comoReconocerla: 'Botones florales picados que se ponen amarillos y se caen antes de abrir.',
      queHacer: 'Junta los botones caídos. Las trampas te avisan cuándo llega; en cuanto aparezca, atiéndelo.',
      mesesActiva: [6, 7, 8, 9],
      favorecidaPor: 'calor',
    },
    {
      id: 'mosquita-blanca-algodon',
      nombre: 'Mosquita blanca',
      icono: '🦟',
      comoReconocerla: 'Nube blanca al mover la planta y una miel pegajosa que ensucia la fibra.',
      queHacer: 'Mancha el algodón y le baja el precio. Revisa el envés de las hojas de en medio.',
      mesesActiva: [6, 7, 8, 9],
      favorecidaPor: 'calor',
    },
    {
      id: 'gusano-rosado',
      nombre: 'Gusano rosado',
      icono: '🐛',
      comoReconocerla: 'Al abrir la bellota, gusanito rosa adentro y la fibra manchada y enredada.',
      queHacer: 'Abre 20 bellotas de distintas plantas para saber cómo vas. Destruye el rastrojo al terminar la cosecha.',
      mesesActiva: [7, 8, 9],
      favorecidaPor: 'calor',
    },
  ],
  otro: [
    {
      id: 'pulgon-generico',
      nombre: 'Pulgón',
      icono: '🪲',
      comoReconocerla: 'Bolitas de bichitos en brotes tiernos y en el envés de la hoja, con miel pegajosa.',
      queHacer: 'Revisa los brotes nuevos, que es donde se juntan. La mariquita se los come, no la espantes.',
      mesesActiva: [4, 5, 6, 7, 8, 9],
      favorecidaPor: 'calor',
    },
    {
      id: 'gusano-generico',
      nombre: 'Gusano de la hoja',
      icono: '🐛',
      comoReconocerla: 'Hojas mordidas por la orilla y bolitas de excremento en el suelo, debajo de la planta.',
      queHacer: 'Búscalo temprano o al atardecer, que es cuando sale. De día se esconde bajo la hoja.',
      mesesActiva: [5, 6, 7, 8, 9],
      favorecidaPor: 'calor',
    },
  ],
}

// Las comunes van al final de cada cultivo, salvo que ya estén incluidas.
for (const cultivo of Object.keys(PLAGAS_POR_CULTIVO)) {
  const propias = PLAGAS_POR_CULTIVO[cultivo]
  for (const comun of COMUNES) {
    if (!propias.some(p => p.id === comun.id)) propias.push(comun)
  }
}
