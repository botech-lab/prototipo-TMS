/**
 * ============================================================================
 * PAZAVI TMS - REGLAS DE ORO DE LA TABLA DE DATOS (`DATA_TABLE_DIMENSIONS`)
 * ============================================================================
 * Dimensiones INMUTABLES de toda tabla del sistema. Igual que las tarjetas de
 * rutas maestras, se congelan aquí para evitar brincos visuales y filas
 * desalineadas entre módulos.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ 1. PAGE HEADER: 72px                                                 │
 * │    [icono] Vehículos                          [+ NUEVO VEHÍCULO]     │
 * │            Flota de transporte registrada en el sistema              │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │ 2. TOOLBAR: 56px                                                     │
 * │    [TODAS][CATEGORÍA A][CATEGORÍA B]              [🔍 Buscar...]     │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │ 3. THEAD: 44px (sticky, uppercase, tracking-wider)                   │
 * │    PLACA   TIPO   MARCA / MODELO   PISOS   CAPACIDAD   ESTADO        │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │ 4. TBODY ROW: 64px (border-b, hover terracota-50)                    │
 * │    1234    Bus Normal   toyota Toyota   2    50 pax   [ACTIVO]       │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * NO MODIFICAR SIN AUTORIZACIÓN EXPLÍCITA.
 * ============================================================================
 */

export const DATA_TABLE_DIMENSIONS = Object.freeze({
  /** Cabecera de página (px, desde `sm`): título + subtítulo + acción primaria. */
  pageHeaderHeight: 72,
  /** Altura mínima (px) de la barra de filtros y búsqueda. */
  toolbarHeight: 56,
  /** Fila de encabezados (px), fija al hacer scroll vertical. */
  headHeight: 44,
  /** Altura normalizada (px) de cada fila de datos. */
  rowHeight: 64,
  /** Altura mínima (px) del estado vacío, calibrada para no colapsar el contenedor. */
  emptyStateHeight: 280,
  /** Ancho máximo (px) del área de contenido (coherente con `--ds-content-max`). */
  contentMaxWidth: 1600,
  /** Clase BEM del contenedor de la tabla (radio, borde y fondo en `data-table.component.scss`). */
  surface: 'data-table__surface',
  /** Registros por página en los catálogos paginados. */
  defaultPageSize: 10,
  /** Máximo de botones de página antes de recurrir a elipsis. */
  maxPageButtons: 7
} as const);

/**
 * Mapa tono semántico → modificador BEM del chip de estado
 * (los colores viven en `status-chip.component.scss`).
 * Única fuente de la verdad cromática para ACTIVO / INACTIVO / BLOQUEADO, etc.
 */
export const CHIP_TONE_CLASSES = Object.freeze({
  success: 'status-chip--success',
  danger: 'status-chip--danger',
  warning: 'status-chip--warning',
  info: 'status-chip--info',
  primary: 'status-chip--primary',
  neutral: 'status-chip--neutral',
  critical: 'status-chip--critical'
} as const);

/** Mapa de alineación de columna → modificador BEM de celda. */
export const COLUMN_ALIGN_CLASSES = Object.freeze({
  left: 'data-table__cell--align-left',
  center: 'data-table__cell--align-center',
  right: 'data-table__cell--align-right'
} as const);

/**
 * Visibilidad responsiva por breakpoint → modificador BEM de celda.
 * Coherente con la Regla 4 (soporte iPad): en mini-rail el contenido gana
 * +160px, por lo que las columnas secundarias reaparecen desde `md`.
 */
export const COLUMN_VISIBILITY_CLASSES = Object.freeze({
  sm: 'data-table__cell--from-sm',
  md: 'data-table__cell--from-md',
  lg: 'data-table__cell--from-lg'
} as const);
