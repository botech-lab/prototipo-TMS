import { SeatPromptEngine } from './seat-prompt-engine';

describe('INTEGRITY GUARDIAN: Intérprete de Texto (Quick Prompt)', () => {
  it('la frase de referencia arma el bus completo', () => {
    const r = SeatPromptEngine.parse('Bus doble piso, abajo 12 camas con baño al fondo, arriba 40 semicama');
    expect(r.spec).not.toBeNull();
    const s = r.spec!;
    expect(s.decks.length).toBe(2);
    // P1: 12 camas en 2+1 → 4 filas + conductor = 5.
    expect(s.decks[0]).toEqual({ length: 5, left: 2, right: 1, seatType: 'CAM', seats: 12 });
    // P2: 40 semicama en 2+2 → 10 filas.
    expect(s.decks[1]).toEqual({ length: 10, left: 2, right: 2, seatType: 'SEM', seats: 40 });
    expect(s.bathroom).toBe('rear-right');
    expect(s.stairs).toBe('middle-left');
    expect(r.warnings).toEqual([]);
    expect(r.understood).toContain('2 pisos');
  });

  it('Regla 1: pisos por palabra clave o por mención de arriba/abajo', () => {
    expect(SeatPromptEngine.parse('40 semicama').spec!.decks.length).toBe(1);
    expect(SeatPromptEngine.parse('dos pisos con 20 camas').spec!.decks.length).toBe(2);
    expect(SeatPromptEngine.parse('abajo 10 camas, arriba 30 semicama').spec!.decks.length).toBe(2);
  });

  it('Regla 3: acepta cantidad antes o después del tipo, y sinónimos', () => {
    expect(SeatPromptEngine.parse('44 asientos semi cama').spec!.decks[0].seatType).toBe('SEM');
    expect(SeatPromptEngine.parse('cama x 12').spec!.decks[0].seatType).toBe('CAM');
    expect(SeatPromptEngine.parse('16 ejecutivos').spec!.decks[0].seatType).toBe('VIP');
    expect(SeatPromptEngine.parse('40 pasajeros').spec!.decks[0].seatType).toBe('EST');
  });

  it('Regla 4: esquema explícito gana; si no, el del tipo; minibús fuerza 2+1', () => {
    expect(SeatPromptEngine.parse('40 semicama 3+2').spec!.decks[0]).toEqual(jasmine.objectContaining({ left: 3, right: 2 }));
    expect(SeatPromptEngine.parse('12 camas').spec!.decks[0]).toEqual(jasmine.objectContaining({ left: 2, right: 1 }));
    expect(SeatPromptEngine.parse('minibus 14 pasajeros').spec!.decks[0]).toEqual(jasmine.objectContaining({ left: 2, right: 1, length: 6 }));
  });

  it('Regla 5: servicios', () => {
    expect(SeatPromptEngine.parse('40 semicama sin baño').spec!.bathroom).toBe('none');
    expect(SeatPromptEngine.parse('40 semicama baño en medio').spec!.bathroom).toBe('middle-right');
    expect(SeatPromptEngine.parse('40 semicama con dos puertas').spec!.doors).toBe('front-rear');
    expect(SeatPromptEngine.parse('40 semicama puerta central').spec!.doors).toBe('front-middle');
    expect(SeatPromptEngine.parse('doble piso abajo 12 camas arriba 40 semicama escalera al fondo derecha').spec!.stairs).toBe('rear-right');
  });

  it('es determinista y tolera mayúsculas, acentos y ruido', () => {
    const a = SeatPromptEngine.parse('BUS DOBLE PISO: ABAJO 12 CAMAS CON BAÑO AL FONDO; ARRIBA 40 SEMICAMA!!');
    const b = SeatPromptEngine.parse('bus doble piso, abajo 12 camas con bano al fondo, arriba 40 semicama');
    expect(a.spec).toEqual(b.spec);
  });

  it('avisa cuando un tramo no se entiende y aplica un valor razonable', () => {
    const r = SeatPromptEngine.parse('doble piso, abajo camas cómodas, arriba 40 semicama');
    expect(r.warnings.length).toBe(1);
    expect(r.spec!.decks[1].seatType).toBe('SEM');
  });

  it('con texto vacío no inventa un bus', () => {
    expect(SeatPromptEngine.parse('   ').spec).toBeNull();
  });
});
