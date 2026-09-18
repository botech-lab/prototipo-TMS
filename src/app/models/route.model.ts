/**
 * Aleta TMS - Rutas Maestras
 * Modelos de datos e interfaces para la gestión de rutas interdepartamentales.
 */

export interface StopNode {
  id: string;
  order: number;
  name: string;
  isOrigin?: boolean;
  isDestination?: boolean;
  coordinates?: { x: number; y: number };
}

export type RouteStatus = 'ACTIVO' | 'INACTIVO' | 'BORRADOR' | 'ARCHIVADA';

export type RouteStatusFilter = 'TODAS' | 'ACTIVAS' | 'BORRADORES' | 'ARCHIVADAS';

export interface MasterRoute {
  id: string;
  code: string; // ej. "RM-01"
  name: string; // ej. "La Paz → Santa Cruz"
  originDepartment: string; // "LA PAZ"
  destinationDepartment?: string; // "SANTA CRUZ"
  status: RouteStatus;
  stopsCount: number;
  stops: StopNode[];
  isExpanded: boolean;
  avoidedDuplicates?: string[]; // Servicios parciales que la ruta maestra consolida
  derivedServices?: string[]; // Alias para servicios derivados consolidados
}

export interface DepartmentGroup {
  department: string;
  totalRoutes: number;
  isExpanded: boolean;
  routes: MasterRoute[];
}

export interface UserProfile {
  name: string;
  role: string;
  avatarUrl?: string;
  initials: string;
}

export interface SubNavItem {
  id: string;
  label: string;
  route: string;
  icon?: string;
}

export interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: 'ventas' | 'programar' | 'operaciones' | 'administracion' | 'informes';
  isActive?: boolean;
  children?: SubNavItem[];
}


