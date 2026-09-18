import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { EditServiceDrawerComponent } from './edit-service-drawer.component';
import { ScheduleService } from '../../services/schedule.service';
import { ScheduleCalendarService } from '../../services/schedule-calendar.service';

describe('EditServiceDrawerComponent', () => {
  let component: EditServiceDrawerComponent;
  let fixture: ComponentFixture<EditServiceDrawerComponent>;
  let scheduleService: ScheduleService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditServiceDrawerComponent, ReactiveFormsModule],
      providers: [ScheduleService, ScheduleCalendarService]
    }).compileComponents();

    fixture = TestBed.createComponent(EditServiceDrawerComponent);
    component = fixture.componentInstance;
    scheduleService = TestBed.inject(ScheduleService);

    const srv = scheduleService.allServices()[0];
    scheduleService.openEditDrawer(srv);
    fixture.detectChanges();
  });

  it('debe crearse correctamente el drawer', () => {
    expect(component).toBeTruthy();
  });

  it('debe inicializar el formulario con los datos del servicio seleccionado', () => {
    const srv = scheduleService.allServices()[0];
    expect(component.editForm.value.originCity).toBe(srv.originCity);
    expect(component.editForm.value.destinationCity).toBe(srv.destinationCity);
    expect(component.editForm.value.distanceKm).toBe(srv.distanceKm);
  });

  it('debe actualizar los datos del servicio al guardar cambios', () => {
    component.editForm.patchValue({
      serviceName: 'Expreso Altiplano VIP Test',
      distanceKm: 300
    });

    component.save();

    const currentSrv = scheduleService.selectedService();
    expect(currentSrv?.serviceName).toBe('Expreso Altiplano VIP Test');
    expect(currentSrv?.distanceKm).toBe(300);
    expect(scheduleService.isEditDrawerOpen()).toBeFalse();
  });
});
