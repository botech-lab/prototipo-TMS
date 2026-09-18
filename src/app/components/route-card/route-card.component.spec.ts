import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouteCardComponent } from './route-card.component';
import { MasterRoute } from '../../models/route.model';
import { ROUTE_CARD_DIMENSIONS } from './route-card-rules';

describe('RouteCardComponent (TDD Suite - Exact Visual Symmetry & Fixed Heights)', () => {
  let component: RouteCardComponent;
  let fixture: ComponentFixture<RouteCardComponent>;

  const mockRouteRM01: MasterRoute = {
    id: 'RM-01',
    code: 'RM-01',
    name: 'La Paz → Santa Cruz',
    originDepartment: 'LA PAZ',
    destinationDepartment: 'SANTA CRUZ',
    status: 'ACTIVO',
    stopsCount: 13,
    isExpanded: true,
    derivedServices: [
      'La Paz–Cochabamba',
      'Cochabamba–Santa Cruz',
      'Villa Tunari–Santa Cruz',
      'Montero–Santa Cruz'
    ],
    stops: [
      { id: '1', order: 1, name: 'La Paz', isOrigin: true },
      { id: '2', order: 2, name: 'El Alto' },
      { id: '3', order: 3, name: 'Calamarca' },
      { id: '4', order: 4, name: 'Caracollo' },
      { id: '5', order: 5, name: 'Cochabamba' },
      { id: '6', order: 6, name: 'Sacaba' },
      { id: '7', order: 7, name: 'Colomi' },
      { id: '8', order: 8, name: 'Villa Tunari' },
      { id: '9', order: 9, name: 'Shinahota' },
      { id: '10', order: 10, name: 'Chimoré' },
      { id: '11', order: 11, name: 'Yapacaní' },
      { id: '12', order: 12, name: 'Montero' },
      { id: '13', order: 13, name: 'Santa Cruz', isDestination: true }
    ]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouteCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RouteCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('route', mockRouteRM01);
    fixture.detectChanges();
  });

  it('debe crear el componente correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('el título de la ruta debe truncarse con puntos suspensivos para evitar empujar contenido', () => {
    const titleEl = fixture.debugElement.query(By.css('[data-testid="route-title"]'));
    expect(titleEl).toBeTruthy();
    const titleStyle = getComputedStyle(titleEl.nativeElement);
    expect(titleStyle.textOverflow).toBe('ellipsis');
    expect(titleStyle.whiteSpace).toBe('nowrap');
    expect(titleStyle.overflow).toBe('hidden');
    expect(titleEl.nativeElement.textContent).toContain('La Paz → Santa Cruz');
  });

  it('debe mantener la altura estructural fija en el contenedor del SVG (SVG_CONTAINER_HEIGHT)', () => {
    expect(ROUTE_CARD_DIMENSIONS.SVG_CONTAINER_HEIGHT).toBe(210);
    const svgContainer = fixture.nativeElement.querySelector('[data-testid="route-graph-container"]');
    expect(svgContainer).toBeTruthy();
    expect(getComputedStyle(svgContainer).height).toBe(`${ROUTE_CARD_DIMENSIONS.SVG_CONTAINER_HEIGHT}px`);
  });

  it('debe mantener la altura estructural fija en el contenedor de servicios (SERVICES_CONTAINER_HEIGHT)', () => {
    expect(ROUTE_CARD_DIMENSIONS.SERVICES_CONTAINER_HEIGHT).toBe(110);
    const servicesContainer = fixture.nativeElement.querySelector('[data-testid="route-services-container"]');
    expect(servicesContainer).toBeTruthy();
    expect(getComputedStyle(servicesContainer).height).toBe(`${ROUTE_CARD_DIMENSIONS.SERVICES_CONTAINER_HEIGHT}px`);
  });

  it('el footer debe medir siempre FOOTER_HEIGHT (48px) con borde superior, y el header HEADER_HEIGHT (76px)', () => {
    expect(ROUTE_CARD_DIMENSIONS.FOOTER_HEIGHT).toBe(48);
    expect(ROUTE_CARD_DIMENSIONS.HEADER_HEIGHT).toBe(76);

    const footerContainer = fixture.nativeElement.querySelector('[data-testid="route-footer"]');
    expect(footerContainer).toBeTruthy();
    const footerStyle = getComputedStyle(footerContainer);
    expect(footerStyle.height).toBe(`${ROUTE_CARD_DIMENSIONS.FOOTER_HEIGHT}px`);
    expect(footerStyle.borderTopWidth).toBe('1px');

    const headerEl = fixture.nativeElement.querySelector('.route-card__header');
    expect(getComputedStyle(headerEl).height).toBe(`${ROUTE_CARD_DIMENSIONS.HEADER_HEIGHT}px`);
  });

  it('cuando la tarjeta está colapsada (isExpanded = false), debe aplicar min-height CARD_COLLAPSED_HEIGHT (160px)', () => {
    fixture.componentRef.setInput('route', { ...mockRouteRM01, isExpanded: false });
    fixture.detectChanges();

    expect(ROUTE_CARD_DIMENSIONS.CARD_COLLAPSED_HEIGHT).toBe(160);
    const cardEl = fixture.debugElement.query(By.css('.rm-route-card'));
    expect(cardEl.nativeElement.classList.contains('route-card--collapsed')).toBeTrue();
    expect(getComputedStyle(cardEl.nativeElement).minHeight).toBe(`${ROUTE_CARD_DIMENSIONS.CARD_COLLAPSED_HEIGHT}px`);
  });

  it('cuando la tarjeta está expandida (isExpanded = true), debe aplicar min-height CARD_EXPANDED_HEIGHT (520px)', () => {
    fixture.componentRef.setInput('route', { ...mockRouteRM01, isExpanded: true });
    fixture.detectChanges();

    expect(ROUTE_CARD_DIMENSIONS.CARD_EXPANDED_HEIGHT).toBe(520);
    const cardEl = fixture.debugElement.query(By.css('.rm-route-card'));
    expect(cardEl.nativeElement.classList.contains('route-card--expanded')).toBeTrue();
    expect(getComputedStyle(cardEl.nativeElement).minHeight).toBe(`${ROUTE_CARD_DIMENSIONS.CARD_EXPANDED_HEIGHT}px`);
  });

  it('debe renderizar los chips de servicios creados', () => {
    const chips = fixture.debugElement.queryAll(By.css('[data-testid="avoided-duplicate-chip"]'));
    expect(chips.length).toBe(4);
  });

  it('debe renderizar el botón de despliegue estandarizado con texto y chevron', () => {
    const toggleBtn = fixture.debugElement.query(By.css('[data-testid="btn-toggle-details"]'));
    expect(toggleBtn).toBeTruthy();
    expect(toggleBtn.nativeElement.textContent.trim()).toContain('Ocultar Detalle');
  });

  it('debe renderizar la píldora switch interactiva en la fila superior derecha', () => {
    const toggleElement = fixture.nativeElement.querySelector('input[type="checkbox"]');
    expect(toggleElement).toBeTruthy();
  });

  it('el título muestra solo origen → destino y las ciudades intermedias van en la línea "vía"', () => {
    fixture.componentRef.setInput('route', { ...mockRouteRM01, name: 'La Paz → Oruro → Potosí → Tarija' });
    fixture.detectChanges();
    const title = fixture.debugElement.query(By.css('[data-testid="route-title"]')).nativeElement as HTMLElement;
    const via = fixture.debugElement.query(By.css('[data-testid="route-via"]')).nativeElement as HTMLElement;
    expect(title.textContent!.replace(/\s+/g, ' ').trim()).toBe('La Paz → Tarija');
    expect(via.textContent!.trim()).toBe('vía Oruro, Potosí');
    expect(title.getAttribute('title')).toBe('La Paz → Oruro → Potosí → Tarija');
  });

  it('sin ciudades intermedias no se muestra la línea "vía"', () => {
    expect(fixture.debugElement.query(By.css('[data-testid="route-via"]'))).toBeNull();
  });
});
