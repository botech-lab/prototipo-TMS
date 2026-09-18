import { TableRowBase } from '@models';

/** Condición de acceso de la cuenta a la plataforma. */
export type UserStatus = 'OPERATIVO' | 'BLOQUEADO';

/** Rol de autorización asignable dentro del sistema. */
export type UserRole =
  | 'ADMIN'
  | 'USER'
  | 'SUPERVISOR'
  | 'OPERADOR'
  | 'VENDEDOR'
  | 'AGENTE'
  | 'CLIENTE';

/** Cuenta de acceso a la plataforma. */
export interface SystemUser extends TableRowBase {
  /** Nombre de usuario sin el prefijo `@`. */
  readonly username: string;
  readonly fullName: string;
  readonly email: string;
  /** Permisos asignados. Puede estar vacío (cuenta sin roles). */
  readonly roles: readonly UserRole[];
  readonly status: UserStatus;
}
