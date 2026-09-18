/**
 * ============================================================================
 * PAZAVI TMS - REGLAS DE ORO DE LOS BLOQUES (`CARD_BLOCK_RULES`)
 * ============================================================================
 * Métrica de los bloques que componen el cuerpo de una tarjeta.
 *
 * A diferencia de los motores anteriores, aquí NO hay coordenadas: la
 * retícula la resuelve CSS. Estas constantes fijan las cotas -tamaños
 * mínimos, separaciones, umbrales de escalón- dentro de las que CSS trabaja.
 *
 * NO MODIFICAR SIN AUTORIZACIÓN EXPLÍCITA.
 * ============================================================================
 */
export const CARD_BLOCK_RULES = Object.freeze({
  /**
   * Umbrales de ancho REAL de la tarjeta, en píxeles.
   * Sustituyen al escalado: la composición cambia, la tipografía no.
   */
  WIDTH_TIERS: Object.freeze({
    /**
     * Calibrados contra los anchos REALES que produce la retícula:
     *   320px en iPad mini (2 columnas)   ·   366-371px de iPad Pro a portátil
     *   504px en pantalla ancha (3 columnas sobre 1600px de contenido)
     * Con umbrales más altos el escalón `wide` no llegaba a activarse nunca.
     */
    NARROW_MAX: 345,
    MEDIUM_MAX: 460
  }),

  /** Separación vertical entre bloques del cuerpo. */
  BLOCK_GAP: 10,

  MATRIX: Object.freeze({
    GAP: 3,
    RADIUS: 2,
    /** Ancho objetivo de celda cuando el bloque no fija columnas. */
    TARGET_CELL_WIDTH: 26,
    /**
     * Alto mínimo de referencia. NO es una cota dura: las filas se reparten
     * el alto disponible con `minmax(0, 1fr)` para que la retícula jamás
     * desborde su contenedor, por densa que sea la unidad.
     */
    MIN_CELL_HEIGHT: 8,
    MAX_CELL_HEIGHT: 26,
    /**
     * Cotas de la celda muda. Sin ellas, un piso de 50 plazas en una tarjeta
     * ancha estiraba cada butaca hasta 68x10px: dejaba de leerse como butaca
     * y pasaba a leerse como barra. Con tope, la retícula se centra y
     * conserva proporción de asiento.
     */
    DOT_MAX_WIDTH: 34,
    DOT_MAX_HEIGHT: 15,
    /** Celdas con rótulo necesitan alto suficiente para el texto. */
    TILE_MIN_HEIGHT: 30,
    MAX_COLUMNS: 16,
    MIN_COLUMNS: 2
  }),

  STAT: Object.freeze({
    HERO_SIZE: 30,
    NORMAL_SIZE: 18,
    CAPTION_SIZE: 9,
    /** En tarjetas estrechas la cifra principal se modera. */
    HERO_SIZE_NARROW: 24
  }),

  METER: Object.freeze({
    HEIGHT: 5,
    RADIUS: 3
  }),

  /** Alto atómico de una fila etiqueta/valor. Una celda nunca lo altera. */
  KEYVALUE_ROW_HEIGHT: 30,

  MOTION: Object.freeze({
    /** Curva tipo muelle para el crecimiento de la tarjeta. */
    SPRING: 'cubic-bezier(0.32, 0.72, 0, 1)',
    /** Duración del despliegue del marco. */
    EXPAND_MS: 420,
    /** Duración de entrada de cada bloque. */
    BLOCK_MS: 320,
    /** Retardo acumulado por bloque, en milisegundos. */
    STAGGER_MS: 45,
    /** Tope de escalonado: más allá se percibe como lentitud. */
    MAX_STAGGER_STEPS: 6
  })
} as const);

export type CardBlockRules = typeof CARD_BLOCK_RULES;
