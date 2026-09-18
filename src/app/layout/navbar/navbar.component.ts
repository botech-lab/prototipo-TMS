import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  input,
  output,
  HostListener,
  ElementRef,
  inject
} from '@angular/core';

import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  NavItem,
  UserProfile,
  NotificationItem,
  SearchEventPayload
} from './navbar.model';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'rm-navigation-root',
    '[class.sidebar-collapsed]': 'isCollapsed()'
  }
})
export class NavbarComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly router = inject(Router);

  // ==========================================
  // INPUTS & OUTPUTS (Angular 17+ Signals API)
  // ==========================================
  readonly userProfile = input<UserProfile>({
    id: 'usr-default',
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@rutasmaestras.com',
    role: 'Administrador de Flota',
    initials: 'CM',
    department: 'Operaciones Logísticas'
  });

  readonly notificationCount = input<number>(3);

  readonly newRouteClick = output<void>();
  readonly searchChange = output<string>();
  readonly collapseChange = output<boolean>();
  readonly userProfileClick = output<void>();
  readonly logoutClick = output<void>();

  // ==========================================
  // REACTIVE STATE (Signals)
  // ==========================================
  readonly isCollapsed = signal<boolean>(false);
  readonly isMobileMenuOpen = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly isUserMenuOpen = signal<boolean>(false);
  readonly isNotificationsOpen = signal<boolean>(false);

  // ==========================================
  // COMPUTED SIGNALS
  // ==========================================
  readonly sidebarWidthClass = computed(() =>
    this.isCollapsed() ? 'navbar__sidebar--collapsed' : 'navbar__sidebar--expanded'
  );

  readonly hasActiveSearch = computed(() =>
    this.searchQuery().trim().length > 0
  );

  // ==========================================
  // NAVEGACIÓN CONFIGURACIÓN ESTÁTICA
  // ==========================================
  readonly mainNavItems: readonly NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      route: '/dashboard',
      icon: 'dashboard',
      ariaLabel: 'Ir al Panel de Control General'
    },
    {
      id: 'rutas-maestras',
      label: 'Rutas Maestras',
      route: '/rutas-maestras',
      icon: 'route',
      badge: 'Principal',
      badgeVariant: 'success',
      ariaLabel: 'Gestión de Rutas Maestras y Trazados'
    },
    {
      id: 'flota',
      label: 'Flota',
      route: '/flota',
      icon: 'fleet',
      badge: '38',
      badgeVariant: 'neutral',
      ariaLabel: 'Gestión de Autobuses y Unidades'
    },
    {
      id: 'horarios',
      label: 'Horarios / Salidas',
      route: '/horarios',
      icon: 'schedules',
      ariaLabel: 'Programación de Salidas e Itinerarios'
    },
    {
      id: 'choferes',
      label: 'Choferes',
      route: '/choferes',
      icon: 'drivers',
      ariaLabel: 'Directorio de Choferes y Turnos'
    },
    {
      id: 'analitica',
      label: 'Analítica',
      route: '/analitica',
      icon: 'analytics',
      badge: 'Nuevo',
      badgeVariant: 'primary',
      ariaLabel: 'Métricas de Venta y Ocupación'
    }
  ];

  readonly secondaryNavItems: readonly NavItem[] = [
    {
      id: 'configuracion',
      label: 'Configuración',
      route: '/configuracion',
      icon: 'settings',
      ariaLabel: 'Configuración del Sistema y Parámetros'
    },
    {
      id: 'soporte',
      label: 'Soporte / Ayuda',
      route: '/soporte',
      icon: 'support',
      ariaLabel: 'Centro de Soporte y Ayuda al Operador'
    }
  ];

  readonly recentNotifications: readonly NotificationItem[] = [
    {
      id: 'notif-1',
      title: 'Retraso de Salida',
      message: 'Bus #104 (La Paz - Cochabamba) retrasado 15 min.',
      timestamp: 'Hace 5 min',
      read: false,
      type: 'warning'
    },
    {
      id: 'notif-2',
      title: 'Nueva Reserva Grupal',
      message: '32 pasajes confirmados en Ruta Santa Cruz - Sucre.',
      timestamp: 'Hace 20 min',
      read: false,
      type: 'info'
    },
    {
      id: 'notif-3',
      title: 'Mantenimiento Preventivo',
      message: 'Unidad #208 completó revisión técnica con éxito.',
      timestamp: 'Hace 1 hora',
      read: true,
      type: 'success'
    }
  ];

  // ==========================================
  // MÉTODOS DE INTERACCIÓN Y TOGGLES
  // ==========================================

  /**
   * Alterna el estado colapsado del Sidebar en vista Desktop.
   */
  toggleCollapse(): void {
    const nextState = !this.isCollapsed();
    this.isCollapsed.set(nextState);
    this.collapseChange.emit(nextState);
  }

  /**
   * Alterna el estado de visibilidad del Drawer móvil/tablet.
   */
  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((open) => !open);
    if (this.isMobileMenuOpen()) {
      this.closeAllDropdowns();
    }
  }

  /**
   * Cierra forzosamente el menú móvil (por ejemplo al navegar).
   */
  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  /**
   * Maneja el input de búsqueda global.
   */
  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target ? target.value : '';
    this.searchQuery.set(value);
    this.searchChange.emit(value);
  }

  /**
   * Limpia el campo de búsqueda global.
   */
  clearSearch(): void {
    this.searchQuery.set('');
    this.searchChange.emit('');
  }

  /**
   * Dispara el evento del botón principal de acción "+ Nueva Ruta".
   */
  onCreateNewRoute(): void {
    this.newRouteClick.emit();
    this.closeMobileMenu();
  }

  /**
   * Alterna la visibilidad del menú desplegable de usuario.
   */
  toggleUserMenu(): void {
    this.isNotificationsOpen.set(false);
    this.isUserMenuOpen.update((open) => !open);
  }

  /**
   * Alterna la visibilidad del panel de notificaciones.
   */
  toggleNotifications(): void {
    this.isUserMenuOpen.set(false);
    this.isNotificationsOpen.update((open) => !open);
  }

  /**
   * Cierra todos los menús contextuales y dropdowns activos.
   */
  closeAllDropdowns(): void {
    this.isUserMenuOpen.set(false);
    this.isNotificationsOpen.set(false);
  }

  /**
   * Cierre con tecla Escape para máxima accesibilidad.
   */
  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.isMobileMenuOpen()) {
      this.closeMobileMenu();
    }
    this.closeAllDropdowns();
  }

  /**
   * Cierre de dropdowns al hacer clic fuera del componente.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.closeAllDropdowns();
    }
  }
}
