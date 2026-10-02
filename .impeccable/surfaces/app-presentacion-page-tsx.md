---
version: 1
slug: "app-presentacion-page-tsx"
primary_target: "app/presentacion/page.tsx"
related_targets: ["components/demo/presentacion.tsx","components/ui/franja-demo.tsx","components/demo/hoja-pruebas.tsx"]
---

# Demostración pública (Vercel, NEXT_PUBLIC_DEMO=si)

Alcance: la franja "Demostración" con su hoja "Pruébalo" (celular) y la vista de presentación /presentacion (pantallas de 1024 px o más). Modo: Operate (el jurado opera la app); el panel de presentación es Persuade ligero.

Audiencia y tarea: el jurado de InnovaTecNM abre la demo en su propio celular, solo, con pocos minutos. Tiene que ver al sistema regar solo y explicar por qué. El presentador proyecta la laptop para enseñar el QR.

Restricciones: datos simulados y siempre etiquetados; nada de cifras inventadas como medidas; la app real (sin la variable) no cambia; X-Frame-Options SAMEORIGIN solo en la demo.

## Direction contract

THESIS: la demostración no se mira, se provoca. Rechaza el "dashboard quieto con datos de ejemplo" y la landing con capturas: el visitante seca la tierra y la app de verdad reacciona.

OWN-WORLD: el sistema "calma" heredado: crema #f6f4ef, tinta marino #13283d, un solo acento turquesa #0b7393; estados en franja teñida (ok verde, agua azul, ojo ámbar); tarjetas blancas de filo fino, radios 14/20, Figtree. La demo agrega solo marino sólido (franja y bisel del celular).

STORY: entiende qué es (riega solo y explica), toca un escenario, ve la humedad bajar, la bomba entrar y parar sola, y pregunta por qué regó.

FIRST VIEWPORT: laptop desde 1280 px: tres columnas, panel (marca, H1 de 2 renglones, bajada, 3 escenarios con estado en curso, franja que narra en vivo), el celular a 390 px de pantalla y alto del viewport, y el QR de 220 px con "Ábrela en tu celular". De 1024 a 1279 px el QR (128 px) va bajo el panel. Celular: franja marina de 44 px con la píldora "Pruébalo" a la derecha; la acción vive ahí.

FORM: extensión de la superficie existente. Sin tirada de concepto, por renuncia explícita: ante tres opciones el usuario eligió "Vista de presentación (Recomendado)" ("En pantallas anchas: la app dentro de un marco de celular y, al lado, qué es IonDroplet y botones Prueba esto... En el celular se queda como está"), y después aclaró que el jurado la abre "Cada quien en su celular". Seed: ninguna (pedido preciso, sin roll).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
