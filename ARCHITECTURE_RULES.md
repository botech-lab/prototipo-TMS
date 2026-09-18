# 🛡️ PAZAVI TMS - Reglas Maestras de Arquitectura y Diseño Frontend

> **IMPORTANTE PARA ASISTENTES DE IA Y DESARROLLADORES**:  
> Este documento contiene las **Reglas de Oro Inmutables** de diseño, geometría vectorial SVG y estructura de componentes para el frontend de PAZAVI TMS. **NO MODIFIQUES NI MEZCLES ESTAS DIMENSIONES O REGLAS SIN AUTORIZACIÓN EXPLÍCITA.**

---

## 🏛️ 1. Estructura de Capas y Principio de Responsabilidad Única

```
src/app/
├── core/                   # Capa Central: Tokens de diseño, constantes y reglas inmutables
│   ├── constants/          # ROUTE_CARD_DIMENSIONS, ROUTE_GRAPH_RULES
│   ├── theme/              # PAZAVI_TOKENS, escala cromática institucional
│   └── index.ts            # Barrel export @core
├── models/                 # Modelos de Dominio e Interfaces TypeScript
│   ├── route.model.ts      # MasterRoute, StopNode, DepartmentGroup
│   └── index.ts            # Barrel export @models
├── services/               # Estado Reactivo con Angular Signals (Signals Store)
│   └── routes.service.ts   # Catálogo de rutas, filtros y mutaciones inmutables
├── components/             # Componentes UI Standalone de Angular 17+
│   ├── route-card/         # Componente Presentacional "Dumb" con alturas normalizadas
│   ├── route-graph-svg/    # Motor Geométrico Puro & Renderizador SVG Reactivo
│   ├── master-routes-dashboard/ # Smart Container (Filtros, Acordeones, Grid)
│   └── app-shell/          # Shell Responsivo con Mini-Rail colapsable (w-16 / w-52)
└── layout/
    └── navbar/             # Barra de navegación principal
```

---

## 📐 2. Dimensiones Inmutables de la Tarjeta (`ROUTE_CARD_DIMENSIONS`)

Todas las tarjetas de rutas maestras deben respetar estrictamente las siguientes alturas calculadas para evitar brincos visuales y desalineación de filas. Los valores son **números en píxeles** en `ROUTE_CARD_DIMENSIONS` (fuente única de la verdad): `RouteCardComponent` los publica en su host como variables CSS (`--route-card-header-h`, `--route-card-svg-h`, `--route-card-services-h`, `--route-card-footer-h`, `--route-card-expanded-min-h`, `--route-card-collapsed-min-h`) y su SCSS los consume con `var(...)`:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. BLOQUE HEADER: HEADER_HEIGHT = 76px                      │
│    [RM-01]  [● ACTIVO]                                 [O ] │ <- Fila 1: Badges + Switch
│    La Paz → Santa Cruz                     [Ver Detalle ⌄]  │ <- Fila 2: Nombre + Botón
├─────────────────────────────────────────────────────────────┤
│ 2. BLOQUE EXPANDIBLE                                        │
│    ┌───────────────────────────────────────────────────────┐│
│    │ SVG CONTAINER: SVG_CONTAINER_HEIGHT = 210px           ││
│    │ (1)─────(2)─────(3)─────(4)─────(5)                   ││
│    └───────────────────────────────────────────────────────┘│
│    ┌───────────────────────────────────────────────────────┐│
│    │ SERVICES CONTAINER: SERVICES_CONTAINER_HEIGHT = 110px ││
│    │ ⚡ SERVICIOS CREADOS:                                 ││
│    │ [La Paz–Cochabamba]  [Cochabamba–Santa Cruz]          ││
│    └───────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ 3. BLOQUE FOOTER: FOOTER_HEIGHT = 48px (borde superior)     │
│    🔗 13 paradas conectadas                      [✏️ Editar]│
└─────────────────────────────────────────────────────────────┘
Total Expandido: CARD_EXPANDED_HEIGHT = 520px (min-height) | Total Colapsado: CARD_COLLAPSED_HEIGHT = 160px (min-height)
```

* **Modo Expandido** (`.route-card--expanded`): `CARD_EXPANDED_HEIGHT: 520` → `min-height: var(--route-card-expanded-min-h)` (520px).
* **Modo Colapsado** (`.route-card--collapsed`): `CARD_COLLAPSED_HEIGHT: 160` → `min-height: var(--route-card-collapsed-min-h)` (160px).
* **Header** (`.route-card__header`): `HEADER_HEIGHT: 76` → `height: var(--route-card-header-h)` (76px); ancho completo, columna flex con `justify-content: space-between`.
* **Contenedor SVG** (`.route-card__graph-box`): `SVG_CONTAINER_HEIGHT: 210` → `height: var(--route-card-svg-h)` (210px); fondo `rgb(250 249 246 / 0.8)`, radio 16px, padding 8px, borde 1px `rgb(229 231 235 / 0.6)`, `overflow: hidden`.
* **Contenedor Servicios** (`.route-card__services`): `SERVICES_CONTAINER_HEIGHT: 110` → `height: var(--route-card-services-h)` (110px); fondo `rgb(250 249 246 / 0.5)`, radio 16px, padding 12px, borde 1px `rgb(229 231 235 / 0.5)`, `overflow-y: auto`, margen inferior 12px.
* **Footer** (`.route-card__footer`): `FOOTER_HEIGHT: 48` → `height: var(--route-card-footer-h)` (48px); padding superior 12px, borde superior 1px `--color-gray-100`, flex centrado con `justify-content: space-between` y `margin-top: auto`.

---

## 🧮 3. Las 5 Reglas Matemáticas del Gráfico Vectorial (`RouteGraphEngine`)

1. **Grid Matrix Step (Paso Horizontal Rígido)**:
   $$\text{fixedStepX} = \frac{\text{usableWidth}}{\text{stopsPerRow} - 1}$$
   Todas las filas comparten el mismo paso horizontal, alineando perfectamente las columnas de arriba a abajo.
2. **Collision-Free Bézier Clearance (Despeje Anti-Choque)**:
   $$\text{textHalfWidth} = \frac{\text{name.length} \cdot \text{fontSizeCity} \cdot 0.58}{2}$$
   $$\text{requiredClearance} = \max(28, \text{textHalfWidth} + 12)$$
   La curva de retorno se aleja dinámicamente según la longitud del texto (*"Cochabamba"*, *"San Pedro de Tiquina"*).
3. **Symmetric Density (Distribución 5-5-3)**:
   Rutas de hasta 13 paradas se organizan en máximo 3 filas (5 en fila 1, 5 en fila 2, 3 en fila 3) evitando nodos huérfanos.
4. **Strict Canvas Containment (Sin Desbordes)**:
   $$0 \le \text{minCurveExtentX} \quad \text{y} \quad \text{maxCurveExtentX} \le 460\text{px}$$
5. **Balanced Vertical Centering (ViewBox 460x200)**:
   $$\text{offsetY} = \max(24, \frac{200 - \text{totalContentHeight}}{2})$$

---

## 📱 4. Reglas Responsivas y Soporte iPad (Tablet)

* **iPad / Tablet (`768px - 1024px`)**:
  * El Grid de rutas **DEBE mostrar 2 columnas amplias** (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3`).
  * El Sidebar/Navbar entra en modo **Mini-Rail (`w-16`)** para dar +160px de holgura a las tarjetas.
* **Mobile (`390px iPhone 12 Pro`)**:
  * `stopsPerRow <= 4` para evitar el apiñamiento de texto.

---

## ⚡ 5. Patrón Reactivo con Angular Signals

* Usar exclusivamente `signal()`, `computed()`, `input()`, `input.required()` y `output()`.
* **Prohibido** crear suscripciones manuales con `.subscribe()` dentro de componentes presentacionales.
* Actualizaciones inmutables de estado mediante `signal.update(fn)`.
