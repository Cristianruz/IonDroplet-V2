# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Agricultor** de 45 a 50 años, en el campo, bajo el sol y a veces con guantes, con el celular en la mano. Quiere saber de un vistazo si su cultivo está bien y si tiene que hacer algo. Es el usuario para el que se diseña todo.
- **Jurado y profesores de InnovaTecNM 2026** (TecNM Campus Chihuahua II). Durante el pitch abren la demostración pública **cada quien en su propio celular** y la exploran solos, sin que nadie se la maneje. Tienen pocos minutos y no conocen la app.

## Product Purpose

IonDroplet mide la humedad del suelo, decide cuándo regar y le explica al agricultor por qué. El éxito es que el agricultor entienda en un vistazo cómo está su cultivo y que el riego pase solo cuando hace falta; y que el jurado se lleve en un minuto que el sistema **riega solo y explica**.

## Positioning

Riega solo y explica cada decisión con palabras sencillas. Nunca muestra un número inventado como si fuera medido: cada dato dice si es medido, calculado, pronosticado o si falta.

## Operating Context

- Dos copias de la misma app. **La real** vive en la laptop del riego (ESP32 por USB, backend Node + SQLite) y solo se usa en esa red. **La demostración** está en Vercel con `NEXT_PUBLIC_DEMO=si`: simula todo en el navegador de cada visita (`lib/demo/`), no hay bomba ni backend detrás y se borra al cerrar la pestaña.
- El hardware es un prototipo de banco: mini bomba de 1 a 3 L/min sobre protoboard. Toda cifra en litros es una proyección, no una medición.
- Se usa en exteriores, con luz fuerte, en celulares de gama media.

## Capabilities and Constraints

- Humedad del suelo en vivo; riego automático al cruzar el punto de riego; riego a mano con confirmación; un agente que ajusta el punto de riego por etapa y clima; clima, ET₀ y balance hídrico de la semana; avisos; fertirriego; historial; asistente de chat; diagnóstico por foto; análisis con IA; ficha del cultivo con vista 3D.
- Términos de la app: "Cultivo" (no "parcela"), "punto de riego", "Avisos", "Regar ahora".
- No hay sonda de ORP, pH ni conductividad: la ionización no se demuestra con una medición. Tampoco hay sensor de temperatura del suelo ni de corriente.
- En la demostración, lo que en el sistema real hace la IA son textos de ejemplo armados con los datos simulados, y así se dice.

## Brand Commitments

- Nombre: IonDroplet. Logo: la gota con la planta (`app/icon.svg`, `components/ui/logo.tsx`).
- Lema que ya usa la app: "Agua exacta, en el momento exacto."
- Voz: español de México, de tú, frases cortas, sin tecnicismos; se habla como alguien del campo que sabe, no como un manual.

## Evidence on Hand

- 36,307 lecturas reales de humedad, del 30 de abril al 10 de junio de 2026 (en la base de la laptop, no en la demostración).
- No hay foto del prototipo para usar, ni testimonios, ni clientes, ni cifras medidas de ahorro de agua. No se inventan.
- Los datos de la demostración son simulados y la pantalla lo dice siempre.

## Product Principles

1. Nunca un número inventado como si fuera medido. Si un dato falta, se dice que falta.
2. Una pantalla contesta una pregunta. Lo detallado queda a un toque, sin estorbar.
3. Cada decisión del sistema se explica en palabras sencillas.
4. La demostración se presenta como demostración y deja ver el sistema actuando, no solo datos quietos.
5. Hecho para el campo: grande, legible bajo el sol y a un toque.

## Accessibility & Inclusion

- Letra base de 16 px, contraste alto para leer bajo el sol, blancos táctiles de al menos 44 px y zoom permitido.
- Modo claro y oscuro; respeta `prefers-reduced-motion`.
