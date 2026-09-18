import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScheduledServicesComponent } from './scheduled-services.component';
import { ScheduleService } from '../../services/schedule.service';
import { ScheduleCalendarService } from '../../services/schedule-calendar.service';
import { SidebarDensityService } from '../../services/sidebar-density.service';

describe('ScheduledServicesComponent (Diseño Exacto de Referencia media_1788212086653.png)', () => {
  let component: ScheduledServicesComponent;
  let fixture: ComponentFixture<ScheduledServicesComponent>;
  let scheduleService: ScheduleService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScheduledServicesComponent],
      providers: [ScheduleService, ScheduleCalendarService, SidebarDensityService]
    }).compileComponents();

    fixture = TestBed.createComponent(ScheduledServicesComponent);
    component = fixture.componentInstance;
    scheduleService = TestBed.inject(ScheduleService);
    fixture.detectChanges();
  });

  it('debe crearse correctamente el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe renderizar la tarjeta compacta del sidebar: turno, ruta, hora de salida con duración y una línea de metadatos', () => {
    scheduleService.openOriginCity.set('LA PAZ');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const firstCard = compiled.querySelector('aside .scheduled-services__service-list > div') as HTMLElement | null;
    expect(firstCard).toBeTruthy();

    // Toda la tarjeta es el control de selección
    expect(firstCard?.getAttribute('role')).toBe('button');
    expect(firstCard?.getAttribute('tabindex')).toBe('0');
    expect(firstCard?.hasAttribute('aria-pressed')).toBeTrue();
    // Sin botones internos (sin pie ni lápiz)
    expect(firstCard?.querySelector('button')).toBeNull();

    // Kicker de turno y título de ruta (H3)
    expect(firstCard?.querySelector('.scheduled-services__shift-pill')?.textContent).toContain('MAÑANA');
    const title = firstCard?.querySelector('h3.scheduled-services__card-title');
    expect(title).toBeTruthy();
    expect(title?.textContent).toContain('La Paz');
    expect(title?.textContent).toContain('Oruro');

    // Hora de salida y duración a la derecha
    expect(firstCard?.querySelector('.scheduled-services__ticket-time')?.textContent?.trim()).toMatch(/^\d{2}:\d{2}$/);
    expect(firstCard?.querySelector('.scheduled-services__ticket-duration')?.textContent).toMatch(/\d+h \d{2}m|\d+m/);

    // Una línea de metadatos: códigos de ciudad, salidas por día y kilómetros
    const meta = firstCard?.querySelector('.scheduled-services__card-meta')?.textContent ?? '';
    expect(meta).toContain('LPZ');
    expect(meta).toContain('ORU');
    expect(meta).toContain('salidas/día');
    expect(meta).toContain('km');
  });

  it('debe abrir el Drawer de edición desde "Editar configuración" del servicio seleccionado', () => {
    scheduleService.openOriginCity.set('LA PAZ');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const firstCard = compiled.querySelector('aside .scheduled-services__service-list > div') as HTMLElement;
    expect(firstCard).toBeTruthy();

    firstCard.click();
    fixture.detectChanges();
    expect(firstCard.getAttribute('aria-pressed')).toBe('true');

    const editBtn = compiled.querySelector('.scheduled-services__edit-config') as HTMLButtonElement;
    expect(editBtn).toBeTruthy();
    expect(editBtn.textContent?.toLowerCase()).toContain('editar configuración');

    editBtn.click();
    fixture.detectChanges();

    expect(scheduleService.isEditDrawerOpen()).toBeTrue();
  });
});
