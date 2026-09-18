import { USER_PRIVILEGE_RULES } from '@core';
import { SystemUser, UserRole } from '../models/user.model';
import { UserPrivilegeEngine } from './user-privilege-engine';

function buildUser(roles: UserRole[]): SystemUser {
  return {
    id: 'usr-test',
    username: 'test',
    fullName: 'Usuario Prueba',
    email: 'test@tmskronos.com',
    roles,
    status: 'OPERATIVO'
  };
}

describe('INTEGRITY GUARDIAN: Motor de Privilegio', () => {
  const { ROLE_WEIGHTS, SYSTEM_ROLES, LEVELS } = USER_PRIVILEGE_RULES;

  it('las reglas de privilegio deben ser inmutables', () => {
    expect(Object.isFrozen(USER_PRIVILEGE_RULES)).toBeTrue();
    expect(() => {
      (USER_PRIVILEGE_RULES.ROLE_WEIGHTS as any).USER = 99;
    }).toThrow();
  });

  // ---- ECUACIÓN 1 -------------------------------------------------------
  describe('Ecuación 1: privilegio por máximo, nunca por suma', () => {
    it('cuatro roles básicos NO deben equivaler a un administrador', () => {
      const many = UserPrivilegeEngine.calculate(
        buildUser(['USER', 'CLIENTE', 'AGENTE', 'VENDEDOR'])
      );
      const admin = UserPrivilegeEngine.calculate(buildUser(['ADMIN']));

      expect(many.level).toBe(ROLE_WEIGHTS.VENDEDOR);
      expect(admin.level).toBe(ROLE_WEIGHTS.ADMIN);
      expect(many.level).toBeLessThan(admin.level);
    });

    it('una cuenta sin roles debe quedar en nivel 0', () => {
      const output = UserPrivilegeEngine.calculate(buildUser([]));
      expect(output.level).toBe(0);
      expect(output.levelLabel).toBe('SIN ACCESO');
      expect(output.summary).toBe('Cuenta sin roles asignados');
    });

    it('el rótulo y el tono deben derivarse del nivel calculado', () => {
      expect(UserPrivilegeEngine.calculate(buildUser(['ADMIN'])).levelLabel).toBe('CRÍTICO');
      expect(UserPrivilegeEngine.calculate(buildUser(['ADMIN'])).tone).toBe('danger');
      expect(UserPrivilegeEngine.calculate(buildUser(['USER'])).levelLabel).toBe('BÁSICO');
      expect(UserPrivilegeEngine.calculate(buildUser(['SUPERVISOR'])).levelLabel).toBe('ALTO');
    });
  });

  // ---- ECUACIÓN 2 -------------------------------------------------------
  describe('Ecuación 2: matriz completa de tamaño fijo', () => {
    it('debe devolver SIEMPRE los 7 roles del sistema', () => {
      const combos: UserRole[][] = [[], ['USER'], ['ADMIN', 'USER'], [...SYSTEM_ROLES] as UserRole[]];
      for (const roles of combos) {
        expect(UserPrivilegeEngine.calculate(buildUser(roles)).cells.length)
          .withContext(`${roles.length} roles`)
          .toBe(SYSTEM_ROLES.length);
      }
    });

    it('la geometría NO debe depender de cuántos roles tenga la cuenta', () => {
      // Es lo que garantiza que ninguna tarjeta deje aire muerto.
      const empty = UserPrivilegeEngine.calculate(buildUser([]));
      const full = UserPrivilegeEngine.calculate(buildUser([...SYSTEM_ROLES] as UserRole[]));
      expect(empty.cells.map(cell => cell.label)).toEqual(full.cells.map(cell => cell.label));
    });

    it('debe marcar como concedidos exactamente los roles de la cuenta', () => {
      const output = UserPrivilegeEngine.calculate(buildUser(['ADMIN', 'USER']));
      const assigned = output.cells.filter(cell => cell.assigned).map(cell => cell.label);
      expect(assigned.sort()).toEqual(['ADMIN', 'USER']);
      expect(output.cells.filter(cell => !cell.assigned).length).toBe(SYSTEM_ROLES.length - 2);
    });

    it('no debe mutar el arreglo de roles recibido', () => {
      const roles: UserRole[] = ['USER', 'ADMIN'];
      UserPrivilegeEngine.calculate(buildUser(roles));
      expect(roles).toEqual(['USER', 'ADMIN']);
    });
  });

  // ---- ECUACIÓN 3 -------------------------------------------------------
  describe('Ecuación 3: orden por peso descendente', () => {
    it('el rol más crítico debe ocupar la primera celda', () => {
      const output = UserPrivilegeEngine.calculate(buildUser(['USER']));
      expect(output.cells[0].label).toBe('ADMIN');
    });

    it('los pesos deben ir en orden no creciente', () => {
      const weights = UserPrivilegeEngine.calculate(buildUser([])).cells.map(cell => cell.weight);
      for (let i = 1; i < weights.length; i++) {
        expect(weights[i]).toBeLessThanOrEqual(weights[i - 1]);
      }
    });

    it('cada celda debe llevar el peso declarado en las reglas', () => {
      for (const cell of UserPrivilegeEngine.calculate(buildUser([])).cells) {
        expect(cell.weight)
          .withContext(cell.label)
          .toBe(ROLE_WEIGHTS[cell.label as keyof typeof ROLE_WEIGHTS]);
      }
    });
  });

  // ---- COBERTURA --------------------------------------------------------
  describe('Cobertura', () => {
    it('debe reflejar la proporción de roles concedidos', () => {
      expect(UserPrivilegeEngine.calculate(buildUser(['ADMIN', 'USER'])).coverageRatio)
        .toBeCloseTo(2 / SYSTEM_ROLES.length, 5);
    });

    it('debe ser 0 sin roles y 1 con todos', () => {
      expect(UserPrivilegeEngine.calculate(buildUser([])).coverageRatio).toBe(0);
      expect(UserPrivilegeEngine.calculate(buildUser([...SYSTEM_ROLES] as UserRole[])).coverageRatio)
        .toBe(1);
    });

    it('la leyenda debe usar singular y plural correctamente', () => {
      expect(UserPrivilegeEngine.calculate(buildUser(['ADMIN'])).summary)
        .toBe(`1 de ${SYSTEM_ROLES.length} roles del sistema`);
      expect(UserPrivilegeEngine.calculate(buildUser(['ADMIN', 'USER'])).summary)
        .toBe(`2 de ${SYSTEM_ROLES.length} roles del sistema`);
    });
  });

  // ---- PUREZA -----------------------------------------------------------
  it('debe ser una función pura', () => {
    const user = buildUser(['ADMIN', 'USER']);
    expect(UserPrivilegeEngine.calculate(user)).toEqual(UserPrivilegeEngine.calculate(user));
  });

  it('debe tolerar la ausencia de cuenta', () => {
    const output = UserPrivilegeEngine.calculate(null);
    expect(output.level).toBe(0);
    expect(output.cells.length).toBe(SYSTEM_ROLES.length);
    expect(output.cells.every(cell => !cell.assigned)).toBeTrue();
  });
});
