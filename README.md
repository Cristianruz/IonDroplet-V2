# IonDroplet V2 — Frontend nuevo

Rediseño desde cero del dashboard de IonDroplet, pensado para agricultores de 45–50 años:
textos grandes, lenguaje simple, botones enormes y solo la información que importa.

## Regla de oro de este proyecto

**Este repositorio es SOLO frontend.** El backend (`iondroplet-backend/server.js` del
[repo principal](https://github.com/Cristianruz/IonDroplet)), la comunicación con los
ESP32/ESP8266 y la base de datos `iondroplet.db` **no se tocan**. Este front consume
exactamente los mismos endpoints que la versión anterior:

| Endpoint | Uso |
|---|---|
| `GET /api/sensors/latest` | Humedad actual (dato real del ESP32) |
| `GET /api/sensors/history?hours=24` | Gráfica de las últimas 24 h |
| `GET /api/esp/status` | Estado de la bomba y modo automático |
| `POST /api/esp/control` | Regar / detener / cambiar modo (idéntico a la V1) |
| `POST /api/ionization/toggle` | Encender/apagar ionización |

## Quién puede entrar (20 sep 2026)

No se pide cuenta: cualquiera que abra la app la ve y puede operarla. Sirve para enseñar el
sistema sin repartir accesos. Se vuelve a cerrar con `REQUIERE_LOGIN=si` en el `.env` del
backend, y **hay que hacerlo antes de exponerla a internet**.

Lo único cerrado es lo que llama a Claude (asistente, análisis, consejo, foto y el agente):
pide la llave del dueño, `CLAVE_DUENO` del `.env`, que se pega una sola vez en
**Ajustes → Opciones del técnico** en cada aparato del dueño. Sin ella responde 403 y la
pantalla lo explica en vez de fallar.

La app le pide la API a su misma dirección y Next la reenvía a `BACKEND_URL`
(por omisión `http://localhost:3001`), así que no hace falta abrir el 3001 ni pelear con CORS.

## Diseño (1 oct 2026)

Los colores salen del póster: fondo crema, texto azul marino y un solo color de acción, el
turquesa del logo (`--acento`). El verde ya no adorna: solo dice "está bien" (`--ok`); el
ámbar dice "ojo" y el rojo "peligro". Tarjetas blancas con un filo fino, sin vidrio ni
degradados, y la letra es Figtree, empaquetada con la app para que funcione sin internet.

- **Inicio** contesta una pregunta: ¿cómo está mi cultivo? Una tarjeta con el medidor, una
  frase y el botón de regar; debajo el clima de la semana y tres accesos. Lo detallado queda
  en "Ver más detalles".
- **Bienvenida y guía rápida** (`components/ui/guia-inicio.tsx`): sale la primera vez, dice
  qué es IonDroplet y enseña cuatro pasos. Se vuelve a abrir con el "?" de Inicio o desde Ajustes.
- Los estados van en cápsula teñida (`.capsula`) y las listas de acciones en `ListaEnlaces`.

## Dos copias de la misma app (1 oct 2026)

| Dónde | Qué es | Cómo se prende |
|---|---|---|
| Vercel (público) | **Demostración.** Datos simulados en el navegador de cada visita; no hay bomba ni backend detrás. | Variable `NEXT_PUBLIC_DEMO=si` en Vercel |
| La computadora del riego | **El sistema real**, con el ESP32 y la base. Solo en esta red. | `INICIAR_SISTEMA.bat`, sin esa variable |

En modo demostración `apiFetch` no sale a la red: contesta `lib/demo/`, que simula la humedad,
los riegos automáticos al cruzar el punto de riego, 30 días de historial, alertas, fertirriego y
las decisiones del agente. Lo que en el sistema real hace la IA (consejos, análisis, chat y
diagnóstico por foto) son textos de ejemplo armados con esos datos; el reporte de la foto dice
que es un ejemplo. Cada visita tiene su propio sistema, que se borra al cerrar la pestaña.
Aunque `BACKEND_URL` siguiera puesta en Vercel, `/api` contesta 404 en modo demostración.

**Para verla trabajar** (el jurado la abre en su propio celular): el botón **Pruébalo** de la
franja de arriba abre tres escenarios (`lib/demo/escenarios.ts`):

- **Secar la tierra**: la humedad queda abajo del punto de riego y el automático riega solo en
  segundos; un riego completo de la demostración dura menos de un minuto.
- **Desconectar el sensor**: la última lectura envejece, sale el aviso y el automático no decide.
  El mismo botón lo vuelve a conectar.
- **Preguntar por qué regó**: abre el asistente con la pregunta, que contesta con los números del
  último riego.

Abajo de la hoja está **Empezar de nuevo**.

**En una pantalla ancha** (1024 px o más) la demostración se abre en `/presentacion`: la app va
adentro de un celular de 390 px y al lado hay un panel con los mismos escenarios, una línea que
narra en vivo lo que pasa en la tierra y un código QR para abrirla en el celular. Cabe completa en
1366 × 768, la laptop típica del proyector. Para verla sin el marco: `?marco=no`. Para que el
celular pueda enmarcarla, en modo demostración la cabecera es `X-Frame-Options: SAMEORIGIN`; la app
real se queda en `DENY`.

Para verla en esta computadora sin pisar la app real (`.next`):

```bash
NEXT_PUBLIC_DEMO=si NEXT_DIST_DIR=.next-demo npx next dev -p 3007
```

## Cómo correrlo

1. Arranca el backend de siempre (el del repo principal, puerto 3001).
2. Aquí:
   ```bash
   npm install
   npm run dev
   ```
3. Abre http://localhost:3000

Si el backend corre en otra dirección, copia `.env.example` a `.env.local` y ajusta
`NEXT_PUBLIC_API_URL`.

## Qué cambia respecto a la V1

- Solo se muestra el **dato real** (humedad del ESP32). Se quitaron los valores simulados
  de temperatura/voltaje/corriente que confundían en las demos.
- El estado de la bomba se lee del backend (`/api/esp/status`), así el dashboard refleja
  también los riegos que dispara el modo automático.
- UX para agricultores: número de humedad gigante con semáforo de color, botón único de
  regar, modo "Solo (automático) / Yo decido" en lenguaje llano.
- Cero dependencias pesadas: Next.js + Tailwind + lucide-react. La gráfica es SVG puro.

## Pendientes (28 sep 2026)

El detalle y la bitácora están en [docs/PENDIENTES.md](docs/PENDIENTES.md). Lo que falta:

- **Avisos por WhatsApp.** Espera la verificación de negocio con Meta.
- **Hidroponía.** Pospuesta. Necesita sensores de CE, pH, temperatura del agua y nivel del
  tanque; riego por ciclos de tiempo; y medir primero qué le hace la ionización a la solución.
- **Hardware.** Sensor a 5 V y calibrado (hoy marca 45 % fijo), y firmware nuevo de los ESP.
- **Revisión de un agrónomo** a la guía de cultivos y al catálogo de plagas.

## Nombres en pantalla

El agricultor ve **"Cultivo"**: la pestaña, los títulos, los avisos y lo que dice la IA. Por
dentro todo se sigue llamando `parcela` (tabla `parcelas`, `parcela_id`, `components/parcela`),
para no migrar la base. La pantalla vive en `/cultivo` y `/parcela` redirige ahí.

## Cómo está organizado (24 sep 2026)

```
app/            una carpeta por pantalla (Next.js app router)
  diagnostico/  diagnóstico por foto
components/
  ui/           piezas de toda la app: barra de abajo, esqueletos, animaciones, sesión
  riego/        humedad, bomba, punto de riego, gráficas, fertirriego, aparatos
  parcela/      ficha, formulario, clima y la vista 3D (parcela/3d)
  plagas/       tarjetas del catálogo de plagas
  diagnostico/  fotos, reporte y la entrada desde otras pantallas
  ia/           consejo, asistente en burbuja y agente
hooks/          datos y llamadas a la API, uno por tema
lib/            lógica pura y catálogos, con sus pruebas (*.test.ts)
docs/           análisis, plan, pendientes, proyecto, setup y diseño
public/         íconos y el service worker
```

En el backend (repo aparte) los módulos van por tema: `ia/` (agente agrónomo y
diagnóstico por foto), `agronomia/` (guía de cultivos), `riego/` (frenos) y
`seguridad/`. `server.js` sigue en la raíz.

## Diagnóstico por foto

Pantalla `/diagnostico`, a la que se entra desde Plagas o desde la ficha del cultivo. Se
escoge el cultivo u "Otra planta", qué parte se fotografía, y se mandan hasta 3 fotos, que el
celular encoge a 2048 px. Sirve para cualquier planta, no solo el nogal.

El backend (`ia/diagnostico-foto.js`) arma el contexto desde la base (cultivo, etapa, guía,
humedad del cultivo y el catálogo de plagas como referencia) y le pide a Claude un reporte
con esquema fijo:
- si la foto sirve;
- qué se observa;
- de 1 a 3 causas posibles, con lo que las apoya, lo que no cuadra y cómo confirmarlas en campo;
- severidad, urgencia y relación con el riego;
- qué hacer ya y cuándo llamar a un técnico.

Tarda de 30 a 90 segundos, porque analiza a fondo. Por eso Next reenvía al backend con un
límite de 3 minutos (`proxyTimeout` en `next.config.mjs`). Es una función del dueño: pide la
llave en Ajustes.
