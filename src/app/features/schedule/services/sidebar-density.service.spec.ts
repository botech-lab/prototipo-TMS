import { TestBed } from '@angular/core/testing';
import { SidebarDensityService } from './sidebar-density.service';

describe('SidebarDensityService (Arquitectura de Densidad Dinámica)', () => {
  let service: SidebarDensityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SidebarDensityService]
    });
    service = TestBed.inject(SidebarDensityService);
  });

  it('debe crearse correctamente el servicio', () => {
    expect(service).toBeTruthy();
  });

  it('debe devolver modo "comfortable" cuando hay 4 o menos orígenes disponibles', () => {
    expect(service.getDensity(1)).toBe('comfortable');
    expect(service.getDensity(2)).toBe('comfortable');
    expect(service.getDensity(3)).toBe('comfortable');
    expect(service.getDensity(4)).toBe('comfortable');
  });

  it('debe devolver modo "compact" cuando hay más de 4 orígenes disponibles (ej. 5, 8, 12)', () => {
    expect(service.getDensity(5)).toBe('compact');
    expect(service.getDensity(8)).toBe('compact');
    expect(service.getDensity(12)).toBe('compact');
  });
});
