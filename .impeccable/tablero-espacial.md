# Tablero Espacial · Amanecer + grafito (guía vigente)

Guía de trabajo para el diseño de Aleta TMS. La referencia normativa es `DESIGN.md`; esta guía resume cómo aplicarla. Sustituye a la versión terracota con degradado. La estructura, la lógica y las reglas de `ARCHITECTURE_RULES.md` no cambian.

## Idea

- **Tablero de salidas (A):** los datos operativos se leen como un tablero de terminal. Horas, montos, códigos, placas, capacidades y conteos van en DM Sans con `tabular-nums` y alineados en columna. Las listas y la semana de salidas se leen de arriba abajo, fila por fila.
- **Cabina (C):** paneles de primer nivel limpios y flotantes (radio 24px, sombra teñida de grafito), controles en píldora, menú lateral oscuro. Menos cajas: la proximidad y el espacio agrupan, no los bordes.

## Ajuste vigente: Amanecer + grafito (prevalece sobre lo anterior donde choque)

Grafito y cobre quedaba apagado. Se mantienen los neutros, el menú oscuro y el cobre #B04E26, pero vuelven la atmósfera y el color con función.

1. **Fondo:** base `--bg-app` (#F1EEF4) y encima la capa `--bg-app-layer` (durazno, damasco y cielo), pintada en un `::before` fijo del shell con `opacity: var(--bg-amount)` (0.7). Con `prefers-reduced-transparency`, fondo opaco.
2. **Vidrio:** la barra superior y los paneles de contenido usan `rgb(255 255 255 / .85)`, `backdrop-filter: blur(18px) saturate(1.3)`, borde de 1px `rgb(255 255 255 / .7)` y `--shadow-float`. Las tarjetas y el tablero dentro de los paneles son opacos: `--card-bg` con borde `--card-border`.
3. **Menú grafito:** texto `--sidebar-text` #F4F1EC, secundario `--sidebar-muted` #ABA59D, bordes `--sidebar-border` #2E2C2A. **El ítem activo va con relleno cobre** (`--color-terracota-500`) y texto blanco, en lugar del filete. El pie "En línea" lleva un punto `--sidebar-online`. Logo y avatar con `--brand-gradient`.
4. **Color con función** (sustituye lo que decía la regla anterior en estos puntos):
   - Tarjeta de ruta seleccionada: fondo `--color-terracota-50` (#FBEDE6), borde `--color-terracota-200` (#E7B9A4) y franja interior de 3px en cobre.
   - Turno (MAÑANA, TARDE, NOCHE): texto cobre, peso 700, sin chip.
   - Flechas "→" de rutas y horarios: en cobre (antes neutral-300).
   - Eyebrow sobre el título del detalle ("SERVICIO PROGRAMADO") y el punto del departamento (● LA PAZ): en cobre.
   - Botón principal: cobre pleno con `--shadow-cta`; hover `--color-terracota-600`.
   - Estado del servicio en la cabecera: píldora "Activo" con fondo `--color-success-100` y texto `--color-success-600`.
5. **Tablero de salidas:**
   - Ocupación: barra de 6px con relleno cobre sobre `--occupancy-track`; en "Casi llena", `--color-signal-amber`.
   - "Activa": texto `--color-success-600` y switch verde (`--color-success-500`).
   - "Casi llena": texto `--color-warning-600`, switch `--color-signal-amber`, y la fila con `linear-gradient(90deg, var(--color-row-warm), transparent 60%)` más una franja interior de 3px en `--color-signal-amber`.
   - "Suspendida": texto `--color-error-600`, switch apagado (`--switch-off`), y la fila atenuada con `--stripe-suspended`.
   - Encabezado del tablero: fondo `--board-head`, rótulos de 11px en mayúsculas.
   - Leyenda con puntos verde, ámbar y gris.
   - Se mantiene: códigos (DESP-…, LPZ/ORU, RM-01) y fechas como texto neutro, sin chips rellenos.
   - El ámbar `--color-signal-amber` nunca se usa como texto.
   - Switch verde solo en salidas (Servicios programados); el resto de switches, grafito encendido y gris apagado.
6. **Rutas maestras** conserva su estructura original (tarjeta que crece en su lugar); el resto de tarjetas no crece y abre panel lateral.

## Regla de color (base; ver el ajuste de arriba)

- Aproximadamente **90 % neutros, 8 % cobre y 2 % estados**.
- El **cobre** (`--color-terracota-500` #B04E26, las variables conservan el nombre por compatibilidad) solo va en: el botón principal de cada vista, lo seleccionado (tarjeta activa, subítem activo) y el anillo de foco. En ningún otro lugar: no en flechas, separadores, horas, códigos ni rótulos.
- **"Activa" es el estado normal y no lleva color:** texto `--color-neutral-500` y como máximo un punto de 7px en `--color-success-500`. Solo "Casi llena" o alerta (`warning`) y "Suspendida" o error (`error`) llevan color.
- **Chips informativos sin relleno:** día (LUN 31), código (DESP-…, RM-01, LPZ/ORU), turno, rango de fechas, ACTIVO. Son texto neutro; los códigos en DM Sans tabular. No hay píldoras negras, cobre, celestes ni verdes de información.
- Flechas "→" y separadores en `--color-neutral-300`.
- **Switch:** encendido en `--color-neutral-900`, apagado en `--color-neutral-300`. El estado ya lo dice el texto de al lado.
- **Tarjeta con alerta:** franja interior de 3px en warning (`box-shadow: inset 3px 0 0 var(--color-warning-500)`). **Tarjeta suspendida:** fondo `--color-neutral-100` y texto `--color-neutral-500`.
- **Ocupación:** barrita de 4px en `--color-neutral-900` al 55 % de opacidad (warning si la tarjeta tiene alerta), sin pista de fondo marcada.
- Fondo de la app liso (`--bg-app` = `--color-neutral-50`). Nada de degradado ni del celeste `--color-secondary-*` en la UI.
- Sin emojis: íconos de línea del mismo set del menú (`nav-icon` en `components/app-shell/`), trazo 1.8.
- Familias retiradas de la UI: `--color-secondary-*`, `--color-gray-*`, `emerald`, `amber`, `indigo`, `slate` y cualquier hex escrito a mano. Todo pasa a la escala neutral o a los estados.

## Menú lateral oscuro

`--sidebar-bg` #1B1A19, `--sidebar-text` #F2EFEA, `--sidebar-muted` #A39E97, `--sidebar-active` #2E2C2A (ítem activo, con filete interior de 2px en cobre), `--sidebar-border` #3A3836 (bordes y píldoras "Pronto" o "15"). El cobre sobre el fondo oscuro no sirve para texto: si algún texto del menú necesita cobre, `--sidebar-accent-text` #D9784E.

## Espaciado, tipografía y tacto

- **Espacio:** solo `--space-1` (4px, ícono y etiqueta), `--space-2` (8px, mismo grupo), `--space-3` y `--space-4` (12-16px, entre grupos o padding de tarjeta), `--space-6` (24px, entre tarjetas y paneles), `--space-8` y `--space-12` (entre secciones). El espacio entre grupos siempre es mayor que dentro de un grupo. Nada fuera de la base 4.
- **Tipografía:** tamaños solo con `--text-2xs` (11px, mínimo absoluto, rótulos en mayúsculas), `--text-xs` (12), `--text-sm` (14), `--text-md` (16, inputs), `--text-lg`, `--text-xl`, `--text-2xl` y `--text-3xl`. Interlineado `--leading-tight` (títulos), `--leading-ui` y `--leading-body`. No usar `line-height` fijo en rem. Las familias y los pesos actuales se mantienen.
- **Radios:** solo `--radius-pill`, `--radius-panel` (24), `--radius-block` (16), `--radius-field` (14) y `--radius-chip`.
- **Tacto:** en tablet y móvil (por debajo de `lg`), el área táctil mínima es `--touch-min` (40px). Puede ampliarse con padding o `::after` aunque el ícono siga pequeño.
- **Nada cortado:** los nombres de ruta usan hasta 2 líneas (`-webkit-line-clamp: 2` más `title`), no una sola línea con "…". Las pistas con desplazamiento horizontal muestran un degradado de borde que indica que hay más.

## Piezas (`src/styles/_mixins.scss`, con `@use 'mixins' as *;`)

`float-panel(data | chrome | overlay)`, `glass(kind)`, `pill-button(primary | ink | secondary | ghost)`, `segmented-track`, `segmented-option($active)`, `field`, `board-label`, `board-figure($size, $weight)`, `focus-ring`, `press`, `rise-in($delay)`, `truncate`, `bp(sm | md | lg | xl)`. Con la paleta nueva, `ink` es grafito: úsalo para controles seleccionados neutros, nunca como relleno de chips informativos.

## Reglas de trabajo

1. Respeta `ARCHITECTURE_RULES.md` y `src/app/core/constants/*`: tarjeta de ruta 76/210/110/48px (colapsada 160, expandida 520), contenedores del grafo (#FAF9F6) y de servicios, filas de tabla de 64px, cabecera de página de 72px y celdas del diseñador de plazas.
2. No cambies la lógica de engines, stores ni services salvo lo aprobado explícitamente.
3. Conserva todos los `data-testid`.
4. Sin guiones largos en textos visibles ni en comentarios nuevos.
5. Nada de `position: fixed` dentro de un elemento con `backdrop-filter`.
6. En Sass, no pongas declaraciones después de reglas anidadas en el mismo bloque; envuélvelas en `& { }`.
