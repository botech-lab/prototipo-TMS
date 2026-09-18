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
 * PAZAVI TMS - REGLAS DE ORO DEL MAPA DE PLAZAS (`VEHICLE_CAPACITY_RULES`)
 * ============================================================================
 * Reglas de DOMINIO del reparto de flota. Conservan el principio del grafo de
 * rutas -el dato ES la geometría: cada plaza se dibuja como una butaca- pero
 * ya no contienen coordenadas: la retícula la resuelve CSS a partir del ancho
 * real de la tarjeta, sin escalar ningún lienzo.
 *
 * NO MODIFICAR SIN AUTORIZACIÓN EXPLÍCITA.
 * ============================================================================
 */
export const VEHICLE_CAPACITY_RULES = deepFreeze({
  DECKS: {
    /** Butacas por fila en disposición estándar (2 + pasillo + 2). */
    SEATS_ACROSS_NORMAL: 4,
    /** Disposición densa para pisos muy cargados (3 + pasillo + 3). */
    SEATS_ACROSS_DENSE: 6,
    /** A partir de estas plazas por piso se pasa a disposición densa. */
    DENSE_THRESHOLD: 40,
    /**
     * Máximo de pisos dibujables. Por encima, los restantes se agregan en la
     * última columna (criterio anti-huérfanos del grafo de rutas).
     */
    MAX_RENDERED: 4,
  },
  CARGO: {
    /**
     * Referencia de normalización de la barra de carga, en kilogramos.
     * Corresponde a la unidad de mayor capacidad de la flota.
     */
    REFERENCE_MAX_KG: 5000,
  }
} as const);

export type VehicleCapacityRules = typeof VEHICLE_CAPACITY_RULES;
