import { TestBed } from '@angular/core/testing';
import { RoutesService } from './routes.service';
import { MasterRoute } from '../models/route.model';

describe('RoutesService (TDD Suite - Catálogo Oficial de 10 Rutas Maestras)', () => {
  let service: RoutesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RoutesService]
    });
    service = TestBed.inject(RoutesService);
  });

  it('debe instanciarse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('debe contener las 10 rutas maestras oficiales (RM-01 a RM-10)', () => {
    const allRoutes = service.getAllRoutes();
    expect(allRoutes.length).toBe(10);

    const codes = allRoutes.map(r => r.code);
    expect(codes).toContain('RM-01');
    expect(codes).toContain('RM-02');
    expect(codes).toContain('RM-03');
    expect(codes).toContain('RM-04');
    expect(codes).toContain('RM-05');
    expect(codes).toContain('RM-06');
    expect(codes).toContain('RM-07');
    expect(codes).toContain('RM-08');
    expect(codes).toContain('RM-09');
    expect(codes).toContain('RM-10');
  });

  it('debe validar la configuración de RM-01 (La Paz → Santa Cruz con 13 paradas)', () => {
    const rm01 = service.getRouteByCode('RM-01');
    expect(rm01).toBeDefined();
    expect(rm01?.originDepartment).toBe('LA PAZ');
    expect(rm01?.destinationDepartment).toBe('SANTA CRUZ');
    expect(rm01?.stopsCount).toBe(13);
    expect(rm01?.stops.length).toBe(13);
    expect(rm01?.avoidedDuplicates).toContain('La Paz–Cochabamba');
    expect(rm01?.avoidedDuplicates).toContain('Cochabamba–Santa Cruz');
  });

  it('debe validar la configuración de RM-02 (La Paz → Tarija con 11 paradas)', () => {
    const rm02 = service.getRouteByCode('RM-02');
    expect(rm02).toBeDefined();
    expect(rm02?.originDepartment).toBe('LA PAZ');
    expect(rm02?.stopsCount).toBe(11);
    expect(rm02?.stops.length).toBe(11);
    expect(rm02?.avoidedDuplicates).toContain('La Paz–Oruro');
    expect(rm02?.avoidedDuplicates).toContain('Oruro–Potosí');
  });

  it('debe validar la configuración de RM-03 (Cochabamba → Potosí con 8 paradas)', () => {
    const rm03 = service.getRouteByCode('RM-03');
    expect(rm03).toBeDefined();
    expect(rm03?.originDepartment).toBe('COCHABAMBA');
    expect(rm03?.stopsCount).toBe(8);
    expect(rm03?.stops.length).toBe(8);
    expect(rm03?.avoidedDuplicates).toContain('Cochabamba–Sucre');
  });

  it('debe validar la configuración de RM-04 y RM-05 en Santa Cruz', () => {
    const rm04 = service.getRouteByCode('RM-04');
    const rm05 = service.getRouteByCode('RM-05');

    expect(rm04?.originDepartment).toBe('SANTA CRUZ');
    expect(rm04?.stopsCount).toBe(8);
    expect(rm04?.avoidedDuplicates).toContain('Santa Cruz–Sucre');

    expect(rm05?.originDepartment).toBe('SANTA CRUZ');
    expect(rm05?.destinationDepartment).toBe('YACUIBA');
    expect(rm05?.stopsCount).toBe(8);
    expect(rm05?.avoidedDuplicates).toContain('Santa Cruz–Tarija');
  });

  it('debe validar la configuración de RM-06 en Potosí (Villazón con 6 paradas)', () => {
    const rm06 = service.getRouteByCode('RM-06');
    expect(rm06?.originDepartment).toBe('POTOSÍ');
    expect(rm06?.stopsCount).toBe(6);
    expect(rm06?.avoidedDuplicates).toContain('Potosí–Uyuni');
  });

  it('debe validar la configuración de RM-07 y RM-08 en la zona oriental y amazónica', () => {
    const rm07 = service.getRouteByCode('RM-07');
    const rm08 = service.getRouteByCode('RM-08');

    expect(rm07?.originDepartment).toBe('SANTA CRUZ');
    expect(rm07?.stopsCount).toBe(7);

    expect(rm08?.originDepartment).toBe('BENI');
    expect(rm08?.destinationDepartment).toBe('COBIJA');
    expect(rm08?.stopsCount).toBe(5);
  });

  it('debe validar la configuración de RM-09 (Copacabana con 5 paradas) y RM-10 (Rurrenabaque con 7 paradas)', () => {
    const rm09 = service.getRouteByCode('RM-09');
    const rm10 = service.getRouteByCode('RM-10');

    expect(rm09?.originDepartment).toBe('LA PAZ');
    expect(rm09?.stopsCount).toBe(5);

    expect(rm10?.originDepartment).toBe('LA PAZ');
    expect(rm10?.stopsCount).toBe(7);
  });

  it('debe permitir cambiar de departamento activo y mantener solo uno expandido a la vez', () => {
    service.selectDepartment('SANTA CRUZ');
    expect(service.selectedDepartment()).toBe('SANTA CRUZ');
    expect(service.activeDepartmentGroup()?.department).toBe('SANTA CRUZ');
    expect(service.activeDepartmentGroup()?.routes.length).toBe(3); // RM-04, RM-05, RM-07
  });
});
