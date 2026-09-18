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
import { Router } from '@angular/router';
import { RoutesService } from '../../services/routes.service';
import { OriginSummary, OriginSummaryEngine } from './origin-summary-engine';
import { RouteCardComponent, CreatedServiceLink } from '../route-card/route-card.component';
import { NavIconComponent } from '../app-shell/nav-icon.component';
import { ToastService } from '../toast/toast.service';
import { departmentCode } from '../../core/constants/department-codes';
import { MasterRoute, RouteStatusFilter } from '../../models/route.model';

export interface DepartmentItem {
  name: string;
  rawName: string;
  routesCount: number;
  /** Código corto del origen para la cabecera tipo boleto ("LPZ"). */
  code: string;
}

/** ¿La ruta pertenece al filtro de estado? */
function matchesStatus(route: MasterRoute, status: RouteStatusFilter): boolean {
  switch (status) {
    case 'ACTIVAS': return route.status === 'ACTIVO';
    case 'BORRADORES': return route.status === 'BORRADOR';
    case 'ARCHIVADAS': return route.status === 'INACTIVO' || route.status === 'ARCHIVADA';
    default: return true;
  }
}

/** Compara sin tildes ni mayúsculas ("potosi" encuentra "Potosí"). */
function fold(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** ¿Coincide con la búsqueda por código, nombre o alguna parada? */
function matchesQuery(route: MasterRoute, query: string): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  return fold(route.code).includes(q)
    || fold(route.name).includes(q)
    || route.stops.some(stop => fold(stop.name).includes(q));
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
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly isModalOpen = signal<boolean>(false);

  /** Origen preseleccionado en el modal (p. ej. "+ Nueva ruta desde Oruro"). */
  readonly modalOrigin = signal<string | null>(null);

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
      routesCount: group.totalRoutes,
      code: departmentCode(group.department)
    }));
  });

  // Catálogo completo de rutas
  readonly allRoutes = computed<MasterRoute[]>(() => {
    return this.routesService.getAllRoutes();
  });

  /** Hay texto en el buscador: los orígenes con resultados se abren solos. */
  readonly searchActive = computed(() => this.searchQuery().trim().length > 0);

  /** Cuántas rutas hay en cada filtro de estado (respetando la búsqueda). */
  readonly statusCounts = computed<Record<RouteStatusFilter, number>>(() => {
    const query = this.searchQuery();
    const found = this.allRoutes().filter(route => matchesQuery(route, query));
    const counts = {} as Record<RouteStatusFilter, number>;
    for (const option of this.statusOptions) {
      counts[option] = found.filter(route => matchesStatus(route, option)).length;
    }
    return counts;
  });

  /** Resultado de la búsqueda: rutas encontradas y en cuántos orígenes. */
  readonly searchSummary = computed(() => {
    const matches = this.allRoutes().filter(route =>
      matchesStatus(route, this.statusFilter()) && matchesQuery(route, this.searchQuery())
    );
    const origins = new Set(matches.map(route => route.originDepartment.toUpperCase()));
    return { routes: matches.length, origins: origins.size };
  });

  /** Orígenes visibles: durante una búsqueda solo los que tienen resultados. */
  readonly visibleDepartments = computed<DepartmentItem[]>(() => {
    if (!this.searchActive()) return this.departments();
    return this.departments().filter(dept => this.getFilteredRoutesForDepartment(dept.name).length > 0);
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
    // Buscando: se abren solos los orígenes que tienen coincidencias.
    if (this.searchActive()) {
      return this.getFilteredRoutesForDepartment(deptName).length > 0;
    }
    const current = this.selectedDepartment();
    return !!current && current.toUpperCase() === deptName.toUpperCase();
  }

  toggleDepartment(deptName: string): void {
    // Pulsar un origen durante la búsqueda la limpia y deja abierto solo ese.
    if (this.searchActive()) {
      this.searchQuery.set('');
      this.selectedDepartment.set(deptName);
      this.routesService.selectDepartment(deptName);
      return;
    }
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
    const query = this.searchQuery();

    // Origen + estado + búsqueda (código, nombre o paradas, sin tildes).
    return this.allRoutes().filter(route =>
      route.originDepartment.toUpperCase() === deptName.toUpperCase()
      && matchesStatus(route, status)
      && matchesQuery(route, query)
    );
  }

  /** El origen no tiene ninguna ruta (no es que los filtros las oculten). */
  hasNoRoutes(dept: DepartmentItem): boolean {
    return this.getOriginSummary(dept.rawName).routesCount === 0;
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('TODAS');
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

  onCreateRoute(origin?: string): void {
    this.modalOrigin.set(origin ?? this.selectedDepartment());
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

  /**
   * Alterna el estado y avisa con "Deshacer". Deshacer restaura el estado
   * exacto anterior (incluido BORRADOR) con setRouteStatus.
   */
  onRouteStatusToggle(routeId: string): void {
    const before = this.allRoutes().find(route => route.id === routeId);
    if (!before) return;
    this.routesService.toggleRouteStatus(routeId);

    const nowActive = this.allRoutes().find(route => route.id === routeId)?.status === 'ACTIVO';
    const services = (before.derivedServices || before.avoidedDuplicates || []).length;
    const affected = services === 0 ? ''
      : ` · ${services} ${services === 1 ? 'servicio afectado' : 'servicios afectados'}`;
    this.toast.show(`${before.code} ${nowActive ? 'activada' : 'desactivada'}${affected}`, {
      actionLabel: 'Deshacer',
      onAction: () => this.routesService.setRouteStatus(routeId, before.status)
    });
  }

  /** Abre Servicios programados con ese servicio ya seleccionado. */
  onOpenService(link: CreatedServiceLink): void {
    this.router.navigate(['/operaciones'], {
      queryParams: { origen: link.origin, destino: link.destination }
    });
  }

  onRouteExpandToggle(routeId: string): void {
    this.routesService.toggleRouteExpand(routeId);
  }

  onEditRoute(routeId: string): void {
    console.log('Editando ruta maestra:', routeId);
  }
}
