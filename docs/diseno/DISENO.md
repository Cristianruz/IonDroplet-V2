# IonDroplet — Documento de Diseño del Frontend

> Este documento es la fuente de verdad del rediseño. Primero se decide aquí y en
> Claude Design; el código se escribe hasta el final.

## 1. Contexto

IonDroplet es un sistema IoT de riego agrícola con agua ionizada (InnovaTecNM 2026).
Hardware real: ESP32/ESP8266 con sensor de humedad de suelo y bomba de riego,
conectados a un backend Node/Express + SQLite que **no se modifica** (regla absoluta:
la bomba debe seguir funcionando).

## 2. Usuarios

| Usuario | Qué necesita | Implicación de diseño |
|---|---|---|
| **Agricultor 45–55 años** (usuario principal) | Saber si su tierra está bien y regar sin pensar | Textos grandes (base ≥18px), lenguaje llano sin tecnicismos, semáforo de color, UNA acción principal por pantalla |
| **Jueces del concurso** (demo en vivo) | Ver que es real y se ve profesional | Datos reales visibles, estados claros, diseño pulido, cero elementos simulados |
| **Equipo** (Cristian + compañero) | Mantenerlo fácil | Pocos componentes, tokens centralizados |

## 3. Principios (en orden de prioridad)

1. **Se entiende a 2 metros**: el dato clave (humedad) se lee desde lejos, con color.
2. **Lenguaje de rancho, no de ingeniero**: "TIERRA SECA", no "humedad subóptima";
   "Yo decido", no "modo manual".
3. **Una acción grande por tarjeta**: botones de mínimo 60px de alto, imposibles de fallar.
4. **Nunca mentir**: solo datos reales del sensor. Si no hay dato, se dice claramente.
5. **El estado del riego siempre visible**: si está regando, se nota sin buscar.

## 4. Pantallas

### 4.1 Dashboard (pantalla única del MVP)
- **Encabezado**: logo + nombre + chip de conexión (verde "Sistema conectado" / rojo "Sin conexión").
- **Tarjeta Humedad** (hero): número gigante con %, etiqueta de estado con semáforo,
  frase explicativa, barra de progreso.
- **Tarjeta Riego**: banda de estado (REGANDO AHORA con animación / SIN REGAR),
  selector "¿Quién decide cuándo regar?" (Solo automático / Yo decido),
  botón gigante REGAR AHORA / DETENER RIEGO en modo manual.
- **Gráfica 24 h**: línea de humedad, un solo tono azul, tooltip al tocar.
- **Tarjeta Ionización**: explicación de una línea + botón encender/apagar.

### 4.2 Futuras (fases del plan)
- Parcelas (comparación), Recomendaciones de riego por día, Configuración de umbral.

## 5. Semáforo de humedad

| Rango | Etiqueta | Color | Mensaje |
|---|---|---|---|
| < 40% | TIERRA SECA | Ámbar `#B45309` | "Le falta agua a tu tierra" |
| 40–75% | HUMEDAD BIEN | Verde `#2E7D32` | "Tu tierra está en buen punto" |
| > 75% | MUY HÚMEDA | Azul `#0277BD` | "Tu tierra tiene agua de sobra" |

(El umbral de 40% coincide con el que usa el backend para el riego automático.)

## 6. Tokens de diseño

### Color
| Token | Valor | Uso |
|---|---|---|
| `--fondo` | `#F6F7F4` | Fondo general (verde-gris muy claro) |
| `--tarjeta` | `#FFFFFF` | Superficies |
| `--tinta` | `#1A2E1A` | Texto principal |
| `--tinta-suave` | `#5C6B5C` | Texto secundario |
| `--verde` | `#2E7D32` | Marca, positivo, botón activo |
| `--verde-fuerte` | `#1B5E20` | Bordes/hover del verde |
| `--agua` | `#0277BD` | Riego, humedad, gráfica |
| `--alerta` | `#B45309` | Tierra seca, advertencias |
| `--peligro` | `#B91C1C` | Detener, sin conexión |
| `--oro` | `#B8860B` | Ionización |

### Tipografía
- Familia: `system-ui` (sin fuentes externas: debe funcionar sin internet en el campo).
- Base: **18px**. Dato hero: **96px/800**. Título de tarjeta: **26px/600**.
  Cuerpo: **20px/400**. Botones: **24px/700**. Etiqueta de estado: **30px/800**.

### Forma y espacio
- Radios: tarjetas 24px, botones 16px, chips pill.
- Sombra: sutil (`0 1px 3px rgba(0,0,0,.06)`), borde `1px rgba(0,0,0,.05)`.
- Espaciado entre tarjetas: 24px. Padding de tarjeta: 32px.
- Botones: alto mínimo 60px; área táctil generosa (se usa con dedos con tierra).

## 7. Estados del sistema (todos deben diseñarse)

1. **Conectado + dato fresco** — todo normal.
2. **Conectado + sensor callado >2 min** — advertencia ámbar en la tarjeta de humedad.
3. **Sin conexión al backend** — banner rojo con instrucción simple ("prende la computadora del riego").
4. **Regando** — banda azul pulsante REGANDO AHORA.
5. **Sin datos todavía** (BD vacía) — "Esperando al sensor…".

## 8. Contrato de datos (NO SE TOCA el backend)

| Endpoint | Uso en el front |
|---|---|
| `GET /api/sensors/latest` | Humedad actual + timestamp (UTC de SQLite) |
| `GET /api/sensors/history?hours=24` | Gráfica |
| `GET /api/esp/status` | `{autoMode, pumpState, espIp}` — estado real de la bomba |
| `POST /api/esp/control` | Body `{bomba: 0|1, autoMode: bool}` — idéntico a la V1 |
| `POST /api/ionization/toggle` | Body `{state: bool}` |

## 9. Restricciones técnicas

- Next.js + Tailwind, UI 100% en español.
- Sin fuentes/CDNs externos (demo puede correr sin internet).
- Solo mostrar datos reales; nada simulado con Math.random.
- Los timestamps de SQLite llegan en UTC: parsear con sufijo `Z`.
