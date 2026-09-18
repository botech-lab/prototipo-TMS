function deepFreeze<T>(obj: T): T {
  Object.keys(obj as any).forEach(prop => {
    const val = (obj as any)[prop];
    if (val !== null && (typeof val === 'object' || typeof val === 'function')) {
      deepFreeze(val);
    }
  });
  return Object.freeze(obj);
}

export const ROUTE_GRAPH_RULES = deepFreeze({
  CANVAS: {
    WIDTH: 460,
    HEIGHT: 200,
    MARGIN_X_DEFAULT: 52,
    MARGIN_X_DENSE: 42,
    MIN_OFFSET_Y: 24,
    /**
     * Ancho mínimo del lienzo adaptable. WIDTH (460) sigue siendo el valor por
     * defecto: solo cambia si el contenedor informa su ancho real.
     */
    MIN_WIDTH: 300,
    /** Espacio bajo la última etiqueta cuando el lienzo crece en alto. */
    BOTTOM_PADDING: 8,
  },
  NODES: {
    RADIUS_LARGE: 18,   // <= 5 paradas
    RADIUS_MEDIUM: 16,  // 6 a 8 paradas
    RADIUS_DENSE: 13.5, // >= 9 paradas
    FONT_SIZE_LARGE: 11.5,
    FONT_SIZE_MEDIUM: 11,
    FONT_SIZE_DENSE: 9.5,
  },
  LABELS: {
    FONT_SIZE_LARGE: 10.5,
    FONT_SIZE_MEDIUM: 10,
    FONT_SIZE_DENSE: 9,
    AVG_CHAR_WIDTH_RATIO: 0.58,
    MIN_COLLISION_CLEARANCE: 12,
    BASE_CURVE_OFFSET: 28,
  },
  GRID: {
    MAX_COLUMNS_NORMAL: 4, // Para rutas de hasta 8 paradas
    MAX_COLUMNS_DENSE: 5,  // Para rutas de 9 a 13 paradas (RM-01 queda en 5-5-3)
    MAX_COLUMNS_MOBILE: 4, // Móvil (< 640px): nunca más de 4 paradas por fila
    MIN_COLUMNS: 3,        // Mínimo al reducir columnas para que quepan las etiquetas
    LABEL_GAP: 8,          // Separación mínima entre etiquetas vecinas de una fila
    ROW_HEIGHT_LARGE: 85,
    ROW_HEIGHT_MEDIUM: 72,
    ROW_HEIGHT_DENSE: 58,
  },
  LINE: {
    /** Trazo punteado neutro (--color-neutral-300, #BDB8B1): el color lo llevan los nodos. */
    COLOR: 'var(--color-neutral-300)',
    STROKE_WIDTH: 2,
    DASH_ARRAY: '6,6',
  },
  /**
   * PALETA "AMANECER ANDINO" (solo color, no toca la geometría).
   * Cada parada se pinta con la categoría de su departamento (--cat-N-fg de
   * _tokens.scss). Nodos extremos: rellenos en el fg de la categoría con el
   * número en blanco. Nodos intermedios: blancos con anillo de 2.5px en el fg.
   * Los valores son variables CSS: el template los aplica con [style.*].
   */
  PALETTE: {
    NODE_INNER_BG: 'var(--color-neutral-0)',
    NODE_INVERSE_TEXT: 'var(--color-neutral-0)',
    LABEL_COLOR: 'var(--color-neutral-700)',
    /** Color de una parada sin departamento conocido. */
    FALLBACK_COLOR: 'var(--color-neutral-500)',
    /** Grosor del anillo del nodo intermedio (trazo, no altera radios ni despejes). */
    RING_WIDTH: 2.5,
    /**
     * Departamento → categoría. Fijas: La Paz 1 (cobre), Cochabamba 2 (cielo),
     * Santa Cruz 3 (salvia), Oruro 4 (maíz); luego Potosí 5 (ciruela) y
     * Chuquisaca 6 (quinua). Los tres restantes reutilizan una categoría
     * elegida para que ninguna ruta del catálogo mezcle dos departamentos
     * con el mismo color: Tarija 2 (no comparte ruta con Cochabamba),
     * Beni 4 (no comparte ruta con Oruro) y Pando 6 (solo va con Beni).
     */
    DEPARTMENT_CATEGORY: {
      'LA PAZ': 1,
      'COCHABAMBA': 2,
      'SANTA CRUZ': 3,
      'ORURO': 4,
      'POTOSÍ': 5,
      'CHUQUISACA': 6,
      'TARIJA': 2,
      'BENI': 4,
      'PANDO': 6,
    },
    /** Parada → departamento (mayúsculas), para colorear sin tocar el modelo StopNode. */
    CITY_DEPARTMENT: {
      'La Paz': 'LA PAZ', 'El Alto': 'LA PAZ', 'Calamarca': 'LA PAZ', 'Patacamaya': 'LA PAZ',
      'Huarina': 'LA PAZ', 'San Pedro de Tiquina': 'LA PAZ', 'Copacabana': 'LA PAZ',
      'Unduavi': 'LA PAZ', 'Caranavi': 'LA PAZ', 'Palos Blancos': 'LA PAZ',
      'Caracollo': 'ORURO', 'Oruro': 'ORURO', 'Challapata': 'ORURO',
      'Cochabamba': 'COCHABAMBA', 'Sacaba': 'COCHABAMBA', 'Colomi': 'COCHABAMBA',
      'Villa Tunari': 'COCHABAMBA', 'Shinahota': 'COCHABAMBA', 'Chimoré': 'COCHABAMBA',
      'Tarata': 'COCHABAMBA', 'Aiquile': 'COCHABAMBA',
      'Santa Cruz': 'SANTA CRUZ', 'Yapacaní': 'SANTA CRUZ', 'Montero': 'SANTA CRUZ',
      'Cabezas': 'SANTA CRUZ', 'Abapó': 'SANTA CRUZ', 'Camiri': 'SANTA CRUZ',
      'Boyuibe': 'SANTA CRUZ', 'San Julián': 'SANTA CRUZ',
      'Potosí': 'POTOSÍ', 'Río Mulatos': 'POTOSÍ', 'Uyuni': 'POTOSÍ', 'Atocha': 'POTOSÍ',
      'Tupiza': 'POTOSÍ', 'Villazón': 'POTOSÍ',
      'Sucre': 'CHUQUISACA', 'Puente Arce': 'CHUQUISACA', 'Tarabuco': 'CHUQUISACA',
      'Yamparáez': 'CHUQUISACA', 'Muyupampa': 'CHUQUISACA', 'Monteagudo': 'CHUQUISACA',
      'Padilla': 'CHUQUISACA',
      'Tarija': 'TARIJA', 'Tarija Terminal': 'TARIJA', 'Villamontes': 'TARIJA',
      'Entre Ríos': 'TARIJA', 'Caraparí': 'TARIJA', 'Yacuiba': 'TARIJA',
      'Trinidad': 'BENI', 'Santa Ana del Yacuma': 'BENI', 'Riberalta': 'BENI',
      'Guayaramerín': 'BENI', 'Yucumo': 'BENI', 'San Borja': 'BENI', 'Rurrenabaque': 'BENI',
      'El Triángulo': 'PANDO', 'Sena': 'PANDO', 'Puerto Rico': 'PANDO', 'Cobija': 'PANDO',
    },
  },
} as const);

export type RouteGraphRules = typeof ROUTE_GRAPH_RULES;
