# Prompt para Claude Design — IonDroplet V2

> Copiar desde la línea de abajo hasta el final y pegarlo en Claude Design.

---

Eres el diseñador principal de **IonDroplet**, un sistema de riego agrícola con agua ionizada
(InnovaTecNM 2026, TecNM Campus Chihuahua II). Necesito el sistema de diseño completo y las
pantallas clave, **incluida una vista 3D de las parcelas donde se vea cómo va creciendo el cultivo**.

## 1. El producto en una frase

Un sensor de humedad en la tierra + un ESP32 que prende una bomba + una app en el celular que le
dice al agricultor si su tierra está bien, cuándo regar y por qué.

## 2. Para quién

| Usuario | Dónde lo usa | Qué necesita |
|---|---|---|
| **Agricultor de 45-55 años** (principal) | Celular, en el campo, bajo el sol, con guantes | Una decisión: ¿riego o no? Texto grande, lenguaje de rancho ("Le falta agua a tu tierra", no "humedad subóptima") |
| **Jurado del concurso / municipio** | Monitor, demo en vivo | Ver que es real, profesional y que los datos son verdaderos |

## 3. La regla que no se rompe

**Nunca se muestra un número inventado como si fuera medido.** Cada dato lleva su procedencia:
*medido*, *calculado*, *pronosticado* o *no disponible*. Si falta un dato, el diseño dice que
falta, con un estado vacío digno — no se rellena.

Esto aplica sobre todo a la vista 3D (ver sección 7).

## 4. Qué entregar

1. **Moodboard y dirección visual** — 2 propuestas cortas antes de pulir. La app hoy usa
   *glassmorphism* sobre fondo verde-gris; puedes mantenerlo o proponer algo mejor, pero tiene
   que leerse a pleno sol.
2. **Color** — paleta con tokens, en tema claro y oscuro, con contraste AA verificado.
3. **Tipografía** — escala completa.
4. **Wireframes** (baja fidelidad) de las pantallas de la sección 6.
5. **Mockups** (alta fidelidad) de: Inicio, Parcela 3D, Análisis.
6. **Animaciones y microinteracciones** — especificadas (duración, curva, qué las dispara).
7. **Vista 3D de parcelas y crecimiento del cultivo** — la pieza estrella.
8. **Biblioteca de componentes** con todos sus estados.

## 5. Sistema visual

### Color (punto de partida, se puede refinar)

| Token | Valor | Uso |
|---|---|---|
| `--fondo` | `#F6F7F4` | Fondo general |
| `--tinta` | `#1A2E1A` | Texto principal |
| `--tinta-suave` | `#5C6B5C` | Texto secundario |
| `--verde` | `#2E7D32` | Marca, estado bien |
| `--agua` | `#0277BD` | Riego, humedad, gráficas |
| `--alerta` | `#B45309` | Tierra seca, advertencias |
| `--peligro` | `#B91C1C` | Detener, sin conexión, crítico |
| `--oro` | `#B8860B` | Ionización |

**Semáforo de humedad** (el corazón de la app):

| Rango | Etiqueta | Color | Mensaje |
|---|---|---|---|
| Bajo el punto de riego | Tierra seca | Ámbar | "Le falta agua a tu tierra" |
| En rango | Humedad bien | Verde | "Tu tierra está en buen punto" |
| Muy arriba | Muy húmeda | Azul | "Tu tierra tiene agua de sobra" |

El color **nunca va solo**: siempre acompañado de texto e icono (daltonismo, sol directo).

### Tipografía

- `system-ui` o una fuente que **se empaquete localmente** (la demo puede correr sin internet: nada
  de Google Fonts por CDN).
- Modo Campo: base ≥18 px, dato de humedad grande y legible a 2 metros, botones ≥60 px de alto.
- Modo Operación (`/operacion`, para el jurado): 13-14 px, tablas densas, vocabulario técnico.
- Números con cifras tabulares.

### Iconos

Lucide (vectorial). Emoji **sólo** como icono de catálogo: cultivos, plagas y aparatos.

## 6. Pantallas

Barra inferior con 5 destinos. Rutas:

| Ruta | Contenido |
|---|---|
| `/` Inicio | Humedad actual (hero), tarjeta de riego (Regando ahora / Sin regar, "¿Quién decide?" Automático / Yo decido, botón Regar ahora / Detener), clima, lo que va a pedir el cultivo esta semana, gráfica 24 h, ionización |
| `/parcela` | **Vista 3D del campo** + cultivo, etapa, superficie, caudal, punto de riego |
| `/analisis` | Lo que interpreta la IA: riesgos con su número, pronóstico, qué hacer, ionización |
| `/historial` | Serie de humedad y bitácora a 24 h / 7 d / 30 d |
| `/alertas` | Avisos con el dato que los disparó y quién los atendió |
| `/fertirriego` | Anotar nutrientes aplicados y acumulado |
| `/plagas` | Riesgo por temporada + foto de la hoja analizada por IA |
| `/dispositivos` | Estado de los 4 aparatos |
| `/asistente` | Chat (también como burbuja flotante en todas las pantallas) |
| `/ajustes` | Conexión, tema, aparatos, acceso al panel de operación |
| `/operacion` | Vista técnica densa para jurado |
| `/entrar` | Login con Google |

**Estados obligatorios en cada pantalla:** conectado con dato fresco · sensor callado (>5 min) ·
sin conexión al backend ("Prende la computadora del riego") · regando · sin datos todavía
("Esperando al sensor…") · cargando (esqueletos).

## 7. Vista 3D de parcelas y crecimiento — la pieza estrella

### Qué debe verse

Una **maqueta 3D isométrica, estilo diorama low-poly**, de la parcela del agricultor, que se pueda
girar con el dedo y hacer zoom:

- **El terreno** dividido en hileras (`num_hileras`) según el sistema de riego (`tipo_sistema`:
  goteo, aspersión, gravedad).
- **La tierra cambia de color con la humedad medida**: café claro agrietado cuando está seca,
  café oscuro cuando está bien, con brillo/charcos cuando está muy húmeda. Mismo semáforo de la
  sección 5.
- **La bomba y la tubería**: cuando está regando, el agua corre animada por las líneas y caen
  gotas (goteo) o arcos de agua (aspersión).
- **El ionizador**: partículas doradas sutiles en el agua cuando se le mandó encender.
- **El sensor** clavado en la tierra, con un pulso cada vez que llega una lectura; apagado y gris
  si está callado.
- **Las plantas**, modeladas por cultivo y por etapa (ver abajo).
- Ciclo de día/noche o cielo según el clima real (soleado, nublado, lluvia pronosticada).

### Crecimiento por etapas

Diseña el modelo de cada cultivo en **6 etapas**, que son las que maneja el sistema:

| Etapa | Qué significa para el riego |
|---|---|
| Siembra | Apenas va empezando, pide agua seguido y poquita |
| Crecimiento | Está echando hoja, es cuando más crece |
| Floración | Es cuando más agua pide |
| Fruto | Está llenando el fruto, no la dejes secar |
| Cosecha | Ya mero, se riega menos |
| Descanso | No pide casi agua |

Cultivos del catálogo: **nogal** (el de la parcela real hoy), chile, alfalfa, maíz, manzana,
frijol, avena, algodón y "otro" (planta genérica).

Prioridad: **nogal completo en las 6 etapas**; del resto, al menos chile y maíz. Nogal en
descanso = árbol sin hojas; en fruto = nueces verdes; etc.

Incluye una **línea de tiempo deslizable** abajo de la escena (Siembra → Descanso) con la etapa
actual marcada: al moverla, las plantas se transforman con una animación de crecimiento suave
(escala + aparición de hojas, flores y frutos). Al soltarla vuelve a la etapa real.

Cada estado de la planta además refleja la humedad: con tierra seca las hojas se ven ligeramente
caídas; al regar se recuperan.

### Honestidad del 3D (obligatorio)

El sistema **no mide el tamaño de la planta**. La etapa la **captura el agricultor** a mano. Por
eso:

- La escena lleva una etiqueta visible: *"Etapa: Floración — la anotaste tú"*.
- La línea de tiempo es **ilustrativa**: al moverla fuera de la etapa real debe decir
  *"Así se vería en Fruto"*, nunca presentarlo como pronóstico de fechas.
- Si la etapa no está capturada: plantas en gris translúcido + botón *"Dime en qué etapa va tu
  cultivo"*.
- Si falta superficie o caudal: el terreno se dibuja con proporción genérica y una pastilla
  *"Superficie sin capturar"*. No inventar hectáreas.
- El color de la tierra **sí** es dato medido: marcarlo como tal.
- El ionizador: la partícula dorada representa **la orden enviada**, no confirmación. Etiqueta:
  *"Se le pidió encender"*.
- Litros: cualquier cifra va como *"proyección a 1 ha, medida sobre prototipo"*.

### Varias parcelas

Vista de **mapa de campo** con varias parcelas lado a lado como fichas 3D, cada una con su cultivo,
color de tierra y un chip de estado. Tocar una hace zoom animado a su diorama. (Hoy hay una sola
parcela: diseña también el estado con una sola y un botón "Agregar parcela".)

### Restricciones técnicas del 3D

- Debe correr **en un celular de gama media** y sin internet: modelos low-poly ligeros, pocas
  texturas, preferencia por color plano y sombreado suave.
- Implementación objetivo: Next.js 15 + React 19. Proponer cómo construirlo (Three.js empaquetado
  local / CSS 3D / SVG isométrico) y justificar el peso.
- **Respaldo 2D**: ilustración isométrica estática para equipos lentos y para
  `prefers-reduced-motion`.
- Controles grandes para dedos con guantes: botones de girar y restablecer vista, no sólo gestos.

## 8. Animaciones

Especifica duración, curva y disparador de cada una. Todas se desactivan con
`prefers-reduced-motion`.

| Momento | Animación |
|---|---|
| Regando ahora | Banda azul con onda de agua que fluye; la gota del logo late |
| Llega una lectura nueva | El número de humedad cuenta hasta el nuevo valor; pulso en el sensor 3D |
| Cambio de semáforo | Transición de color de la tarjeta y de la tierra 3D (400-600 ms) |
| Regar ahora / Detener | Presión con respuesta táctil, confirmación clara del estado real de la bomba (no optimista) |
| Sin conexión | Banner que baja desde arriba, sin parpadeos alarmistas |
| Crecimiento por etapa | Morph de la planta: brote → hojas → flor → fruto |
| Ionización | Partículas doradas que suben lento |
| Carga | Esqueletos con brillo suave, nunca spinners eternos |
| Entre pantallas | Transición corta (150-250 ms), sin distraer |

Tono: **orgánico y tranquilo**, como agua y plantas. Nada de rebotes exagerados.

## 9. Componentes a documentar

Tarjeta · Botón (primario, secundario, peligro; normal, presionado, deshabilitado, cargando) ·
Pastilla/chip de estado · Pastilla de procedencia (medido / calculado / pronosticado / no
disponible) · Barra de humedad · Gráfica de línea · Fila de bitácora · Alerta (crítica,
atención, informativa) · Barra inferior · Burbuja de asistente · Selector de etapa · Escena 3D con
sus controles · Estados vacíos.

## 10. Lo que NO quiero

- Dashboards llenos de números decorativos o simulados.
- Jerga de ingeniería en el Modo Campo.
- Texto pequeño o gris claro que no se lea al sol.
- Un 3D bonito que mienta: si el dato no existe, la escena lo dice.
- Dependencias de CDN o fuentes externas.

Empieza por las 2 direcciones visuales y el diorama 3D del nogal en sus 6 etapas.
