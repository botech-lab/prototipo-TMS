import { SeatLayoutEngine } from './seat-layout-engine';
import { SeatMutationEngine, MutationContext } from './seat-mutation-engine';
import { BuildSpec, NumberingStrategy, SeatCell, VehicleLayout } from '../models/seat-layout.model';

describe('INTEGRITY GUARDIAN: Motor de mutaciones (retoques sobre un plano vivo)', () => {
  const SPEC: BuildSpec = {
    decks: [
      { length: 5, left: 2, right: 1, seatType: 'CAM', seats: 10 },
      { length: 10, left: 2, right: 2, seatType: 'SEM', seats: 36 }
    ],
    bathroom: 'entry', doors: 'front', stairs: 'front-right'
  };
  const build = (plan: NumberingStrategy | readonly NumberingStrategy[] = 'aisleOdd') =>
    SeatLayoutEngine.buildFromSpec('v', SPEC, plan, 'continuous');
  const ctx = (over: Partial<MutationContext> = {}): MutationContext =>
    ({ plan: ['aisleOdd', 'aisleOdd'], scope: 'continuous', activeDeck: 0, ...over });

  /** Ventana y pasillo de la primera fila con butacas de un piso. */
  const firstRow = (layout: VehicleLayout, deckIndex: number) => {
    const deck = layout.decks[deckIndex];
    const row = deck.cells.findIndex(line => line[0].kind === 'seat');
    return { window: (deck.cells[row][0] as SeatCell).number, aisle: (deck.cells[row][deck.aisleCol - 1] as SeatCell).number };
  };

  describe('Clasificador de intención', () => {
    it('sin plano dibujado nada es un retoque: todo describe un bus nuevo', () => {
      expect(SeatMutationEngine.isMutation('invierte las columnas', false)).toBeFalse();
      expect(SeatMutationEngine.isMutation('renumera el segundo piso con ventana par', false)).toBeFalse();
    });

    it('con plano, los verbos de retoque y las reglas de numeración cuentan como mutación', () => {
      for (const t of [
        'modificamelo lo asientos en el segundo piso impares en ventana y pares pasillo',
        'cambia la numeración del primer piso',
        'invierte las columnas',
        'mueve la fila individual a la derecha',
        'renumera todo por fila'
      ]) expect(SeatMutationEngine.isMutation(t, true)).withContext(t).toBeTrue();
    });

    it('describir un bus entero, sin verbo de retoque, es creación', () => {
      for (const t of ['quiero un bus de 2 pisos con 40 semicama', 'hola qué tal']) {
        expect(SeatMutationEngine.isMutation(t, true)).withContext(t).toBeFalse();
      }
    });

    it('con verbo pero describiendo un bus entero, el motor devuelve el turno a creación', () => {
      const t = 'cambia todo: doble piso, abajo 12 camas, arriba 44 semicama';
      expect(SeatMutationEngine.isMutation(t, true)).toBeTrue();          // el verbo abre la puerta…
      expect(SeatMutationEngine.apply(build(), t, ctx()).status).toBe('unknown');   // …y el motor la cierra
    });
  });

  describe('Regla de numeración por piso', () => {
    const COMMAND = 'modificamelo lo asientos en el segundo piso impares en ventana y pares pasillo';

    it('la frase del operador cambia SOLO el segundo piso', () => {
      const layout = build();
      const r = SeatMutationEngine.apply(layout, COMMAND, ctx());
      expect(r.status).toBe('applied');
      expect(r.kind).toBe('numbering');
      expect(r.numbering).toEqual(['aisleOdd', 'sides']);
      expect(r.deckIndex).toBe(1);
      expect(r.message).toContain('Listo: he actualizado la numeración del Segundo Piso a impares en ventana y pares en pasillo.');

      // P2 pasa a ventana impar; P1 conserva su regla y sus números.
      expect(firstRow(r.layout!, 1).window % 2).toBe(1);
      expect(firstRow(r.layout!, 1).aisle % 2).toBe(0);
      expect(firstRow(r.layout!, 0)).toEqual(firstRow(layout, 0));
    });

    it('no toca plazas, mobiliario ni el resto del plano', () => {
      const layout = build();
      const r = SeatMutationEngine.apply(layout, COMMAND, ctx());
      const kinds = (l: VehicleLayout) => l.decks.map(d => d.cells.flat().map(c => c.kind).join(','));
      expect(kinds(r.layout!)).toEqual(kinds(layout));
      expect(SeatLayoutEngine.stats(r.layout!, null).totalSeats).toBe(46);
      expect(r.layout!.decks[0].doors).toEqual(layout.decks[0].doors);
    });

    it('sin mencionar piso, la regla se aplica a todo el bus y no salta de piso', () => {
      const r = SeatMutationEngine.apply(build(), 'cambia la numeración a por fila', ctx());
      expect(r.numbering).toEqual(['rows', 'rows']);
      expect(r.deckIndex).toBeNull();
      expect(r.message).toContain('de todo el bus');
    });

    it('si ya estaba así lo dice y no rehace el plano', () => {
      const r = SeatMutationEngine.apply(build(), 'renumera el segundo piso con pares en ventana', ctx());
      expect(r.status).toBe('noop');
      expect(r.layout).toBeNull();
      expect(r.message).toBe('El Segundo Piso ya numera pares en ventana e impares en pasillo.');
    });

    it('pedir el segundo piso en un bus de uno solo se avisa, no se inventa', () => {
      const single = SeatLayoutEngine.buildFromSpec('v', { ...SPEC, decks: [SPEC.decks[0]], stairs: 'none' }, 'sides', 'continuous');
      const r = SeatMutationEngine.apply(single, 'renumera el segundo piso con ventana par', { ...ctx(), plan: ['sides'] });
      expect(r.status).toBe('noop');
      expect(r.message).toContain('un solo piso');
    });
  });

  describe('Alcance de la numeración', () => {
    it('"numeración por piso" cambia el alcance, no la regla de recorrido', () => {
      const r = SeatMutationEngine.apply(build(), 'pon la numeración por piso', ctx());
      expect(r.kind).toBe('scope');
      expect(r.scope).toBe('perDeck');
      expect(r.numbering).toEqual(['aisleOdd', 'aisleOdd']);
      expect(firstRow(r.layout!, 1).window).toBeLessThan(5);   // el piso alto vuelve a empezar
    });

    it('"numeración corrida" cuando ya lo es se avisa', () => {
      expect(SeatMutationEngine.apply(build(), 'numeración corrida', ctx()).status).toBe('noop');
    });
  });

  describe('Inversión de columnas', () => {
    it('"invierte las columnas del primer piso" permuta y renumera solo ese piso', () => {
      const layout = build();
      const r = SeatMutationEngine.apply(layout, 'invierte las columnas del primer piso', ctx());
      expect(r.status).toBe('applied');
      expect(r.kind).toBe('swap');
      expect(r.layout!.decks[0].left).toBe(1);
      expect(r.layout!.decks[0].right).toBe(2);
      expect(r.layout!.decks[1].left).toBe(2);          // el piso alto, intacto
      expect(SeatLayoutEngine.stats(r.layout!, null).totalSeats).toBe(46);
    });

    it('"mueve la fila individual a la izquierda" entiende el lado pedido', () => {
      const r = SeatMutationEngine.apply(build(), 'mueve la fila individual a la izquierda', ctx());
      expect(r.status).toBe('applied');
      expect(r.layout!.decks[0].left).toBe(1);
      // Pedirlo donde ya está no rehace nada.
      expect(SeatMutationEngine.apply(build(), 'mueve la fila individual a la derecha', ctx()).status).toBe('noop');
    });

    it('sin decir piso, invierte el que se está mirando', () => {
      const r = SeatMutationEngine.apply(build(), 'invierte los lados', ctx({ activeDeck: 1 }));
      expect(r.status).toBe('noop');                    // el piso alto es 2+2: simétrico
      expect(r.message).toContain('simétrica');
      expect(r.deckIndex).toBe(1);
    });

    it('un esquema explícito indica el lado: "déjalo en 1+2"', () => {
      const r = SeatMutationEngine.apply(build(), 'déjalo en 1+2', ctx());
      expect(r.layout!.decks[0].left).toBe(1);
    });
  });

  it('un comando que no se entiende devuelve el turno al flujo de creación', () => {
    const r = SeatMutationEngine.apply(build(), 'ponle wifi a las butacas', ctx());
    expect(r.status).toBe('unknown');
    expect(r.layout).toBeNull();
  });

  describe('Casos críticos de transporte', () => {
    const CAT = [{ code: 'EST', name: 'Estándar' }, { code: 'SEM', name: 'Semicama' }, { code: 'CAM', name: 'Cama' }, { code: 'VIP', name: 'VIP' }, { code: 'REL', name: 'Relevo' }];
    const withCat = (over: Partial<MutationContext> = {}) => ctx({ catalog: CAT, ...over });
    const seatsOf = (l: VehicleLayout, d: number) => l.decks[d].cells.flat().filter(c => c.kind === 'seat') as SeatCell[];
    const series = (l: VehicleLayout, d: number) => seatsOf(l, d).filter(c => SeatLayoutEngine.isSellable(c.seatType)).map(c => c.number).sort((a, b) => a - b);

    it('1 · quita plazas del piso citado y no toca el otro', () => {
      const layout = build();
      const r = SeatMutationEngine.apply(layout, 'Quítame 2 asientos del piso 2 porque queda muy apretado', withCat());
      expect(r.status).toBe('applied');
      expect(r.kind).toBe('quantity');
      expect(seatsOf(r.layout!, 1).length).toBe(34);
      expect(seatsOf(r.layout!, 0).length).toBe(10);
      expect(series(r.layout!, 0)).toEqual(series(layout, 0));
      // La serie queda corrida de 1 a 44, sin huecos.
      expect([...series(r.layout!, 0), ...series(r.layout!, 1)]).toEqual(Array.from({ length: 44 }, (_, i) => i + 1));
    });

    it('1b · "agrega una fila más abajo" añade una fila entera de butacas', () => {
      const layout = build();
      const r = SeatMutationEngine.apply(layout, 'Agrega una fila más abajo', withCat());
      expect(r.kind).toBe('quantity');
      expect(seatsOf(r.layout!, 0).length).toBe(10 + (layout.decks[0].left + layout.decks[0].right));
      expect(seatsOf(r.layout!, 1).length).toBe(36);
    });

    it('2 · "el asiento 12 que sea para chofer de relevo" cambia solo esa celda', () => {
      const r = SeatMutationEngine.apply(build(), 'El asiento 12 que sea para chofer de relevo', withCat());
      expect(r.status).toBe('applied');
      expect(r.kind).toBe('seat');
      const relief = seatsOf(r.layout!, 1).filter(c => c.seatType === 'REL');
      expect(relief.length).toBe(1);
      // El relevo no se vende: sale de la serie y el resto se compacta.
      expect(series(r.layout!, 0).concat(series(r.layout!, 1))).toEqual(Array.from({ length: 45 }, (_, i) => i + 1));
    });

    it('2b · "borra el asiento 5" lo vacía y cierra el hueco', () => {
      const r = SeatMutationEngine.apply(build(), 'Borra el asiento 5', withCat());
      expect(seatsOf(r.layout!, 0).length).toBe(9);
      expect(series(r.layout!, 0)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('2c · una butaca que no existe se avisa; un tipo que no existe también', () => {
      expect(SeatMutationEngine.apply(build(), 'borra el asiento 999', withCat()).status).toBe('noop');
      const r = SeatMutationEngine.apply(build(), 'el asiento 3 que sea cama premium', withCat());
      expect(r.status).toBe('noop');
      expect(r.message).toContain('No tengo el tipo');
    });

    it('7 · rangos por número: "del 1 al 6 cama y del 7 al 10 semicama"', () => {
      const r = SeatMutationEngine.apply(build(), 'Del 1 al 6 que sean cama y del 7 al 10 semicama', withCat());
      expect(r.status).toBe('applied');
      expect(r.kind).toBe('range');
      const byNumber = new Map(seatsOf(r.layout!, 0).map(c => [c.number, c.seatType]));
      for (let n = 1; n <= 6; n++) expect(byNumber.get(n)).withContext(`butaca ${n}`).toBe('CAM');
      for (let n = 7; n <= 10; n++) expect(byNumber.get(n)).withContext(`butaca ${n}`).toBe('SEM');
      // Cambiar el tipo no renumera.
      expect(series(r.layout!, 0)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('10 · numeración de atrás hacia adelante y empezando por la puerta', () => {
      const r = SeatMutationEngine.apply(build(), 'numera de atrás hacia adelante', withCat());
      expect(r.kind).toBe('direction');
      expect(r.direction).toEqual({ origin: 'rear', side: 'driver' });
      const deck = r.layout!.decks[0];
      const rowsWithSeats = deck.cells.map((line, i) => ({ i, seats: line.filter(c => c.kind === 'seat') as SeatCell[] })).filter(x => x.seats.length);
      const first = rowsWithSeats[0].seats.map(s => s.number);
      const last = rowsWithSeats[rowsWithSeats.length - 1].seats.map(s => s.number);
      expect(Math.min(...last)).toBeLessThan(Math.min(...first));   // la fila del fondo numera antes

      const side = SeatMutationEngine.apply(build(), 'numera empezando por la derecha', withCat());
      expect(side.direction).toEqual({ origin: 'front', side: 'door' });
    });
  });

  it('es determinista: mismas entradas, mismo resultado', () => {
    const layout = build();
    const a = SeatMutationEngine.apply(layout, 'renumera el segundo piso con ventana impar', ctx());
    const b = SeatMutationEngine.apply(layout, 'renumera el segundo piso con ventana impar', ctx());
    expect(a.message).toBe(b.message);
    expect(a.numbering).toEqual(b.numbering);
  });
});
