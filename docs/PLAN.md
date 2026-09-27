# IonDroplet V2 — Plan de implementación

Fase 3 del encargo. Priorizado, con lo que toca backend marcado aparte.
Escrito el 6 de septiembre de 2026, sobre el diagnóstico de [ANALISIS.md](ANALISIS.md).

---

## Estado: A1, A2 y A3 entregadas

| Etapa | Estado |
|---|---|
| **A1** Índices | ✅ Aplicado y medido |
| **A2** ET₀ y balance hídrico | ✅ Backend y pantalla, funcionando con datos reales |
| **A3** Modo Operación | ✅ Ruta `/operacion`, verificada en claro, oscuro y celular |
| **B1** Fertirriego | ✅ Tres tablas, cuatro endpoints, pantalla de captura y sección en el panel |
| B2, C, D, E | Sin empezar |

## Decisiones tomadas

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Delicias? | **Exploratorio.** Nadie ha dicho nada. La Etapa E se queda al final. |
| 2 | ¿Fecha de pitch? | **Menos de un mes.** Por eso el alcance se recortó a A1–A3. |
| 3 | ¿Tercer lugar? | **Modo Operación**, por encima de fertirriego. |
| 4 | ¿Para quién escribo el Modo Operación? | **Jurado y profesores del TecNM.** Vocabulario de ingeniería. |
| 5 | ¿Caudal de la bomba? | **Pendiente.** Se llena después; mientras, la app dice "falta el dato". |
| 6 | ¿Superficie de la parcela? | **Pendiente**, igual. `area_ha` sigue en `null`. |
| 7 | ¿Comprar sensores? | **Nada por ahora.** Los cuatro candidatos necesitan cambiar el firmware, y no hay tiempo antes del pitch. |

### Sobre la bomba, ya con la foto a la vista

Es una **mini bomba de diafragma de corriente directa** sobre protoboard, con manguera de
silicón de ~5 mm. Del orden de **1 a 3 L/min**, no los 20–60 que supuse al preguntar.

Dos consecuencias:

1. **No hay placa que leer.** La idea de leerla con la función de visión no aplica: estas bombas
   no traen. La prueba de la cubeta es el camino, y a este caudal sale exacta.
2. **El caudalímetro YF-S201 que recomendé está mal para esta bomba** (mide 1–30 L/min, y
   trabajaría pegado al fondo del rango). La pieza correcta sería un **YF-S401**, 0.3–6 L/min.

Y lo que importa más: esto es un **prototipo de banco**. Cualquier cifra de "cuánta agua ahorré"
que salga de aquí es una **proyección**, no una medición. Se puede presentar —y se presenta
bien— con la etiqueta encima. Sin etiqueta es el mismo pecado que la temperatura inventada de V1,
sólo que con aritmética adelante.

---

## Cómo está ordenado

Tres criterios, en este orden: **qué tanto responde al jurado**, **qué tan poco depende de
hardware que no existe**, y **qué tanto riesgo corre la regla de oro**. Lo que no toca la
lógica de riego va primero; lo que sí, va hasta que lo demás esté firme.

| Etapa | Qué es | Toca backend | Necesita tu OK |
|---|---|---|---|
| **A** | Cimientos: rendimiento, inteligencia agronómica, presentación | Sí, aditivo | Sí, A1 y A2 |
| **B** | Lo que pidió el jurado y no necesita hardware | Sí, aditivo | Sí |
| **C** | Salida al exterior: WhatsApp y offline | Sí, aditivo | Sí, C1 |
| **D** | Multi-parcela — aquí sí se toca la lógica de riego | Sí, **con cambio de comportamiento** | Sí, con diff y prueba |
| **E** | Escala institucional | Sí, mayor | Sí |

---

## ETAPA A — Cimientos

### A1. Índices en la base de datos

**El mayor retorno por esfuerzo de todo el plan.** Hoy cada consulta recorre las 36,307 filas
completas.

**Medido sobre la base real, en solo lectura:**

| Consulta | Filas | Tiempo | Plan |
|---|---|---|---|
| Última lectura (`ORDER BY timestamp DESC LIMIT 1`) | 1 | **10.5 ms** | `SCAN` + orden temporal |
| Historial 24 h | 0 | 9.1 ms | `SCAN` + orden temporal |
| Historial completo | 36,307 | 194.6 ms | `SCAN` + orden temporal |
| Resumen 30 días | 1 | 7.4 ms | `SCAN` |

**Corrijo lo que escribí antes de medir:** a 36,307 filas esto **todavía no se siente lento**.
9 ms no los nota nadie. Mi frase de que "cualquier demo con datos reales se ve lenta" era una
suposición, y la medición no la sostiene.

**Lo que la medición sí muestra, y es peor a futuro:** las seis consultas hacen `SCAN` —
recorrido completo de tabla. La de "última lectura" **recorre y ordena las 36,307 filas para
devolver una sola**, y esa corre **cada 3 segundos**. El costo crece lineal con las filas.

Un día de operación continua son 23,545 lecturas, o sea **~706,000 filas al mes con un solo
sensor**. A ese ritmo, en un mes esa consulta de cada 3 segundos pasa de 10 ms a unos 200 ms, y
el historial completo a unos 4 segundos. Con varios sensores no hay discusión.

No es una emergencia hoy. Es una que llega sola en semanas, y cuesta una sesión evitarla.

Lo que propongo agregar, y nada más:

```sql
CREATE INDEX IF NOT EXISTS idx_lecturas_tiempo   ON sensor_readings(timestamp);
CREATE INDEX IF NOT EXISTS idx_lecturas_aparato  ON sensor_readings(device_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_lecturas_parcela  ON sensor_readings(parcela_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_bitacora_tiempo   ON action_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_bitacora_parcela  ON action_log(parcela_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_ionizacion_tiempo ON ionization_log(timestamp);
```

**Por qué es seguro:** un índice **no cambia el esquema ni los datos**. Ninguna consulta
devuelve un resultado distinto — devuelve el mismo, más rápido. Se deshace con `DROP INDEX`
sin perder nada. Es lo más aditivo que existe en una base de datos.

**El costo real, que sí hay que decirlo:** cada `INSERT` se vuelve un poco más lento porque hay
que mantener seis índices. Con lecturas cada 3 segundos eso es irrelevante; lo mido antes y
después y te enseño los números.

- **Riesgo:** muy bajo · **Esfuerzo:** una sesión · **Bloquea a:** todo lo demás a escala

### A2. Evapotranspiración y balance hídrico

El sistema pasa de *"avisa cuando ya está seco"* a *"te dice cuándo va a estar seco"*.

Verificado en vivo contra tu ubicación real (28.744073 / −106.171121): Open-Meteo devuelve
**6.39 mm de ET₀ hoy**, y los 7 días del pronóstico. El backend ya arma esa llamada con un
`daily=`, así que es **agregar un campo a esa cadena de texto**.

Lo que se construye encima:

1. **ETc = ET₀ × Kc**, donde Kc es el coeficiente del cultivo por etapa. Va en
   `guia-cultivos.js`, junto a los rangos de humedad que ya están ahí — **misma tabla, misma
   revisión del agrónomo pendiente**.
2. **Balance hídrico** = (riego + lluvia) − ETc. El riego sale de `action_log.duracion_seg`, la
   lluvia de Open-Meteo. Todo dato que ya se guarda.
3. **Días hasta el punto de riego**, proyectando el balance sobre el pronóstico.

**Endpoint nuevo:** `GET /api/agua/balance?parcela_id=&dias=`. No modifica ninguno existente.

**La honestidad de siempre:** sin el caudal de la bomba, el riego aplicado no se puede convertir
a milímetros. Hasta que me des ese número, la pantalla muestra el balance **en déficit
climático** (ETc − lluvia, que sí es medible) y dice explícitamente que falta el aporte del
riego. No se inventa.

- **Riesgo:** bajo · **Esfuerzo:** 2 sesiones · **Depende de:** nada

### A3. Modo Operación

Frontend puro. **Puedo hacerlo solo, sin tocar backend.**

- Interruptor en Ajustes, recordado. En pantalla ancha se sugiere.
- **Modo Campo queda intacto.** No se toca una sola pantalla de las que ya funcionan.
- Base 14 px, radios de 6 px, iconografía Lucide (**ya instalada**, cero dependencias nuevas),
  tabla de parcelas ordenable, gráfica de series múltiples, resumen ejecutivo arriba.
- Vocabulario técnico en este modo: "humedad volumétrica", "lámina aplicada", "ETc".

Aquí es donde se ve la ingeniería que hay debajo. Es lo que arregla la percepción del jurado
**sin degradar la app del agricultor**.

- **Riesgo:** nulo para lo existente · **Esfuerzo:** 3–4 sesiones · **Depende de:** A2 para tener qué mostrar

---

## ETAPA B — El feedback del jurado, sin hardware

### B1. Fertirriego

**El requerimiento del jurado que menos depende de hardware.** Con captura manual sirve desde el
primer día.

Tres tablas nuevas (`eventos_fertirriego`, `nutrientes_aplicados`, `lecturas_solucion`), cuatro
endpoints nuevos, una pantalla de captura y una de historial. **Nada existente se toca.**

El valor no está en registrar: está en cruzar. Dosis aplicada contra etapa fenológica contra
respuesta de humedad. Eso es lo que ningún cuaderno hace.

- **Riesgo:** nulo, todo es nuevo · **Esfuerzo:** 3 sesiones · **Depende de:** nada

### B2. Motor de reglas y centro de alertas

Reglas deterministas en código que **deciden**; la IA sólo **redacta y prioriza**. Un aviso de
helada no puede depender de que el modelo esté disponible.

- Tabla `alertas` con severidad y estado (`nueva` / `leida` / `atendida` / `descartada`).
- Evaluación de reglas cada N minutos, y al llegar una lectura.
- Pantalla `/alertas`, campanita con contador, y **quién atendió qué y cuándo** — eso es lo que
  un municipio necesita para rendir cuentas.
- Las ocho reglas de la propuesta, incluyendo umbrales **relativos al historial de cada
  parcela**, no absolutos.

- **Riesgo:** bajo · **Esfuerzo:** 4 sesiones · **Depende de:** A2 · **Bloquea a:** C1

### B3. Litros y pesos

Cierra el pendiente que ya tenías apuntado. **Necesita un solo número tuyo: el caudal de la
bomba en litros por minuto.**

Con eso: lámina aplicada en mm, metros cúbicos por riego, costo en pesos (tarifa configurable) y
eficiencia en litros por punto de humedad recuperado. **"Cuánta agua ahorré" es la cifra que
convence a un municipio**, y sale de datos que ya se están guardando.

- **Riesgo:** bajo · **Esfuerzo:** 2 sesiones · **Bloqueado por:** el caudal

---

## ETAPA C — Salida al exterior

### C1. WhatsApp

**Bloqueado por un trámite que es tuyo, no mío:** verificación de negocio con Meta y un número
dedicado. Puedo dejar todo listo y probado contra un número de prueba mientras eso avanza.

Cloud API directo, sin Twilio ni SDK: es HTTPS, **cero dependencias nuevas**. Plantillas
aprobadas por tipo de alerta, y el control de saturación del diagnóstico (máximo 1 crítica por
parcela cada 6 h, las de atención agrupadas en un mensaje diario, las informativas nunca).

El riesgo número uno no es técnico: es que el agricultor silencie el número.

- **Esfuerzo:** 2 sesiones · **Depende de:** B2 y del trámite

### C2. PWA y offline

Cierra otro pendiente, y **corrige la discrepancia del diagnóstico**: hoy no hay PWA de ningún
tipo, sin señal la app no abre.

Manifest, service worker, íconos, caché de la última lectura conocida con su antigüedad visible.
**En el campo la señal se cae**; que la app abra y diga "esto es de hace 40 minutos" es mejor
que una pantalla en blanco.

- **Riesgo:** bajo · **Esfuerzo:** 2 sesiones · **Frontend casi todo**

---

## ETAPA D — Multi-parcela

**Aquí sí se toca la lógica de riego.** No entro sin diff aprobado y sin un plan de prueba.

### D1. Poblar `parcela_id` en las lecturas

La columna existe y está 100% vacía. Se llena en la escritura, se rellena hacia atrás con el
`device_id` único que hay. Sin esto, D3 no se sostiene.

### D2. Estado de riego por parcela

**El cambio más delicado del plan entero.** Hoy:

```js
let espSettings = { autoMode: true, pumpState: 0, espIp: null };
```

Un `autoMode` y un `pumpState` para todo el sistema, en memoria del proceso. Propuesta: un mapa
por `parcela_id`, **persistido en tabla** para que sobreviva reinicios, con el comportamiento
actual como caso de una sola parcela — **idéntico mientras haya una sola**. Eso es lo que hace
la prueba posible: se verifica que con una parcela nada cambió.

- **Riesgo:** el más alto del plan · **Esfuerzo:** 3 sesiones + pruebas · **Bloquea a:** D3

### D3. Comparación entre parcelas

Endpoint `GET /api/parcelas/comparar` con series alineadas y muestreadas, y la vista comparativa
del Modo Operación. **El requerimiento del jurado que estaba bloqueado.**

### D4. Modelo multinivel nuevo

`puntos_medicion` + `lecturas_perfil`, con el concepto de sonda que hoy falta. Las tablas
actuales están vacías: se quedan donde están, sin tocarse. **Sigue necesitando firmware y sondas
físicas**, pero el modelo y la gráfica de perfil quedan listos para el día que lleguen.

---

## ETAPA E — Escala institucional

Sólo si Delicias se vuelve real. Multi-usuario y organizaciones, autenticación de dispositivos
(hoy cualquiera en la red puede inyectar lecturas por `/api/esp/data`), reactivación del
`authMiddleware`, ingesta por MQTT, y migración a PostgreSQL + TimescaleDB con retención y
agregados continuos.

Es un mes largo de trabajo. **No lo empiezo por especulación.**

---

## Lo mínimo para el pitch

Si la fecha aprieta, esto es lo que yo presentaría, en este orden:

1. **A1** — barato y evita que el sistema se degrade solo conforme se acumulan lecturas
2. **A2** — el balance hídrico es lo que hace que se vea *inteligente* y no *reactivo*
3. **A3** — el Modo Operación es lo que arregla "se ve poco profesional"
4. **B1** — fertirriego, tacha un requerimiento del jurado completo
5. **B2** — alertas, tacha otro y prepara WhatsApp

Son unas doce sesiones y **cubre tres de los cinco puntos del jurado sin comprar un solo
sensor**. Los otros dos (multinivel real y WhatsApp) dependen de cosas fuera del código:
hardware y un trámite con Meta.

---

## Lo que saco de la ruta crítica, y por qué

**La Fase 8 de voz.** Estaba en el plan viejo. La quito del camino corto: no responde a ningún
punto del jurado, no le sirve al operador municipal, y el reconocimiento de voz en el campo con
ruido de bomba es frágil. Si la quieres para el pitch dímelo y la subo — pero compite con el
balance hídrico, y el balance hídrico gana.

**Huracanes de NOAA.** Misma razón de siempre: Chihuahua está a 400 km de la costa y a 1,575 m
de altura. El aviso de helada que ya existe salva más cosecha.

---

## Lo que necesito de ti para arrancar

Puedo empezar **A3 hoy mismo sin preguntarte nada** — es frontend puro.

Para A1 y A2 necesito tu visto bueno porque tocan el backend, aunque sean aditivos. Te paso el
diff exacto antes de escribir una línea, como siempre.

Y hay un número que desbloquea B3 entero: **¿cuántos litros por minuto da la bomba?**
