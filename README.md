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

## Pendientes (plan InnovaTecNM 2026)

- Fase 0: tabla `parcelas` (requiere endpoint nuevo **aditivo** en el backend)
- Fase 2: recomendaciones de riego por días
- Fase 4: avisos por WhatsApp (Twilio Sandbox)
- Fase 5: comparación entre parcelas
