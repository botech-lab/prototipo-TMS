import { USER_PRIVILEGE_RULES } from '@core';
import { ChipTone } from '@models';
import { SystemUser, UserRole } from '../models/user.model';

/** Una celda de la matriz: un rol del sistema, concedido o ausente. */
export interface RoleCell {
  readonly label: string;
  readonly weight: number;
  /** `true` si la cuenta posee este rol. */
  readonly assigned: boolean;
}

export interface PrivilegeEngineOutput {
  /** Peso máximo entre los roles de la cuenta, de 0 a 5. */
  readonly level: number;
  readonly levelLabel: string;
  readonly tone: ChipTone;
  /** Las 7 celdas del universo de roles, ordenadas por peso descendente. */
  readonly cells: readonly RoleCell[];
  readonly assignedCount: number;
  readonly totalSystemRoles: number;
  readonly summary: string;
  /** Cobertura = roles concedidos / roles del sistema. */
  readonly coverageRatio: number;
}

/**
 * ============================================================================
 * MOTOR DE DOMINIO DEL PRIVILEGIO (`UserPrivilegeEngine`)
 * ============================================================================
 * Tercer hermano, tras el de flota (espacio) y el de licencias (tiempo). Aquí
 * el eje es la AUTORIZACIÓN.
 *
 * LAS 3 ECUACIONES DE DOMINIO:
 *
 * 1. PRIVILEGIO POR MÁXIMO, NUNCA POR SUMA
 *    nivel = max(peso(rol)) para todo rol de la cuenta;  0 si no tiene roles
 *    Cinco roles básicos no equivalen a un ADMIN. La suma sería una lectura
 *    de seguridad falsa y peligrosa.
 *
 * 2. MATRIZ COMPLETA DE TAMAÑO FIJO
 *    Se devuelven SIEMPRE los 7 roles del sistema. La geometría no depende de
 *    cuántos tenga la cuenta, así que ninguna tarjeta deja aire muerto y se
 *    ve además lo que la cuenta NO tiene, que en seguridad importa igual.
 *
 * 3. ORDEN POR PESO DESCENDENTE
 *    El rol más crítico ocupa siempre la primera celda.
 *
 * (Las antiguas ecuaciones de medición tipográfica y desborde `+N` dejan de
 *  hacer falta: al dibujarse el universo completo no hay nada que ocultar, y
 *  el ajuste al ancho lo resuelve CSS Grid.)
 * ============================================================================
 */
export class UserPrivilegeEngine {
  static calculate(user: SystemUser | null): PrivilegeEngineOutput {
    const { ROLE_WEIGHTS, SYSTEM_ROLES, LEVELS } = USER_PRIVILEGE_RULES;

    const roles: readonly UserRole[] = user?.roles ?? [];
    const owned = new Set<string>(roles);

    // ---- Ecuación 1: privilegio por máximo -----------------------------
    const level = roles.reduce((max, role) => Math.max(max, ROLE_WEIGHTS[role] ?? 0), 0);

    // ---- Ecuaciones 2 y 3: matriz completa, ordenada por peso ----------
    const cells: RoleCell[] = SYSTEM_ROLES.map(label => ({
      label,
      weight: ROLE_WEIGHTS[label as UserRole] ?? 0,
      assigned: owned.has(label)
    }));

    const total = SYSTEM_ROLES.length;
    const assignedCount = roles.length;

    return {
      level,
      levelLabel: LEVELS.LABELS[level] ?? LEVELS.LABELS[0],
      tone: (LEVELS.TONES[level] ?? LEVELS.TONES[0]) as ChipTone,
      cells,
      assignedCount,
      totalSystemRoles: total,
      summary: this.buildSummary(assignedCount, total),
      coverageRatio: total > 0 ? Math.min(1, assignedCount / total) : 0
    };
  }

  private static buildSummary(assigned: number, total: number): string {
    if (assigned === 0) {
      return 'Cuenta sin roles asignados';
    }
    return assigned === 1
      ? `1 de ${total} roles del sistema`
      : `${assigned} de ${total} roles del sistema`;
  }
}
