/**
 * Rutas Maestras - Enterprise Logistics TMS
 * Definición de modelos e interfaces para la barra de navegación y panel lateral.
 */

export type NavIconType =
  | 'dashboard'
  | 'route'
  | 'fleet'
  | 'schedules'
  | 'drivers'
  | 'analytics'
  | 'settings'
  | 'support'
  | 'plus'
  | 'search'
  | 'bell'
  | 'chevron-left'
  | 'chevron-right'
  | 'menu'
  | 'x'
  | 'user'
  | 'logout'
  | 'help';

export interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: NavIconType;
  badge?: string | number;
  badgeVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  exactMatch?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
}

export interface NavSection {
  id: string;
  title?: string;
  items: NavItem[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  initials: string;
  department?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'warning' | 'success' | 'danger';
}

export interface SearchEventPayload {
  query: string;
  timestamp: number;
}
