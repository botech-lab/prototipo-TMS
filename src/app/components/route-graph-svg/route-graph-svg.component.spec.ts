import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouteGraphSvgComponent } from './route-graph-svg.component';
import { StopNode } from '../../models/route.model';

describe('RouteGraphSvgComponent (TDD Suite - Responsive SVG Math Engine)', () => {
  let component: RouteGraphSvgComponent;
  let fixture: ComponentFixture<RouteGraphSvgComponent>;

  const mock13Stops: StopNode[] = [
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
  ];

  const mock5Stops: StopNode[] = [
    { id: '1', order: 1, name: 'La Paz', isOrigin: true },
    { id: '2', order: 2, name: 'El Alto' },
    { id: '3', order: 3, name: 'Huarina' },
    { id: '4', order: 4, name: 'Tiquina' },
    { id: '5', order: 5, name: 'Copacabana', isDestination: true }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouteGraphSvgComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RouteGraphSvgComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('stops', mock13Stops);
    fixture.detectChanges();
  });

  it('debe crearse el componente correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe renderizar el elemento SVG con viewBox proporcional calculado matemáticamente y ancho completo (route-graph__svg)', () => {
    const svgEl = fixture.debugElement.query(By.css('[data-testid="route-svg-graph"]'));
    expect(svgEl).toBeTruthy();
    expect(svgEl.attributes['viewBox']).toContain('0 0 460');
    expect(svgEl.nativeElement.classList.contains('route-graph__svg')).toBeTrue();
    expect(svgEl.attributes['preserveAspectRatio']).toBe('xMidYMid meet');
  });

  it('debe renderizar exactamente 13 nodos para la ruta RM-01', () => {
    const nodes = fixture.debugElement.queryAll(By.css('[data-testid="stop-node"], [data-testid="node-origin"], [data-testid="node-destination"]'));
    expect(nodes.length).toBe(13);
  });

  it('debe contener un contenedor con overflow-hidden para garantizar que no desborde la card', () => {
    const container = fixture.debugElement.query(By.css('.rm-svg-container'));
    expect(container).toBeTruthy();
    expect(getComputedStyle(container.nativeElement).overflow).toBe('hidden');
  });

  it('debe adaptar el trazado continuo cuando recibe una ruta corta de 5 paradas (RM-09)', () => {
    fixture.componentRef.setInput('stops', mock5Stops);
    fixture.detectChanges();

    const nodes = fixture.debugElement.queryAll(By.css('[data-testid="stop-node"], [data-testid="node-origin"], [data-testid="node-destination"]'));
    expect(nodes.length).toBe(5);

    const pathEl = fixture.debugElement.query(By.css('[data-testid="route-connection-path"]'));
    expect(pathEl).toBeTruthy();
    expect(pathEl.attributes['d']).toContain('M');
  });

  it('debe renderizar las etiquetas de las ciudades centradas en text-anchor="middle"', () => {
    const labels = fixture.debugElement.queryAll(By.css('text.city-label, [data-testid="city-name-label"]'));
    expect(labels.length).toBe(13);

    const firstLabel = labels[0];
    expect(firstLabel.attributes['text-anchor']).toBe('middle');
  });

  describe('Adaptación al tamaño real de la caja (ResizeObserver)', () => {
    const settle = async () => {
      await new Promise(resolve => setTimeout(resolve, 60));
      fixture.detectChanges();
    };
    const viewBoxOf = () => fixture.debugElement.query(By.css('[data-testid="route-svg-graph"]')).attributes['viewBox'];

    it('en una caja ancha (660x200) el lienzo usa todo el ancho: viewBox 0 0 660 200', async () => {
      const host = fixture.nativeElement as HTMLElement;
      host.style.width = '660px';
      host.style.height = '200px';
      await settle();
      expect(viewBoxOf()).toBe('0 0 660 200');
    });

    it('en una caja estrecha (320x200) baja a menos columnas para que los nombres no se pisen', async () => {
      const host = fixture.nativeElement as HTMLElement;
      host.style.width = '320px';
      host.style.height = '200px';
      await settle();
      expect(component.geometry().config.stopsPerRow).toBeLessThan(5);
      expect(viewBoxOf()).toMatch(/^0 0 320 \d+$/);
    });
  });
});
