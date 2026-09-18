import { CARD_BLOCK_RULES, ENTITY_CARD_DIMENSIONS } from '@core';
import { CardWidthTier } from '@models';

/** Escalón de densidad de la tarjeta, análogo a los tres radios de nodo. */
export type CardDensityTier = 'compact' | 'normal' | 'dense';

export interface CardGeometry {
  readonly tier: CardDensityTier;
  /** Alto del contenedor de cuerpo, en píxeles. */
  readonly bodyHeight: number;
  /** Alto mínimo de la tarjeta desplegada. */
  readonly expandedHeight: number;
  /** Alto mínimo de la tarjeta en reposo. */
  readonly collapsedHeight: number;
  /** Filas de detalle declaradas por el módulo. */
  readonly rows: number;
  /** Filas que caben sin scroll en el escalón elegido. */
  readonly rowsWithoutScroll: number;
  /** `true` cuando el módulo declara más filas de las que caben. */
  readonly isScrollable: boolean;
}

/**
 * ============================================================================
 * MOTOR DE GEOMETRÍA DE TARJETA (`EntityCardEngine`)
 * ============================================================================
 * Puente puro entre la regla de oro (marco congelado) y los datos (cuerpo
 * variable). Cuarto motor de la familia, junto a los de flota, licencias y
 * privilegios.
 *
 * REGLA CENTRAL: la altura se resuelve por MÓDULO, no por tarjeta. El grid la
 * calcula UNA vez a partir de la definición y la reparte idéntica a todas sus
 * tarjetas. Por eso dos módulos pueden medir distinto sin que ninguna retícula
 * llegue a brincar: nunca conviven en la misma.
 *
 * LAS 3 ECUACIONES:
 *
 * 1. ESCALÓN POR DENSIDAD
 *    filas ≤ 3 → COMPACT (130) · ≤ 5 → NORMAL (190) · resto → DENSE (250)
 *
 * 2. IDENTIDAD ARITMÉTICA DE ALTURA
 *    expandida = 2·PADDING_Y + HEADER + GAP_TOP + BODY + GAP_BOTTOM + FOOTER
 *    colapsada = 2·PADDING_Y + HEADER + FOOTER
 *    Ambas se DERIVAN: ningún número de altura se escribe a mano en plantilla.
 *
 * 3. CAPACIDAD SIN SCROLL
 *    filasSinScroll = ⌊(BODY − DETAIL_TITLE_HEIGHT) / DETAIL_ROW_HEIGHT⌋
 *    Si el módulo declara más filas, el cuerpo activa scroll interno en lugar
 *    de crecer: la altura del marco es intocable.
 * ============================================================================
 */
export class EntityCardEngine {
  /**
   * Ecuación 4: ESCALÓN HORIZONTAL.
   * Se deduce del ancho REAL medido de la tarjeta, no de un breakpoint de
   * ventana: dos tarjetas idénticas en retículas distintas deben componerse
   * distinto, y la ventana no sabe nada de eso.
   */
  static widthTier(width: number): CardWidthTier {
    const { NARROW_MAX, MEDIUM_MAX } = CARD_BLOCK_RULES.WIDTH_TIERS;
    if (width <= 0 || width < NARROW_MAX) {
      return 'narrow';
    }
    return width < MEDIUM_MAX ? 'medium' : 'wide';
  }

  /**
   * Columnas de una matriz cuando el bloque no las fija.
   * Se derivan del ancho útil real para que la retícula lo llene por
   * completo, en vez de escalar un lienzo fijo y dejar aire a los lados.
   */
  static matrixColumns(width: number, cellCount: number): number {
    const { GAP, TARGET_CELL_WIDTH, MAX_COLUMNS, MIN_COLUMNS } = CARD_BLOCK_RULES.MATRIX;
    if (cellCount <= 0 || width <= 0) {
      return MIN_COLUMNS;
    }
    const fit = Math.floor((width + GAP) / (TARGET_CELL_WIDTH + GAP));
    return Math.max(MIN_COLUMNS, Math.min(MAX_COLUMNS, Math.min(fit, cellCount)));
  }

  static calculate(rows: number): CardGeometry {
    const D = ENTITY_CARD_DIMENSIONS;
    const safeRows = Math.max(0, Math.floor(rows));

    // ---- Ecuación 1: escalón por densidad ------------------------------
    const tier: CardDensityTier =
      safeRows <= D.TIER_COMPACT_MAX_ROWS
        ? 'compact'
        : safeRows <= D.TIER_NORMAL_MAX_ROWS
          ? 'normal'
          : 'dense';

    const bodyHeight =
      tier === 'compact'
        ? D.BODY_COMPACT
        : tier === 'normal'
          ? D.BODY_NORMAL
          : D.BODY_DENSE;

    // ---- Ecuación 2: identidad aritmética ------------------------------
    const collapsedHeight = D.PADDING_Y * 2 + D.HEADER_HEIGHT + D.FOOTER_HEIGHT;
    const expandedHeight =
      collapsedHeight + D.GAP_TOP + bodyHeight + D.GAP_BOTTOM;

    // ---- Ecuación 3: capacidad sin scroll ------------------------------
    const rowsWithoutScroll = Math.floor(
      (bodyHeight - D.DETAIL_TITLE_HEIGHT) / D.DETAIL_ROW_HEIGHT
    );

    return {
      tier,
      bodyHeight,
      expandedHeight,
      collapsedHeight,
      rows: safeRows,
      rowsWithoutScroll,
      isScrollable: safeRows > rowsWithoutScroll
    };
  }
}
