import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { By } from '@angular/platform-browser';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { NavbarComponent } from './navbar.component';
import { NavItem, UserProfile } from './navbar.model';

// Componentes Dummy para rutas de prueba
@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.Eager,
 template: `<div>Dashboard View</div>` })
class DummyDashboardComponent {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.Eager,
 template: `<div>Rutas Maestras View</div>` })
class DummyRutasMaestrasComponent {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.Eager,
 template: `<div>Flota View</div>` })
class DummyFlotaComponent {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.Eager,
 template: `<div>Horarios View</div>` })
class DummyHorariosComponent {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.Eager,
 template: `<div>Choferes View</div>` })
class DummyChoferesComponent {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.Eager,
 template: `<div>Analitica View</div>` })
class DummyAnaliticaComponent {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.Eager,
 template: `<div>Configuracion View</div>` })
class DummyConfiguracionComponent {}

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.Eager,
 template: `<div>Soporte View</div>` })
class DummySoporteComponent {}

describe('NavbarComponent (TDD Suite - Rutas Maestras)', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let router: Router;

  const mockUserProfile: UserProfile = {
    id: 'usr-001',
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@rutasmaestras.com',
    role: 'Administrador de Flota',
    initials: 'CM',
    department: 'Operaciones Logísticas'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([
          { path: '', redirectTo: 'rutas-maestras', pathMatch: 'full' },
          { path: 'dashboard', component: DummyDashboardComponent },
          { path: 'rutas-maestras', component: DummyRutasMaestrasComponent },
          { path: 'flota', component: DummyFlotaComponent },
          { path: 'horarios', component: DummyHorariosComponent },
          { path: 'choferes', component: DummyChoferesComponent },
          { path: 'analitica', component: DummyAnaliticaComponent },
          { path: 'configuracion', component: DummyConfiguracionComponent },
          { path: 'soporte', component: DummySoporteComponent },
        ])
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    
    // Inicializar inputs y fixture
    fixture.componentRef.setInput('userProfile', mockUserProfile);
    fixture.componentRef.setInput('notificationCount', 5);
    fixture.detectChanges();
  });

  function getElementRoute(debugEl: any): string {
    if (!debugEl) return '';
    const href = debugEl.nativeElement?.getAttribute('href');
    if (href) return href;
    const routerLinkDir = debugEl.injector.get(RouterLink, null);
    if (routerLinkDir?.urlTree) {
      return '/' + routerLinkDir.urlTree.toString().replace(/^\//, '');
    }
    return debugEl.attributes?.['routerLink'] || debugEl.attributes?.['ng-reflect-router-link'] || '';
  }

  // ==========================================
  // 1. INICIALIZACIÓN Y CONFIGURACIÓN INICIAL
  // ==========================================
  describe('1. Inicialización y Estado Inicial', () => {
    it('debe crear el componente correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debe tener los valores iniciales correctos en los Signals reactivos', () => {
      expect(component.isCollapsed()).toBeFalse();
      expect(component.isMobileMenuOpen()).toBeFalse();
      expect(component.searchQuery()).toBe('');
      expect(component.isUserMenuOpen()).toBeFalse();
      expect(component.isNotificationsOpen()).toBeFalse();
    });

    it('debe contener exactamente los 6 ítems de navegación principales requeridos', () => {
      const items = component.mainNavItems;
      expect(items.length).toBe(6);

      const routes = items.map((i: NavItem) => i.route);
      expect(routes).toEqual([
        '/dashboard',
        '/rutas-maestras',
        '/flota',
        '/horarios',
        '/choferes',
        '/analitica'
      ]);

      const labels = items.map((i: NavItem) => i.label);
      expect(labels).toContain('Dashboard');
      expect(labels).toContain('Rutas Maestras');
      expect(labels).toContain('Flota');
      expect(labels).toContain('Horarios / Salidas');
      expect(labels).toContain('Choferes');
      expect(labels).toContain('Analítica');
    });

    it('debe contener exactamente los 2 ítems de navegación secundaria en la sección inferior', () => {
      const secondary = component.secondaryNavItems;
      expect(secondary.length).toBe(2);

      const routes = secondary.map((i: NavItem) => i.route);
      expect(routes).toEqual(['/configuracion', '/soporte']);
    });
  });

  // ==========================================
  // 2. BRANDING E IDENTIDAD VISUAL
  // ==========================================
  describe('2. Branding e Identidad Visual', () => {
    it('debe renderizar el isotipo "RM" y el branding institucional', () => {
      const brandElement = fixture.debugElement.query(By.css('[data-testid="brand-header"]'));
      expect(brandElement).toBeTruthy();

      const logoText = brandElement.query(By.css('[data-testid="brand-logo-text"]'));
      expect(logoText.nativeElement.textContent.trim()).toBe('RM');

      const brandTitle = brandElement.query(By.css('[data-testid="brand-title"]'));
      expect(brandTitle.nativeElement.textContent).toContain('Rutas Maestras');

      const brandSubtitle = brandElement.query(By.css('[data-testid="brand-subtitle"]'));
      expect(brandSubtitle.nativeElement.textContent).toContain('Enterprise Logistics');
    });

    it('debe enlazar el logotipo corporativo a la ruta por defecto "/rutas-maestras"', () => {
      const logoLink = fixture.debugElement.query(By.css('[data-testid="brand-link"]'));
      expect(logoLink).toBeTruthy();
      expect(getElementRoute(logoLink)).toBe('/rutas-maestras');
    });
  });

  // ==========================================
  // 3. RENDERIZADO DE ENLACES Y ESTADO ACTIVO
  // ==========================================
  describe('3. Renderizado de Enlaces de Navegación', () => {
    it('debe renderizar todos los enlaces principales en el menú lateral con sus atributos', () => {
      const navLinks = fixture.debugElement.queryAll(By.css('[data-testid="nav-item-link"]'));
      expect(navLinks.length).toBe(6);

      const expectedLinks = [
        { label: 'Dashboard', route: '/dashboard' },
        { label: 'Rutas Maestras', route: '/rutas-maestras' },
        { label: 'Flota', route: '/flota' },
        { label: 'Horarios / Salidas', route: '/horarios' },
        { label: 'Choferes', route: '/choferes' },
        { label: 'Analítica', route: '/analitica' }
      ];

      expectedLinks.forEach((expected, index) => {
        const link = navLinks[index];
        expect(link.nativeElement.textContent).toContain(expected.label);
        expect(getElementRoute(link)).toBe(expected.route);
      });
    });

    it('debe renderizar los enlaces secundarios de configuración y soporte en el pie del sidebar', () => {
      const configLink = fixture.debugElement.query(By.css('[data-testid="secondary-nav-configuracion"]'));
      const supportLink = fixture.debugElement.query(By.css('[data-testid="secondary-nav-soporte"]'));

      expect(configLink).toBeTruthy();
      expect(getElementRoute(configLink)).toBe('/configuracion');
      expect(configLink.nativeElement.textContent).toContain('Configuración');

      expect(supportLink).toBeTruthy();
      expect(getElementRoute(supportLink)).toBe('/soporte');
      expect(supportLink.nativeElement.textContent).toContain('Soporte / Ayuda');
    });

    it('debe aplicar la clase de estado activo al navegar a la ruta "/rutas-maestras"', fakeAsync(() => {
      router.navigateByUrl('/rutas-maestras');
      tick();
      fixture.detectChanges();

      const activeLink = fixture.debugElement.query(By.css('.active-nav-item, .nav-item-active'));
      expect(activeLink).toBeTruthy();
      expect(getElementRoute(activeLink)).toBe('/rutas-maestras');
    }));
  });

  // ==========================================
  // 4. BOTÓN DE ACCIÓN RÁPIDA "+ NUEVA RUTA"
  // ==========================================
  describe('4. Botón de Acción Principal "+ Nueva Ruta"', () => {
    it('debe renderizar el botón de acción rápida con texto prominente y diseño de acento', () => {
      const newRouteBtn = fixture.debugElement.query(By.css('[data-testid="btn-new-route"]'));
      expect(newRouteBtn).toBeTruthy();
      expect(newRouteBtn.nativeElement.textContent).toContain('Nueva Ruta');
    });

    it('debe emitir el evento `newRouteClick` al hacer clic en el botón "+ Nueva Ruta"', () => {
      spyOn(component.newRouteClick, 'emit');

      const newRouteBtn = fixture.debugElement.query(By.css('[data-testid="btn-new-route"]'));
      newRouteBtn.triggerEventHandler('click', null);

      expect(component.newRouteClick.emit).toHaveBeenCalledTimes(1);
    });

    it('debe invocar el método `onCreateNewRoute()` cuando se presiona el botón de acción', () => {
      spyOn(component, 'onCreateNewRoute').and.callThrough();

      const newRouteBtn = fixture.debugElement.query(By.css('[data-testid="btn-new-route"]'));
      newRouteBtn.triggerEventHandler('click', null);

      expect(component.onCreateNewRoute).toHaveBeenCalled();
    });
  });

  // ==========================================
  // 5. COLAPSO / EXPANSIÓN DEL SIDEBAR (DESKTOP)
  // ==========================================
  describe('5. Colapso / Expansión del Sidebar (Desktop)', () => {
    it('debe alternar el estado isCollapsed y emitir `collapseChange` al invocar `toggleCollapse()`', () => {
      spyOn(component.collapseChange, 'emit');

      expect(component.isCollapsed()).toBeFalse();

      component.toggleCollapse();
      expect(component.isCollapsed()).toBeTrue();
      expect(component.collapseChange.emit).toHaveBeenCalledWith(true);

      component.toggleCollapse();
      expect(component.isCollapsed()).toBeFalse();
      expect(component.collapseChange.emit).toHaveBeenCalledWith(false);
    });

    it('debe alternar el colapso al hacer clic en el botón toggle del sidebar', () => {
      const toggleBtn = fixture.debugElement.query(By.css('[data-testid="btn-toggle-collapse"]'));
      expect(toggleBtn).toBeTruthy();

      toggleBtn.triggerEventHandler('click', null);
      fixture.detectChanges();
      expect(component.isCollapsed()).toBeTrue();

      toggleBtn.triggerEventHandler('click', null);
      fixture.detectChanges();
      expect(component.isCollapsed()).toBeFalse();
    });

    it('debe actualizar las clases CSS del sidebar cuando está colapsado', () => {
      component.isCollapsed.set(true);
      fixture.detectChanges();

      const sidebar = fixture.debugElement.query(By.css('[data-testid="sidebar-container"]'));
      expect(sidebar.classes['sidebar-collapsed'] && sidebar.classes['navbar__sidebar--collapsed']).toBeTrue();
    });
  });

  // ==========================================
  // 6. MENÚ RESPONSIVE / DRAWER MÓVIL
  // ==========================================
  describe('6. Menú Responsive / Drawer Móvil', () => {
    it('debe alternar el estado isMobileMenuOpen al llamar a `toggleMobileMenu()`', () => {
      expect(component.isMobileMenuOpen()).toBeFalse();

      component.toggleMobileMenu();
      expect(component.isMobileMenuOpen()).toBeTrue();

      component.toggleMobileMenu();
      expect(component.isMobileMenuOpen()).toBeFalse();
    });

    it('debe cerrar el menú móvil al invocar `closeMobileMenu()`', () => {
      component.isMobileMenuOpen.set(true);
      component.closeMobileMenu();
      expect(component.isMobileMenuOpen()).toBeFalse();
    });

    it('debe abrir el drawer móvil al pulsar el botón hamburguesa', () => {
      const burgerBtn = fixture.debugElement.query(By.css('[data-testid="btn-mobile-burger"]'));
      expect(burgerBtn).toBeTruthy();

      burgerBtn.triggerEventHandler('click', null);
      fixture.detectChanges();

      expect(component.isMobileMenuOpen()).toBeTrue();

      const mobileDrawer = fixture.debugElement.query(By.css('[data-testid="mobile-drawer"]'));
      expect(mobileDrawer).toBeTruthy();
    });

    it('debe cerrar el drawer móvil al hacer clic en el backdrop / overlay', () => {
      component.isMobileMenuOpen.set(true);
      fixture.detectChanges();

      const backdrop = fixture.debugElement.query(By.css('[data-testid="mobile-backdrop"]'));
      expect(backdrop).toBeTruthy();

      backdrop.triggerEventHandler('click', null);
      fixture.detectChanges();

      expect(component.isMobileMenuOpen()).toBeFalse();
    });

    it('debe cerrar el menú móvil automáticamente al hacer clic en cualquier enlace de navegación', () => {
      component.isMobileMenuOpen.set(true);
      fixture.detectChanges();

      const mobileNavLinks = fixture.debugElement.queryAll(By.css('[data-testid="mobile-nav-link"]'));
      expect(mobileNavLinks.length).toBeGreaterThan(0);

      mobileNavLinks[0].triggerEventHandler('click', { button: 0 });
      fixture.detectChanges();

      expect(component.isMobileMenuOpen()).toBeFalse();
    });
  });

  // ==========================================
  // 7. INPUT DE BÚSQUEDA GLOBAL
  // ==========================================
  describe('7. Barra de Búsqueda Global', () => {
    it('debe renderizar el input de búsqueda con el placeholder especificado', () => {
      const searchInput = fixture.debugElement.query(By.css('[data-testid="global-search-input"]'));
      expect(searchInput).toBeTruthy();
      expect(searchInput.attributes['placeholder']).toBe('Buscar rutas, ciudades o buses...');
    });

    it('debe actualizar la señal `searchQuery` y emitir `searchChange` al escribir en el input', () => {
      spyOn(component.searchChange, 'emit');

      const searchInput = fixture.debugElement.query(By.css('[data-testid="global-search-input"]'));
      const inputEl = searchInput.nativeElement as HTMLInputElement;

      inputEl.value = 'La Paz - Cochabamba';
      searchInput.triggerEventHandler('input', { target: inputEl });

      expect(component.searchQuery()).toBe('La Paz - Cochabamba');
      expect(component.searchChange.emit).toHaveBeenCalledWith('La Paz - Cochabamba');
    });

    it('debe permitir limpiar la búsqueda y emitir string vacío', () => {
      spyOn(component.searchChange, 'emit');
      component.searchQuery.set('Santa Cruz');
      fixture.detectChanges();

      const clearBtn = fixture.debugElement.query(By.css('[data-testid="btn-clear-search"]'));
      expect(clearBtn).toBeTruthy();

      clearBtn.triggerEventHandler('click', null);
      fixture.detectChanges();

      expect(component.searchQuery()).toBe('');
      expect(component.searchChange.emit).toHaveBeenCalledWith('');
    });
  });

  // ==========================================
  // 8. PERFIL DE USUARIO Y NOTIFICACIONES
  // ==========================================
  describe('8. Perfil de Usuario y Notificaciones', () => {
    it('debe mostrar la información del perfil del usuario (nombre, rol e iniciales)', () => {
      const userName = fixture.debugElement.query(By.css('[data-testid="user-profile-name"]'));
      const userRole = fixture.debugElement.query(By.css('[data-testid="user-profile-role"]'));
      const userInitials = fixture.debugElement.query(By.css('[data-testid="user-profile-avatar"]'));

      expect(userName.nativeElement.textContent).toContain('Carlos Mendoza');
      expect(userRole.nativeElement.textContent).toContain('Administrador de Flota');
      expect(userInitials.nativeElement.textContent.trim()).toBe('CM');
    });

    it('debe renderizar el badge de notificaciones con la cantidad correcta', () => {
      const badge = fixture.debugElement.query(By.css('[data-testid="notification-badge"]'));
      expect(badge).toBeTruthy();
      expect(badge.nativeElement.textContent.trim()).toBe('5');
    });

    it('debe alternar el dropdown del menú de usuario al hacer clic en el avatar', () => {
      expect(component.isUserMenuOpen()).toBeFalse();

      const avatarBtn = fixture.debugElement.query(By.css('[data-testid="btn-user-menu"]'));
      avatarBtn.triggerEventHandler('click', null);
      fixture.detectChanges();

      expect(component.isUserMenuOpen()).toBeTrue();

      const userDropdown = fixture.debugElement.query(By.css('[data-testid="user-menu-dropdown"]'));
      expect(userDropdown).toBeTruthy();
    });

    it('debe alternar el panel de notificaciones al hacer clic en la campana', () => {
      expect(component.isNotificationsOpen()).toBeFalse();

      const notifBtn = fixture.debugElement.query(By.css('[data-testid="btn-notifications"]'));
      notifBtn.triggerEventHandler('click', null);
      fixture.detectChanges();

      expect(component.isNotificationsOpen()).toBeTrue();
    });
  });
});
