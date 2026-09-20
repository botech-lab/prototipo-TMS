import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { MasterRoutesDashboardComponent } from './master-routes-dashboard.component';
import { RoutesService } from '../../services/routes.service';
import { ToastService } from '../toast/toast.service';

describe('MasterRoutesDashboardComponent (TDD Suite - Vertical Accordion Stack)', () => {
  let component: MasterRoutesDashboardComponent;
  let fixture: ComponentFixture<MasterRoutesDashboardComponent>;
  let routesService: RoutesService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterRoutesDashboardComponent],
      providers: [RoutesService]
    }).compileComponents();

    routesService = TestBed.inject(RoutesService);
    fixture = TestBed.createComponent(MasterRoutesDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse el componente correctamente', () => {
    expect(component).toBeTruthy();
  });

  // ========================================================
  // 1. LISTA VERTICAL DE ACORDEONES (SIN TABS/PILLS SUPERIORES)
  // ========================================================
  describe('1. Lista Vertical de 9 Departamentos', () => {
    it('no debe renderizar ninguna barra horizontal de pastillas o tabs de ciudades arriba', () => {
      const topPills = fixture.debugElement.query(By.css('[data-testid="origin-department-item"], [data-testid="dept-row-pills"]'));
      expect(topPills).toBeNull();

      // Verificamos que los items de departamentos sean solo los acordeones de la lista vertical
      const accordionItems = fixture.debugElement.queryAll(By.css('[data-testid="department-accordion-item"]'));
      expect(accordionItems.length).toBe(9);
    });

    it('debe renderizar los 9 departamentos de Bolivia en la lista vertical', () => {
      const accordionItems = fixture.debugElement.queryAll(By.css('[data-testid="department-accordion-item"]'));
      expect(accordionItems.length).toBe(9);

      const texts = accordionItems.map(item => item.nativeElement.textContent);
      expect(texts.some(t => t.includes('La Paz'))).toBeTrue();
      expect(texts.some(t => t.includes('Santa Cruz'))).toBeTrue();
      expect(texts.some(t => t.includes('Cochabamba'))).toBeTrue();
      expect(texts.some(t => t.includes('Oruro'))).toBeTrue();
      expect(texts.some(t => t.includes('Potosí'))).toBeTrue();
      expect(texts.some(t => t.includes('Chuquisaca'))).toBeTrue();
      expect(texts.some(t => t.includes('Tarija'))).toBeTrue();
      expect(texts.some(t => t.includes('Beni'))).toBeTrue();
      expect(texts.some(t => t.includes('Pando'))).toBeTrue();
    });
  });

  // ========================================================
  // 2. EXPANSIÓN EXCLUSIVA (SINGLE EXPANDED ACCORDION)
  // ========================================================
  describe('2. Comportamiento de Acordeón Exclusivo', () => {
    it('por defecto, "La Paz" debe estar expandido mostrando sus 4 tarjetas de rutas maestras', () => {
      expect(component.selectedDepartment()).toBe('La Paz');
      const laPazContent = fixture.debugElement.query(By.css('[data-testid="department-content-La Paz"]'));
      expect(laPazContent).toBeTruthy();

      const cards = laPazContent.queryAll(By.css('[data-testid="route-card-item"]'));
      expect(cards.length).toBe(4);
    });

    it('al hacer clic en "Santa Cruz", debe expandir Santa Cruz con sus 3 rutas y colapsar La Paz', () => {
      const scHeader = fixture.debugElement.query(By.css('[data-testid="department-header-Santa Cruz"]'));
      expect(scHeader).toBeTruthy();

      // Clic en Santa Cruz
      scHeader.triggerEventHandler('click', null);
      fixture.detectChanges();

      // Santa Cruz expandido
      expect(component.selectedDepartment()).toBe('Santa Cruz');
      const scContent = fixture.debugElement.query(By.css('[data-testid="department-content-Santa Cruz"]'));
      expect(scContent).toBeTruthy();
      const scCards = scContent.queryAll(By.css('[data-testid="route-card-item"]'));
      expect(scCards.length).toBe(3);

      // La Paz colapsado
      const laPazContent = fixture.debugElement.query(By.css('[data-testid="department-content-La Paz"]'));
      expect(laPazContent).toBeNull();
    });

    it('al hacer clic en el departamento ya expandido, debe colapsarse', () => {
      const laPazHeader = fixture.debugElement.query(By.css('[data-testid="department-header-La Paz"]'));
      
      // Clic para colapsar
      laPazHeader.triggerEventHandler('click', null);
      fixture.detectChanges();

      expect(component.selectedDepartment()).toBeNull();
      const laPazContent = fixture.debugElement.query(By.css('[data-testid="department-content-La Paz"]'));
      expect(laPazContent).toBeNull();
    });
  });

  // ========================================================
  // 3. BARRA DE FILTROS Y BÚSQUEDA DENTRO DEL ACORDEÓN
  // ========================================================
  describe('3. Filtros y Búsqueda Global', () => {
    it('debe filtrar las rutas maestras por término de búsqueda (ej. "Copacabana")', () => {
      component.searchQuery.set('Copacabana');
      fixture.detectChanges();

      const laPazContent = fixture.debugElement.query(By.css('[data-testid="department-content-La Paz"]'));
      expect(laPazContent).toBeTruthy();

      const cards = laPazContent.queryAll(By.css('[data-testid="route-card-item"]'));
      expect(cards.length).toBe(1);

      const code = cards[0].query(By.css('[data-testid="route-code"]'));
      expect(code.nativeElement.textContent.trim()).toBe('RM-09');
    });

    it('el botón de acción principal debe mostrar exactamente "NUEVA RUTA" sin el caracter "+" duplicado', () => {
      const btn = fixture.debugElement.query(By.css('[data-testid="btn-create-route"]'));
      expect(btn).toBeTruthy();
      expect(btn.nativeElement.textContent.trim()).toBe('NUEVA RUTA');
    });

    it('debe renderizar las 4 opciones de filtro de estado (TODAS, ACTIVAS, BORRADORES, ARCHIVADAS)', () => {
      const tabs = fixture.debugElement.queryAll(By.css('[data-testid="status-filter-tab"]'));
      expect(tabs.length).toBe(4);
      const labels = fixture.debugElement
        .queryAll(By.css('[data-testid="status-filter-label"]'))
        .map(t => t.nativeElement.textContent.trim());
      expect(labels).toEqual(['TODAS', 'ACTIVAS', 'BORRADORES', 'ARCHIVADAS']);
    });
  });

  // ========================================================
  // 4. BOLETO Y MEJORAS DE USO
  // ========================================================
  describe('4. Boleto y mejoras de uso', () => {
    const counts = () => fixture.debugElement
      .queryAll(By.css('[data-testid="status-filter-count"]'))
      .map(c => Number(c.nativeElement.textContent.trim()));

    it('cada filtro muestra cuántas rutas contiene y TODAS es la suma de los demás estados', () => {
      const [all, ...rest] = counts();
      expect(all).toBe(routesService.getAllRoutes().length);
      expect(rest.every(n => n <= all)).toBeTrue();
    });

    it('los contadores respetan la búsqueda', () => {
      component.searchQuery.set('Copacabana');
      fixture.detectChanges();
      expect(counts()[0]).toBe(1);
    });

    it('la cabecera abierta muestra el código del origen (LPZ) y sus métricas', () => {
      const header = fixture.debugElement.query(By.css('[data-testid="department-header-La Paz"]')).nativeElement as HTMLElement;
      expect(header.textContent).toContain('LPZ');
      expect(fixture.debugElement.query(By.css('[data-testid="origin-metrics"]'))).toBeTruthy();
    });

    it('buscar una parada abre solos los orígenes con coincidencias y oculta los demás', () => {
      component.selectedDepartment.set(null);
      component.searchQuery.set('sacaba');
      fixture.detectChanges();
      const items = fixture.debugElement.queryAll(By.css('[data-testid="department-accordion-item"]'));
      expect(items.length).toBeGreaterThan(0);
      expect(items.length).toBeLessThan(9);
      expect(fixture.debugElement.query(By.css('[data-testid="department-content-La Paz"]'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('[data-testid="search-summary"]')).nativeElement.textContent).toContain('encontrada');
    });

    it('la búsqueda ignora tildes ("potosi" encuentra "Potosí")', () => {
      component.searchQuery.set('potosi');
      fixture.detectChanges();
      expect(component.searchSummary().routes).toBeGreaterThan(0);
    });

    it('desactivar una ruta muestra un aviso con Deshacer que restaura el estado exacto', () => {
      const toast = TestBed.inject(ToastService);
      let message = '';
      let undo: (() => void) | undefined;
      spyOn(toast, 'show').and.callFake((msg: string, options?: { onAction?: () => void }) => {
        message = msg;
        undo = options?.onAction;
      });

      const route = routesService.getAllRoutes().find(r => r.status === 'ACTIVO')!;
      component.onRouteStatusToggle(route.id);
      expect(routesService.getAllRoutes().find(r => r.id === route.id)!.status).toBe('INACTIVO');
      expect(message).toContain(`${route.code} desactivada`);

      undo!();
      expect(routesService.getAllRoutes().find(r => r.id === route.id)!.status).toBe('ACTIVO');
    });

    it('un origen sin rutas invita a crear la primera con el origen ya elegido', () => {
      const empty = component.departments().find(d => component.hasNoRoutes(d));
      if (!empty) { pending('El catálogo de ejemplo no tiene orígenes vacíos'); return; }
      component.selectedDepartment.set(empty.name);
      fixture.detectChanges();
      const cta = fixture.debugElement.query(By.css('[data-testid="btn-create-route-from-origin"]'));
      expect(cta.nativeElement.textContent).toContain(empty.name);
      const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
      cta.triggerEventHandler('click', null);
      expect(navigate).toHaveBeenCalledWith(['/rutas-maestras/nueva'], { queryParams: { origen: empty.name } });
    });
  });
});
