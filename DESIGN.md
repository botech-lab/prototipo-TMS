---
name: Aleta TMS
description: Sistema de gestión y venta de pasajes interdepartamentales. Un tablero de salidas sobre vidrio, bajo un amanecer andino.
colors:
  copper: "#B04E26"
  copper-hover: "#933F1D"
  copper-pressed: "#7A3317"
  copper-soft: "#FBEDE6"
  copper-edge: "#E7B9A4"
  sky: "#1F6F8B"
  sky-hover: "#185A71"
  sky-soft: "#E3F1F7"
  canvas: "#F4F3F1"
  bg-base: "#F1EEF4"
  bg-dawn: "#F6C9B8"
  bg-apricot: "#F7DCCB"
  bg-sky: "#BFE3F4"
  surface: "#FFFFFF"
  graphite-100: "#EFEEEB"
  graphite-200: "#E4E3DF"
  graphite-300: "#BDB8B1"
  graphite-400: "#8E8983"
  graphite-500: "#5F5A55"
  graphite-600: "#4E4A46"
  graphite-700: "#3A3734"
  graphite-900: "#181716"
  sidebar-bg: "#1B1A19"
  sidebar-text: "#F4F1EC"
  sidebar-muted: "#ABA59D"
  sidebar-border: "#2E2C2A"
  ok: "#2F7A55"
  ok-soft: "#E6F3EC"
  warn-text: "#946009"
  warn-signal: "#D9951F"
  warn-soft: "#FBF0DC"
  err: "#B42318"
  err-soft: "#FCE9E7"
  cat-1: "#B04E26"
  cat-2: "#1F6F8B"
  cat-3: "#356B51"
  cat-4: "#8C6310"
  cat-5: "#7A4B8C"
  cat-6: "#B03E68"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, system-ui, -apple-system, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Plus Jakarta Sans, system-ui, -apple-system, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1.2
  title:
    fontFamily: "Plus Jakarta Sans, system-ui, -apple-system, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.35
  input:
    fontFamily: "Plus Jakarta Sans, system-ui, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.35
  meta:
    fontFamily: "Plus Jakarta Sans, system-ui, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.35
  label:
    fontFamily: "Plus Jakarta Sans, system-ui, -apple-system, sans-serif"
    fontSize: "11px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.08em"
  data:
    fontFamily: "DM Sans, monospace, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    fontFeature: "\"tnum\""
  data-hero:
    fontFamily: "DM Sans, monospace, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    fontFeature: "\"tnum\""
rounded:
  field: "14px"
  block: "16px"
  panel: "24px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
components:
  button-primary:
    backgroundColor: "{colors.copper}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "44px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.copper-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.graphite-900}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "44px"
  link-secondary:
    textColor: "{colors.sky}"
    typography: "{typography.body}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.block}"
    padding: "16px"
  card-selected:
    backgroundColor: "{colors.copper-soft}"
  status-active:
    backgroundColor: "{colors.ok-soft}"
    textColor: "{colors.ok}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
  status-warning:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn-text}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
  status-error:
    backgroundColor: "{colors.err-soft}"
    textColor: "{colors.err}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.graphite-900}"
    typography: "{typography.input}"
    rounded: "{rounded.field}"
    height: "44px"
  nav-item-active:
    backgroundColor: "{colors.copper}"
    textColor: "{colors.surface}"
    rounded: "{rounded.block}"
  toast:
    backgroundColor: "{colors.sidebar-bg}"
    textColor: "{colors.sidebar-text}"
    rounded: "{rounded.pill}"
---

# Design System: Aleta TMS

## Overview

**Creative North Star: "Tablero de salidas bajo un amanecer andino"**

Aleta TMS se lee como el tablero de una terminal de buses: horas, códigos, placas y ocupación en cifras tabulares, alineadas y escaneables de un vistazo. Ese tablero vive sobre paneles de vidrio flotantes, y detrás de ellos amanece: un degradado suave de durazno, damasco y cielo sobre una base lila muy clara. El menú lateral es grafito oscuro, y la marca aparece como un solo acento: el cobre.

La vida de la interfaz viene del fondo (degradado y vidrio); las tarjetas y tablas son blancas y opacas para que los datos se lean nítidos. El color solo aparece cuando cumple una función: la acción principal, lo seleccionado, las rutas y la ocupación en cobre; los estados solo cuando piden atención y siempre con texto; las categorías solo con leyenda. Es una herramienta de trabajo para despachadores, vendedores, administradores y gerencia, igual de completa en PC, tablet y móvil.

**Key Characteristics:**
- Fondo "Amanecer": base #F1EEF4 con una capa de degradado (durazno, damasco, cielo) al 70 %, fija detrás de toda la app.
- Paneles de vidrio (blanco al 85 %, desenfoque 18px) y, dentro, tarjetas y tablas blancas opacas con borde finísimo.
- Menú lateral grafito #1B1A19; el ítem activo va con relleno cobre.
- Cobre #B04E26 como único acento de marca: una acción principal por vista, lo seleccionado, las flechas de ruta, la ocupación y el foco.
- Cifras en DM Sans tabular; interfaz en Plus Jakarta Sans. Texto mínimo de 11px.
- Controles en píldora; paneles de 24px; tarjetas de 16px; campos de 14px.
- Tarjetas que no crecen al pedir más detalle (se abre un panel lateral), con una excepción: la tarjeta de ruta maestra, que crece en su lugar por diseño original.

## Colors

Grafito neutro con un solo acento cobre, un color de información (cielo), estados funcionales y seis categorías para datos.

### Primary
- **Cobre** (#B04E26): botón principal de cada vista (uno solo), ítem activo del menú, tarjeta seleccionada (franja interior de 3px), flechas "→" de rutas y horarios, barra y anillo de ocupación, anillo de foco. Texto blanco sobre cobre: 5.3:1. Hover #933F1D, pulsado #7A3317.
- **Cobre suave** (#FBEDE6) y **filo cobre** (#E7B9A4): fondo y borde de lo seleccionado.

### Secondary
- **Cielo** (#1F6F8B, 5.7:1): información y acciones secundarias como enlace subrayado ("Plazas", "Ver detalle", "Editar"); el día de hoy. Reemplaza al celeste antiguo (#00A3E0), que no pasaba contraste. En código conserva el nombre `--color-secondary-*` por compatibilidad; los alias `--color-sky-*` son los recomendados.

### Neutral (grafito)
- **Canvas** (#F4F3F1) y **superficie** (#FFFFFF).
- **Grafito 200** (#E4E3DF) bordes; **300** (#BDB8B1) separadores, línea de ruta y switch apagado, nunca texto; **500** (#5F5A55, 6.6:1) texto secundario y rótulos; **900** (#181716, 17.9:1) texto principal.
- Bordes de tarjeta `rgb(24 23 22 / .09)`; fondos suaves `rgb(24 23 22 / .045)`.

### Estados
- **Ok** #2F7A55 sobre #E6F3EC. **Atención**: texto #946009 sobre #FBF0DC; la señal ámbar #D9951F solo en barras, switches y franjas, nunca como texto. **Error** #B42318 sobre #FCE9E7.

### Categorías (máximo 6, siempre con leyenda)
cat-1 cobre #B04E26, cat-2 cielo #1F6F8B, cat-3 salvia #356B51, cat-4 maíz #8C6310, cat-5 ciruela #7A4B8C, cat-6 quinua #B03E68, cada una con su fondo suave. Se usan para departamentos en el grafo de rutas (La Paz cat-1, Cochabamba cat-2, Santa Cruz cat-3, Oruro cat-4) y tipos de asiento en el diseñador de plazas (Cama cat-1, Semicama cat-2, VIP cat-5, Ambulatorio cat-3, Reclinable cat-6, otros cat-4).

### Named Rules
**La Regla del Cobre Único.** Un solo botón cobre por vista. El cobre además marca lo seleccionado, las flechas de ruta y la ocupación; nada más.

**La Regla del Estado con Texto.** Un estado solo lleva color cuando pide atención, y siempre acompañado de texto. Códigos, fechas, turnos y números van como texto, nunca en chips de color.

**La Regla del Switch.** El switch de una salida (Servicios programados) es verde cuando está activa, ámbar cuando está casi llena y gris cuando está suspendida. Todos los demás switches (rutas, vehículos, catálogos) son grafito encendidos y gris apagados.

**La Regla de la Leyenda.** Toda categoría de color se explica con una leyenda visible. Las categorías no decoran.

## Typography

**UI:** Plus Jakarta Sans (system-ui de respaldo). **Datos:** DM Sans con `tabular-nums` para horas, precios, placas, códigos y capacidades.

### Hierarchy
- **Display** (800, 30px): título de página.
- **Headline** (800, 24px) y **Title** (700, 18px): paneles y tarjetas; títulos hasta 2 líneas, nunca cortados con "…" a la primera línea.
- **Body** (500, 14px): interfaz y celdas. **Input** (16px) en campos, para evitar el zoom de iOS. **Meta** (12px).
- **Label** (800, 11px, mayúsculas, tracking 0.08em): rótulos de tablero, encabezados de columna, botones.
- **Data** (DM Sans 600, 14px) y **Data hero** (700, 24-26px): horas de salida y cifras protagonistas.

### Named Rules
**La Regla de los 11px.** Ningún texto baja de 11px. Tamaños solo desde `--text-*`, interlineados desde `--leading-*`.

## Layout

Cáscara con menú lateral grafito (flotante, esquinas de 24px), barra superior de vidrio flotante y contenido sobre el fondo Amanecer. En tablet el menú pasa a mini-riel; en móvil se oculta tras el botón de menú (panel con foco atrapado y Escape). Enlace "Saltar al contenido" como primer foco.

Espaciado en base 4 (`--space-1` a `--space-12`): el espacio entre grupos siempre mayor que dentro de un grupo. Por debajo de 640px las vistas con tabla abren en tarjetas. Tablas y pistas que se desplazan en horizontal muestran un degradado de borde. Áreas táctiles de 40px como mínimo en tablet y móvil.

## Elevation & Depth

Tres planos: fondo Amanecer, paneles de vidrio (barra superior, menú, paneles de contenido, drawers y modales) y tarjetas opacas. Las sombras están teñidas de grafito, nunca negras.

- **Reposo**: `0 1px 2px rgb(24 23 22 / .05), 0 6px 16px -12px rgb(24 23 22 / .25)`.
- **Flotante** (paneles): `0 1px 2px rgb(24 23 22 / .05), 0 18px 40px -26px rgb(24 23 22 / .35)`.
- **Hover de tarjeta**: sube 2px con sombra `0 2px 4px /.06, 0 16px 32px -18px /.4`.
- **Acción cobre**: `0 8px 18px -8px rgb(176 78 38 / .6)`.

### Named Rules
**La Regla del Dato Opaco.** Los datos (tablas, tarjetas, formularios, grafo) se leen sobre blanco opaco dentro del vidrio. Todo vidrio tiene alternativa opaca con `prefers-reduced-transparency`.

## Shapes

Controles y estados en píldora; campos de 14px; tarjetas y bloques de 16px; paneles, drawers y modales de 24px. Sin radios sueltos.

## Components

### Buttons
Principal: píldora cobre de 44px, rótulo en mayúsculas de 11px, uno por vista. Secundario: píldora blanca con contorno. Enlace secundario en cielo subrayado. Foco visible con doble anillo (blanco + cobre).

### Tarjetas (sistema común)
Cabecera con código en texto tabular gris y estado + switch arriba a la derecha; cuerpo con un solo protagonista, subtítulo y 2-3 datos clave; pie con una acción con texto, un enlace opcional y el resto en "⋯". Estados: seleccionada (fondo cobre suave, filo cobre y franja de 3px), atención (franja ámbar), inactiva o suspendida (rayado suave, texto atenuado). Altura igual por fila; no crecen: "Ver detalle" abre un panel lateral.

- **Salida (Servicios programados)**: boleto con talón (día y hora), perforado y cuerpo con bus, anillo de ocupación y estado.
- **Ruta maestra**: estructura original del prototipo; crece en su lugar a 520px y muestra la caja del grafo (210px) y "Servicios creados" (110px). Ver `ARCHITECTURE_RULES.md`.

### Estados en tablas
Píldora suave con texto: verde "Activo", ámbar "Revisión técnica" o "Licencia por vencer", rojo "Fuera de servicio", "Bloqueado" o "Vencida", neutra "Inactivo".

### Inputs / Fields
Blanco, 16px de texto, radio 14px. Foco: borde cobre y halo `rgb(176 78 38 / .18)`. Error: borde rojo, fondo #FCE9E7 y mensaje debajo en rojo. Requerido: asterisco rojo más "obligatorio" para lectores de pantalla.

### Navigation
Menú grafito; grupo "Operación" (Rutas maestras, Servicios programados) y "Administración" (Usuarios, Vehículos, Conductores, Catálogos plegable con 15 catálogos). Ventas e Informes deshabilitados con "Pronto". Ítem activo con relleno cobre. Íconos de línea de un solo set (trazo 1.8). La ruta de navegación y el título de la pestaña ("Vehículos · Aleta TMS") salen de la ruta activa.

### Aviso (toast)
Cápsula grafito #1B1A19 abajo al centro, texto #F4F1EC y acción "Deshacer" en cobre claro #F2B79B. Se pausa con el puntero o el foco. Toda eliminación y suspensión se puede deshacer.

### Grafo de ruta (signature)
Nodos por departamento con las categorías (extremos rellenos, intermedios con aro de 2.5px), línea punteada grafito-300, texto alternativo con la lista de paradas. Geometría inmutable según `ARCHITECTURE_RULES.md`.

## Do's and Don'ts

### Do:
- **Do** usar un solo botón cobre por vista, y cobre para lo seleccionado, las flechas de ruta y la ocupación.
- **Do** poner los datos sobre blanco opaco dentro de paneles de vidrio.
- **Do** escribir horas, placas, códigos y cifras en DM Sans tabular.
- **Do** acompañar todo estado con texto, y toda categoría con leyenda.
- **Do** usar solo tokens (`--color-*`, `--cat-*`, `--space-*`, `--text-*`, `--radius-*`).
- **Do** abrir el detalle en un panel lateral en lugar de agrandar la tarjeta (salvo la tarjeta de ruta maestra).
- **Do** ofrecer "Deshacer" en toda acción destructiva o de alto impacto.

### Don't:
- **Don't** usar el ámbar #D9951F ni el grafito-300 como color de texto.
- **Don't** meter códigos, fechas o turnos en chips de color.
- **Don't** usar emojis como íconos.
- **Don't** usar texto por debajo de 11px.
- **Don't** usar grises fríos, el celeste antiguo #00A3E0 ni hex escritos a mano.
- **Don't** usar verde en switches que no sean de salidas.
