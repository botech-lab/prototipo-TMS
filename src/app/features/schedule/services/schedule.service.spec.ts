import { TestBed } from '@angular/core/testing';
import { ScheduleService } from './schedule.service';
import { ScheduleCalendarService } from './schedule-calendar.service';
import { ScheduledCommercialService } from '../models/schedule.model';

describe('ScheduleOperationsService (Refinamiento Visual & Confirmación de Switch)', () => {
  let service: ScheduleService;
  let calendarService: ScheduleCalendarService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ScheduleService, ScheduleCalendarService]
    });
    service = TestBed.inject(ScheduleService);
    calendarService = TestBed.inject(ScheduleCalendarService);
  });

  it('el título del calendario debe ser limpio (ej. "Septiembre 2026") sin prefijo "Semana X"', () => {
    const week = calendarService.currentWeek();
    expect(week.title).toBe('Septiembre 2026');
    expect(week.title).not.toContain('Semana');
  });

  it('debe abrir modal de confirmación toggle-confirm con requestToggleSlot(slot)', () => {
    const srv = service.allServices()[0];
    service.selectService(srv);

    const slot = service.currentWeekSlots()[0];
    service.requestToggleSlot(slot);

    const modal = service.modalState();
    expect(modal.isOpen).toBeTrue();
    expect(modal.type).toBe('toggle-confirm');
    expect(modal.slot?.id).toBe(slot.id);
  });

  it('debe cambiar el estado del slot solo al ejecutar confirmToggleSlot()', () => {
    const srv = service.allServices()[0];
    service.selectService(srv);

    const slot = service.currentWeekSlots()[0];
    const initialStatus = slot.isActive;

    service.requestToggleSlot(slot);
    service.confirmToggleSlot();

    const updatedSlot = service.currentWeekSlots().find(s => s.id === slot.id)!;
    expect(updatedSlot.isActive).toBe(!initialStatus);
    expect(service.modalState().isOpen).toBeFalse();
  });
});
