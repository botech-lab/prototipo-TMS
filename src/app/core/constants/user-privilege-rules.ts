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
 * PAZAVI TMS - REGLAS DE ORO DEL PRIVILEGIO (`USER_PRIVILEGE_RULES`)
 * ============================================================================
 * Reglas de DOMINIO de las cuentas. Se dibuja la MATRIZ COMPLETA de roles del
 * sistema -los concedidos encendidos, los ausentes en fantasma-, de modo que
 * la retícula tiene tamaño fijo y una cuenta con 0 roles ocupa lo mismo que
 * una con 7. El reparto en columnas lo resuelve CSS.
 *
 * NO MODIFICAR SIN AUTORIZACIÓN EXPLÍCITA.
 * ============================================================================
 */
export const USER_PRIVILEGE_RULES = deepFreeze({
  /**
   * Peso de autorización de cada rol. El privilegio de una cuenta es el
   * MÁXIMO de los pesos de sus roles, nunca la suma: cinco roles básicos no
   * equivalen a un administrador.
   */
  ROLE_WEIGHTS: {
    ADMIN: 5,
    SUPERVISOR: 4,
    OPERADOR: 3,
    VENDEDOR: 2,
    AGENTE: 2,
    USER: 1,
    CLIENTE: 1,
  },
  /** Universo completo de roles, ordenado por peso descendente. */
  SYSTEM_ROLES: ['ADMIN', 'SUPERVISOR', 'OPERADOR', 'VENDEDOR', 'AGENTE', 'USER', 'CLIENTE'],
  LEVELS: {
    MAX: 5,
    LABELS: ['SIN ACCESO', 'BÁSICO', 'MEDIO', 'ELEVADO', 'ALTO', 'CRÍTICO'],
    TONES: ['neutral', 'info', 'info', 'warning', 'warning', 'danger'],
  },
  MATRIX: {
    /** Columnas de la matriz de roles: 7 celdas en 4 + 3. */
    COLUMNS: 4,
  }
} as const);

export type UserPrivilegeRules = typeof USER_PRIVILEGE_RULES;
