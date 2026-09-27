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
