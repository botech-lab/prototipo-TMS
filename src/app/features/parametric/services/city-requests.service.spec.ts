import { TestBed } from '@angular/core/testing';
import { CityRequestsService, normalize } from './city-requests.service';

describe('CityRequestsService', () => {
  let service: CityRequestsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CityRequestsService);
  });

  it('crea la solicitud pendiente con código correlativo', () => {
    const request = service.create({ name: ' Chulumani ', department: 'LA PAZ', municipality: '', reference: 'entre Unduavi y Coroico' });
    expect(request.code).toBe('SOL-0001');
    expect(request.name).toBe('Chulumani');
    expect(request.status).toBe('PENDIENTE');
    expect(service.pending().length).toBe(1);
  });

  it('no duplica una solicitud pendiente con el mismo nombre (sin importar tildes)', () => {
    const first = service.create({ name: 'Irupana', department: 'LA PAZ', municipality: '', reference: '' });
    const again = service.create({ name: 'irupaná', department: 'LA PAZ', municipality: '', reference: '' });
    expect(again).toBe(first);
    expect(service.all().length).toBe(1);
  });

  it('arma el enlace de WhatsApp con el número de solicitud', () => {
    const request = service.create({ name: 'Chulumani', department: 'LA PAZ', municipality: '', reference: '' });
    const link = service.whatsappLink(request);
    expect(link.startsWith('https://wa.me/')).toBeTrue();
    expect(decodeURIComponent(link)).toContain('SOL-0001');
  });

  it('normaliza nombres para comparar', () => {
    expect(normalize('  Guayaramerín ')).toBe('guayaramerin');
  });
});
