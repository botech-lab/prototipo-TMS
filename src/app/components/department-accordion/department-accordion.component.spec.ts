import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DepartmentAccordionComponent } from './department-accordion.component';
import { DepartmentGroup } from '../../models/route.model';

describe('DepartmentAccordionComponent (TDD Suite - Grid & Secondary Pills)', () => {
  let component: DepartmentAccordionComponent;
  let fixture: ComponentFixture<DepartmentAccordionComponent>;

  const mockDepartment: DepartmentGroup = {
    department: 'LA PAZ',
    totalRoutes: 2,
    isExpanded: true,
    routes: [
      {
        id: 'rm-05',
        code: 'RM-05',
        name: 'la paz - cochabamba',
        originDepartment: 'LA PAZ',
        status: 'ACTIVO',
        stopsCount: 11,
        isExpanded: true,
        stops: [
          { id: '1', order: 1, name: 'La Paz', isOrigin: true },
          { id: '2', order: 2, name: 'El Alto' },
          { id: '3', order: 3, name: 'Patacamaya' },
          { id: '4', order: 4, name: 'Caracollo' },
          { id: '5', order: 5, name: 'Oruro' },
          { id: '6', order: 6, name: 'Challapata' },
          { id: '7', order: 7, name: 'Potosí' },
          { id: '8', order: 8, name: 'Tarija' },
          { id: '9', order: 9, name: 'Sucre' },
          { id: '10', order: 10, name: 'Tupiza' },
          { id: '11', order: 11, name: 'Cochabamba', isDestination: true }
        ]
      }
    ]
  };

  const mockSecondary: DepartmentGroup[] = [
    { department: 'ORURO', totalRoutes: 2, isExpanded: false, routes: [] },
    { department: 'CHUQUISACA', totalRoutes: 3, isExpanded: false, routes: [] },
    { department: 'POTOSÍ', totalRoutes: 1, isExpanded: false, routes: [] }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepartmentAccordionComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DepartmentAccordionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('department', mockDepartment);
    fixture.componentRef.setInput('secondaryDepartments', mockSecondary);
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe renderizar el título del acordeón "ORIGEN: LA PAZ" con el icono de línea del pin', () => {
    const titleEl = fixture.debugElement.query(By.css('[data-testid="accordion-title"]'));
    expect(titleEl.nativeElement.textContent).toContain('ORIGEN: LA PAZ');
    const pinIcon = titleEl.nativeElement.querySelector('[data-testid="accordion-pin-icon"]');
    expect(pinIcon).toBeTruthy();
    expect(pinIcon.getAttribute('aria-hidden')).toBe('true');
  });

  it('debe renderizar el grid responsivo de tarjetas dentro del departamento activo', () => {
    const gridEl = fixture.debugElement.query(By.css('[data-testid="routes-grid"]'));
    expect(gridEl).toBeTruthy();
    expect(getComputedStyle(gridEl.nativeElement).display).toBe('grid');

    const routeCards = fixture.debugElement.queryAll(By.css('[data-testid="department-route-card"]'));
    expect(routeCards.length).toBe(1);
  });

  it('debe renderizar la fila de pastillas de departamentos secundarios (separación de 12px)', () => {
    const bottomBar = fixture.debugElement.query(By.css('[data-testid="bottom-department-bar"]'));
    expect(bottomBar).toBeTruthy();

    const pills = bottomBar.queryAll(By.css('[data-testid="secondary-department-pill"]'));
    expect(pills.length).toBe(3);
    expect(pills[0].nativeElement.textContent).toContain('ORURO');
  });

  it('debe emitir `selectDepartment` al hacer clic en una pastilla secundaria', () => {
    spyOn(component.selectDepartment, 'emit');

    const pills = fixture.debugElement.queryAll(By.css('[data-testid="secondary-department-pill"]'));
    pills[0].triggerEventHandler('click', null);

    expect(component.selectDepartment.emit).toHaveBeenCalledWith('ORURO');
  });
});
