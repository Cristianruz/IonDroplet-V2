# Pendientes de IonDroplet V2

Estado al 3 de septiembre de 2026. Fases terminadas: **las seis (0 a 6)**. Lo que sigue es pulido y decisiones abiertas.

---

## 1. Bloqueado por hardware

| # | Qué falta | Detalle |
|---|---|---|
| 1.1 | La prueba de aceptación de la Fase 0 | Mojar el sensor, ver el número cambiar en ~3 s y que la bomba responda al cruzar el umbral. El ESP32 no ha estado conectado en ningún momento. |
| 1.2 | Confirmar el puerto serial | Hoy solo aparecen COM7 y COM8, que son Bluetooth. Al conectar el ESP32, correr `[System.IO.Ports.SerialPort]::GetPortNames()` y, si no es COM5, poner `SERIAL_PORT=` en el `.env` del backend. |
| 1.3 | Ver la bitácora con riegos de verdad | Se probó con riegos de segundos hechos por API. Falta confirmar que un riego automático real queda bien registrado de principio a fin. |
| 1.4 | Ver la gráfica con datos frescos | La última lectura es del 10 de junio, así que "Hoy" y "7 días" salen vacíos. Los puntos verdes de riego se verificaron sembrando datos de prueba dentro del rango. |

---

## 2. Decisiones — ya resueltas

| # | Decisión | Cómo quedó |
|---|---|---|
| 2.1 | Dónde se guarda el punto de riego | **Se queda escribiendo en los dos**: `thresholds.hum_max` (que mueve la bomba) y `parcelas.hum_min` como copia. Además, en la Fase 5 la IA va a **proponer** el punto de riego (ver abajo). |
| 2.5 | ¿Login en la v1? | **No.** El sistema corre en la red del rancho y el agricultor no teclea contraseñas bajo el sol. El `authMiddleware` se queda desactivado y no hay botón de cerrar sesión. Los endpoints de auth siguen ahí sin usarse. |
| 4.11 | Control de versiones del backend | **Hecho**, `git init` local en `iondroplet-backend`. Sin remoto: ese `.env` tiene llaves de verdad. |
| 4.13 | Nada commiteado | **Hecho.** Repositorio privado `Cristianruz/IonDroplet-V2` en GitHub, con las fases 0 a 3. |
| 4.14 | Runner de pruebas para la Fase 4 | **El de Node**, `node --test`, que corre TypeScript directo en Node 24. Cero dependencias nuevas. |
| 2.2 y 2.3 | Etapa como desplegable y punto de riego con botón "Cambiar", como el wireframe | **Se quedan como están**: botones grandes para la etapa y − / + para el punto de riego. Menos toques con guantes, que es el criterio que el propio documento usa. |
| 2.4 | La ionización aparecía en Inicio y en su pestaña | **Quitada de Inicio.** Un control en un solo lugar. Inicio se queda con lo urgente: humedad y riego. |
| 4.8 | `num_hileras` y `tipo_sistema` sin usar | **Se quedan dormidos.** Intactos en la base, fuera de la pantalla. |
| 4.9 | Tablas `sensor_readings_multinivel` y `agua_subterranea` sin usar | **Unidas al sistema.** Se declaran en `server.js` y tienen cuatro endpoints nuevos para recibir y leer. Ver la advertencia de abajo. |

## 2b. Decisiones — todavía abiertas

| # | Decisión | Cómo quedó por lo pronto |
|---|---|---|
| 2.6 | "lo decidió el sistema" aparece en el wireframe F3a pero no en su tabla de traducciones | Se siguió la tabla (`usuario` / `ia` / `umbral`), que es la parte normativa. |

---

## 3. Cosas a medias que dependen de fases siguientes

| # | Dónde | Qué falta |
|---|---|---|
| 3.3 | ~~Botón "Preguntar" en Plagas~~ | **Hecho** en la Fase 5: abre el asistente con la plaga ya escrita. |
| 3.4 | ~~Asistente y Plagas sin entrada~~ | **Resuelto.** A Plagas se entra desde Parcela, al Asistente desde Inicio y desde el botón "Preguntar" de cada plaga, y a Dispositivos desde Ajustes. |
| 3.5 | Plagas | El catálogo es una primera versión escrita a mano. Convendría que un técnico agrónomo lo revise antes de la demo, sobre todo las temporadas por mes. |

---

## 4. Deuda técnica

| # | Qué | Por qué importa |
|---|---|---|
| 4.2 | La ionización se registra por **lo que se pide**, no por lo que el ionizador confirma | El aparato no reporta su estado. Mismo problema que 4.10. |
| 4.7 | Las gráficas **submuestrean** (240 puntos en Inicio, 720 en Historial) | Lo hace el servidor con el parámetro `max`. Son lecturas reales, una de cada N, nunca promedios. Las cifras exactas salen aparte de `/api/sensors/resumen`, calculadas sobre todas. |

### Ya resueltos

- ~~Aviso de "INICIAR_SISTEMA.bat" duplicado~~ → ahora es `components/aviso-sin-conexion.tsx`.
- ~~Mezcla de tú y usted~~ → todo en **tú**, como los wireframes.
- ~~Sin `<title>` por pantalla~~ → cada ruta tiene su `layout.tsx` con su título.
- ~~"Empezó a regar" para un riego en curso~~ → dice **"Regando ahora"** cuando la bomba sigue prendida.
- ~~`use-parcela` no leía por `id`~~ → ahora lee por `id` en cuanto sabe cuál es, y vuelve a la lista si desaparece.
- ~~Faltaban los puntos verdes de riego en la gráfica~~ → **hechos**, con su leyenda.
- ~~Historial pedía la bitácora dos veces~~ → una sola respuesta sirve para la lista y para los puntos.
- ~~Cada pantalla con su propio temporizador~~ → un solo `<ProveedorDatos>` para toda la app.
- ~~Un riego se perdía si se reiniciaba el backend~~ → al arrancar se retoma el riego abierto y se cierra con su duración real. Probado: cerró con 71 s abarcando el reinicio. Si pasaron más de 12 horas no se inventa una duración, se marca como no medido.
- ~~El estado del ionizador se perdía al recargar~~ → sale de `ionization_log`, que ya guardaba cada cambio. Sigue siendo "lo último que se le pidió", y la pantalla lo dice con esas palabras.
- ~~`action_log` crecía sin límite~~ → al arrancar se borra lo de más de 2 años, configurable con `BITACORA_DIAS`.
- ~~El `package-lock.json` listaba `pg`~~ → regenerado con `npm install --package-lock-only`, que no toca `node_modules`. Verificado: 154 carpetas antes y después, cero recompilación de módulos nativos.
- ~~El cultivo se guardaba por nombre~~ → normalizado a su `id`.
- ~~La app decía "No responde" sin haber preguntado~~ → la primera vuelta del sondeo siempre corre, aunque la pantalla esté en segundo plano.

### Sobre las profundidades y el agua subterránea

Los endpoints ya están (`POST` y `GET` de `/api/sensors/multinivel` y `/api/agua-subterranea`)
y fueron probados guardando y leyendo. **Pero nada los alimenta todavía**: el ESP32 manda solo
`{ humedad }`. Para que lleguen datos hay que cambiar el firmware, y eso está fuera de lo que
se puede tocar. Mientras no haya mediciones reales **no se hace pantalla para ellos**: no se
enseña un número que nadie midió. Falta también decidir de qué aparato salen (sensores a
varias profundidades, sonda de nivel freático) y con qué `device_id`.

### Rendimiento — medido, no supuesto

Un día real de operación son **23,545 lecturas** (el 10 de junio, en la base). El panel pedía
las últimas 24 horas completas **cada minuto**:

| | Antes | Ahora |
|---|---|---|
| Historial completo (36,263 lecturas) | 5.18 MB en 4,215 ms | 44 KB en 154 ms |
| Peticiones al arrancar una pantalla que no dibuja gráfica | pedía las 24 h igual | no la pide |

En producción (`npm run build` + `npm start`) la app carga en **90–155 ms** y pesa **142 KB**.
Lo que se sentía lento era el servidor de desarrollo compilando cada pantalla la primera vez
que se entra: eso no le pasa al agricultor.

### Trampa de operación

`npm run build` **corrompe el servidor de desarrollo** si `next dev` está corriendo: sale
`__webpack_modules__[moduleId] is not a function`. Se arregla borrando `.next` y reiniciando.
Para revisar tipos sin apagar nada: `npx tsc --noEmit`.

---

## 5. Lo que sigue

Las seis fases del plan están terminadas. Lo que queda es de tres tipos:

**Revisión de un experto.** La guía agronómica (`guia-cultivos.js`, en el backend) y el
catálogo de plagas (`lib/plagas.ts`) los redactó Claude. Antes de la demo los debería revisar
un agrónomo, sobre todo las temperaturas críticas, los rangos de humedad y los calendarios
por mes.

**Ubicación de la parcela.** Hasta que alguien toque el botón desde el celular estando en la
parcela, la tarjeta del clima sigue pidiendo el dato. No se adivina: dos municipios a 100 km
tienen 6 grados de diferencia en la mínima, y de eso depende un aviso de helada.

**Lo que necesita hardware nuevo.**

| Qué | Qué hace falta |
|---|---|
| Ubicación desde el aparato | Un módulo GPS en el ESP32 y cambiar el firmware. El backend ya acepta `lat` y `lon` en `/api/esp/data`: la puerta está abierta. |
| Temperatura del suelo, pH, conductividad | Sensores nuevos. `sensor_readings` ya tiene las columnas `temperature`, `voltage` y `current` vacías esperando. |
| Humedad a varias profundidades y nivel freático | Sensores nuevos. Los endpoints ya existen y fueron probados. |
| Que el ionizador confirme su estado | Hoy solo se sabe lo último que se le pidió, y la pantalla de Aparatos lo dice tal cual. |
| Varias parcelas con su propia bomba | Antes hay que quitar el `espSettings` global de `server.js`: hoy hay un solo `autoMode` y un solo `pumpState` para todo el sistema, así que dos bombas se pisarían. Eso sí toca la lógica de riego. |
| Registro automático de aparatos nuevos | La tabla `devices` solo tiene `id` e `ionization_on`: le faltan nombre, tipo, parcela y última respuesta. Cambio aditivo. |

**Huracanes.** Si lo quieres, se conecta el centro de huracanes de NOAA. Con la salvedad de
siempre: Chihuahua está a 400 km de la costa y a 1,400 m de altura, los huracanes no tocan
tierra ahí, y el aviso de helada que ya existe salva más cosecha.

---

## 6. Etapa A entregada — 6 de septiembre de 2026

Alcance recortado a A1–A3 porque el pitch es en menos de un mes. Ver [PLAN.md](PLAN.md).

### A1 — Índices en la base

Seis índices sobre `sensor_readings`, `action_log` e `ionization_log`. Medido sobre una copia,
nunca sobre producción:

| | Sin índices | Con índices |
|---|---|---|
| Última lectura (corre cada 3 s) | 11.82 ms | **0.93 ms** |
| Resumen de 30 días | 12.22 ms | **4.08 ms** |
| Historial completo | 229 ms | 214 ms |
| `INSERT` | 0.097 ms | 0.104 ms |

El plan de consulta pasó de `SCAN sensor_readings` a `SCAN sensor_readings USING INDEX
idx_lecturas_tiempo`. Escribir cuesta ~7% más, que a una lectura cada 3 segundos no se nota.

**Corrección de lo que dije antes de medir:** afirmé que sin índices "cualquier demo con datos
reales se ve lenta". A 36,307 filas es falso —9 ms no los nota nadie. El argumento verdadero es
que el costo crece lineal y un mes de operación continua con un solo sensor son ~706,000 filas.

### A2 — Evapotranspiración y balance hídrico

- `guia-cultivos.js`: tabla nueva `KC_POR_ETAPA`, ocho cultivos por seis etapas, de FAO-56.
  `otro` va en `null` a propósito: sin saber qué se sembró no hay coeficiente que valga.
  **Pendiente de revisión agronómica, igual que el resto del archivo.**
- `pedirClima()`: se agregó `et0_fao_evapotranspiration` al `daily=`. No se tocó `past_days`
  para no correr los índices de los arreglos que ya consume el frontend.
- Endpoint nuevo `GET /api/agua/balance?parcela_id=&dias=`. Ninguno existente se modificó.
- `components/balance-card.tsx` en Inicio, y el detalle diario en el panel de operación.

**Va hacia adelante, no hacia atrás**: el pronóstico da los 7 días que vienen. El riego ya hecho
se reporta aparte y en minutos, sin restarlo de la demanda futura.

**Lo que NO calcula, y lo dice en pantalla:** la lámina aplicada. Faltan el caudal de la bomba y
`area_ha`. Van en `null` y se listan en `faltantes`. El déficit sí se da en litros **por
hectárea**, que es conversión de unidades (1 mm sobre 1 ha = 10,000 L), no una estimación.

### A3 — Modo Operación

Ruta nueva `/operacion`, con entrada desde Ajustes. **El Modo Campo no se tocó.**

Es una ruta aparte y no un interruptor global a propósito: cambiar las ocho pantallas según un
modo era mucho más riesgo del que aguanta un mes de plazo, y la vista aparte da el mismo
resultado. Base 14 px, esquinas de 6 px, iconos Lucide, tablas densas, cero emoji. CSS bajo
`.op` para que nada se filtre.

Secciones: resumen, balance hídrico por día, serie de humedad con banda de umbral, unidades de
manejo, **procedencia del dato**, bitácora y ficha técnica.

La de procedencia es la que responde al jurado: por cada magnitud dice si es medida, calculada,
pronosticada o **no disponible**, y con qué instrumento. Las que no tienen sensor salen como "No
disponible" en vez de esconderse.

Verificado en tema claro, oscuro y a 375 px: sin desbordamiento lateral, las cuatro tablas
scrollean dentro de su contenedor.

### Sin resolver, y son tuyos

| Dato | Para qué | Cómo se consigue |
|---|---|---|
| Caudal de la bomba (L/min) | Lámina aplicada, m³, pesos, eficiencia | Bombear a una taza medidora 60 s y anotar |
| `area_ha` de la Parcela 1 | Litros de **esta** parcela, no por hectárea | Capturarlo en la pantalla de Parcela |
| Etapa del cultivo | Afina el Kc; hoy se usa la intermedia | Capturarlo en la pantalla de Parcela |

### Trampa nueva de operación

El servidor de la app corría con `next start`, no con `next dev`. **Una ruta nueva no aparece
hasta que se reconstruye**: `npm run build` y reiniciar. Perdí un rato buscando un 404 que no
era del código.

---

## 7. La ionización — el hueco en el centro del producto

Levantado el 6 de septiembre de 2026, a raíz de una pregunta del usuario.

El sistema se llama IonDroplet y la ionización es lo que le da nombre. **Es también lo menos
instrumentado de todo el sistema.** Cinco hechos verificados:

1. **`/api/esp/data` recibe `ionizador` y lo descarta.** La variable se destructura en la
   línea del handler y **no se lee en ninguna parte del archivo** (verificado: aparece 3 veces
   en `server.js`, dos son comentarios). Aunque el firmware reportara, el backend lo tira.
   A diferencia del GPS, aquí **la puerta no está abierta**.
2. **Nada mide el efecto.** No hay ORP —el potencial redox en mV, que es la magnitud estándar
   del agua ionizada—, ni pH, ni conductividad. El sistema no tiene una sola evidencia de que
   la ionización sirva.
3. **Ionización y riego son independientes.** Si el producto es riego con agua ionizada, el
   ionizador debería estar encendido mientras corre la bomba. Nadie lo verificaba.
4. **`ionization_log` tiene 4 filas**, todas del 6 de septiembre a las 05:26 con un segundo
   entre cada una. Son pruebas. **No hay un solo uso real registrado.**
5. **El panel de operación la omitía por completo.** Cero menciones en la primera versión.

### Lo que se hizo, sin hardware

- **Cifra nueva: "Riego con ionización (%)"** — qué porcentaje del tiempo de bomba ocurrió con
  el ionizador encendido. Sale del **solape de intervalos de `action_log`**, sin ningún sensor
  nuevo. Verificado con un caso construido: riego de 6 s, ionización cubriendo 3 s → **50%**,
  calculado igual por el panel y por una comprobación independiente.
- **Cifra nueva: "Ionización 7 d"** — eventos y tiempo acumulado.
- **Bloque "Alcance de la medición de ionización"** en el panel, que dice los cuatro límites de
  arriba con esas palabras.
- **Tres filas nuevas en la tabla de procedencia**: estado del ionizador (*solicitada, sin
  confirmación*), ORP y pH/conductividad (*no disponible*).

### Lo que sigue necesitando hardware

| Qué | Para qué | Nota |
|---|---|---|
| Sensor de corriente en el ionizador | Confirmar que encendió de verdad | Barato. También hay que **persistir el campo `ionizador`**, que hoy se descarta |
| **Sonda ORP (mV)** | **Lo único que evidenciaría que la ionización hace algo** | Es la medida estándar del agua ionizada |
| pH y conductividad | Completar la caracterización del agua | Se comparte con fertirriego |

**Recomendación:** si algún día se compra un solo sensor, discutir seriamente si va antes el
**ORP** que el caudalímetro. El caudalímetro da litros y pesos; el ORP defiende el nombre del
producto. La pregunta *"¿cómo saben que la ionización sirve?"* hoy no tiene respuesta.

---

## 8. B1 — Fertirriego, entregado el 9 de septiembre de 2026

El requerimiento del jurado que menos dependía de hardware. Sirve desde el primer día con
captura a mano.

### Backend, todo aditivo

Tres tablas nuevas y sus cuatro índices. **Nada existente se tocó.**

- `eventos_fertirriego` — fecha, duración, volumen, CE, pH, **etapa**, operador, notas
- `nutrientes_aplicados` — una fila por nutriente del evento
- `lecturas_solucion` — **vacía a propósito**, lista para el día que haya sonda de CE y pH en
  línea. Nadie la escribe y ninguna pantalla la enseña: no se inventa una medición.

Cuatro endpoints nuevos bajo `/api/fertirriego`: `POST` para capturar, `GET` para el historial,
`GET /resumen` para los acumulados, y `DELETE /:id` para corregir una captura equivocada.

**Los nutrientes y las unidades se validan contra una lista.** Sin eso, el mismo nutriente entra
como `N`, `n`, `nitrogeno` y `Nitrógeno`, y ningún resumen cuadra nunca. Probado: rechaza
nutriente inventado, unidad inventada, pH fuera de 0-14 y captura sin nutrientes.

### La decisión de diseño que da el valor

**Cada evento congela la etapa del cultivo en el momento de aplicar.** Dentro de tres meses la
parcela va a estar en otra etapa y el registro va a seguir diciendo en cuál se aplicó. Eso es lo
que un cuaderno no hace, y es lo que permite cruzar dosis contra fenología.

### Frontend

- `lib/nutrientes.ts` — catálogo con nombre completo primero ("Nitrógeno", no "N")
- `hooks/use-fertirriego.ts`
- `components/fertirriego-form.tsx` — los tres de siempre a la vista, los otros nueve detrás de
  un botón. **CE y pH escondidos tras "Tengo medidor de agua"**: hacen falta un aparato que casi
  nadie tiene, y a quien no lo tiene no le estorban ni lo hacen sentir que le falta llenar algo.
- `app/fertirriego/page.tsx` — se entra desde Parcela, como a Plagas
- Sección nueva en el panel de operación, con tabla de eventos y acumulados por nutriente

### Honestidad, como siempre

Si no se capturó el volumen, **no se calcula la concentración**. La pantalla dice "no puedo
decirte en qué concentración quedó" en vez de estimarla a partir de los eventos que sí lo tienen.

### Verificado

Captura hecha **desde la interfaz**, no por API: 15 kg de nitrógeno y 9 kg de potasio en 1,200 L.
Apareció en el resumen, en el historial y en el panel de operación. Validación probada en
pantalla. Cero errores de consola. Móvil a 375 px sin desbordamiento. Los datos de prueba se
borraron: las tres tablas quedaron en 0 y `action_log` con la única fila real que había.

### Corrección sobre los índices de A1

Te dije que el costo era 7% más lento al escribir. **También cuestan disco:** la base pasó de
1.5 MB a 4.9 MB con las mismas 36,307 lecturas. Los 3.3 MB son los seis índices. En una laptop
da igual; a escala de municipio hay que tenerlo en la cuenta.
