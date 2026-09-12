# IonDroplet V2

Sistema de riego para agricultura con agua ionizada.
InnovaTecNM 2026 — TecNM Campus Chihuahua II.

Estado al 11 de septiembre de 2026. Todos los números de este documento salen de la base de
datos y del código, no de la memoria de nadie.

---

## 1. Qué es

Un sistema que mide la humedad del suelo, decide cuándo regar y le explica al agricultor por qué.
Tres piezas:

| Pieza | Qué hace | Dónde vive |
|---|---|---|
| **ESP32 + sensor** | Mide la humedad y obedece a la bomba | En la parcela, por USB o Wi-Fi |
| **Backend** | Decide el riego, guarda todo, calcula y llama a la IA | Node + Express + SQLite |
| **Aplicación** | Lo que el agricultor y el jurado ven | Next.js, en el celular |

**Usuario final:** un agricultor de 45-50 años, en el campo, bajo el sol, con guantes, en un
celular. Todo el diseño sale de ahí.

---

## 2. El principio que gobierna todo

> **Nunca se muestra un número inventado como si fuera medido.**

No es un detalle de estilo: es lo que separa este sistema de una maqueta. La versión anterior
rellenaba temperatura, voltaje y corriente con números fabricados, y la pantalla se veía llena.
Esta no lo hace, y por eso a veces se ve con menos datos — pero todos son verdad.

De ahí salen tres reglas que aparecen por todo el código:

1. **Si un dato falta, se dice que falta.** No se estima, no se rellena, no se promedia.
2. **Todo número lleva su procedencia**: medido, calculado, pronosticado o ausente.
3. **La IA interpreta; no inventa.** Los indicadores los calcula el código con datos reales y la
   IA los ordena y los explica. La única probabilidad en porcentaje que se muestra es la de
   lluvia, porque esa la publica el servicio meteorológico.

---

## 3. Qué mide, qué calcula y qué no sabe

### Mide de verdad

| Magnitud | Instrumento | Estado hoy |
|---|---|---|
| Humedad del suelo | Sensor capacitivo → ESP32 | **36,307 lecturas**, del 30 abr al 10 jun de 2026 |
| Estado de bomba y modo | Backend, persistido | Vigente |
| Duración de cada riego | `action_log`, por transición de bomba | Vigente |
| Aplicaciones de fertirriego | Captura manual del agricultor | Sin registros todavía |

### Calcula a partir de lo medido

| Magnitud | Fórmula | Desde |
|---|---|---|
| ET₀ (evaporación de referencia) | FAO Penman-Monteith | Open-Meteo |
| ETc (lo que pide **este** cultivo) | ET₀ × Kc, con Kc por etapa | Tablas FAO-56 |
| Déficit hídrico a 7 días | ETc − lluvia pronosticada | Ambos |
| Litros por hectárea | 1 mm sobre 1 ha = 10,000 L | Conversión de unidades |
| Riesgo de plaga | Humedad y mes contra el catálogo | `lib/plagas.ts` |
| Eficiencia de riego | Minutos por punto de humedad ganado | Riego + lecturas |
| Riego con ionización | Solape de intervalos de la bitácora | `action_log` |

### **No sabe, y lo dice**

| Magnitud | Por qué falta |
|---|---|
| Temperatura del suelo | No hay termómetro. La columna existe y está vacía. |
| Tensión y corriente | No hay sensor. Columnas vacías. |
| **ORP, pH y conductividad del agua** | No hay sonda. **Es la magnitud que evidenciaría la ionización.** |
| Perfil de humedad por profundidad | Tablas y endpoints listos; sin sondas instaladas. |
| Lámina aplicada en mm y litros | Falta el caudal de la bomba, que es **un número** que se mide con una taza y un cronómetro. |
| Litros de **esta** parcela | Falta la superficie (`area_ha`). |

---

## 4. El hueco honesto: la ionización

El sistema se llama IonDroplet y la ionización es lo que le da nombre. **También es lo menos
instrumentado de todo.** Cuatro hechos:

1. **El ionizador no confirma su estado.** Lo que se registra es la orden, no que haya encendido.
2. **`/api/esp/data` recibe un campo `ionizador` y lo descarta.** Hoy no hay vía para que el
   aparato reporte.
3. **Nada mide el efecto**: ni ORP, ni pH, ni conductividad.
4. Sólo hay **6 registros** en `ionization_log`, todos de pruebas.

Lo que **sí** se puede medir sin comprar nada, y el sistema ya lo calcula:
**qué porcentaje del tiempo de bomba ocurrió con el ionizador encendido.** Si el producto es
riego con agua ionizada, esa es la cifra que lo demuestra. Sale del solape de intervalos de la
bitácora.

Todo esto está escrito en el panel de operación, a la vista. **Un jurado va a preguntar
exactamente esto**, y una pantalla que lo dice resiste mejor que una que lo esconde.

---

## 5. Arquitectura

```
   ESP32 + sensor capacitivo
            │
     USB serial 115200  ó  HTTP /api/esp/data
            │
            ▼
   ┌─────────────────────────────────────────┐
   │  BACKEND  ·  Node + Express 5 + SQLite  │
   │  2,983 líneas en server.js              │
   │                                         │
   │  • Control de riego POR PARCELA         │
   │  • Motor de alertas (reglas de código)  │
   │  • Balance hídrico (ET₀ × Kc)           │
   │  • Guía agronómica de 9 cultivos        │
   │  • Capa de IA (API Anthropic por fetch) │
   └─────────────────────────────────────────┘
            │  HTTP :3001
            ▼
   ┌─────────────────────────────────────────┐
   │  APP  ·  Next.js 15 + React 19          │
   │  12 pantallas · 26 componentes          │
   │  14 hooks · un solo proveedor de datos  │
   └─────────────────────────────────────────┘
```

**Dependencias de la app: cuatro.** `next`, `react`, `react-dom` y `lucide-react`.
Sin librería de gráficas, sin librería de componentes, sin cliente HTTP. Las gráficas son SVG
escrito a mano. El backend llama a la API de Anthropic con `fetch`, sin SDK.

> **Por qué tan pocas dependencias:** `npm install` recompila los módulos nativos
> (`serialport`, `sqlite3`). Antes de una demo, eso es un riesgo que no vale la pena.

---

## 6. Modelo de datos

14 tablas. El estado real hoy:

| Tabla | Filas | Para qué |
|---|---|---|
| `sensor_readings` | **36,307** | Las lecturas de humedad |
| `parcelas` | 1 | Cultivo, etapa, superficie, ubicación, caudal |
| `thresholds` | 1 | El punto de riego que mueve la bomba |
| `action_log` | 1 | Bitácora: riegos, modos, ionización, fertirriego |
| `alertas` | 5 | Avisos del motor de reglas |
| `ionization_log` | 6 | Lo último que se le pidió al ionizador |
| `estado_riego` | 1 | Modo y bomba **por parcela**, persistido |
| `eventos_fertirriego` | 0 | Aplicaciones de nutrientes |
| `nutrientes_aplicados` | 0 | Un renglón por nutriente |
| `lecturas_solucion` | 0 | **Vacía a propósito**: espera sonda de EC y pH |
| `sensor_readings_multinivel` | 0 | Espera sondas a varias profundidades |
| `agua_subterranea` | 0 | Espera sonda de nivel freático |
| `devices` | 0 | Sin usar |
| `users` | 0 | Sin login: el sistema corre en la red del rancho |

**Seis índices** sobre `timestamp`, `device_id` y `parcela_id`. La consulta que corre cada 3
segundos pasó de **11.82 ms a 0.93 ms**.

### La parcela de hoy

```
Parcela 1 · nogal · punto de riego 80%
ubicación 28.744073, −106.171121  (tomada del teléfono)
etapa: sin capturar    superficie: sin capturar    caudal: sin capturar
```

---

## 7. La capa de IA

Cuatro usos, todos con el contexto armado **en el servidor** — la app nunca manda datos que no
midió nadie.

| Uso | Qué hace |
|---|---|
| **Análisis completo** | Interpreta indicadores ya calculados: riesgos con su nivel y su número, pronóstico, acciones priorizadas |
| **Opinión por pantalla** | Una o dos frases con la lectura de la situación. Caché de 20 min |
| **Asistente** | Chat en burbuja flotante, disponible desde cualquier pantalla |
| **Foto de la planta** | El agricultor fotografía una hoja y la IA dice a qué se parece |

**El reparto del trabajo es lo que hace que se pueda confiar:** el código calcula, la IA explica.
El prompt le prohíbe inventar un porcentaje y le exige citar el número que sostiene cada nivel.
Si le falta un dato, tiene que decirlo.

---

## 8. Motor de alertas

**Las reglas son de código, no de IA.** Un aviso de helada no puede depender de que el modelo
esté disponible ni de que conteste bien.

Seis reglas activas, evaluadas cada 10 minutos:

| Regla | Se dispara cuando | Severidad |
|---|---|---|
| `sensor_mudo` | Sin lectura por más de 30 min | Crítica |
| `helada` | Mínima pronosticada cerca de la crítica del cultivo | Crítica / Atención |
| `riego_largo` | La bomba lleva más del doble de **la mediana de esa parcela** | Crítica |
| `humedad_baja_etapa` | Humedad bajo el rango que pide el cultivo **en su etapa** | Atención |
| `calor_extremo` | Máxima sobre la de estrés del cultivo | Atención |
| `deficit_agua` | La semana pide mucha más agua de la que va a llover | Atención |
| `lluvia_proxima` | Probabilidad alta y milímetros que valgan | Informativa |

Dos reglas más están **definidas y sin implementar**, y el panel lo dice: comparación entre
parcelas (hay una sola) y eficiencia en litros (falta el caudal).

**Tres decisiones que costaron encontrar:**

- Cada alerta guarda **el número que la disparó**. Sin eso sería una opinión del sistema.
- Al atenderla se guarda **quién y cuándo**. Eso es lo que un municipio necesita para rendir
  cuentas: no basta con avisar, hay que poder decir quién hizo caso.
- **Silencio de 6 horas** tras atender. El riesgo número uno de un sistema de avisos no es
  avisar de menos: es que lo silencien.

Y un defecto que salió al probar y valió la pena: el motor confundía *"la regla no disparó"* con
*"la regla no se pudo evaluar"*, así que **un tropiezo de red apagaba un aviso real**. Ahora
distingue las dos cosas.

---

## 9. Pantallas

Doce rutas. La barra de abajo tiene cinco destinos; el resto se alcanza desde ellos.

| Ruta | Qué es |
|---|---|
| `/` | Humedad, riego, clima, lo que va a pedir esta semana, gráfica de 24 h |
| `/parcela` | Cultivo, etapa, superficie, caudal, punto de riego |
| `/analisis` | Lo que ve la IA: riesgos, pronóstico, qué hacer. Y la ionización |
| `/historial` | Serie de humedad y bitácora, a 24 h / 7 d / 30 d |
| `/ajustes` | Conexión, tema, aparatos, panel de operación |
| `/alertas` | Los avisos del sistema, con su dato y quién los atendió |
| `/fertirriego` | Anotar lo que se le puso, y el acumulado por nutriente |
| `/plagas` | Riesgo por temporada y foto de la planta |
| `/dispositivos` | Estado de los cuatro aparatos |
| `/asistente` | El chat completo |
| `/operacion` | **La vista técnica** |
| `/ionizacion` | Redirige a `/analisis` |

### Por qué existe el panel de operación

Hay **dos audiencias con necesidades opuestas**:

| | El agricultor | El jurado / el municipio |
|---|---|---|
| Dónde | Celular, bajo el sol, con guantes | Monitor, oficina |
| Necesita | Una decisión: ¿riego o no? | Panorama, tendencias, comparativas |
| Vocabulario | "Le toca agua" | "Lámina aplicada, ETc, eficiencia" |

Forzar una sola pantalla para las dos la empeora para ambas. Por eso `/operacion` es una ruta
aparte, con tipografía de 13.5 px, tablas densas y vocabulario de ingeniería — y el Modo Campo
no se tocó.

Ahí vive la sección de **procedencia del dato**, que por cada magnitud dice si es medida,
calculada, pronosticada o **no disponible**, y con qué instrumento.

---

## 10. API

38 endpoints. Los que importan:

```
Sensores      GET  /api/sensors/latest · /history · /resumen
Riego         GET  /api/esp/status · /api/esp/estados
              POST /api/esp/control · /api/esp/data
Agua          GET  /api/agua/balance          ET₀, ETc, déficit a 7 días
              GET  /api/riego/eficiencia      minutos y litros por punto
Parcelas      GET  /api/parcelas · /:id · /comparar
Alertas       GET  /api/alertas · /resumen    POST /:id/estado · /vistas
Fertirriego   POST /api/fertirriego           GET /resumen   DELETE /:id
IA            GET  /api/ai/analisis · /consejo      POST /api/chat · /api/ai/foto
Clima         GET  /api/clima                 Open-Meteo, caché de 15 min
Bitácora      GET  /api/logs · /resumen
```

**Todo el crecimiento fue aditivo.** Ningún endpoint existente cambió de forma. `/api/esp/status`
y `/api/esp/control` aceptan `parcela_id` opcional: sin él se comportan exactamente como antes.

---

## 11. Sistema visual

Referencia explícita: aplicaciones de uso diario. Lo que las hace ver serias no es que sean
bonitas, es que son **contenidas**.

| | Antes | Ahora |
|---|---|---|
| Bordes | 4 px | **1 px** |
| Esquinas | 16 y 24 px | **8 px** |
| Base tipográfica | 16 px sobre escala inflada | **15 px** |
| El número de humedad | 72 px | **34 px** |
| Sombras | En cada tarjeta | **Ninguna** |
| Al pasar el ratón | Todo se levantaba | **Cambio de color** |
| Iconos | Emoji | **Lucide vectorial** |
| Texto | "SIN REGAR" | "Sin regar" |

Clases con nombre en `globals.css` — `tarjeta`, `boton`, `campo`, `pastilla`, `etiqueta`, `dato`
— para que cambiar el relleno de una tarjeta sea un lugar y no veinte.

Tema claro y oscuro completos, con `prefers-reduced-motion` respetado.

---

## 12. Cómo levantarlo

```bash
# Backend
cd iondroplet-backend
node server.js                  # :3001

# Aplicación
npm run build
npx next start                  # :3000
```

Desde el celular: `http://<IP-de-la-PC>:3000`.

> **Trampa:** la app corre con `next start`, no con `next dev`. **Una ruta nueva no aparece
> hasta reconstruir.**

---

## 13. Qué está verificado y qué no

### Verificado corriendo el sistema

- **Riego por parcela**: se grabó una línea base con un riego real antes del cambio y se repitió
  después — 8 de 9 pasos idénticos. Con dos parcelas, las siete comprobaciones pasan: una en
  manual con la bomba encendida no mueve a la otra.
- **Motor de alertas**: no duplica, se apaga solo, respeta el silencio de 6 h, y los avisos
  reales sobreviven a una reevaluación.
- **Eficiencia de riego**: probada con un caso construido — tres riegos, dos de 20 min y uno de
  40, todos subiendo 10 puntos. Dio referencia 2 min/pt, último 4, desviación **+100 %**.
- **Fertirriego**: capturado desde la interfaz, no por API. La validación rechaza nutriente
  inventado, unidad inventada y pH fuera de 0-14.
- **Las 12 pantallas**: sin elementos transparentes, sin mayúsculas gritadas, 462 peticiones
  todas en 200, en claro, oscuro y a 375 px.

### **No verificado**

- ⚠️ **El service worker de la PWA.** El navegador de la vista previa lo rechaza y no hubo un
  Chrome real disponible. El manifest es válido y `sw.js` se sirve bien, **pero eso no demuestra
  que funcione sin señal.** Hay que probarlo en un teléfono: modo avión y recargar.
- ⚠️ **Nunca ha habido un riego automático real.** El ESP32 no se ha conectado en toda la vida
  del proyecto. Todo lo de riego se probó por API con duraciones de segundos.
- ⚠️ **La app en un teléfono de verdad.** El arreglo de la dirección del backend no se ha
  probado en hardware real.

---

## 14. Lo que falta, y de quién depende

### Del usuario

| Qué | Por qué importa |
|---|---|
| **Conectar el ESP32 y dejarlo corriendo** | La última lectura es del 10 de junio. Sin datos frescos, la gráfica y medio panel salen vacíos. **Es lo más importante.** |
| **Probar la PWA en el teléfono** | Es lo único entregado sin verificar |
| **Medir el caudal de la bomba** | Una taza y un cronómetro. Desbloquea litros, m³, pesos y eficiencia |
| **Capturar superficie y etapa** | Los campos ya están; afinan el balance hídrico |
| **Revisión de un agrónomo** | `guia-cultivos.js` (incluida la tabla Kc) y `lib/plagas.ts` los redactó Claude |

### Fuera del alcance por decisión

- **WhatsApp** — el motor está diseñado, pero depende de la verificación de negocio con Meta.
  Se dejó para después del pitch.
- **Multi-usuario y autenticación de aparatos** — sólo si la adopción municipal se vuelve real.
  Hoy `/api/esp/data` acepta lecturas de cualquiera en la red.

### Si algún día hay presupuesto de hardware

| Sensor | Costo aprox. | Qué desbloquea |
|---|---|---|
| **Sonda ORP** | $500-1,500 | **Lo único que evidenciaría que la ionización sirve** |
| Caudalímetro YF-S401 | ~$150 | Litros y pesos medidos, no proyectados |
| 3 sensores a 20/40/60 cm | ~$150 | **Multinivel** — son tres del mismo capacitivo que ya usas |
| Termómetro de suelo DS18B20 | ~$80 | Llena una columna muerta; grados-día |

Los cuatro necesitan **cambiar el firmware del ESP32**, que ha sido el cuello de botella de todo.

---

## 15. La advertencia que hay que decir en el pitch

El montaje actual es un **prototipo de banco**: una mini bomba de diafragma de 1 a 3 L/min sobre
protoboard, en un tóper.

Cualquier cifra de "cuánta agua ahorré" que salga de ahí es una **proyección, no una medición**.
Se puede presentar, y se presenta bien, con la etiqueta encima: *"proyección a 1 ha, medida sobre
prototipo"*. Sin etiqueta es el mismo pecado que los números fabricados de la versión anterior,
sólo que con aritmética adelante que lo hace ver más creíble.

**Un jurado respeta lo primero y tumba lo segundo en preguntas.**

---

## Documentos relacionados

| Archivo | Qué tiene |
|---|---|
| [ANALISIS.md](ANALISIS.md) | El diagnóstico: inventario de datos, UI y arquitectura |
| [PLAN.md](PLAN.md) | El plan en cinco etapas y por qué ese orden |
| [PENDIENTES.md](PENDIENTES.md) | Bitácora de lo entregado, con los defectos encontrados |
| [SETUP.md](SETUP.md) | Cómo dejarlo corriendo |
