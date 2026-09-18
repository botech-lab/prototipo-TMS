import { Injectable, computed, signal } from '@angular/core';
import { USERS_MOCK } from '../data/users.mock';
import { SystemUser } from '../models/user.model';

/**
 * ============================================================================
 * SIGNALS STORE - GESTIÓN DE USUARIOS
 * ============================================================================
 * Control de accesos, roles y seguridad de la plataforma.
 * ============================================================================
 */
@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly users = signal<readonly SystemUser[]>(USERS_MOCK);

  /** Término de búsqueda por nombre de usuario o nombre completo. */
  readonly searchQuery = signal<string>('');

  readonly filteredUsers = computed<readonly SystemUser[]>(() => {
    const term = this.searchQuery().trim().toLowerCase();
    if (!term) {
      return this.users();
    }

    return this.users().filter(user =>
      `${user.username} ${user.fullName} ${user.email}`.toLowerCase().includes(term)
    );
  });

  readonly totalCount = computed<number>(() => this.users().length);

  /** Cuentas sin acceso, útil como indicador de seguridad en la cabecera. */
  readonly blockedCount = computed<number>(
    () => this.users().filter(user => user.status === 'BLOQUEADO').length
  );

  /** Alterna OPERATIVO/BLOQUEADO de una cuenta (switch de la tarjeta). */
  toggleStatus(id: string): void {
    this.users.update(list =>
      list.map(user =>
        user.id === id
          ? { ...user, status: user.status === 'OPERATIVO' ? 'BLOQUEADO' : 'OPERATIVO' }
          : user
      )
    );
  }

  /** Alta. Se antepone para que aparezca de inmediato. */
  add(user: SystemUser): void {
    this.users.update(list => [user, ...list]);
  }

  /** Reemplaza un registro existente (edición). Conserva su posición. */
  update(user: SystemUser): void {
    this.users.update(list => list.map(current => (current.id === user.id ? user : current)));
  }

  remove(id: string): void {
    this.users.update(list => list.filter(user => user.id !== id));
  }

  /** Posición actual en el padrón completo, o -1. */
  indexOf(id: string): number {
    return this.users().findIndex(user => user.id === id);
  }

  /** Reinserta un registro eliminado en su posición original (deshacer). */
  restore(user: SystemUser, index: number): void {
    this.users.update(list => {
      const at = Math.min(Math.max(index, 0), list.length);
      return [...list.slice(0, at), user, ...list.slice(at)];
    });
  }
}
