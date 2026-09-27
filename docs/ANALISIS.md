# IonDroplet V2 — Diagnóstico integral y propuesta de evolución

Levantado el 6 de septiembre de 2026 contra el código y la base de datos reales.
Fases 1 y 2 del encargo. **Sin cambios de código**: esto es diagnóstico y propuesta.

---

## 0. Antes de empezar: el stack descrito no es el stack que hay

Seis diferencias entre la descripción del encargo y lo que está en el repositorio. Importan
porque varias conclusiones dependen de ellas.

| Lo que dice el encargo | Lo que hay |
|---|---|
| Next.js 14 | **Next.js 15.5.19**, React 19.2.4 |
| PWA con capacidades offline | **No hay PWA.** Ni `manifest.json`, ni service worker, ni `public/`. Sin señal la app no abre. |
| `MobileNav`, `OfflineBanner` | Se llaman `nav-inferior.tsx` y `aviso-sin-conexion.tsx`. Existen, con otros nombres. |
| Manifest personalizado | Lo único personalizado es `app/icon.svg` (favicon) |
| Plan de migración a PostgreSQL + TimescaleDB | **No existe tal plan en el repo.** El único rastro de PostgreSQL era `init_db.js`, borrado en la Fase 0 porque apuntaba a una base que nadie usaba, con contraseña en texto plano. |
| Arquitectura objetivo LoRaWAN/celular + broker MQTT | **Cero rastro.** No hay MQTT, ni LoRa, ni cola de mensajes. La única entrada de datos es serial USB y HTTP. |
| Open-Meteo en 28.6353 / −106.0889 | La ubicación guardada es **28.744073 / −106.171121**, capturada del teléfono el 6 de septiembre. Unos 13 km al norte. |

**Por qué importa:** si el plan de escala se construye asumiendo que ya existe una base
PostgreSQL o un broker MQTT, se subestima el trabajo. Ninguna de las dos cosas está empezada.

---

## FASE 1 — DIAGNÓSTICO

### 1.1 Inventario de datos y categorías

#### Lo que el sistema captura hoy

| Categoría | Fuente | Frecuencia | Dónde se guarda | ¿Real? |
|---|---|---|---|---|
| Humedad de suelo | ESP32 por serial (COM5, 115200) o HTTP | ~cada 3 s cuando opera | `sensor_readings.humidity` | **Sí** |
| Estado de bomba | Memoria del proceso (`espSettings`) | En vivo | **No se persiste** | Sí, pero volátil |
| Modo de riego | Memoria del proceso | En vivo | **No se persiste** | Sí, pero volátil |
| Ionización | Lo que se le pide desde la app | Por evento | `ionization_log` | Es intención, no confirmación |
| Clima exterior | Open-Meteo | Caché 15 min | **No se persiste** | Sí |
| Pronóstico 7 días | Open-Meteo | Caché 15 min | No se persiste | Sí |
| Acciones (riegos, modo, umbral) | Backend, por evento | Por evento | `action_log` | Sí |
| Metadatos de parcela | Captura del agricultor | Manual | `parcelas` | Sí |

**Volumen real:** 36,307 lecturas en 41 días, de **un solo `device_id`** (`ESP-USB`). El día
más denso fueron 23,545 lecturas — es decir, en operación continua el sistema genera del orden
de 23 mil filas por día por sensor.

#### Datos que existen en el modelo y no se muestran

| Columna / tabla | Estado | Veredicto |
|---|---|---|
| `sensor_readings.temperature` | **0 de 36,307 filas** tienen valor | Columna muerta. No hay termómetro. |
| `sensor_readings.voltage` | **0 de 36,307** | Columna muerta. No hay sensor de energía. |
| `sensor_readings.current` | **0 de 36,307** | Columna muerta. |
| `sensor_readings.parcela_id` | **0 de 36,307** | Nunca se escribe. La relación va por `device_id`. |
| `thresholds.temp_max`, `volt_min`, `volt_max`, `curr_max` | Tienen valores, nadie los lee | Se conservan solo para no perderlos al reescribir la fila |
| `parcelas.num_hileras`, `tipo_sistema` | Con datos reales, ocultos por decisión | Dormidos a propósito |
| `parcelas.hum_max` | Con valor, sin lector | El que manda es `thresholds.hum_max` |
| `devices` | **0 filas**, y solo tiene `id` + `ionization_on` | Tabla inservible como registro de aparatos |
| `sensor_readings_multinivel` | **0 filas**. Endpoints construidos y probados | Esperando hardware |
| `agua_subterranea` | **0 filas**. Endpoints construidos y probados | Esperando hardware |

> **Esto es la mitad del "se ve poco serio".** En V1 esas columnas vacías se rellenaban con
> números fabricados y la interfaz se veía llena. En V2 se decidió no inventar, y el resultado
> honesto es una pantalla con un solo dato real. **El problema no es el diseño: es que hay un
> solo sensor.** Ninguna decisión de UI arregla eso.

#### Lo que se muestra y no acciona nada

- **Ionización**: pantalla completa dedicada a un aparato que no confirma su estado. Se muestra
  la intención, no la realidad. Es honesto, pero ocupa una de las cinco pestañas.
- **"Aparato que la mide: ESP-01"** en la ficha de parcela: identificador técnico sin utilidad
  para el agricultor y sin acción asociada.
- **Dirección de conexión** en Ajustes: sólo lectura, informativa.

#### ¿El modelo soporta lo que piden los jueces?

| Requerimiento | ¿Soportado? | Detalle |
|---|---|---|
| **Sensores multinivel** | **A medias.** La tabla y los cuatro endpoints existen y están probados. **Falta todo lo demás**: nada la alimenta (el firmware manda solo `{humedad}`), no hay UI, y el modelo no relaciona un punto de medición con sus varias profundidades — sólo tiene `profundidad_cm` suelto, sin concepto de "sonda" ni de perfil. |
| **Fertirriego** (nutrientes, dosis, EC, pH) | **No existe.** Ni tabla, ni columna, ni endpoint, ni pantalla. Cero. |
| **Comparación entre parcelas** | **No soportado.** Hay una parcela y todo el sistema la asume: el frontend lee `GET /api/parcelas` y toma `[0]`; el backend tiene **un solo `espSettings` global** con un `autoMode` y un `pumpState` para todo el sistema. Dos parcelas con dos bombas se pisarían. |
| **Metadatos agronómicos** | **Sí, y es lo más maduro del sistema.** `parcelas` tiene cultivo, etapa, área, ubicación; y `guia-cultivos.js` añade humedad ideal por etapa, temperatura de helada, calendario mensual y consumo de agua para nueve cultivos. |
| **Alertas por WhatsApp** | **No existe.** No hay ningún canal de salida: ni push, ni correo, ni mensajería. Las alertas solo viven dentro de la pantalla. |

---

### 1.2 Inventario de UI/UX

#### Las ocho pantallas

| Ruta | Qué muestra | Densidad |
|---|---|---|
| `/` Inicio | Criterio de la IA, humedad, riego, clima + pronóstico, gráfica 24 h, acceso al asistente | 2.4 pantallas de alto |
| `/parcela` | Ficha del cultivo, humedad, punto de riego, propuesta de la IA, acceso a plagas | 2.5 |
| `/plagas` | Foto con IA, plaga de mayor riesgo, lista del resto | ~3 |
| `/historial` | Filtros 24 h / 7 d / 30 d, gráfica, tres cifras, bitácora | 2.3 |
| `/ionizacion` | Un botón | 1.0 |
| `/ajustes` | Conexión, tema, acceso a aparatos, punto de riego | 2.4 |
| `/dispositivos` | Cuatro aparatos con su estado y pasos de revisión | ~2 |
| `/asistente` | Chat | variable |

#### Por qué se percibe como poco profesional — causas concretas

No es una impresión vaga. Son seis decisiones puntuales, todas rastreables:

1. **Emoji como iconografía principal.** 🌰 para el nogal, 🐛 para plagas, 📡 para la central,
   ❄️ 🌧️ 💨 🌡️ para los avisos del clima, 💧 ⚡ 🌱 en la bitácora. Los emoji se renderizan
   distinto en cada sistema, no admiten color de marca y **leen como app de consumo**. Un panel
   de agricultura de precisión usa iconografía vectorial consistente.

2. **Un dato protagonista por pantalla, gigante.** La humedad llega a 4.5 rem (72 px). Una
   tarjeta consume media pantalla para mostrar **un número**. La densidad de información es
   bajísima: el Inicio ocupa 2.4 pantallas para cinco datos.

3. **Radios de esquina muy grandes** (`rounded-2xl` = 16 px, antes 24 px) en tarjetas y botones,
   más botones de 56 a 68 px de alto. Es lenguaje de app móvil de consumo, no de consola.

4. **Todo es tarjeta apilada en una columna.** No hay tablas, ni series múltiples, ni una vista
   que permita comparar. La gráfica dibuja **una sola serie**.

5. **Lenguaje deliberadamente coloquial.** "Tu tierra está en buen punto", "le toca agua",
   "ya mero", "¿Ves algo raro en la planta?". Se prohibió por escrito decir "umbral",
   "sensor capacitivo" o "parámetro".

6. **Ausencia de jerarquía ejecutiva.** No hay resumen de estado general, ni KPIs, ni una vista
   que responda "¿cómo va todo?" antes de bajar al detalle.

#### El hallazgo que importa

**Nada de lo anterior es un error.** Cada punto se decidió a propósito, está documentado, y
responde a un usuario concreto: *un agricultor de 45-50 años, en el campo, bajo el sol, con
guantes*. Para ese usuario, el emoji del nogal es más rápido de reconocer que un icono
abstracto, y "le toca agua" es más claro que "humedad por debajo del umbral".

**El problema real es que ahora hay dos audiencias con necesidades opuestas:**

| | El agricultor en la parcela | El operador municipal / el jurado |
|---|---|---|
| Dispositivo | Celular, bajo el sol, con guantes | Monitor, oficina |
| Necesita | Una decisión: ¿riego o no? | Panorama de N parcelas, tendencias, comparativas |
| Tolera | Un dato por pantalla | Tablas densas, series múltiples |
| Vocabulario | "Le toca agua" | "Evapotranspiración, lámina aplicada, eficiencia" |

**Intentar que una sola pantalla sirva a las dos la va a empeorar para ambas.** La recomendación
está en 2.3.

---

### 1.3 Arquitectura técnica

#### Lo que está bien resuelto

- **Capa de datos unificada en el frontend.** Un solo `<ProveedorDatos>` con un temporizador
  para toda la app, que pausa en segundo plano, espacia el sondeo sin conexión y cancela
  peticiones al desmontar. Medido: 23 → 15 llamadas en un recorrido de cinco pantallas.
- **Muestreo del lado del servidor.** `/api/sensors/history?max=N` reduce de 5.18 MB / 4,215 ms
  a 44 KB / 154 ms, conservando primera y última lectura. Las cifras exactas salen aparte, de
  agregados en SQL.
- **Registro de acciones con `origen`** (`usuario` / `ia` / `umbral`) y duración. Es la base
  sobre la que se puede construir cualquier métrica de eficiencia.
- **Guía agronómica en archivo auditable**, no en la memoria del modelo. Los números se pueden
  corregir y revisar.
- **Todos los escritos de la IA pasan por endpoints que registran quién decidió qué.**

#### La deuda que bloquea la Fase 2

**1. Cero índices.** La base no tiene un solo índice más allá de las llaves primarias.

```
sqlite_master → índices: solo el automático de users.email (UNIQUE)
```

Medido en solo lectura sobre la base real: las seis consultas principales hacen `SCAN`. La de
"última lectura" **recorre y ordena las 36,307 filas para devolver una**, y corre cada 3
segundos. Hoy cuesta 10.5 ms — no se nota. El costo crece lineal con las filas, y un mes de
operación continua con un solo sensor son ~706,000. Ver la tabla completa en [PLAN.md](PLAN.md).

Cada consulta de historial hace **recorrido completo de tabla** sobre 36,307 filas. Con 23 mil
filas por día por sensor: a 50 sensores son **1.15 millones de filas diarias**, 420 millones al
año. Sin índices sobre `(device_id, timestamp)` eso no responde. **Es el bloqueador número uno
de la escala, y se arregla en una tarde.**

**2. Estado global de una sola bomba.** En `server.js`:

```js
let espSettings = { autoMode: true, pumpState: 0, espIp: null };
```

Un `autoMode` y un `pumpState` **para todo el sistema**. Dos parcelas con dos bombas se pisarían:
apagar una apagaría la otra. Además es memoria del proceso: **al reiniciar se pierde el modo**.
Es el bloqueador de multi-parcela, y el único cambio que toca la lógica de riego.

**3. Sin multi-tenant ni sesión.** `users` está vacía y el `authMiddleware` es `next()` directo,
desactivado a propósito para la demo. No hay concepto de organización, ni de permisos, ni de
"esta parcela es de este usuario". Para adopción municipal esto no es opcional.

**4. Una sola vía de ingesta, y es un cable.** El serial USB en `COM5` implica que **el servidor
tiene que estar físicamente conectado al ESP32**. Es incompatible con una red distribuida.
`/api/esp/data` (HTTP) existe y funciona, pero no hay autenticación de dispositivo: cualquiera
en la red puede inyectar lecturas.

**5. No hay capa de reglas ni de eventos.** Todo es lectura directa. La única "regla" es
`humedad < thresholds.hum_max → bomba on`, escrita a mano en dos lugares (el lector serial y
`/api/esp/data`). No hay motor, ni condiciones compuestas, ni estado de alerta persistido.

**6. Sin `parcela_id` en las lecturas.** La columna existe y está 100% vacía. Con varias
parcelas, `device_id` como única relación se vuelve frágil.

**7. Sin retención ni agregación.** `sensor_readings` crece sin límite y sin resúmenes
horarios/diarios. (`action_log` sí tiene purga a dos años.)

---

## FASE 2 — PROPUESTA DE DISEÑO

### 2.1 Motor de recomendaciones y notificaciones

#### Arquitectura: reglas deterministas + IA que explica

La distinción que sostiene todo lo demás:

- **Las reglas deciden.** Son deterministas, están en código, se pueden auditar y probar, y
  funcionan sin internet. Una regla dispara una alerta.
- **La IA redacta y prioriza.** Toma el resultado de las reglas y lo convierte en lenguaje
  llano con contexto. **Nunca decide sola si hay alerta.**

Esto evita el peor escenario: que un aviso de helada dependa de que el modelo esté disponible y
de buen humor. Y evita el otro: reglas rígidas que suenan a máquina.

#### Tabla de reglas propuesta

| Regla | Condición | Severidad | Canal |
|---|---|---|---|
| Helada inminente | mínima pronosticada ≤ `heladaCritica` del cultivo, con margen por etapa | **Crítica** | WhatsApp + in-app |
| Sensor mudo | sin lectura > 30 min en horario de operación | **Crítica** | WhatsApp + in-app |
| Riego anómalo | riego activo > 2× la duración mediana histórica de esa parcela | **Crítica** | WhatsApp + in-app |
| Humedad bajo crítico por etapa | humedad < rango de `guia-cultivos` para la etapa actual | Atención | in-app, WhatsApp si persiste 2 h |
| Lluvia próxima | prob. ≥ 60% en 24 h **y** riego programado | Atención | in-app |
| Desviación entre parcelas | consumo de una parcela > 1.5× la mediana de parcelas del mismo cultivo y etapa | Atención | in-app |
| Ventana óptima de riego | menor evapotranspiración prevista en 24 h | Informativa | in-app |
| Eficiencia de riego a la baja | litros por punto de humedad recuperado empeora vs. media móvil de 30 días | Informativa | in-app, resumen semanal |

**Tres niveles, y qué significan:**

- **Crítica** — algo se puede perder hoy. Interrumpe: WhatsApp inmediato.
- **Atención** — hay que decidir algo en el día. In-app destacada; WhatsApp solo si persiste.
- **Informativa** — mejora la operación. In-app y resumen semanal.

#### Por qué esto se siente inteligente y no reglas fijas

Cuatro mecanismos concretos, todos con datos que **ya se están guardando**:

1. **Umbrales relativos al historial de cada parcela**, no absolutos. "Riego anómalo" compara
   contra la mediana de esa parcela, que sale de `action_log.duracion_seg`. Una parcela de nogal
   y una de chile tienen normales distintas, y el sistema las aprende solo.
2. **Contexto fenológico.** El mismo 45% de humedad es normal en descanso y crítico en
   floración. `guia-cultivos.js` ya tiene esa tabla por etapa.
3. **Comparación entre pares.** Con varias parcelas, una que se desvía de sus semejantes
   (mismo cultivo, misma etapa, mismo clima) es señal aunque esté "dentro de rango".
4. **Ajuste estacional por clima real.** Las mismas condiciones de suelo con 38 °C y viento
   significan algo distinto que con 22 °C y lluvia en puerta.

#### Centro de notificaciones in-app

Tabla nueva `alertas`: `id, parcela_id, regla, severidad, titulo, detalle, datos_json,
estado ('nueva'|'leida'|'atendida'|'descartada'), creada, atendida_por, atendida_en`.

- Campanita en el encabezado con contador de no leídas.
- Pantalla `/alertas` con filtro por severidad y estado, agrupada por parcela.
- Cada alerta con **acción sugerida** y botón para marcarla atendida. Queda quién y cuándo —
  eso es lo que un municipio necesita para rendir cuentas.
- Las atendidas no desaparecen: pasan a historial. Es la trazabilidad.

#### Canal WhatsApp

**Recomendación: WhatsApp Cloud API (Meta), directo, no Twilio.**

| | Cloud API (Meta) | Twilio |
|---|---|---|
| Costo por conversación | Tarifa de Meta directa | Tarifa de Meta **+ margen de Twilio** |
| Dependencias | Ninguna, es HTTPS | SDK o HTTP |
| Complejidad de alta | Alta: verificación de negocio, número dedicado | Menor |

Como todo el backend ya llama a APIs externas con `fetch`, Cloud API **no agrega una sola
dependencia**. La contra es real: Meta exige verificación del negocio, y para el municipio eso
significa papeleo. Twilio se salta parte de eso a cambio de margen. *Sugiero Cloud API y asumir
el trámite; si el tiempo apremia para el pitch, Twilio como puente.*

**Restricción que define el diseño:** fuera de una ventana de 24 h desde el último mensaje del
usuario, **solo se pueden enviar plantillas aprobadas por Meta**. No se puede mandar texto libre.
Hay que registrar y aprobar plantillas por tipo de alerta, con variables:

> `⚠️ IonDroplet — {{parcela}}: se espera helada {{cuando}}, mínima de {{temperatura}}°C.
> Tu {{cultivo}} sufre abajo de {{critica}}°C. Ver detalle: {{liga}}`

**Control de saturación** — el riesgo número uno es que el agricultor silencie el número:

- Máximo **1 mensaje crítico por parcela cada 6 h** para la misma regla.
- Las de atención **se agrupan en un solo mensaje diario**, a hora configurable.
- Las informativas **nunca** van por WhatsApp: resumen semanal o nada.
- Tabla `envios_whatsapp` con la traza, para poder demostrar qué se mandó y cuándo.
- Silencio nocturno configurable, salvo críticas.

---

### 2.2 Modelo de datos ampliado

#### Sensores multinivel — rehacer el modelo

La tabla actual tiene `profundidad_cm` suelto, sin concepto de sonda. Propuesta:

```
puntos_medicion   id, parcela_id, nombre, latitud, longitud, device_id, instalado
                  (una sonda física, con su ubicación exacta dentro de la parcela)

lecturas_perfil   id, punto_id, profundidad_cm, humedad, temperatura_suelo,
                  conductividad, timestamp
                  (una lectura por profundidad; varias filas por sonda y momento)
```

Esto permite lo que de verdad importa: **el perfil de humedad**. Un cultivo de raíz profunda
puede estar sufriendo con la superficie mojada. Visualmente es un gráfico de profundidad, no una
línea más.

#### Fertirriego — construir de cero

```
eventos_fertirriego  id, parcela_id, inicio, fin, volumen_litros, ec_ds_m, ph,
                     fuente ('manual'|'sensor'), operador, notas

nutrientes_aplicados id, evento_id, nutriente, cantidad, unidad
                     (N, P, K, Ca, Mg, micros — una fila por nutriente)

lecturas_solucion    id, parcela_id, ec_ds_m, ph, temperatura, timestamp
                     (si algún día hay sonda EC/pH en línea)
```

Con captura manual esto ya sirve el día uno: el agricultor registra qué aplicó, y el sistema
cruza dosis con respuesta de humedad y con etapa. **Es el requerimiento de los jueces que menos
depende de hardware nuevo.**

#### Comparación entre parcelas

No necesita tabla nueva; necesita **quitar el supuesto de parcela única**:

- `sensor_readings.parcela_id` **poblado** (hoy 100% NULL).
- Estado de riego **por parcela**, no global — ver 1.3, punto 2.
- Endpoint `GET /api/parcelas/comparar?ids=1,2,3&metrica=humedad&hours=168` que devuelva series
  alineadas en el tiempo, ya muestreadas.

#### Categorías que faltan y son estándar en agricultura de precisión

| Categoría | Por qué | ¿Se puede hoy? |
|---|---|---|
| **Evapotranspiración (ET₀)** | Es *el* número de la programación de riego. Cuánta agua pierde el cultivo por clima. | **Sí, ya.** Open-Meteo entrega `et0_fao_evapotranspiration`. Con el coeficiente Kc del cultivo por etapa se obtiene ETc. **El mayor salto de inteligencia por el menor esfuerzo.** |
| **Balance hídrico** | Agua que entra (riego + lluvia) menos la que sale (ETc). Permite *anticipar* en vez de reaccionar. | Sí: riego de `action_log`, lluvia de Open-Meteo, ETc de arriba. |
| **Lámina aplicada (mm)** | Unidad en que un agrónomo piensa el riego, no "minutos de bomba". | Necesita **un dato**: el caudal de la bomba (L/min) y el área. El agricultor lo sabe. |
| **Eficiencia de riego** | Litros por punto de humedad recuperado. Detecta fugas y goteros tapados. | Sí, con lo anterior. |
| **Grados-día acumulados** | Predice etapas fenológicas por temperatura, en vez de que el agricultor las capture a mano. | Sí, con temperatura de Open-Meteo. |
| **Punto de marchitez / capacidad de campo** | Los umbrales fijos ignoran que un suelo arcilloso y uno arenoso son distintos. | Necesita el tipo de suelo, capturado una vez. |

> **ET₀ y balance hídrico son la recomendación más fuerte de este documento.** Convierten el
> sistema de "avisa cuando ya está seco" a "te dice cuándo va a estar seco". Es la diferencia
> entre un termómetro y un pronóstico, y **no requiere nada de hardware nuevo**.

---

### 2.3 Rediseño de percepción y tono

#### La decisión de fondo: dos vistas, no una

Del hallazgo de 1.2: son dos audiencias con necesidades opuestas. La propuesta es **un producto
con dos modos**, no dos productos.

**Modo Campo** (lo que hay hoy, refinado). Celular, un dato protagonista, lenguaje llano, botones
grandes. **No se toca**: funciona para quien lo va a usar todos los días.

**Modo Operación** (nuevo). Tablet/escritorio. Tablas densas, series múltiples, comparativas,
exportación. Es lo que ve el jurado, el agrónomo y el municipio.

Se escoge en Ajustes y se recuerda. En pantallas anchas se sugiere Operación.

#### Sistema visual del Modo Operación

| | Modo Campo (hoy) | Modo Operación (propuesto) |
|---|---|---|
| Base tipográfica | 16 px | 14 px |
| Iconografía | Emoji | **Lucide vectorial**, un solo grosor |
| Radio de esquina | 16 px | **6 px** |
| Densidad | 1 dato / media pantalla | Tabla de 12 filas visibles |
| Gráficas | Una serie | **Múltiples series**, ejes dobles, bandas de referencia |
| Color | Semáforo grande | Semáforo **discreto**: puntos y texto, no fondos |
| Alto de botón | 56–68 px | 36–40 px |

La paleta se conserva —verde, agua, alerta, peligro— porque ya es la marca. Lo que cambia es
**cuánta superficie ocupa cada color**: en modo operación el color señala, no decora.

#### Estructura del panel de operación

```
┌─ Resumen ejecutivo ──────────────────────────────────────┐
│  N parcelas · N con alerta · agua aplicada hoy (m³)      │
│  eficiencia media · balance hídrico agregado             │
└──────────────────────────────────────────────────────────┘
┌─ Alertas activas ────────────────────────────────────────┐
│  ordenadas por severidad, con parcela y acción sugerida  │
└──────────────────────────────────────────────────────────┘
┌─ Tabla de parcelas ──────────────────────────────────────┐
│  Parcela │ Cultivo │ Etapa │ Hum. │ Perfil │ ETc │ Bal.  │
│  ordenable, filtrable, clic → detalle                    │
└──────────────────────────────────────────────────────────┘
┌─ Comparativa ────────────────────────────────────────────┐
│  serie múltiple, selección de parcelas y métrica         │
└──────────────────────────────────────────────────────────┘
```

#### Lenguaje: dos registros, un solo dato

El mismo hecho, dicho para cada audiencia:

| Modo Campo | Modo Operación |
|---|---|
| "Tu tierra está al 34%, le toca agua" | "Humedad volumétrica 34% — por debajo del umbral de manejo (40%) para nogal en llenado" |
| "Riega solo si baja de 40%" | "Umbral de manejo: 40% HV" |
| "Van 2 horas de agua" | "Lámina aplicada: 18 mm · 124 m³ · eficiencia 0.82" |
| "Puede helar mañana" | "Riesgo de helada: T-mín pronosticada −1.2 °C vs. crítica del cultivo −2.0 °C" |

**El dato es el mismo. Cambia el registro.** Y para el pitch: se demuestra en Modo Campo —que es
donde se ve que el sistema piensa por el agricultor— y se abre Modo Operación para enseñar que
hay ingeniería debajo.

---

### Cómo queda resuelto el feedback de los jueces

| Feedback | Dónde se resuelve | Qué falta de verdad |
|---|---|---|
| **Sensores multinivel** | 2.2 — modelo `puntos_medicion` + `lecturas_perfil`, gráfico de perfil | Sondas físicas y firmware. El modelo actual además hay que rehacerlo. |
| **Alertas por WhatsApp** | 2.1 — Cloud API, plantillas, control de saturación | Verificación de negocio con Meta y número dedicado |
| **Fertirriego** | 2.2 — tres tablas, captura manual desde el día uno | Nada bloqueante. **Es lo más rápido de entregar.** |
| **Comparación entre parcelas** | 2.2 + 1.3 punto 2 | Quitar el `espSettings` global. Toca la lógica de riego. |
| **Pitch menos técnico** | 2.3 — dos modos | Nada. La capa de IA ya empuja en esa dirección. |

---

## Lo que necesito de ti antes de la Fase 3

1. **¿Delicias es real o exploratorio?** Cambia todo el orden: si hay una conversación abierta
   con el municipio, multi-tenant y autenticación de dispositivos suben al primer lugar. Si es
   exploratorio, primero ET₀ y fertirriego, que lucen y no requieren hardware.
2. **¿Cuántos sensores hay o habrá en los próximos seis meses?** Con menos de diez, SQLite bien
   indexado aguanta y la migración a TimescaleDB puede esperar. Arriba de cincuenta, no.
3. **¿Quién opera el Modo Operación?** ¿El mismo agricultor, un agrónomo, o personal municipal?
   Define permisos y vocabulario.
4. **¿Hay presupuesto para hardware?** ET₀ y fertirriego no lo necesitan; multinivel y EC/pH sí.
5. **¿Fecha del pitch?** Determina qué entra en el corto plazo.
6. **El caudal de la bomba en litros por minuto.** Un solo número que desbloquea lámina
   aplicada, eficiencia de riego y el "cuánta agua ahorré" — que es la cifra que convence a un
   municipio.
