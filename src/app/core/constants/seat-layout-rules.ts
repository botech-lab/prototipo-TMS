function deepFreeze<T>(obj: T): T {
  Object.keys(obj as any).forEach(prop => {
    const val = (obj as any)[prop];
    if (val !== null && (typeof val === 'object' || typeof val === 'function')) {
      deepFreeze(val);
    }
  });
  return Object.freeze(obj);
}

/**
 * ============================================================================
 * PAZAVI TMS - REGLAS DE ORO DEL DISEÑADOR DE PLAZAS (`SEAT_LAYOUT_RULES`)
 * ============================================================================
 * Parámetros INMUTABLES del editor de distribución de butacas: geometría del
 * plano, objetivo táctil, numeración, tarifa por reglas, presets y paletas.
 *
 * El plano se guarda SIEMPRE en coordenadas de bus; la orientación en pantalla
 * es solo una transposición al renderizar.
 *
 * NO MODIFICAR SIN AUTORIZACIÓN EXPLÍCITA.
 * ============================================================================
 */
export const SEAT_LAYOUT_RULES = deepFreeze({
  GRID: {
    DEFAULT_LENGTH: 12,
    MIN_LENGTH: 4,
    MAX_LENGTH: 20,
    /** Butacas a lo ancho en disposición estándar (2 + pasillo + 2). */
    SEATS_ACROSS_NORMAL: 4,
    /** Disposición densa (3 + pasillo + 3). */
    SEATS_ACROSS_DENSE: 6,
    /** Umbral de plazas por piso a partir del cual se sugiere la densa. */
    DENSE_THRESHOLD: 40,
    AISLE_WIDTH: 1,
    MAX_SIDE: 3,
  },
  /**
   * Morph de columnas. Cada preset fija butacas a izquierda y derecha del
   * pasillo; el motor conserva las butacas ya colocadas ancladas a su ventana.
   */
  COLUMN_PRESETS: [
    { id: '1', label: '1', left: 1, right: 0 },
    { id: '2', label: '2', left: 1, right: 1 },
    { id: '2+1', label: '2+1', left: 2, right: 1 },
    { id: '2+2', label: '2+2', left: 2, right: 2 },
    { id: '3+2', label: '3+2', left: 3, right: 2 },
    { id: '3+3', label: '3+3', left: 3, right: 3 },
  ],
  CELL: {
    BASE_SIZE: 52,
    /** Objetivo táctil mínimo (Apple HIG: 44pt). */
    MIN_TOUCH_TARGET: 44,
    GAP: 6,
    RADIUS: 10,
    AISLE_RATIO: 0.55,
  },
  ZOOM: { MIN: 0.6, MAX: 1.6, STEP: 0.2, DEFAULT: 1 },
  PORTRAIT_BREAKPOINT: 768,
  NUMBERING: {
    DEFAULT_STRATEGY: 'sides',
    DEFAULT_SCOPE: 'continuous',
    FIRST_NUMBER: 1,
    /**
     * Butacas que NO se venden y por tanto NO llevan número de venta: la
     * ambulatoria (sin reserva) y la de relevo (descanso de tripulación).
     * Se saltan al numerar y no aparecen en el manifiesto.
     */
    UNNUMBERED: ['AMB', 'REL'],
    /** Sentido del recorrido. El estándar es frente→fondo empezando por el conductor. */
    DEFAULT_DIRECTION: { origin: 'front', side: 'driver' },
    LABELS: {
      sides: 'Ventana impar · pasillo par',
      aisleOdd: 'Ventana par · pasillo impar',
      rows: 'Por fila · 1,2 | 3,4',
    },
    DIRECTION_LABELS: {
      front: 'del frente al fondo', rear: 'del fondo al frente',
      driver: 'empezando por el conductor', door: 'empezando por la puerta',
    },
  },
  /** Ancho de la pestaña flotante cuando el panel derecho está plegado. */
  ZEN_TAB_WIDTH: 40,

  /** Duraciones de gestos con punto ciego (el DOM cambia a mitad). */
  ANIMATION: { FLIP_MS: 320, LAND_MS: 480 },

  /**
   * FÍSICA DEL DOBLE PISO. La escalera es asimétrica: abajo nace en el
   * vestíbulo (fila de cabina, junto a puerta y mampara) y no quita butacas;
   * arriba desemboca en el salón y reserva una celda.
   */
  VESTIBULE: {
    /** Fila del vestíbulo en la planta baja (la de cabina y puerta). */
    ROW: 0,
    /** Rótulos de orientación del chasis (estándar Sudamérica: se conduce a la izquierda). */
    SIDE_LABELS: { driver: '▼ Lado izquierdo (conductor)', doors: '▲ Lado derecho (puertas de embarque)', front: 'Frente', rear: 'Parte trasera' },
    /** Etiqueta del hueco de escalera en la planta alta. */
    HOLE_LABEL: 'Hueco escalera',
    /** Fila (0-based) de la planta alta donde emerge la escalera "delantera". */
    FRONT_ARRIVAL_ROW: 1,
    /** Escalera por defecto según carrocería reconocida en el texto. */
    CHASSIS_STAIRS: { marcopolo: 'front-right', comil: 'front-right' } as const,
    CHASSIS_PATTERNS: { marcopolo: 'marcopolo|paradiso|\\bg[78]\\b', comil: 'comil|campione', irizar: 'irizar|\\bi[68]\\b' } as const
  },
  HISTORY: { MAX_STEPS: 50 },
  /** Trazo luminoso de la numeración en serpiente. */
  SNAKE: { STROKE: '#0EA5E9', GLOW: 'rgba(14, 165, 233, 0.35)', WIDTH: 4 },
  /**
   * Seis acentos elegantes para tipos de butaca creados al vuelo. Relleno,
   * borde y texto vienen calibrados: el popover solo elige el nombre.
   */
  ACCENTS: {
    zafiro:    { label: 'Zafiro',    fill: '#E0EDFF', stroke: '#1E4FD8', text: '#123A9E' },
    esmeralda: { label: 'Esmeralda', fill: '#DDF5EA', stroke: '#0F8A5F', text: '#0A5C40' },
    grafito:   { label: 'Grafito',   fill: '#ECEEF1', stroke: '#3F4753', text: '#1F242B' },
    dorado:    { label: 'Dorado',    fill: '#FFF2CC', stroke: '#B8860B', text: '#7A5A07' },
    borgona:   { label: 'Borgoña',   fill: '#F9E1E6', stroke: '#8B1E3F', text: '#5E1329' },
    violeta:   { label: 'Violeta',   fill: '#EEE6FF', stroke: '#6D28D9', text: '#4C1D95' },
  },
  /** Paradas del deslizador de reclinación, en grados. */
  RECLINE_STOPS: [120, 140, 160, 180],
  /**
   * Apariencia de los tipos de butaca del catálogo sin acento propio.
   * Paleta "Amanecer andino" (valores de --cat-N-bg / --cat-N-fg en _tokens.scss):
   * fondo suave de la categoría; número y base de 3px en el tono fuerte.
   *   VIP  cat-5 ciruela   CAM cat-1 cobre   SEM cat-2 cielo
   *   EST  neutral         AMB cat-3 salvia  REL cat-6 quinua
   *   DEFAULT (cualquier otro código sin acento) cat-4 maíz
   */
  SEAT_APPEARANCE: {
    EST: { icon: '💺', label: 'Estándar', fill: '#EFEEEB', stroke: '#4E4A46', text: '#4E4A46' },
    SEM: { icon: '🛋️', label: 'Semicama', fill: '#E3F1F7', stroke: '#1F6F8B', text: '#1F6F8B' },
    CAM: { icon: '🛏️', label: 'Cama', fill: '#FBEDE6', stroke: '#B04E26', text: '#B04E26' },
    VIP: { icon: '👑', label: 'VIP', fill: '#F1E9F5', stroke: '#7A4B8C', text: '#7A4B8C' },
    AMB: { icon: '🚶', label: 'Ambulatorio', fill: '#E6F2EB', stroke: '#356B51', text: '#356B51' },
    REL: { icon: '🧑‍✈️', label: 'Relevo', fill: '#FAE8EF', stroke: '#B03E68', text: '#B03E68' },
    DEFAULT: { icon: '▪', label: 'Butaca', fill: '#FBF1DA', stroke: '#8C6310', text: '#8C6310' },
  },
  FIXTURES: {
    cabin: { icon: '🛞', label: 'Cabina', fill: '#1F2937', stroke: '#111827' },
    door: { icon: '🚪', label: 'Puerta', fill: '#FDE68A', stroke: '#B45309' },
    bathroom: { icon: '🚻', label: 'Baño', fill: '#DBEAFE', stroke: '#1D4ED8' },
    stairs: { icon: '🪜', label: 'Escalera', fill: '#FCE7F3', stroke: '#BE185D' },
    table: { icon: '☕', label: 'Mesa', fill: '#F5F5F4', stroke: '#78716C' },
  },
  /** Comodidades asignables a mano (capa de equipamiento). */
  AMENITIES: {
    usb: { icon: '🔌', label: 'USB' },
    screen: { icon: '📺', label: 'Pantalla' },
    wifi: { icon: '📶', label: 'Wi-Fi' },
    outlet: { icon: '⚡', label: 'Enchufe' },
    tray: { icon: '🍽️', label: 'Mesa plegable' },
  },
  /** Características derivadas de la geometría, con su glifo. */
  TRAITS: {
    window: { icon: '🪟', label: 'Ventana' },
    aisle: { icon: '🚹', label: 'Pasillo' },
    bulkhead: { icon: '🧱', label: 'Mampara' },
    panoramic: { icon: '🌄', label: 'Panorámica' },
    lavatory: { icon: '🚻', label: 'Junto al baño' },
    legroom: { icon: '🦵', label: 'Espacio extra' },
  },
  /**
   * Motor de tarifa por reglas. Se evalúan EN ORDEN y gana la primera que
   * coincide; `fare` es el NOMBRE del registro en `tipos-categoria-tarifa`.
   * `rank` alimenta el heatmap: mayor = más caro = más cálido.
   */
  FARE_RULES: [
    { trait: 'panoramic', fare: 'Premium',    rank: 4 },
    { trait: 'legroom',   fare: 'Ejecutivo',  rank: 3 },
    { trait: 'bulkhead',  fare: 'Ejecutivo',  rank: 3 },
    { trait: 'lavatory',  fare: 'Estudiante', rank: 1 },
  ],
  FARE_DEFAULT: { fare: 'Normal', rank: 2 },
  /** Rampa del heatmap por rango de tarifa (1 = económico, 4 = premium). */
  FARE_HEAT: {
    1: { fill: '#DCFCE7', stroke: '#16A34A', text: '#14532D' },
    2: { fill: '#F1F5F9', stroke: '#64748B', text: '#334155' },
    3: { fill: '#FEF3C7', stroke: '#D97706', text: '#78350F' },
    4: { fill: '#FDE68A', stroke: '#B45309', text: '#78350F' },
  },
  /** Presets de chasis: arman un bus completo de un toque. */
  CHASSIS_PRESETS: [
    { id: 'interurbano', label: 'Interurbano 2+2', description: '12 filas Semicama, baño al fondo', floors: 1, length: 12, left: 2, right: 2, seatTypes: ['SEM'], bathroom: true },
    { id: 'cama-21', label: 'Cama 2+1', description: '10 filas Cama con pasillo descentrado', floors: 1, length: 10, left: 2, right: 1, seatTypes: ['CAM'], bathroom: true },
    { id: 'doble-lujo', label: 'Doble piso lujo', description: 'P1 VIP 2+1 · P2 Cama 2+2, escalera y baño', floors: 2, length: 11, left: 2, right: 2, seatTypes: ['VIP', 'CAM'], bathroom: true },
    { id: 'minibus', label: 'Minibús 2+1', description: '6 filas Estándar, sin baño', floors: 1, length: 6, left: 2, right: 1, seatTypes: ['EST'], bathroom: false },
  ],
  SHORTCUTS: {
    SELECT: 'v', ERASE: 'e', NUMBER: 'n', MOVE: 'h', AUTO_NUMBER: 'a', MIRROR: 'm',
    DUPLICATE: 'd', UNDO: 'z', REDO: 'y', PREVIEW: 'p',
    SEAT_TOOL_DIGITS: true,
  },
  /**
   * Semáforo de coherencia. Los códigos listados ponen una luz en ROJO y
   * BLOQUEAN el guardado; el resto de avisos la ponen en ámbar y solo informan.
   * (Refina la regla 7: la validación informa, salvo que el plano sea
   * operativamente inválido.)
   */
  TRAFFIC: {
    BLOCKING_CODES: ['OVER_CAPACITY', 'DUPLICATE_NUMBERS'],
  },
  /**
   * CARROCERÍAS DE REFERENCIA. `homologated: false` en todas: son medidas
   * públicas aproximadas para arrancar, NO fichas oficiales del fabricante.
   * Sustituir cada entrada por datos homologados cuando existan.
   */
  BODY_TEMPLATES: [
    {
      id: 'marcopolo-paradiso-g8-1800-dd', brand: 'Marcopolo', model: 'Paradiso G8 1800 DD', homologated: false,
      reference: 'Doble piso · P1 cama 2+1 · P2 semicama 2+2 · baño al fondo · escalera central',
      spec: { decks: [{ length: 5, left: 2, right: 1, seatType: 'CAM' }, { length: 12, left: 2, right: 2, seatType: 'SEM' }],
        bathroom: 'rear-right', doors: 'front-middle', stairs: 'middle-left', emergencyExitRows: [[2], [4, 9]] }
    },
    {
      id: 'irizar-i8', brand: 'Irizar', model: 'i8', homologated: false,
      reference: 'Un piso · semicama 2+2 · 13 filas · baño al fondo · dos puertas',
      spec: { decks: [{ length: 13, left: 2, right: 2, seatType: 'SEM' }], bathroom: 'rear-right', doors: 'front-middle', stairs: 'none', emergencyExitRows: [[4, 9]] }
    },
    {
      id: 'scania-touring-hd', brand: 'Scania', model: 'Touring HD', homologated: false,
      reference: 'Un piso · semicama 2+2 · 12 filas · baño al fondo',
      spec: { decks: [{ length: 12, left: 2, right: 2, seatType: 'SEM' }], bathroom: 'rear-right', doors: 'front', stairs: 'none', emergencyExitRows: [[3, 8]] }
    },
    {
      id: 'mercedes-sprinter-515', brand: 'Mercedes-Benz', model: 'Sprinter 515', homologated: false,
      reference: 'Minibús · estándar 2+1 · 6 filas · sin baño',
      spec: { decks: [{ length: 6, left: 2, right: 1, seatType: 'EST' }], bathroom: 'none', doors: 'front', stairs: 'none', emergencyExitRows: [[3]] }
    },
  ],
  /**
   * PRESETS INDUSTRIALES para crear una unidad con un clic. `vehicleTypeName`
   * apunta a `tipo-vehiculos`: peso máximo y licencia salen de ahí, no de aquí.
   */
  VEHICLE_PRESETS: [
    { id: 'clasico', label: 'Bus Clásico Interurbano', description: '1 piso · 40 pasajeros · 2+2 Semicama', vehicleTypeName: 'Bus Semicama', floors: 1, passengerCapacity: 40,
      spec: { decks: [{ length: 11, left: 2, right: 2, seatType: 'SEM' }], bathroom: 'rear-right', doors: 'front-middle', stairs: 'none' } },
    { id: 'suite-dd', label: 'Bus Suite Doble Piso (Leito)', description: '2 pisos · P1 12 Cama 180° (2+1) · P2 44 Semicama (2+2)', vehicleTypeName: 'Bus Cama Completo', floors: 2, passengerCapacity: 56,
      spec: { decks: [{ length: 5, left: 2, right: 1, seatType: 'CAM' }, { length: 11, left: 2, right: 2, seatType: 'SEM' }], bathroom: 'rear-right', doors: 'front-middle', stairs: 'middle-left' } },
    { id: 'minibus', label: 'Minibús / Transfer Directo', description: '1 piso · 14 pasajeros · 2+1 Express', vehicleTypeName: 'Minibús', floors: 1, passengerCapacity: 14,
      spec: { decks: [{ length: 6, left: 2, right: 1, seatType: 'EST' }], bathroom: 'none', doors: 'front', stairs: 'none' } },
    { id: 'custom', label: 'Personalizado', description: 'Lienzo limpio para diseñar desde cero', vehicleTypeName: 'Bus Normal', floors: 1, passengerCapacity: 40, spec: null },
  ],
  /** Vocabulario del intérprete de texto (Quick Prompt). Minúsculas, sin acentos. */
  PROMPT: {
    SEAT_WORDS: {
      cama: 'CAM', camas: 'CAM', leito: 'CAM',
      semicama: 'SEM', semicamas: 'SEM', 'semi cama': 'SEM',
      vip: 'VIP', suite: 'VIP', suites: 'VIP', ejecutivo: 'VIP', ejecutivos: 'VIP',
      estandar: 'EST', normal: 'EST', normales: 'EST', regular: 'EST', asiento: 'EST', asientos: 'EST',
      ambulatorio: 'AMB', ambulatorios: 'AMB',
      relevo: 'REL', relevos: 'REL', 'chofer de relevo': 'REL', 'conductor de relevo': 'REL', tripulacion: 'REL', auxiliar: 'REL',
    },
    /**
     * LISTA NEGRA DEL PARSER. Sustantivos del chasis y adjetivos de
     * numeración: jamás son un tipo de butaca, ni siquiera uno nuevo. Sin
     * esto, "en el piso 1 pon 44 semicamas" propone crear el tipo "Piso".
     */
    FORBIDDEN_SEAT_NAMES: [
      'piso', 'pisos', 'deck', 'decks', 'planta', 'plantas', 'nivel', 'niveles',
      'asiento', 'asientos', 'butaca', 'butacas', 'plaza', 'plazas', 'pasajero', 'pasajeros', 'pax',
      'fila', 'filas', 'columna', 'columnas', 'lado', 'lados',
      'ventana', 'ventanas', 'pasillo', 'pasillos', 'numeracion', 'numero', 'numeros',
      'par', 'pares', 'impar', 'impares',
      'arriba', 'abajo', 'frente', 'fondo', 'atras', 'medio', 'centro', 'delante', 'adelante',
      'bus', 'buses', 'chasis', 'camion', 'unidad', 'coche', 'carroceria',
      'puerta', 'puertas', 'bano', 'banos', 'escalera', 'escaleras', 'gradas', 'mampara', 'cabina',
      'pon', 'ponme', 'poner', 'quiero', 'queremos', 'necesito', 'dame', 'hazme', 'haz', 'arma', 'armame', 'usa', 'usar', 'seria', 'sean', 'sea',
    ],
    /** Esquema por defecto según el tipo de butaca cuando el texto no lo dice. */
    DEFAULT_SCHEME: { CAM: { left: 2, right: 1 }, VIP: { left: 2, right: 1 }, SEM: { left: 2, right: 2 }, EST: { left: 2, right: 2 }, AMB: { left: 2, right: 2 }, REL: { left: 2, right: 2 } },
    MINIBUS_SCHEME: { left: 2, right: 1 },
  },
  /** Micro-SVG para ticket térmico: tamaño de celda en unidades del viewBox. */
  EXPORT: { SVG_CELL: 10, SVG_GAP: 2, SVG_AISLE: 5, SVG_FONT: 5 }
} as const);

export type SeatLayoutRules = typeof SEAT_LAYOUT_RULES;
