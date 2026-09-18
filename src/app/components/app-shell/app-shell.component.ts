import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { UserProfile } from '../../models/route.model';
import { BreadcrumbItem, readBreadcrumb } from '../../core/routing/route-meta';
import { NavIconComponent } from './nav-icon.component';
import { focusFirst, trapTab } from '../record-drawer/focus-trap';
import {
  SHELL_NAV_SECTIONS,
  SHELL_NAV_SOON,
  ShellNavLink,
  ShellNavSection,
  ShellNavSubgroup
} from './shell-nav.model';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, NavIconComponent],
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  private readonly burger = viewChild<ElementRef<HTMLElement>>('burger');
  private readonly drawer = viewChild<ElementRef<HTMLElement>>('drawer');

  readonly isMobileMenuOpen = signal<boolean>(false);
  readonly isSidebarCollapsed = signal<boolean>(false);

  readonly userProfile: UserProfile = {
    name: 'Alex Rivera',
    role: 'Operaciones',
    initials: 'AR'
  };

  readonly sections = SHELL_NAV_SECTIONS;
  readonly soonItems = SHELL_NAV_SOON;

  /** Ruta actual sin query ni fragmento; fuente de todos los estados activos. */
  readonly currentPath = signal<string>(this.pathOf(this.router.url));

  /** Miga de pan de la ruta activa (Route.data.breadcrumb). */
  readonly breadcrumb = signal<readonly BreadcrumbItem[]>(this.readActiveBreadcrumb());
  readonly breadcrumbTrail = computed(() => this.breadcrumb().slice(0, -1));
  readonly breadcrumbCurrent = computed(() => this.breadcrumb().at(-1)?.label ?? 'Aleta TMS');

  /** Subgrupos plegables abiertos (Catálogos). Plegados por defecto. */
  readonly openSubgroups = signal<ReadonlySet<string>>(new Set());

  constructor() {
    this.syncWithUrl();
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef))
      )
      .subscribe(e => {
        this.currentPath.set(this.pathOf(e.urlAfterRedirects));
        this.breadcrumb.set(this.readActiveBreadcrumb());
        this.syncWithUrl();
      });
  }

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      // En tablets / iPads (768px - 1023px), iniciar en modo mini-rail para maximizar ancho útil
      const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      if (isTablet) {
        this.isSidebarCollapsed.set(true);
      }
    }
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed.update(v => !v);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
    if (this.isMobileMenuOpen()) {
      // Foco dentro del drawer en cuanto se pinta.
      afterNextRender(() => focusFirst(this.drawer()?.nativeElement, '.shell__drawer-close'), {
        injector: this.injector
      });
    }
  }

  /**
   * Cierra el drawer móvil. Con `returnFocus` (Escape, backdrop o botón cerrar)
   * el foco vuelve a la hamburguesa; al navegar por un enlace no se mueve.
   */
  closeMobileMenu(returnFocus = false): void {
    const wasOpen = this.isMobileMenuOpen();
    this.isMobileMenuOpen.set(false);
    if (wasOpen && returnFocus) {
      this.burger()?.nativeElement.focus();
    }
  }

  /** Teclado en el drawer: Escape cierra y Tab queda atrapado dentro. */
  onDrawerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMobileMenu(true);
      return;
    }
    trapTab(event, this.drawer()?.nativeElement);
  }

  /** Enlace de salto: lleva el foco al contenido sin alterar la URL del router. */
  skipToContent(event: Event): void {
    event.preventDefault();
    const main = typeof document !== 'undefined' ? document.getElementById('shell-main') : null;
    main?.focus();
    main?.scrollIntoView({ block: 'start' });
  }

  isLinkActive(link: ShellNavLink): boolean {
    return [link.route, ...(link.aliases ?? [])].some(url => this.matches(url));
  }

  isSubgroupCurrent(group: ShellNavSubgroup): boolean {
    return this.currentPath().startsWith(group.urlPrefix);
  }

  isSectionActive(section: ShellNavSection): boolean {
    return (
      (section.aliases ?? []).some(url => this.matches(url)) ||
      section.links.some(link => this.isLinkActive(link)) ||
      (!!section.subgroup && this.isSubgroupCurrent(section.subgroup))
    );
  }

  isSubgroupOpen(group: ShellNavSubgroup): boolean {
    return this.openSubgroups().has(group.id);
  }

  toggleSubgroup(group: ShellNavSubgroup): void {
    this.openSubgroups.update(open => {
      const next = new Set(open);
      if (next.has(group.id)) {
        next.delete(group.id);
      } else {
        next.add(group.id);
      }
      return next;
    });
  }

  /** En el mini-rail el subgrupo no cabe: se expande la barra y se abre el subgrupo. */
  openSubgroupFromRail(group: ShellNavSubgroup): void {
    this.isSidebarCollapsed.set(false);
    this.openSubgroups.update(open => new Set(open).add(group.id));
  }

  private matches(url: string): boolean {
    const path = this.currentPath();
    return path === url || path.startsWith(url + '/');
  }

  /** Despliega automáticamente el subgrupo que contiene la URL actual. */
  private syncWithUrl(): void {
    for (const section of this.sections) {
      const group = section.subgroup;
      if (group && this.isSubgroupCurrent(group) && !this.isSubgroupOpen(group)) {
        this.openSubgroups.update(open => new Set(open).add(group.id));
      }
    }
  }

  private pathOf(url: string): string {
    return url.split(/[?#]/)[0] || '/';
  }

  private readActiveBreadcrumb(): readonly BreadcrumbItem[] {
    let node: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    let trail: readonly BreadcrumbItem[] = [];
    while (node) {
      const own = readBreadcrumb(node.data);
      if (own.length) {
        trail = own;
      }
      node = node.firstChild;
    }
    return trail;
  }
}
