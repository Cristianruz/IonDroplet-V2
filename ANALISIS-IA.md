# Análisis de la propuesta: IA multi-agente en IonDroplet V2

Escrito el 11 de septiembre de 2026, contra el código y la base reales.
**Esto es análisis y diseño. No se ha tocado `server.js`.**

---

## Veredicto rápido

| Propuesta | Veredicto | Por qué |
|---|---|---|
| **1. Agente agrónomo con Tool Use** | **Sí, con una corrección importante** | Ya existe el 80 %. Lo que falta no es la IA: es el control de una IA que **acciona una bomba** |
| **2. Detección de calcificación** | **El algoritmo sí; los datos no** | Hay **0 riegos registrados con duración**. El detector ya está construido y no tiene qué comer |
| **3. Sensor virtual de ORP** | **No como está planteado** | **ORP no se puede inferir de corriente y voltaje.** Pero hay algo mejor, más barato y más honesto |

---

## 1. El Agente Agrónomo

### Lo primero: ya existe casi todo

```
POST /api/ai/umbral           → la IA propone un punto de riego
POST /api/ai/umbral/aplicar   → lo aplica, acotado a 10-90,
                                escribe thresholds + parcelas.hum_min
                                y registra en action_log con origen='ia'
```

Construir un mecanismo paralelo duplicaría esto. **Lo que Tool Use aporta de verdad son dos
cosas**, y sólo una de ellas es buena idea hoy:

| Aporte | ¿Vale la pena? |
|---|---|
| **Salida estructurada** en vez de pedirle JSON en el prompt y parsearlo | **Sí, claramente.** Hoy el código hace `JSON.parse` de texto libre y tiene un `try/catch` por si el modelo se sale del formato. Tool Use lo vuelve un contrato tipado |
| **Autonomía**: que aplique solo, a diario, sin que nadie confirme | **Aquí hay que frenar** |

### El problema que hay que resolver antes de darle autonomía

`thresholds.hum_max` **no es un número que se muestra: es el número que enciende la bomba.**

Nuestra regla de oro dice "nunca se muestra un número inventado como si fuera medido". Un agente
autónomo introduce una categoría peor: **un número inventado que acciona.** Si el modelo pone 90,
la bomba riega sin parar. Si pone 15, el nogal se seca en floración.

Y hay un agravante concreto: **el sensor lleva 93 días sin reportar.** Un agente que corriera hoy
decidiría a ciegas y con toda confianza.

### Diseño propuesto: autonomía con cinturón

Cinco guardas, todas verificables por un jurado:

1. **Rango duro**, ya existe: 10–90. Se queda fuera del alcance del modelo.
2. **Delta máximo por día: ±5 puntos.** Un agente no puede mover el umbral 40 puntos de golpe
   aunque se confunda. Recuperarse de un error toma días, no una noche.
3. **Prerrequisito de datos:** si el sensor no reportó en las últimas 6 h, **el agente no corre.**
   No propone, no aplica, y lo registra como "no evaluable" — igual que hace el motor de alertas.
4. **Dos herramientas, no una.** Que "no cambiar nada" sea una decisión explícita y registrada,
   no la ausencia de una llamada.
5. **Reversible y auditable:** cada cambio guarda el valor anterior, el nuevo, la justificación y
   la confianza. Un botón deshace el último.

### El código

```js
// --- HERRAMIENTAS DEL AGENTE AGRÓNOMO ---
//
// Son DOS a propósito. Con una sola, "no hacer nada" sería que el modelo
// simplemente no llamara a la herramienta, y eso es indistinguible de que
// se confundió o de que la respuesta se cortó. Con dos, no cambiar es una
// decisión que queda escrita y se puede auditar.

const HERRAMIENTAS_AGRONOMO = [
  {
    name: 'actualizar_umbral_riego',
    description:
      'Cambia el punto de riego de una parcela: el porcentaje de humedad por debajo del cual ' +
      'la bomba enciende sola. Úsala SOLO si el balance hídrico, la etapa del cultivo y las ' +
      'lecturas recientes justifican el cambio. El sistema limita el movimiento a 5 puntos por día.',
    input_schema: {
      type: 'object',
      properties: {
        parcela_id: { type: 'integer', description: 'La parcela a ajustar.' },
        nuevo_punto_riego: {
          type: 'integer',
          minimum: 10,
          maximum: 90,
          description: 'Humedad porcentual bajo la cual encenderá la bomba.',
        },
        justificacion_tecnica: {
          type: 'string',
          description:
            'Por qué, citando los NÚMEROS que lo sostienen (ETc, déficit, humedad medida, etapa). ' +
            'Sin números verificables, no cambies.',
        },
      },
      required: ['parcela_id', 'nuevo_punto_riego', 'justificacion_tecnica'],
    },
  },
  {
    name: 'mantener_umbral',
    description: 'Deja el punto de riego como está. Úsala cuando no haya razón suficiente para moverlo.',
    input_schema: {
      type: 'object',
      properties: {
        parcela_id: { type: 'integer' },
        justificacion_tecnica: { type: 'string' },
      },
      required: ['parcela_id', 'justificacion_tecnica'],
    },
  },
]

const DELTA_MAXIMO_DIARIO = 5
const FRESCURA_MINIMA_MIN = 360 // 6 h

/**
 * Corre el agente para una parcela. Nunca lanza hacia arriba: si algo falla,
 * el riego sigue exactamente como estaba.
 */
async function correrAgenteAgronomo(parcelaId) {
  try {
    const ind = await indicadores()

    // GUARDA 1: sin sensor fresco no se decide. Un agente a ciegas es peor
    // que ningún agente, porque decide con la misma seguridad.
    if (!ind.sensor.vigente || ind.sensor.minutos > FRESCURA_MINIMA_MIN) {
      await registrarAccion(
        'agente',
        `No se evaluó el punto de riego: el sensor lleva ${ind.sensor.minutos} minutos sin reportar.`,
        'ia',
        parcelaId
      )
      return { corrio: false, motivo: 'sensor_sin_reportar' }
    }

    const actual = (await db.get('SELECT hum_max FROM thresholds ORDER BY id DESC LIMIT 1'))?.hum_max
    if (actual == null) return { corrio: false, motivo: 'sin_umbral_configurado' }

    const contexto = await contextoDelSistema()

    const sistema = `Eres el agrónomo de IonDroplet. Decides el punto de riego de una parcela.

INDICADORES YA CALCULADOS (no los recalcules, no los cambies):
${JSON.stringify(ind, null, 2)}

CONTEXTO:
${contexto}

Punto de riego actual: ${actual}%.

REGLAS DURAS:
- Sólo puedes moverlo ${DELTA_MAXIMO_DIARIO} puntos por día como máximo.
- La justificación tiene que citar números que estén arriba. Si no puedes citarlos, usa mantener_umbral.
- Ante la duda, mantener. Un umbral mal puesto seca un cultivo o ahoga una raíz.`

    const respuesta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 1024,
        tools: HERRAMIENTAS_AGRONOMO,
        // El modelo DEBE llamar a una de las dos. No se acepta texto suelto.
        tool_choice: { type: 'any' },
        system: sistema,
        messages: [{ role: 'user', content: 'Decide el punto de riego de hoy.' }],
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!respuesta.ok) return { corrio: false, motivo: 'api_' + respuesta.status }

    const datos = await respuesta.json()
    const llamada = (datos.content || []).find(b => b.type === 'tool_use')
    if (!llamada) return { corrio: false, motivo: 'sin_llamada_a_herramienta' }

    if (llamada.name === 'mantener_umbral') {
      await registrarAccion('agente', `Mantuvo el punto en ${actual}%: ${llamada.input.justificacion_tecnica}`, 'ia', parcelaId)
      return { corrio: true, cambio: false }
    }

    // GUARDA 2: el delta se acota AQUÍ, no en el prompt. Un prompt es una
    // petición; esto es una garantía.
    const pedido = Math.round(llamada.input.nuevo_punto_riego)
    const acotado = Math.max(
      10,
      Math.min(90, Math.max(actual - DELTA_MAXIMO_DIARIO, Math.min(actual + DELTA_MAXIMO_DIARIO, pedido)))
    )

    if (acotado === actual) {
      await registrarAccion('agente', `Propuso ${pedido}% pero quedó igual tras acotar.`, 'ia', parcelaId)
      return { corrio: true, cambio: false }
    }

    // GUARDA 3: se guarda el valor ANTERIOR, para poder deshacer.
    const previos = (await db.get('SELECT * FROM thresholds ORDER BY id DESC LIMIT 1')) || {}
    await db.run('DELETE FROM thresholds')
    await db.run(
      'INSERT INTO thresholds (temp_max, hum_max, volt_min, volt_max, curr_max) VALUES (?, ?, ?, ?, ?)',
      [previos.temp_max ?? null, acotado, previos.volt_min ?? null, previos.volt_max ?? null, previos.curr_max ?? null]
    )
    await db.run('UPDATE parcelas SET hum_min = ? WHERE id = ?', [acotado, parcelaId])

    await registrarAccion(
      'umbral',
      `El agente movió el punto de riego de ${actual}% a ${acotado}%` +
        (pedido !== acotado ? ` (pidió ${pedido}%, se acotó)` : '') +
        `. ${llamada.input.justificacion_tecnica}`,
      'ia',
      parcelaId
    )

    return { corrio: true, cambio: true, antes: actual, despues: acotado }
  } catch (e) {
    console.error('El agente agrónomo falló:', e.message)
    return { corrio: false, motivo: 'excepcion' }
  }
}

// Una vez al día. Se usa setInterval como el motor de alertas: no hay cron
// en este proyecto y meter uno sería una dependencia más.
const UN_DIA_MS = 24 * 60 * 60 * 1000
setInterval(async () => {
  const p = await parcelaActual()
  if (p) correrAgenteAgronomo(p)
}, UN_DIA_MS)
```

### Cómo defenderlo ante el jurado

> "¿Y si la IA se equivoca y mata el cultivo?"

**No puede.** Tres capas: el rango duro lo fija el código, no el modelo; el movimiento máximo es
de 5 puntos al día; y si el sensor no está reportando, el agente no corre. Además, cada decisión
—incluida la de no cambiar nada— queda escrita con su justificación y con el valor anterior.

Eso es lo que separa un agente de un generador de texto: **el agente tiene atribuciones acotadas
y auditadas.**

---

## 2. Detección de calcificación

### La buena noticia: el detector ya existe

`GET /api/riego/eficiencia` ya calcula, por cada riego:

- Humedad antes (última lectura en los 30 min previos al arranque)
- Humedad después (primera lectura en los 30 min siguientes al cierre)
- **Minutos por punto de humedad ganado**
- Y compara contra **la mediana de esa misma parcela**, no contra un número fijo

Se verificó con un caso construido: tres riegos, dos de 20 min y uno de 40, todos subiendo 10
puntos. Dio referencia 2 min/pt, último 4, **desviación +100 %**.

### La mala noticia, y es seria

```
Filas en action_log:         1
Riegos registrados:          0
Riegos con duración:         0   ← lo que el detector necesita
```

**Hay 36,307 lecturas de humedad y cero riegos.** El detector está bien construido y no tiene
qué comer. Ninguna cantidad de estadística arregla eso.

Para detectar un cambio de eficiencia hacen falta, mínimo, **entre 8 y 12 riegos** con lectura
antes y después. A un riego diario son dos semanas de operación **con el ESP32 conectado**.

### Lo que sí hay que agregar: distinguir deriva de golpe

Lo que existe compara el último riego contra la mediana. La calcificación **no se ve así**: no
es un salto, es una pendiente que sube semana a semana.

| Firma | Qué es | Cómo se ve |
|---|---|---|
| **Salto** | Gotero tapado, manguera doblada, fuga | Un evento se dispara, el resto normal |
| **Deriva** | **Calcificación de electrodos y emisores** | Pendiente positiva sostenida |

### El algoritmo, y por qué NO un Random Forest

**Con 12 observaciones, un Random Forest es sobreajuste con buena prensa.** Un jurado de
ingeniería lo va a preguntar, y la respuesta correcta es estadística robusta:

- **Mediana + MAD** (desviación absoluta mediana) en vez de media + desviación estándar. Con
  pocos datos agrícolas y ruido, un solo riego raro te mueve la media; la mediana no.
- **Pendiente de Theil-Sen**: la mediana de todas las pendientes entre pares de puntos. Resiste
  hasta ~29 % de datos corruptos, y con N pequeño es mejor que mínimos cuadrados.

Las dos se calculan en Node, sin dependencias, y se explican en una frase. Eso es defendible.

```js
/** Mediana. */
function mediana(xs) {
  const o = [...xs].sort((a, b) => a - b)
  const m = Math.floor(o.length / 2)
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2
}

/** Desviación absoluta mediana: la dispersión que no mueve un dato raro. */
function mad(xs) {
  const med = mediana(xs)
  return mediana(xs.map(x => Math.abs(x - med)))
}

/**
 * Pendiente de Theil-Sen: la mediana de las pendientes de todos los pares.
 * Aguanta que hasta uno de cada tres puntos esté corrupto, que es justo lo
 * que pasa cuando un riego se cortó o el sensor parpadeó.
 */
function pendienteTheilSen(puntos) {
  const pend = []
  for (let i = 0; i < puntos.length; i++) {
    for (let j = i + 1; j < puntos.length; j++) {
      const dx = puntos[j].x - puntos[i].x
      if (dx !== 0) pend.push((puntos[j].y - puntos[i].y) / dx)
    }
  }
  return pend.length ? mediana(pend) : null
}

const MINIMO_EVENTOS = 8

/**
 * ¿Hay calcificación? Devuelve null cuando NO SE PUEDE SABER, que no es lo
 * mismo que "no hay". Esa distinción ya nos salvó una vez en el motor de
 * alertas: confundirlas apagaba avisos reales.
 */
function detectarCalcificacion(eventos) {
  const medibles = eventos.filter(e => e.minutos_por_punto !== null)
  if (medibles.length < MINIMO_EVENTOS) {
    return {
      evaluable: false,
      porque: `Hacen falta ${MINIMO_EVENTOS} riegos con lectura antes y después. Hay ${medibles.length}.`,
    }
  }

  const valores = medibles.map(e => e.minutos_por_punto)
  const base = mediana(valores)
  const disp = mad(valores) || base * 0.1 // si todo es idéntico, 10% como piso

  // Días desde el primer riego, para que la pendiente sea por día y no por índice.
  const t0 = new Date(medibles[0].cuando).getTime()
  const puntos = medibles.map(e => ({
    x: (new Date(e.cuando).getTime() - t0) / 86400000,
    y: e.minutos_por_punto,
  }))

  const pendiente = pendienteTheilSen(puntos) // min/punto ganados por día
  const ultimos3 = valores.slice(-3)
  const desviacionRobusta = (mediana(ultimos3) - base) / disp

  // Deriva: la pendiente sube Y los últimos están arriba de lo normal.
  // Las dos condiciones juntas, porque cada una sola da falsos positivos:
  // la pendiente sola confunde estacionalidad; la desviación sola confunde
  // un mal riego con una tendencia.
  const derivaSostenida = pendiente !== null && pendiente > 0 && desviacionRobusta > 2

  // Proyección a 30 días, para que el aviso diga cuánto falta y no sólo "ojo".
  const proyeccion30d = pendiente !== null ? base + pendiente * 30 : null

  return {
    evaluable: true,
    eventos: medibles.length,
    base_min_por_punto: Math.round(base * 100) / 100,
    pendiente_min_por_punto_por_dia: pendiente !== null ? Math.round(pendiente * 1000) / 1000 : null,
    desviacion_robusta: Math.round(desviacionRobusta * 100) / 100,
    proyeccion_30d: proyeccion30d !== null ? Math.round(proyeccion30d * 100) / 100 : null,
    // 'deriva' apunta a calcificación; 'salto' a una obstrucción puntual.
    patron: derivaSostenida ? 'deriva' : desviacionRobusta > 3 ? 'salto' : 'normal',
  }
}
```

### La consulta SQL que lo alimenta

Es la que ya usa `/api/riego/eficiencia`, y esta es la parte que importa — **cruzar el intervalo
del riego con las lecturas de humedad de sus bordes**:

```sql
-- Riegos cerrados de la ventana, con su humedad de antes y de después.
-- La ventana de 30 minutos a cada lado es el corazón del asunto: una lectura
-- de ayer no dice nada de este riego.
SELECT
  a.id,
  a.timestamp                                  AS inicio,
  a.duracion_seg,

  (SELECT s.humidity FROM sensor_readings s
    WHERE s.parcela_id = a.parcela_id
      AND s.timestamp <= a.timestamp
      AND s.timestamp >= datetime(a.timestamp, '-30 minutes')
    ORDER BY s.timestamp DESC LIMIT 1)         AS humedad_antes,

  (SELECT s.humidity FROM sensor_readings s
    WHERE s.parcela_id = a.parcela_id
      AND s.timestamp >= datetime(a.timestamp, '+' || a.duracion_seg || ' seconds')
      AND s.timestamp <= datetime(a.timestamp, '+' || (a.duracion_seg + 1800) || ' seconds')
    ORDER BY s.timestamp ASC LIMIT 1)          AS humedad_despues

FROM action_log a
WHERE a.tipo = 'riego'
  AND a.duracion_seg IS NOT NULL
  AND a.parcela_id = ?
  AND a.timestamp >= datetime('now', '-90 days')
ORDER BY a.timestamp ASC;
```

Los índices `idx_lecturas_parcela (parcela_id, timestamp)` y `idx_bitacora_parcela` ya existen,
así que las subconsultas no recorren las 36,307 filas.

### Sobre la "inversión de polaridad"

Es una técnica real y correcta contra la calcificación de electrodos: invertir la corriente
despega el carbonato depositado. Pero hay que decir dos cosas:

1. **No existe ese comando.** No hay endpoint, ni protocolo serial, ni nada en el firmware.
2. **No sabemos si el ionizador lo soporta.** Requiere un puente H o un relé de doble polo. Si
   el circuito actual es una fuente fija, invertir la polaridad no es cuestión de software.

Es un cambio de **hardware y firmware**, no de backend. Vale la pena, pero hay que llamarlo por
su nombre.

---

## 3. Sensor virtual de ionización

Aquí es donde tengo que ser más directo, porque es donde más fácil se pierde ante un jurado.

### ORP no se puede inferir de corriente y voltaje

**No es una limitación de nuestro modelo: es física.**

El ORP (potencial de óxido-reducción) es un **potencial de media celda** que se mide contra un
electrodo de referencia (típicamente Ag/AgCl). Depende de qué especies químicas hay en el agua y
en qué proporción. La corriente que atraviesa la celda **no determina el ORP**: depende de la
conductividad, la geometría y el voltaje aplicado.

Y hay un problema que remata el asunto, y es de método antes que de física:

> **Para entrenar un modelo que prediga ORP, necesitas mediciones de ORP.**
> Si tuvieras el sensor para generarlas, ya no necesitarías el modelo.

Un modelo entrenado sin etiquetas reales no predice: **inventa con pasos intermedios que lo hacen
ver calculado.** Es exactamente el pecado que este proyecto lleva meses evitando, y un jurado de
ingeniería lo detecta con una pregunta: *"¿contra qué lo validaron?"*.

**Mi recomendación es no hacerlo.** No porque sea difícil, sino porque no se puede defender.

### Lo que sí se puede hacer, y es mejor

El ACS712 es buena idea. Lo que hay que cambiar es qué se hace con él. **Cuatro cosas, todas
honestas, y la última es la más fuerte.**

#### a) Confirmar que el ionizador de verdad encendió — *medición, no inferencia*

Hoy el sistema tiene un hueco reconocido: **el ionizador no confirma su estado.** Con corriente
medida, `corriente > umbral` significa que el aparato está energizado. Punto.

Eso **cierra el hueco número uno del proyecto** y no requiere ningún modelo.

#### b) Conductividad por ley de Ohm — *cálculo, no predicción*

Esto no necesita aprendizaje automático. Es física de primer curso:

```
Conductancia:     G = I / V            [siemens]
Conductividad:    σ = G · K            [S/cm]
                  donde K = L/A es la constante de celda [cm⁻¹]

En µS/cm:         σ = (I / V) · K · 10⁶
```

Con voltaje constante y corriente medida, **la conductividad sale de una división y una
constante.** La constante `K` se obtiene calibrando una vez contra una solución patrón de KCl
(~$150 MXN) o contra cualquier medidor de EC prestado.

Compensación por temperatura, que un jurado sí va a preguntar:

```
σ₂₅ = σ_T / (1 + α(T − 25))       con α ≈ 0.02 /°C para aguas naturales
```

> **Esta es la respuesta a "¿por qué no usaron machine learning?"**: porque hay una ecuación
> exacta. Usar un Random Forest donde aplica la ley de Ohm es lo que un jurado estricto marca
> como falta de criterio, no como sofisticación.

#### c) Detectar degradación de electrodos — *gratis, sale de lo mismo*

A voltaje constante y agua parecida, **la corriente cae conforme los electrodos se calcifican.**
Es la misma firma de deriva del punto 2, medida en otra variable. Las dos se confirman entre sí:
si la eficiencia de riego baja *y* la corriente del ionizador baja, el diagnóstico es sólido.

#### d) Carga entregada — **la respuesta al jurado**

```
Q = ∫ I dt        [coulombs]
```

La carga es una cantidad **medida**, no inferida. Y por la ley de Faraday se relaciona
directamente con cuánta electrólisis ocurrió:

```
moles transformados = Q / (n · F)      F = 96,485 C/mol
```

Cuando el jurado pregunte *"¿cómo saben que el agua se ionizó?"*, la respuesta más fuerte que
pueden dar es:

> **"Medimos la corriente a 1 Hz e integramos: entregamos 2,840 coulombs a la celda durante el
> riego de ayer. Eso es una medición, no una estimación. Lo que no afirmamos es el ORP
> resultante, porque no tenemos con qué medirlo — y no lo vamos a inventar."**

Eso gana puntos. Un ORP inventado los pierde todos.

### Nota de hardware que vale dinero

El **ACS712 puede ser la pieza equivocada** para este montaje. Es un sensor de efecto Hall con
185 mV/A (versión 5 A). Si el ionizador consume 100 mA, la señal es de **18 mV** — dentro del
ruido del ADC del ESP32, que además es notoriamente no lineal.

**Para corrientes bajas, un INA219** (I²C, digital, resolución de ~0.8 mA, con voltaje y potencia
incluidos) es mejor medida por un costo parecido. Un jurado que sepa de instrumentación va a
preguntar por la resolución y el ruido.

**Midan primero cuánta corriente consume el ionizador**, y de ahí escojan la pieza.

### Integración en `/api/esp/data`

```js
// --- CONSTANTES DE LA CELDA ---
// K sale de calibrar UNA VEZ contra una solución patrón. Mientras no se
// calibre, se queda en null y NO se publica conductividad: se publica la
// corriente, que sí está medida.
const CELDA = {
  constante_k: null,   // cm⁻¹, pendiente de calibración
  voltaje_v: null,     // V, del ionizador
  calibrada_en: null,
}

const UMBRAL_ENCENDIDO_A = 0.02 // por debajo de esto, no está energizado

app.post('/api/esp/data', async (req, res) => {
  const { humedad, corriente_a, temperatura_agua_c, device_id /* … */ } = req.body

  // … lo que ya hace …

  if (corriente_a !== undefined && Number.isFinite(corriente_a)) {
    const encendido = corriente_a > UMBRAL_ENCENDIDO_A

    // MEDIDO: la corriente y el estado que se deduce de ella.
    // Esto SÍ cierra el hueco de "el ionizador no confirma su estado".
    await db.run(
      `INSERT INTO lecturas_ionizacion (parcela_id, corriente_a, encendido, temperatura_agua_c)
       VALUES (?, ?, ?, ?)`,
      [parcelaId, corriente_a, encendido ? 1 : 0, temperatura_agua_c ?? null]
    )

    // CALCULADO: sólo si la celda está calibrada. Sin calibrar, no se inventa.
    if (CELDA.constante_k !== null && CELDA.voltaje_v) {
      let ec = (corriente_a / CELDA.voltaje_v) * CELDA.constante_k * 1e6 // µS/cm
      if (temperatura_agua_c != null) {
        ec = ec / (1 + 0.02 * (temperatura_agua_c - 25))
      }
      await db.run(
        `INSERT INTO lecturas_solucion (parcela_id, ec_ds_m, temperatura, device_id)
         VALUES (?, ?, ?, ?)`,
        // La columna está en dS/m; 1 dS/m = 1000 µS/cm.
        [parcelaId, Math.round((ec / 1000) * 100) / 100, temperatura_agua_c ?? null, device_id]
      )
    }
  }

  // … el resto igual …
})
```

**Y en la pantalla, la etiqueta no se negocia:**

| Magnitud | Cómo se rotula |
|---|---|
| Corriente del ionizador | **Medida** · ACS712/INA219 |
| Ionizador encendido | **Medida** · deducida de la corriente |
| Carga entregada (C) | **Medida** · integral de corriente |
| Conductividad (EC) | **Calculada** · ley de Ohm, celda calibrada el `<fecha>` |
| **ORP** | **No disponible** · requiere sonda. **No se estima.** |

La tabla de procedencia del panel de operación ya tiene exactamente esta forma. Sólo hay que
mover tres filas de "No disponible" a "Medida".

---

## 4. Lo que hay que mirar antes de decidir

### Los datos que no existen

| Necesita | Tiene | Falta |
|---|---|---|
| Agente agrónomo | Sensor callado 93 días | **Lecturas frescas** |
| Detector de calcificación | 0 riegos con duración | **8-12 riegos**, ~2 semanas de operación |
| Sensor de corriente | Sin ACS712 instalado | **Hardware + firmware** |

**Los tres dependen de conectar el ESP32 y dejarlo corriendo.** Es el mismo cuello de botella
que lleva todo el proyecto.

### El calendario

El pitch es a principios de octubre. De las tres:

| | Se puede demostrar en el pitch |
|---|---|
| **Agente agrónomo** | **Sí**, si el sensor reporta. No necesita hardware nuevo |
| **Calcificación** | **No.** Necesita ~2 semanas de riegos reales primero |
| **Corriente del ionizador** | **Sólo si el firmware cambia esta semana** |

### El monolito

`server.js` tiene 2,983 líneas. Estas tres propuestas le sumarían ~600. Para un jurado que revise
código, eso es una debilidad.

**Recomendación:** que lo nuevo salga en módulos (`agentes/agronomo.js`, `mantenimiento/calcificacion.js`,
`instrumentos/celda.js`) y que `server.js` sólo los llame. **No refactorizar lo que ya funciona**
— eso es riesgo puro antes de una demo.

---

## 5. Mi recomendación

| Orden | Qué | Por qué |
|---|---|---|
| **1** | **Conectar el ESP32 hoy** | Sin esto, ninguna de las tres se puede demostrar. No es opcional, es el prerrequisito |
| **2** | **Agente agrónomo con Tool Use y las cinco guardas** | Es lo único que no necesita hardware nuevo, y la salida estructurada mejora algo que ya existe |
| **3** | **ACS712 o INA219 en el ionizador** | Cierra el hueco más grande del proyecto: que el ionizador no confirma su estado. Y da la carga en coulombs, que es la mejor respuesta al jurado |
| **4** | **Detector de calcificación** | El algoritmo se deja escrito; empieza a servir cuando haya ~2 semanas de riegos |
| **NO** | **Predicción de ORP** | No se puede validar. Es el único punto donde el proyecto perdería su mayor fortaleza |

### La frase que resume por qué

Lo que hace fuerte a este proyecto ante un jurado no es que tenga IA. Es que **sabe distinguir
lo que midió de lo que calculó y de lo que no sabe.** Las tres propuestas son buenas en la medida
en que respeten eso, y la de ORP es la única que lo rompe.

Cambiar "sensor virtual de ORP" por "confirmación de ionización por corriente + carga entregada"
cuesta menos, se defiende mejor y responde exactamente la pregunta que el jurado iba a hacer.
