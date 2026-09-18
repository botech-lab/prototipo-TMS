import { SystemUser } from '../models/user.model';

/**
 * Datos de demostración de cuentas del sistema.
 * Reemplazar por `GET /api/v1/usuarios` cuando el backend esté listo.
 */
export const USERS_MOCK: readonly SystemUser[] = [
  {
    id: 'usr-operador',
    username: 'operador',
    fullName: 'Juan Operador',
    email: 'operador@tmskronos.com',
    roles: ['USER', 'ADMIN'],
    status: 'OPERATIVO'
  },
  {
    id: 'usr-supervisor',
    username: 'supervisor',
    fullName: 'María Supervisora',
    email: 'supervisor@tmskronos.com',
    roles: ['USER', 'CLIENTE', 'SUPERVISOR'],
    status: 'OPERATIVO'
  },
  {
    id: 'usr-agente',
    username: 'agente',
    fullName: 'Carlos Agente',
    email: 'agente@tmskronos.com',
    roles: ['USER'],
    status: 'OPERATIVO'
  },
  {
    id: 'usr-adrian',
    username: 'adrian',
    fullName: 'Usuario Nuevo',
    email: 'adrian@tms.com',
    roles: ['VENDEDOR', 'OPERADOR', 'ADMIN', 'AGENTE'],
    status: 'OPERATIVO'
  },
  {
    id: 'usr-azd',
    username: 'azd',
    fullName: 'Viejo Mago',
    email: 'azdwia00@gmal.com',
    roles: [],
    status: 'BLOQUEADO'
  },
  {
    id: 'usr-admin',
    username: 'admin',
    fullName: 'Admin Sistema',
    email: 'admin@tmskronos.com',
    roles: ['ADMIN'],
    status: 'OPERATIVO'
  }
];
