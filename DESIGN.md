---
name: IonDroplet
description: "Calma: papel crema, tinta marina y un solo turquesa para actuar. Riego que se lee de un vistazo, bajo el sol."
colors:
  fondo: "#f6f4ef"
  tarjeta: "#ffffff"
  cristal-suave: "#f9f8f5"
  pista: "#eeebe4"
  tinta: "#13283d"
  tinta-suave: "#4a5a6a"
  etiqueta: "#5a6776"
  apagado: "#5c6977"
  borde: "#e5e1d8"
  acento: "#0b7393"
  acento-fuerte: "#075b75"
  acento-suave: "#e3f1f6"
  ok: "#26794a"
  ok-suave: "#e5f2ea"
  agua: "#2f6fd6"
  agua-suave: "#e7effb"
  alerta: "#a35c00"
  alerta-texto: "#8a4d00"
  fondo-alerta: "#fcf0dc"
  peligro: "#b42a1f"
  fondo-peligro: "#fbeae8"
  sobre-estado: "#ffffff"
  franja-demo-fondo: "#13283d"
  franja-demo-tinta: "#f6f4ef"
  bisel-telefono: "#13283d"
  escena-cielo: "#d8ebf3"
  escena-medido: "#11794a"
  escena-ojo: "#7a5004"
  escena-falta: "#3a4f45"
  escena-lluvia: "#1d4f8a"
  fondo-noche: "#0e1a26"
  tarjeta-noche: "#15232f"
  elevado-noche: "#1a2a38"
  pista-noche: "#22344a"
  tinta-noche: "#e9f0f6"
  tinta-suave-noche: "#b6c4d1"
  etiqueta-noche: "#9fb0c0"
  apagado-noche: "#93a4b5"
  borde-noche: "#27394c"
  acento-noche: "#4ec1df"
  acento-fuerte-noche: "#7dd3ea"
  acento-suave-noche: "rgba(78, 193, 223, .14)"
  ok-noche: "#5cc98a"
  agua-noche: "#78aaff"
  alerta-noche: "#f2b54a"
  peligro-noche: "#f27a70"
  sobre-estado-noche: "#0b1620"
  franja-demo-fondo-noche: "#1d3247"
  bisel-telefono-noche: "#050d15"
typography:
  display:
    fontFamily: "Figtree Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(2.25rem, 3.2vw, 3.1rem)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Figtree Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Figtree Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Figtree Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Figtree Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Figtree Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 650
    letterSpacing: "0.01em"
  dato:
    fontFamily: "Figtree Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "2.1rem"
    fontWeight: 750
    lineHeight: 1.05
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  dato-grande:
    fontFamily: "Figtree Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "56px"
    fontWeight: 750
    lineHeight: 0.9
    letterSpacing: "-0.045em"
    fontFeature: "tnum"
  title-lg:
    fontFamily: "Figtree Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 750
    letterSpacing: "-0.02em"
  lead:
    fontFamily: "Figtree Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.5
  op-titulo:
    fontFamily: "Figtree Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    letterSpacing: "-0.02em"
  op-kpi:
    fontFamily: "Figtree Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "23px"
    fontWeight: 700
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  op-eje:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "10px"
  op-texto:
    fontFamily: "Figtree Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "13.5px"
    lineHeight: 1.45
  op-etiqueta:
    fontFamily: "Figtree Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.045em"
  op-mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "11.5px"
    fontFeature: "tnum"
rounded:
  sm: "14px"
  md: "20px"
  hoja: "24px"
  pill: "999px"
  telefono: "56px"
  pantalla-telefono: "44px"
  segmento: "10px"
  barra: "4px"
spacing:
  pagina: "16px"
  pila: "16px"
  tarjeta: "18px"
  tarjeta-ancha: "22px"
  lista: "6px"
  franja: "11px 14px"
  toque: "44px"
  control: "48px"
components:
  button-primary:
    backgroundColor: "{colors.acento}"
    textColor: "{colors.sobre-estado}"
    typography: "{typography.title}"
    rounded: "{rounded.sm}"
    padding: "0 18px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.acento-fuerte}"
  button-secondary:
    backgroundColor: "{colors.tarjeta}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.sm}"
    padding: "0 18px"
    height: "48px"
  button-secondary-hover:
    backgroundColor: "{colors.cristal-suave}"
  button-subtle:
    backgroundColor: "transparent"
    textColor: "{colors.tinta-suave}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "40px"
  button-subtle-hover:
    backgroundColor: "{colors.pista}"
    textColor: "{colors.tinta}"
  card:
    backgroundColor: "{colors.tarjeta}"
    rounded: "{rounded.md}"
    padding: "{spacing.tarjeta}"
  list-row:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
    rounded: "{rounded.sm}"
    padding: "12px"
    height: "64px"
  list-row-en-curso:
    backgroundColor: "{colors.agua-suave}"
  icon-circle:
    backgroundColor: "{colors.acento-suave}"
    textColor: "{colors.acento}"
    rounded: "{rounded.pill}"
    size: "40px"
  capsule:
    textColor: "{colors.ok}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
  status-strip:
    textColor: "{colors.tinta}"
    rounded: "{rounded.sm}"
    padding: "{spacing.franja}"
  pill:
    backgroundColor: "{colors.tarjeta}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "42px"
  pill-selected:
    backgroundColor: "{colors.acento-suave}"
    textColor: "{colors.acento-fuerte}"
  field:
    backgroundColor: "{colors.tarjeta}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
    height: "48px"
  nav-tab:
    textColor: "{colors.tinta-suave}"
    height: "64px"
  nav-tab-active:
    backgroundColor: "{colors.acento-suave}"
    textColor: "{colors.acento-fuerte}"
    rounded: "{rounded.pill}"
  demo-banner:
    backgroundColor: "{colors.franja-demo-fondo}"
    textColor: "{colors.franja-demo-tinta}"
    height: "44px"
  demo-pill:
    backgroundColor: "{colors.franja-demo-tinta}"
    textColor: "{colors.franja-demo-fondo}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "32px"
  bottom-sheet:
    backgroundColor: "{colors.fondo}"
    rounded: "{rounded.hoja}"
    width: "520px"
  presenter-phone:
    backgroundColor: "{colors.bisel-telefono}"
    rounded: "{rounded.telefono}"
    padding: "12px"
    width: "414px"
---

# Design System: IonDroplet

## Overview

**Creative North Star: "Papel y tinta en el campo"**

IonDroplet se ve como una libreta limpia que alguien del campo lleva en la mano: fondo crema liso, tarjetas blancas con un filo fino y tinta azul marino. Nada compite por la atención salvo dos cosas: el estado del cultivo (dicho con un color que significa algo) y la única acción turquesa que el agricultor puede necesitar. Es un sistema pensado para un celular de gama media, a pleno sol, en manos de alguien de 45 a 50 años: letra base de 16 px, blancos táctiles de 44 a 64 px y contraste alto en los dos temas.

El sistema "calma" reemplazó al vidrio líquido anterior: sin degradados ni desenfoque detrás del texto, sin bloques sólidos de color para los estados. Los colores salen del póster de IonDroplet (crema, marino, turquesa). El verde dejó de ser decoración y quedó solo para decir "está bien". El modo noche es un azul marino profundo, no negro, con los estados subidos de luz.

La demostración pública (Vercel) es una extensión del mismo mundo, no otro: agrega solo marino sólido, en la franja de arriba y en el bisel del celular de la vista de presentación, porque eso es "del sitio" y no de la app. La consola densa de Operación (`/operacion`) es un subsistema aparte, encerrado bajo su propio contenedor, con reglas propias de densidad.

**Key Characteristics:**
- Fondo crema plano, tarjetas blancas separadas por filo (1 px) y una sombra casi imperceptible.
- Un solo color de acción (turquesa) para botones, selección, íconos de sección y el asistente.
- Los estados (ok, agua, ojo, peligro) solo informan, siempre teñidos: fondo claro, filo del mismo color, letra fuerte.
- Tres radios: 14, 20 y píldora.
- Figtree variable en un solo tipo; jerarquía por peso (550 a 800) y tracking negativo en los tamaños grandes.
- Claro y oscuro con los mismos nombres de token; movimiento discreto que respeta `prefers-reduced-motion`.

## Colors

Una paleta de papel y tinta con un acento turquesa y un semáforo teñido que solo habla cuando hay algo que decir.

### Primary
- **Turquesa del Logo** (`acento`; noche `acento-noche`): botón primario, pestaña elegida, círculo de ícono de sección, globo del agricultor en el asistente, foco del teclado, cursor y controles nativos (`caret-color`, `accent-color`). Su versión **Turquesa Hondo** (`acento-fuerte`) es el hover del primario y el texto de lo seleccionado; **Turquesa Agua Clara** (`acento-suave`) es el fondo de lo seleccionado, del círculo de ícono y del recuadro del consejo en Inicio.

### Secondary
- **Azul Riego** (`agua`, `agua-suave`): el sistema está regando o hay agua de sobra. Renglón "en curso", cápsula "Regando", banda animada de la vista 3D y el botón de confirmar "Sí, regar".

### Tertiary
- **Verde Bien** (`ok`, `ok-suave`): el cultivo está bien. Nunca decora.
- **Ámbar Ojo** (`alerta`, `fondo-alerta`; `alerta-texto` para texto corrido sobre claro): falta agua, sensor sin responder, aviso de clima, contador de avisos sin ver.
- **Rojo Peligro** (`peligro`, `fondo-peligro`): peligro real y la acción "Detener riego".

### Neutral
- **Papel Crema** (`fondo`; noche `fondo-noche`): fondo de toda pantalla y de la hoja "Pruébalo". También es el `theme-color` del navegador.
- **Hoja Blanca** (`tarjeta`; noche `tarjeta-noche`): tarjetas, campos, barra inferior, paneles flotantes.
- **Crema Rozada** (`cristal-suave`; noche `elevado-noche`): hover de renglones y botones secundarios, celdas de pronóstico.
- **Surco** (`pista`; noche `pista-noche`): pistas de medidores, esqueletos de carga, segmentado, marcas.
- **Tinta Marina** (`tinta`; noche `tinta-noche`): todo el texto principal y la raya del punto de riego en el medidor.
- **Tinta Lavada** (`tinta-suave`): texto secundario y pestañas sin elegir. **Gris Etiqueta** (`etiqueta`) para etiquetas sobre un dato; **Gris Apagado** (`apagado`) para detalles, marcas de tiempo y placeholders.
- **Filo** (`borde`; noche `borde-noche`): el borde por defecto de todo elemento y las rayas entre renglones.
- **Sobre Estado** (`sobre-estado`): texto encima de un relleno de acento o de estado (blanco en claro, marino casi negro en noche).

### Demostración (solo con `NEXT_PUBLIC_DEMO=si`)
- **Marino de la Franja** (`franja-demo-fondo` con `franja-demo-tinta`; noche `franja-demo-fondo-noche` con `tinta-noche`): la franja de arriba y, invertidos, la píldora "Pruébalo".
- **Bisel** (`bisel-telefono`; noche `bisel-telefono-noche` con un filo de `borde-noche`): el marco del celular en la vista de presentación.

### Named Rules
**The One Teal Rule.** El turquesa es el único color de acción. Si algo se toca para hacer algo o está elegido, va en turquesa; si no, no lleva turquesa.

**The Color Means Something Rule.** Verde, azul, ámbar y rojo solo dicen un estado (bien, regando, ojo, peligro). Un ícono o un fondo nunca toman un color de estado por adorno.

**The Tint Not Block Rule.** Un estado se pinta teñido: fondo al 12-13 % del color sobre la tarjeta, filo al 25-28 %, letra o ícono en el color pleno. El relleno sólido de estado queda solo para un botón de acción confirmada ("Detener riego", "Sí, regar") y para el contador de avisos.

**The Navy Belongs To The Site Rule.** El marino sólido es del sitio de demostración (franja y bisel), en los dos temas; ninguna tarjeta, aviso ni botón de la app usa marino de fondo.

## Typography

**Display Font:** Figtree Variable (con system-ui, -apple-system, Segoe UI, Roboto, sans-serif)
**Body Font:** Figtree Variable
**Label/Mono Font:** ui-monospace (solo en la consola de Operación)

**Character:** Una sola sans humanista y redonda, amable sin ser infantil. La jerarquía sale del peso del eje variable (550, 650, 750, 800) y de un tracking que se cierra conforme crece el tamaño, no de mezclar familias.

### Hierarchy
- **Display** (800, clamp de 2.25 a 3.1 rem, 1.04): solo el H1 del panel de la vista de presentación, con `text-wrap: balance`. Se encoge a clamp(2.1rem, 2.9vw, 2.6rem) en pantallas de menos de 800 px de alto.
- **Headline** (750, 1.5 rem, 1.2): título de pantalla, uno por pantalla. La hoja "Pruébalo" lo usa a 1.3 rem.
- **Title** (700, 1.05 rem): encabezado de tarjeta o bloque. El nombre del cultivo en Inicio va a 1.125 rem bold.
- **Body** (400, 16 px, 1.5): texto corrido. Los detalles de tarjeta van a 15 px con interlineado ajustado; la bajada de la presentación a 1.125 rem con máximo de 50ch.
- **Label** (650, 0.8 rem, +0.01em, sin mayúsculas): la etiqueta chiquita encima de un dato.
- **Dato** (750, 2.1 rem, 1.05, cifras tabulares) y **Dato grande** (750, 56 px, 0.9): las cifras que se leen de lejos; la unidad va aparte a 650 y en tinta lavada.
- **Operación** (13.5 px de base; etiquetas de 11 px en mayúsculas con +0.045em; cifras y códigos en monoespaciada de 11.5 px): solo bajo el contenedor de Operación.

### Named Rules
**The One Title Rule.** Una pantalla, un título de pantalla. Lo demás son títulos de bloque.

**The Quiet Label Rule.** En la app "calma" las etiquetas van en minúscula y sentence case. Las mayúsculas espaciadas existen solo dentro de la consola de Operación.

**The Tabular Numbers Rule.** Toda cifra que cambia en vivo (humedad, KPIs, la franja que narra) usa cifras tabulares para no bailar.

## Layout

La app es una sola columna para el celular: contenedor de máximo 672 px (`max-w-2xl`), centrado, con 16 px a los lados y 16 px entre tarjetas. La barra de navegación queda fija abajo con el área segura del teléfono sumada. Inicio contesta una pregunta con una tarjeta principal; lo detallado queda tras "Ver más detalles". Las listas de acciones van como renglones dentro de una sola tarjeta (relleno de 6 px, renglones de 64 px mínimo), no como cuadros iguales en rejilla.

Las tarjetas tienen 18 px de relleno y 22 px desde 640 px de ancho. Los blancos táctiles son de 44 px como mínimo (botón redondo de ícono, píldora de la franja con área ampliada), 48 px en botones y campos, 64 px en renglones y pestañas.

La vista de presentación (solo demostración, desde 1024 px) es una rejilla: de 1024 a 1279 px, panel (340-500 px) y QR de 128 px en una columna con el celular al lado; desde 1280 px, tres columnas: panel (340-470 px), celular de 414 px de ancho con pantalla de 390 px y alto del viewport (600 a 868 px), y QR de 220 px. Los huecos se encogen con la altura (`clamp` sobre vh) para caber en una laptop de 768 px de alto sin desplazarse. Por debajo de 1024 px se apila: celular, panel, QR. La franja de demostración mide 44 px de alto y oculta su ícono por debajo de 400 px y su frase secundaria por debajo de 385 px.

La consola de Operación usa hasta 1400 px de ancho, rejillas automáticas de KPIs (mínimo 158 px) y fichas (mínimo 290 px) unidas por rayas de 1 px.

## Elevation & Depth

Casi plano. Lo que separa es el filo de 1 px, no la sombra: las tarjetas llevan una sombra doble apenas visible y en modo noche se reduce a una línea de 1 px. La sombra crece solo para lo que flota sobre todo lo demás (hojas, paneles, el celular de la presentación) y el turquesa lleva un halo propio. No hay desenfoque detrás del texto en ningún lugar.

### Shadow Vocabulary
- **Tarjeta** (`box-shadow: 0 1px 2px rgba(19, 40, 61, .04), 0 2px 10px rgba(19, 40, 61, .04)`; noche `0 1px 2px rgba(0, 0, 0, .25)`): toda tarjeta.
- **Botón** (`box-shadow: 0 1px 2px rgba(19, 40, 61, .06)`): botón secundario.
- **Acento** (`box-shadow: 0 2px 8px rgba(11, 115, 147, .22)`; noche `0 2px 10px rgba(78, 193, 223, .22)`): botón primario.
- **Elevada** (`box-shadow: 0 12px 40px rgba(19, 40, 61, .18)`; noche `0 14px 44px rgba(0, 0, 0, .5)`): hoja "Pruébalo", paneles y ventanas flotantes.
- **Segmento elegido** (`box-shadow: 0 1px 3px rgba(19, 40, 61, .12)`): la opción levantada dentro de un control segmentado.
- **Celular** (`box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 12px 24px -12px rgba(19,40,61,.35), 0 40px 80px -24px rgba(19,40,61,.45)`; noche `0 0 0 1px #27394c, 0 40px 80px -24px rgba(0,0,0,.7)`): solo el bisel de la presentación.
- **Velo** (`rgba(19, 40, 61, .42)`): fondo detrás de la hoja "Pruébalo".

### Named Rules
**The Edge Separates Rule.** Dos superficies se distinguen por el filo, no por la sombra. Si un elemento necesita sombra para verse, primero revisa el filo.

**The Only Floating Things Lift Rule.** La sombra elevada es para lo que tapa la pantalla (hoja, panel, ventana, el celular). Una tarjeta en el flujo nunca la usa.

## Shapes

Esquinas suaves y redondas, nunca rectas: 14 px para controles y piezas dentro de una tarjeta (botones, campos, renglones, franjas de estado, avisos, celdas), 20 px para tarjetas y ventanas, píldora completa para cápsulas, pastillas, marcas, la pestaña elegida y la píldora "Pruébalo". Los íconos de sección van en círculo de 40 px. Las piezas de demostración agregan radios propios de su objeto: 24 px arriba para la hoja que sube, 56 px para el bisel del celular y 44 px para su pantalla. Lo que falta o se puede agregar usa filo punteado (dato faltante, "Agregar cultivo"). Las rayas entre renglones son rectas y metidas 12 px de cada lado, separadas del renglón, para que no se curven con sus esquinas.

### Named Rules
**The Three Radii Rule.** 14, 20 y píldora. Un radio nuevo solo se justifica si dibuja un objeto real (el celular, la hoja).

## Components

### Buttons
Táctiles y claros: grandes, de un toque, con un solo protagonista por tarjeta.
- **Shape:** esquinas suaves (14 px), 48 px de alto, ícono de 16-17 px a 8 px del texto.
- **Primary:** relleno turquesa, texto sobre estado, peso 700, halo turquesa. Uno por bloque como máximo.
- **Hover / Focus:** hover (solo con puntero fino) baja a turquesa hondo; al presionar, escala a 0.98. Foco de teclado global: contorno turquesa de 2 px separado 2 px. Deshabilitado: 50 % de opacidad, sin sombra. Transiciones de 120 ms con `cubic-bezier(.2, .6, .35, 1)`.
- **Secondary:** blanco con filo y sombra de botón; hover a crema rozada. Es "Regar ahora" y "Mejor no".
- **Subtle:** transparente, tinta lavada, 40 px de alto, peso 650; hover sobre surco. Acciones de bajo peso ("Ver más detalles", "Empezar de nuevo") y, en círculo de 44 px, los botones de ícono del encabezado y de cerrar.
- **Acción de estado:** "Detener riego" en rojo peligro sólido y "Sí, regar" en azul riego sólido, siempre tras una confirmación o durante un riego manual.

### Chips
- **Cápsula de estado:** píldora teñida con el color del estado (13 % de fondo, 28 % de filo), punto de 8 px a la izquierda, 0.875 rem a 700. Cuando dice "Regando", solo late el punto y la letra se oscurece un cuarto hacia la tinta para pasar 4.5:1. La variante de nivel es más chica (0.75 rem) y sin punto.
- **Pastilla de selección:** píldora blanca con filo, 42 px de alto; elegida, se tiñe de turquesa agua clara con filo turquesa y texto turquesa hondo. Nunca un bloque sólido.
- **Chip de escena (3D):** píldora blanca casi opaca encima del cultivo en 3D, igual en los dos temas porque la escena siempre es clara. Por eso su letra no usa los tokens del tema sino los suyos, oscurecidos para pasar 4.5:1 sobre blanco: `escena-medido` (color de la tierra medido), `escena-ojo` (superficie sin capturar, ionizador), `escena-falta` (sin lectura) y `escena-lluvia` ("Lloviendo ahora: X mm", la lluvia que se ve es la del pronóstico de este momento).
- **Procedencia del dato:** píldora de 11 px que dice de dónde sale cada cifra: medido (verde), calculado (azul), pronosticado (ámbar), registrado (surco) y falta (punteada, transparente).

### Cards / Containers
- **Corner Style:** 20 px.
- **Background:** hoja blanca (noche: `tarjeta-noche`).
- **Shadow Strategy:** sombra de tarjeta (ver Elevation & Depth).
- **Border:** 1 px de filo.
- **Internal Padding:** 18 px; 22 px desde 640 px. Las tarjetas-lista usan 6 px.

### Inputs / Fields
- **Style:** blanco, filo de 1 px, 14 px de radio, 48 px de alto, texto de 1 rem; placeholder en gris apagado.
- **Focus:** el filo pasa a turquesa con un anillo de 3 px en turquesa agua clara.

### Navigation
- **Barra inferior:** fija, blanca, con filo arriba. Cinco destinos (cuatro sin conexión), cada uno de 64 px con ícono de 22 px y etiqueta de 12.5 px. Sin elegir: tinta lavada a 550. Elegida: la etiqueta pasa a turquesa hondo a 750, el ícono engrosa su trazo a 2.4 y se mete en una píldora teñida de 56 × 30 px. No se pinta la barra entera.
- **Renglón de lista (ListaEnlaces):** círculo de ícono turquesa, título de 16 px semibold, detalle de 14 px apagado y chevron. En hover, crema rozada. Cuando algo está pasando por ese renglón ("Regando"), se tiñe de azul agua suave, el círculo del ícono se vuelve blanco con ícono azul y el chevron se cambia por la cápsula de estado.

### Franja de estado
Aviso dentro de una tarjeta o panel (helada, lluvia, la narración en vivo de la presentación): 14 px de radio, fondo al 12 % del color sobre la tarjeta, filo al 25 %, texto en tinta a 600 y el ícono en el color del estado. El color llega por una sola variable desde el mismo token del semáforo.

### Medidor de humedad (Inicio)
Aro de 128 px y 12 px de grosor sobre surco, relleno en el color del estado, con una raya de tinta marina que marca el punto de riego. La cifra va al centro, en tabulares, con el "%" en tinta lavada. Junto a él, una frase grande de 21 px que dice cómo está el cultivo.

### Consejo del sistema
La lectura del sistema en una o dos frases. En Inicio va en un recuadro de 14 px teñido de turquesa agua clara con un ícono de destellos en turquesa; en otras pantallas, como línea en tinta lavada.

### Franja de demostración
Banda marina de 44 px a todo lo ancho (contenido a 672 px), "**Demostración** con datos de ejemplo" a 13.5 px y, a la derecha, la píldora "Pruébalo" con los colores invertidos (crema sobre marino), 32 px de alto con área de toque ampliada a 44 px; hover a blanco puro, presionada escala a 0.97. Dentro del celular de la presentación no se muestra.

### Hoja "Pruébalo"
Sube desde abajo sobre un velo marino al 42 %, con fondo crema, esquinas superiores de 24 px, sombra elevada, asa de 40 × 4 px, título de pantalla a 1.3 rem, botón de cerrar redondo de 44 px y los escenarios como renglones de lista. Máximo 520 px de ancho; Escape cierra y bloquea el desplazamiento de atrás. Entra en 340 ms.

### Vista de presentación
Panel (logo, H1 display, bajada, escenarios en lista, franja que narra en vivo), el celular con bisel marino y pantalla real de la app, y el código QR en marino sobre blanco con radio de 14 px (blanco también en modo noche, para que se escanee). El celular entra subiendo en 600 ms.

### Escena 3D del cultivo
Diorama de juguete en three.js (`components/parcela/3d/diorama.js`): bloque de tierra con terrones pintados arriba y el corte del suelo en capas a los lados, pasto seco y piedritas en la orilla, sombras suaves. Todo lo que se mueve sale de un dato; el movimiento explica el estado, no adorna.
- **Luz:** sigue la hora del teléfono. Sol que cruza de este a oeste, cálido y con sombras largas al amanecer y al atardecer, blanco al mediodía; de noche luz de luna, estrellas si está despejado, y los foquitos de la bomba y del sensor encendidos. De noche el color de la tierra se sigue distinguiendo.
- **Clima de ahora (Open-Meteo):** el código WMO pone las nubes (cielo gris y sombras de nubes que cruzan el campo con el viento), la lluvia (hilos inclinados por el viento, salpicones en la tierra, brillo de mojado en tierra y hojas, charcos si es fuerte), la niebla y los relámpagos de tormenta. El viento en km/h mece plantas y pasto con rachas.
- **Riego:** goteo, la gota se hincha en la boquilla, cae, salpica y deja una mancha oscura que crece mientras riega y se seca en un minuto; aspersión, cabezas que giran con tres chorros en arco hasta la tierra; gravedad, la lámina de agua avanza por el surco desde la bomba.
- **Verdad del dato:** el tono de la tierra sigue siendo la humedad medida; el agua de encima solo la oscurece hasta 13 % y le da brillo. La lluvia que se ve lo dice en un chip de escena.
- **Costo:** la lluvia y el pasto son un solo dibujo cada uno (InstancedMesh). Fuera de pantalla o con la pestaña oculta no se dibuja. Con movimiento reducido la escena queda quieta mostrando el mismo estado (lluvia, manchas, luz de la hora) y se redibuja cada minuto.

## Do's and Don'ts

### Do:
- **Do** usar el turquesa (`acento`) para lo único que se toca para actuar o lo que está elegido, y en ningún otro lugar.
- **Do** pintar todo estado teñido: fondo al 12-13 % del color, filo al 25-28 %, letra o ícono en el color pleno, con el color pasado por la variable `--c`.
- **Do** separar superficies con el filo de 1 px (`borde`) y dejar la sombra elevada para lo que flota sobre la pantalla.
- **Do** mantener los blancos táctiles en 44 px como mínimo, 48 px en botones y campos, 64 px en renglones.
- **Do** usar 14 px para controles, 20 px para tarjetas y píldora para chips; nada más sin un objeto real que lo pida.
- **Do** decir de dónde viene cada cifra (medido, calculado, pronosticado, registrado, falta) con la píldora de procedencia, y marcar lo que falta con filo punteado.
- **Do** dar a cada valor de color su par de modo noche con el mismo nombre de token, en `prefers-color-scheme` y en `[data-tema="oscuro"]`.
- **Do** usar cifras tabulares en todo número que cambia en vivo.
- **Do** ofrecer las acciones como renglones dentro de una sola tarjeta-lista con círculo de ícono, no como cuadros iguales en rejilla.

### Don't:
- **Don't** usar verde, azul, ámbar o rojo como adorno: solo dicen bien, regando, ojo o peligro.
- **Don't** pintar un estado como bloque sólido; el relleno sólido de estado es solo para un botón de acción confirmada y el contador de avisos.
- **Don't** poner degradados ni desenfoque detrás del texto; los únicos degradados son señales de movimiento (la banda de riego y el brillo del esqueleto de carga).
- **Don't** usar marino sólido de fondo dentro de la app: es de la franja de demostración y del bisel del celular.
- **Don't** escribir etiquetas en mayúsculas espaciadas fuera de la consola de Operación.
- **Don't** usar más de un título de pantalla por pantalla.
- **Don't** dejar que el subsistema de Operación (su densidad de 13.5 px, mayúsculas y monoespaciada) se filtre fuera de su contenedor.
