# Pendientes de IonDroplet V2

Estado al 3 de septiembre de 2026. Fases terminadas: **0, 1, 2, 3 y 4**. Faltan: 5 y 6.

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
| 4.3 | `action_log` **crece sin límite** | Sin purga. Con años de uso habrá que archivar o borrar lo viejo. |
| 4.12 | El `package-lock.json` del backend todavía lista `pg` | No se corrió `npm install` a propósito: reinstalar recompilaría `serialport` y `sqlite3`, que son nativos, justo antes de una demo. |

---

## 3. Cosas a medias que dependen de fases siguientes

| # | Dónde | Qué falta |
|---|---|---|
| 3.2 | Ajustes | Falta el enlace a **Dispositivos** (Fase 6). Los wireframes dicen que se llega desde ahí, no desde la barra. |
| 3.3 | Plagas | Falta el botón **"Preguntar"**, que debe abrir el asistente de la Fase 5 con la plaga ya escrita. No se puso un botón que no lleve a ningún lado. |
| 3.4 | Asistente | No es destino de la barra en los wireframes. Falta decidir desde dónde se llega. (Plagas ya se resolvió: se entra desde la pantalla de Parcela, porque dependen del cultivo.) |
| 3.5 | Plagas | El catálogo es una primera versión escrita a mano. Convendría que un técnico agrónomo lo revise antes de la demo, sobre todo las temporadas por mes. |

---

## 4. Deuda técnica

| # | Qué | Por qué importa |
|---|---|---|
| 4.1 | Un riego que empieza y **no alcanza a cerrarse** (porque se reinicia el backend) se queda sin duración | Es a propósito, y es lo correcto: nunca se le inventa una duración. La cifra "de agua" avisa cuántos riegos quedaron sin cerrar en vez de sumar de menos en silencio. Con el hardware actual el tiempo real es inaverigable. |
| 4.2 | La ionización se registra por **lo que se pide**, no por lo que el ionizador confirma | El aparato no reporta su estado. Mismo problema que 4.10. |
| 4.6 | El cultivo se guardará como `id` (`"nogal"`) en vez del nombre (`"Nogal"`) la próxima vez que se guarde la parcela | La lectura acepta las dos formas. Es la normalización que la Fase 4 necesita. |
| 4.7 | Las gráficas **submuestrean** (240 puntos en Inicio, 720 en Historial) | Lo hace el servidor con el parámetro `max`. Son lecturas reales, una de cada N, nunca promedios. Las cifras exactas salen aparte de `/api/sensors/resumen`, calculadas sobre todas. |
| 4.15 | La pantalla de Historial pide la bitácora **dos veces** | Una para los puntos verdes de la gráfica y otra para la lista. Son pocos KB, pero se podrían unir en una sola petición. |
| 4.10 | El estado del ionizador vive en memoria del navegador | Se pierde al recargar. No hay endpoint que devuelva el estado real; `devices` está vacía y solo tiene `id` e `ionization_on`. La Fase 6 va a necesitar campos ahí. |

### Ya resueltos

- ~~Aviso de "INICIAR_SISTEMA.bat" duplicado~~ → ahora es `components/aviso-sin-conexion.tsx`.
- ~~Mezcla de tú y usted~~ → todo en **tú**, como los wireframes.
- ~~Sin `<title>` por pantalla~~ → cada ruta tiene su `layout.tsx` con su título.
- ~~"Empezó a regar" para un riego en curso~~ → dice **"Regando ahora"** cuando la bomba sigue prendida.
- ~~`use-parcela` no leía por `id`~~ → ahora lee por `id` en cuanto sabe cuál es, y vuelve a la lista si desaparece.
- ~~Faltaban los puntos verdes de riego en la gráfica~~ → **hechos**, con su leyenda.

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

## 5. Fases que faltan

**Fase 5 — Asistente.** `POST /api/chat` nuevo (sin tocar `/api/ai/analyze`) y
`app/asistente/page.tsx`. El contexto lo arma el backend con la última lectura, el estado del
ESP32 y la parcela; el front solo manda la pregunta. Respuesta en español simple, máximo tres
frases. Si no hay dato del sensor, la IA debe decirlo en vez de suponer.

**Fase 5b — La IA propone el punto de riego.** Decidido el 3 de septiembre de 2026. La IA
analiza cultivo, etapa, la humedad de los últimos días y la temporada, y **sugiere** un punto
de riego con su razón en una frase. Un botón grande lo aplica; queda registrado con
`origen: 'ia'`, que en la bitácora se lee "lo recomendó el asistente". **Nunca cambia la bomba
sin que alguien lo acepte.**

**Fase 6 — Dispositivos.** `app/dispositivos/page.tsx`, al que se llega desde Ajustes.
Verde si respondió hace menos de 2 min, ámbar si más, rojo si nunca, calculado del timestamp
de la última lectura y no de un campo propio. Un icono por aparato en una constante de la
pantalla. El botón "CÓMO REVISARLO" abre 3–4 pasos en lenguaje llano, sin códigos de error.
Puede necesitar campos nuevos en `devices` (cambio aditivo, con permiso).
