/**
 * ============================================================================
 * PAZAVI TMS - REGLAS DE ORO DE LA TARJETA DE ENTIDAD (`ENTITY_CARD_DIMENSIONS`)
 * ============================================================================
 * Generalización de `ROUTE_CARD_DIMENSIONS` para entidades SIN grafo de
 * paradas (Vehículos, Conductores, Usuarios y las 16 paramétricas).
 *
 * A DIFERENCIA de la tarjeta de ruta maestra, aquí los valores son NÚMEROS EN
 * PÍXELES, no cadenas de clases. La plantilla los consume por enlace de estilo
 * a través de `EntityCardEngine`, de modo que estas constantes son la fuente
 * de la verdad REAL y no documentación paralela: cambiar un número aquí mueve
 * la interfaz, y la auditoría de reglas de oro verifica la identidad.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ PADDING_Y = 20                                                       │
 * │ ┌──────────────────────────────────────────────────────────────────┐ │
 * │ │ HEADER_HEIGHT = 76   (INVARIANTE: alinea todas las filas)        │ │
 * │ ├──────────────────────────────────────────────────────────────────┤ │
 * │ │ GAP_TOP = 12                                                     │ │
 * │ │ BODY = 130 | 190 | 250   (ADAPTATIVO: escalón según densidad)    │ │
 * │ │ GAP_BOTTOM = 12                                                  │ │
 * │ ├──────────────────────────────────────────────────────────────────┤ │
 * │ │ FOOTER_HEIGHT = 48   (INVARIANTE: anclado con margin-top: auto)  │ │
 * │ └──────────────────────────────────────────────────────────────────┘ │
 * │ PADDING_Y = 20                                                       │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * IDENTIDAD ARITMÉTICA (verificada por test):
 *   expandida  = 2·PADDING_Y + HEADER + GAP_TOP + BODY + GAP_BOTTOM + FOOTER
 *   colapsada  = 2·PADDING_Y + HEADER + FOOTER = 164
 *
 * Lo que se congela es el MARCO (header, footer, paddings, retícula).
 * Lo que se adapta es el CUERPO. Y la altura se resuelve por MÓDULO, nunca
 * por tarjeta: dentro de una misma retícula todas miden igual y no hay
 * brincos entre filas.
 *
 * NO MODIFICAR SIN AUTORIZACIÓN EXPLÍCITA.
 * ============================================================================
 */
export const ENTITY_CARD_DIMENSIONS = Object.freeze({
  // ---- INVARIANTES (px) -------------------------------------------------
  /** Padding vertical de la superficie (20px por lado). */
  PADDING_Y: 20,
  /** Cabecera de dos filas. Invariante que alinea el grid. */
  HEADER_HEIGHT: 76,
  /** Pie anclado con `margin-top: auto`. Invariante. */
  FOOTER_HEIGHT: 48,
  /** Separación entre cabecera y cuerpo (margen superior del cuerpo). */
  GAP_TOP: 12,
  /** Separación entre cuerpo y pie. */
  GAP_BOTTOM: 12,

  // ---- ESCALONES DE CUERPO (px) ----------------------------------------
  /** ≤3 filas de detalle. */
  BODY_COMPACT: 130,
  /** 4 a 5 filas. También el escalón de los motores con lienzo 320×140. */
  BODY_NORMAL: 190,
  /** 6 filas o más. */
  BODY_DENSE: 250,

  // ---- MÉTRICA DE FILA --------------------------------------------------
  /** Altura atómica de una fila etiqueta/valor. Una celda NUNCA la altera. */
  DETAIL_ROW_HEIGHT: 32,
  /** Altura del rótulo "DETALLE DEL REGISTRO:". */
  DETAIL_TITLE_HEIGHT: 26,

  // ---- UMBRALES DE ESCALÓN ---------------------------------------------
  TIER_COMPACT_MAX_ROWS: 3,
  TIER_NORMAL_MAX_ROWS: 5,

  // ---- PRESENTACIÓN -----------------------------------------------------
  /**
   * Clase BEM de la superficie de la tarjeta (radio 24px, igual que la ruta
   * maestra). Los estilos viven en `entity-card.component.scss`.
   */
  SURFACE: 'entity-card__surface',
  /**
   * Retícula responsiva. Conforme a la Regla 4 de arquitectura: 1 columna en
   * móvil, 2 columnas amplias en iPad y 3 desde `xl`. Clase BEM; los estilos
   * viven en `entity-card-grid.component.scss`.
   */
  GRID: 'entity-card-grid__grid'
} as const);

export type EntityCardDimensions = typeof ENTITY_CARD_DIMENSIONS;
