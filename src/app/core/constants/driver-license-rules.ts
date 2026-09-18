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
 * PAZAVI TMS - REGLAS DE ORO DE LA VIGENCIA (`DRIVER_LICENSE_RULES`)
 * ============================================================================
 * Reglas de DOMINIO del motor temporal de conductores. Cada MES de vigencia
 * es una celda de una retícula de 12 columnas -un año por fila-, siguiendo el
 * principio de que el dato es la geometría. El posicionamiento lo resuelve
 * CSS Grid; aquí solo vive el significado.
 *
 * NO MODIFICAR SIN AUTORIZACIÓN EXPLÍCITA.
 * ============================================================================
 */
export const DRIVER_LICENSE_RULES = deepFreeze({
  THRESHOLDS: {
    /** A partir de aquí la licencia entra en ventana de renovación. */
    EXPIRING_SOON_DAYS: 90,
    /** Umbral crítico: requiere acción inmediata. */
    CRITICAL_DAYS: 30,
    /** Vigencia estándar, en años. Respaldo cuando falta la fecha de emisión. */
    DEFAULT_TERM_YEARS: 5,
  },
  GRID: {
    /** Un año por fila: 12 columnas alineadas. */
    COLUMNS: 12,
    /** Tope de filas (licencias de hasta 6 años). */
    MAX_ROWS: 6,
    /** Días promedio por mes, para convertir el término a celdas. */
    DAYS_PER_MONTH: 30.44,
  },
  STATES: {
    VIGENTE: { tone: 'success', label: 'VIGENTE' },
    POR_VENCER: { tone: 'warning', label: 'POR VENCER' },
    CRITICA: { tone: 'danger', label: 'CRÍTICA' },
    VENCIDA: { tone: 'neutral', label: 'VENCIDA' },
  }
} as const);

export type DriverLicenseRules = typeof DRIVER_LICENSE_RULES;
