import { SeatTypeResolver } from './seat-type-resolver';

describe('INTEGRITY GUARDIAN: Resolvedor difuso de tipos de butaca', () => {
  const CAT = [{ code: 'EST', name: 'Estándar' }, { code: 'SEM', name: 'Semicama' }, { code: 'CAM', name: 'Cama' }, { code: 'VIP', name: 'VIP' }, { code: 'UV', name: 'Ultra VIP' }];

  it('Levenshtein clásico', () => {
    expect(SeatTypeResolver.levenshtein('cama', 'cama')).toBe(0);
    expect(SeatTypeResolver.levenshtein('kama', 'cama')).toBe(1);
    expect(SeatTypeResolver.levenshtein('semikma', 'semicama')).toBe(2);
    expect(SeatTypeResolver.levenshtein('', 'abc')).toBe(3);
  });

  it('exacto: sinónimos y nombres del catálogo, sin tildes ni mayúsculas', () => {
    expect(SeatTypeResolver.resolve('Semicama', CAT)).toEqual(jasmine.objectContaining({ status: 'exact', code: 'SEM' }));
    expect(SeatTypeResolver.resolve('ESTÁNDAR', CAT).code).toBe('EST');
    expect(SeatTypeResolver.resolve('leito', CAT).code).toBe('CAM');
    expect(SeatTypeResolver.resolve('Ultra VIP', CAT)).toEqual(jasmine.objectContaining({ status: 'exact', code: 'UV' }));
  });

  it('difuso: hasta 2 errores en palabras largas, 1 en cortas, 0 en muy cortas', () => {
    expect(SeatTypeResolver.resolve('semikma', CAT)).toEqual(jasmine.objectContaining({ status: 'fuzzy', code: 'SEM', distance: 2 }));
    expect(SeatTypeResolver.resolve('kama', CAT)).toEqual(jasmine.objectContaining({ status: 'fuzzy', code: 'CAM', distance: 1 }));
    expect(SeatTypeResolver.resolve('estamdar', CAT).code).toBe('EST');
    expect(SeatTypeResolver.resolve('vic', CAT).status).toBe('unknown');
  });

  it('desconocido: devuelve el más cercano como alternativa, nunca falla', () => {
    const r = SeatTypeResolver.resolve('cama premium', CAT.filter(c => c.code !== 'UV'));
    expect(r.status).toBe('unknown');
    expect(r.closest?.code).toBe('CAM');
    expect(SeatTypeResolver.resolve('', CAT).status).toBe('unknown');
  });

  it('el relleno no cuenta: "camas individuales" es cama', () => {
    expect(SeatTypeResolver.resolve('camas individuales', CAT)).toEqual(jasmine.objectContaining({ status: 'exact', code: 'CAM' }));
  });
});
