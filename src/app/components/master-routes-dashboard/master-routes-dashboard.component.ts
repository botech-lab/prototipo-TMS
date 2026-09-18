import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
  computed,
  viewChild
} from '@angular/core';
import { RoutesService } from '../../services/routes.service';
import { OriginSummary, OriginSummaryEngine } from './origin-summary-engine';
import { RouteCardComponent } from '../route-card/route-card.component';
import { NavIconComponent } from '../app-shell/nav-icon.component';
import { MasterRoute, RouteStatusFilter } from '../../models/route.model';

export interface DepartmentItem {
  name: string;
  rawName: string;
  routesCount: number;
}

@Component({
  selector: 'app-master-routes-dashboard',
  imports: [RouteCardComponent, NavIconComponent],
  templateUrl: './master-routes-dashboard.component.html',
  styleUrls: ['./master-routes-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MasterRoutesDashboardComponent {
  readonly routesService = inject(RoutesService);

  readonly isModalOpen = signal<boolean>(false);

  private readonly injector = inject(Injector);
  private readonly createBtn = viewChild<ElementRef<HTMLButtonElement>>('createBtn');
  private readonly modal = viewChild<ElementRef<HTMLElement>>('modal');

  // Departamento actualmente expandido (o null si todos están colapsados)
  readonly selectedDepartment = signal<string | null>('La Paz');

  // Filtros de estado reactivos
  readonly statusFilter = signal<RouteStatusFilter>('TODAS');
  readonly statusOptions: RouteStatusFilter[] = ['TODAS', 'ACTIVAS', 'BORRADORES', 'ARCHIVADAS'];

  // Input de búsqueda global reactivo
  readonly searchQuery = signal<string>('');

  // Lista ordenada de los 9 departamentos de Bolivia
  readonly departments = computed<DepartmentItem[]>(() => {
    return this.routesService.departmentGroups().map(group => ({
      name: this.formatDepartmentName(group.department),
      rawName: group.department,
      routesCount: group.totalRoutes
    }));
  });

  // Catálogo completo de rutas
  readonly allRoutes = computed<MasterRoute[]>(() => {
    return this.routesService.getAllRoutes();
  });

  /**
   * Resumen agregado por origen, cacheado en un `computed` para no recalcular
   * en cada ciclo de detección: la cabecera lo consulta en cada render.
   */
  private readonly summaries = computed<Map<string, OriginSummary>>(() => {
    const byOrigin = new Map<string, MasterRoute[]>();

    for (const route of this.allRoutes()) {
      const key = route.originDepartment.toUpperCase();
      const bucket = byOrigin.get(key);
      if (bucket) {
        bucket.push(route);
      } else {
        byOrigin.set(key, [route]);
      }
    }

    const result = new Map<string, OriginSummary>();
    byOrigin.forEach((routes, key) => result.set(key, OriginSummaryEngine.calculate(routes)));
    return result;
  });

  /**
   * Destinos visibles en la cabecera. En media columna, con el título y el
   * contador ya ocupando ~330px, solo cabe UNO sin que el siguiente quede
   * cortado por la mitad: el resto se resume en un chip "+N".
   */
  private readonly MAX_DESTINATIONS_COLLAPSED = 1;

  visibleDestinations(deptName: string): readonly string[] {
    const destinations = this.getOriginSummary(deptName).destinations;
    return this.isDepartmentExpanded(deptName)
      ? destinations
      : destinations.slice(0, this.MAX_DESTINATIONS_COLLAPSED);
  }

  hiddenDestinationsCount(deptName: string): number {
    if (this.isDepartmentExpanded(deptName)) {
      return 0;
    }
    return Math.max(
      0,
      this.getOriginSummary(deptName).destinations.length - this.MAX_DESTINATIONS_COLLAPSED
    );
  }

  /** Resumen del origen indicado. Vacío si el departamento no tiene rutas. */
  getOriginSummary(deptName: string): OriginSummary {
    return this.summaries().get(deptName.toUpperCase()) ?? {
      routesCount: 0,
      activeCount: 0,
      draftCount: 0,
      archivedCount: 0,
      uniqueStops: 0,
      servicesCount: 0,
      destinations: []
    };
  }

  isDepartmentExpanded(deptName: string): boolean {
    const current = this.selectedDepartment();
    return !!current && current.toUpperCase() === deptName.toUpperCase();
  }

  toggleDepartment(deptName: string): void {
    const current = this.selectedDepartment();
    if (current && current.toUpperCase() === deptName.toUpperCase()) {
      this.selectedDepartment.set(null);
    } else {
      this.selectedDepartment.set(deptName);
      this.routesService.selectDepartment(deptName);
    }
  }

  getFilteredRoutesForDepartment(deptName: string): MasterRoute[] {
    const status = this.statusFilter();
    const query = this.searchQuery().toLowerCase().trim();

    return this.allRoutes().filter(route => {
      // 1. Filtro por Departamento de Origen
      const matchesDept = route.originDepartment.toUpperCase() === deptName.toUpperCase();
      if (!matchesDept) return false;

      // 2. Filtro por Estado
      const matchesStatus =
        status === 'TODAS' ? true :
        status === 'ACTIVAS' ? route.status === 'ACTIVO' :
        status === 'BORRADORES' ? route.status === 'BORRADOR' :
        status === 'ARCHIVADAS' ? (route.status === 'INACTIVO' || route.status === 'ARCHIVADA') : true;
      if (!matchesStatus) return false;

      // 3. Filtro por Búsqueda (Código, Nombre de Ruta o Nombres de Paradas)
      if (!query) return true;
      const matchesCode = route.code.toLowerCase().includes(query);
      const matchesName = route.name.toLowerCase().includes(query);
      const matchesStop = route.stops.some(stop => stop.name.toLowerCase().includes(query));

      return matchesCode || matchesName || matchesStop;
    });
  }

  private formatDepartmentName(name: string): string {
    if (!name) return '';
    const lower = name.toLowerCase();
    return lower.replace(/\b\w/g, char => char.toUpperCase());
  }

  setStatusFilter(filter: RouteStatusFilter): void {
    this.statusFilter.set(filter);
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input ? input.value : '');
  }

  onCreateRoute(): void {
    this.isModalOpen.set(true);
    // Accesibilidad: el foco entra al diálogo en cuanto se pinta.
    afterNextRender(() => {
      const fields = this.modalFocusables();
      (fields.find(el => el.matches('select, input')) ?? fields[0])?.focus();
    }, { injector: this.injector });
  }

  onCloseModal(): void {
    this.isModalOpen.set(false);
    // Accesibilidad: devuelve el foco al botón que abrió el diálogo.
    this.createBtn()?.nativeElement.focus();
  }

  /** Escape cierra; Tab y Shift+Tab quedan atrapados dentro del diálogo. */
  onModalKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onCloseModal();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const focusables = this.modalFocusables();
    if (!focusables.length) {
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private modalFocusables(): HTMLElement[] {
    const root = this.modal()?.nativeElement;
    if (!root) {
      return [];
    }
    return Array.from(
      root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
  }

  onRouteStatusToggle(routeId: string): void {
    this.routesService.toggleRouteStatus(routeId);
  }

  onRouteExpandToggle(routeId: string): void {
    this.routesService.toggleRouteExpand(routeId);
  }

  onEditRoute(routeId: string): void {
    console.log('Editando ruta maestra:', routeId);
  }
}
