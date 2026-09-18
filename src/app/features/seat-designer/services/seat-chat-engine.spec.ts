import { SeatChatEngine } from './seat-chat-engine';
import { SeatLayoutEngine } from './seat-layout-engine';
import { SeatPromptEngine } from './seat-prompt-engine';
import { BuildSpec, SeatCell } from '../models/seat-layout.model';
import { SeatTypeResolver } from './seat-type-resolver';

const plan = (r: { numbering: { deck_1: string; deck_2?: string } | null }) => [r.numbering!.deck_1, r.numbering!.deck_2 ?? r.numbering!.deck_1] as ('sides' | 'aisleOdd' | 'rows')[];
const CAT = [{ code: 'EST', name: 'Estándar' }, { code: 'SEM', name: 'Semicama' }, { code: 'CAM', name: 'Cama' }, { code: 'VIP', name: 'VIP' }, { code: 'AMB', name: 'Ambulatorio' }];
const seatsOf = (layout: ReturnType<typeof SeatLayoutEngine.buildFromSpec>, deck: number) =>
  layout.decks[deck].cells.flat().filter(c => c.kind === 'seat') as SeatCell[];

describe('INTEGRITY GUARDIAN: Asistente Conversacional', () => {
  const PHRASE = 'Quiero un bus con 2 pisos, abajo 10 camas, arriba 33 semicama. Numeración: ventana pares y pasillo impares.';
  const EXAMPLE = 'Bus 2 pisos, abajo 9 camas individuales y compartidas, arriba 36 semicama.';
  const ALL = { p1_orientation: '1+2', leftover_p1: 'single', leftover_p2: 'bench', p2_stairs_arrival: 'middle-right', bathroom_setup: 'entry' };

  it('UNA sola pregunta por turno: nunca una lista', () => {
    let r = SeatChatEngine.respond(PHRASE);
    const asked: string[] = [];
    let guard = 0;
    while (r.status === 'needs_clarification' && guard++ < 10) {
      expect(r.questions.length).toBe(1);
      asked.push(r.questions[0].id);
      r = SeatChatEngine.respond(PHRASE, Object.fromEntries(asked.map(id => [id, (ALL as Record<string, string>)[id]])));
    }
    expect(r.status).toBe('ready');
    expect(asked).toEqual(['p1_orientation', 'leftover_p1', 'leftover_p2', 'p2_stairs_arrival', 'bathroom_setup']);
    expect(r.numbering).toEqual({ deck_1: 'aisleOdd', deck_2: 'aisleOdd' });
  });

  it('el ejemplo real: individuales → desembocadura → baño → lista', () => {
    const t1 = SeatChatEngine.respond(EXAMPLE);
    expect(t1.message).toContain('Anotado: bus doble piso con 9 camas abajo y 36 semicamas arriba');
    expect(t1.questions[0].id).toBe('p1_orientation');
    expect(t1.questions[0].options.map(o => o.label)).toEqual(['(A) Individuales a la Izquierda (1+2)', '(B) Individuales a la Derecha (2+1)']);

    const t2 = SeatChatEngine.respond(EXAMPLE, { p1_orientation: '2+1' });
    expect(t2.message).toContain('Planta baja configurada en 2+1');
    expect(t2.questions[0].id).toBe('p2_stairs_arrival');
    expect(t2.questions[0].options.map(o => o.value)).toEqual(['front-right', 'middle-right', 'rear-right']);

    const t3 = SeatChatEngine.respond(EXAMPLE, { p1_orientation: '2+1', p2_stairs_arrival: 'front-right' });
    expect(t3.questions[0].id).toBe('bathroom_setup');

    const t4 = SeatChatEngine.respond(EXAMPLE, { p1_orientation: '2+1', p2_stairs_arrival: 'front-right', bathroom_setup: 'entry' });
    expect(t4.status).toBe('ready');
    expect(t4.message).toContain('¡Estructura lista! P1: Mampara frontal + subida de escalera + Baño de acceso + 9 camas (2+1). P2: 36 semicamas (2+2) con hueco de escalera tras asientos 3 y 4. Total: 45 plazas exactas');
    expect(t4.spec!.decks[0]).toEqual(jasmine.objectContaining({ left: 2, right: 1, seats: 9 }));
    expect(t4.spec!.stairs).toBe('front-right');
    expect(t4.spec!.bathroom).toBe('entry');
  });

  it('el bus del ejemplo tiene 45 plazas: vestíbulo abajo sin quitar butacas, hueco arriba en la fila 2 derecha', () => {
    const r = SeatChatEngine.respond(EXAMPLE, { p1_orientation: '2+1', p2_stairs_arrival: 'front-right', bathroom_setup: 'entry' });
    const layout = SeatLayoutEngine.buildFromSpec('v', r.spec!, plan(r), 'continuous');
    expect(seatsOf(layout, 0).length).toBe(9);
    expect(seatsOf(layout, 1).length).toBe(36);
    const p1 = layout.decks[0], p2 = layout.decks[1];
    const row0 = p1.cells[0].map(c => c.kind);
    // Vestíbulo completo en la fila de cabina: cabina, baño (junto al conductor),
    // escalera (junto a la puerta) y la puerta como marcador de borde.
    expect(row0).toContain('cabin'); expect(row0).toContain('bathroom'); expect(row0).toContain('stairs');
    expect(p1.doors).toEqual([{ row: 0, side: 'right' }]);
    expect(p1.cells.every(line => line[p1.aisleCol].kind === 'aisle')).toBeTrue();
    // La escalera nunca entra en un lugar de asiento: desde la fila 2 el salón está limpio.
    expect(p1.cells.slice(1).flat().some(c => c.kind === 'stairs' || c.kind === 'bathroom')).toBeFalse();
    // Arriba: hueco en la fila 2 (índice 1), lado derecho junto al pasillo.
    expect(p2.cells[1][p2.aisleCol + 1].kind).toBe('stairs');
    expect(p2.cells.flat().filter(c => c.kind === 'stairs').length).toBe(1);
  });

  it('"entre el asiento 3 y 4" fija la fila del hueco y no pregunta escalera; el chasis Marcopolo tampoco', () => {
    const a = SeatChatEngine.respond('2 pisos abajo 12 camas 2+1 arriba 40 semicama, la escalera sube entre el asiento 3 y 4, sin baño');
    expect(a.status).toBe('ready');
    expect(a.spec!.stairsRow).toBe(1);
    const b = SeatChatEngine.respond('Marcopolo G7 doble piso, abajo 12 camas 2+1, arriba 40 semicama, baño en el acceso');
    expect(b.status).toBe('ready');
    expect(b.spec!.stairs).toBe('front-right');
    expect(b.message).toContain('tras asientos 3 y 4');
  });

  it('el bus armado tiene EXACTAMENTE las plazas pedidas: 10 y 33, no 12 y 36', () => {
    const r = SeatChatEngine.respond(PHRASE, ALL);
    const layout = SeatLayoutEngine.buildFromSpec('v', r.spec!, plan(r), 'continuous');
    expect(seatsOf(layout, 0).length).toBe(10);
    expect(seatsOf(layout, 1).length).toBe(33);
  });

  it('la banqueta ocupa la posición del pasillo en la última fila y numera al final', () => {
    const r = SeatChatEngine.respond(PHRASE, ALL);
    const layout = SeatLayoutEngine.buildFromSpec('v', r.spec!, plan(r), 'perDeck');
    const upper = layout.decks[1];
    const bench = upper.cells[upper.length - 1][upper.aisleCol];
    expect(bench.kind).toBe('seat');
    expect((bench as SeatCell).number).toBe(33);
    // Borrarla devuelve la celda al pasillo, no a un hueco pintable.
    const erased = SeatLayoutEngine.applyTool(layout, { deck: 1, row: upper.length - 1, col: upper.aisleCol }, { kind: 'erase' });
    expect(erased.decks[1].cells[upper.length - 1][upper.aisleCol].kind).toBe('aisle');
  });

  it('"butaca individual" deja la última fila parcial sin banqueta', () => {
    const r = SeatChatEngine.respond(PHRASE, { ...ALL, leftover_p2: 'single' });
    const layout = SeatLayoutEngine.buildFromSpec('v', r.spec!, plan(r), 'continuous');
    expect(seatsOf(layout, 1).length).toBe(33);
    expect(layout.decks[1].cells.flat().some((c, i) => c.kind === 'seat' && i % layout.decks[1].width === layout.decks[1].aisleCol)).toBeFalse();
  });

  it('"ventana pares y pasillo impares" numera con el pasillo impar', () => {
    const r = SeatChatEngine.respond('un piso, 16 semicama 2+2, ventana pares y pasillo impares', { bathroom_setup: 'none' });
    expect(r.status).toBe('ready');
    const layout = SeatLayoutEngine.buildFromSpec('v', r.spec!, plan(r), 'continuous');
    const deck = layout.decks[0];
    const firstRow = deck.cells.findIndex(line => line.some(c => c.kind === 'seat'));
    const aisleSeat = deck.cells[firstRow][deck.aisleCol - 1] as SeatCell;
    const windowSeat = deck.cells[firstRow][0] as SeatCell;
    expect(aisleSeat.number % 2).toBe(1);
    expect(windowSeat.number % 2).toBe(0);
  });

  it('si el esquema viene explícito no pregunta orientación', () => {
    const r = SeatChatEngine.respond('un piso, 12 camas 2+1 con baño al fondo');
    expect(r.status).toBe('ready');
  });

  it('un tramo ilegible se pregunta con opciones y la respuesta se reinterpreta', () => {
    const first = SeatChatEngine.respond('dos pisos, abajo camas cómodas, arriba 40 semicama');
    expect(first.questions[0].id).toBe('deck_0');
    const second = SeatChatEngine.respond('dos pisos, abajo camas cómodas, arriba 40 semicama', { deck_0: '12 camas', p1_orientation: '2+1', p2_stairs_arrival: 'middle-left', bathroom_setup: 'none' });
    expect(second.status).toBe('ready');
    expect(second.spec!.decks[0].seatType).toBe('CAM');
    expect(second.spec!.decks[0].seats).toBe(12);
  });

  it('typos leves se corrigen solos por distancia de edición: "semikma", "kama", "estamdar"', () => {
    const r = SeatChatEngine.respond('doble piso, abajo 12 kama 2+1, arriba 40 semikma, escalera al centro, sin baño', {}, CAT);
    expect(r.status).toBe('ready');
    expect(r.spec!.decks[0].seatType).toBe('CAM');
    expect(r.spec!.decks[1].seatType).toBe('SEM');
    expect(SeatPromptEngine.parse('44 estamdar', CAT).spec!.decks[0].seatType).toBe('EST');
  });

  it('un tipo inexistente ("Ultra VIP") no falla: pregunta crear o usar el más cercano', () => {
    const T = 'doble piso, abajo 12 ultra vip 2+1, arriba 40 semicama, escalera al centro, sin baño';
    const q = SeatChatEngine.respond(T, {}, CAT);
    expect(q.status).toBe('needs_clarification');
    expect(q.questions.length).toBe(1);
    expect(q.questions[0].id).toBe('seat_type_p1');
    expect(q.questions[0].options.map(o => o.value)).toEqual(['create:Ultra VIP', 'use:VIP']);

    const created = SeatChatEngine.respond(T, { seat_type_p1: 'create:Ultra VIP' }, CAT);
    expect(created.status).toBe('ready');
    expect(created.newSeatTypes).toEqual([{ code: 'UV', name: 'Ultra VIP' }]);
    expect(created.spec!.decks[0].seatType).toBe('UV');

    const reused = SeatChatEngine.respond(T, { seat_type_p1: 'use:VIP' }, CAT);
    expect(reused.spec!.decks[0].seatType).toBe('VIP');
    expect(reused.newSeatTypes).toEqual([]);
  });

  it('piso mixto por fila: "4 filas abajo: 1 fila salón cama y el resto semicama"', () => {
    const r = SeatChatEngine.respond('4 filas abajo: 1 fila salon cama y el resto semicama, arriba 40 semicama, escalera al centro, sin baño', {}, CAT);
    expect(r.status).toBe('ready');
    expect(r.spec!.decks[0].rowOverrides).toEqual([{ row: 0, seatType: 'CAM' }]);
    expect(r.spec!.decks[0].seatType).toBe('SEM');
    const layout = SeatLayoutEngine.buildFromSpec('v', r.spec!, plan(r), 'continuous');
    const p1 = layout.decks[0];
    const salonRows = p1.cells.filter(line => !line.some(c => c.kind === 'cabin'));
    expect(salonRows.length).toBe(4);
    expect(salonRows[0].filter(c => c.kind === 'seat').every(c => (c as SeatCell).seatType === 'CAM')).toBeTrue();
    expect(salonRows.slice(1).flat().filter(c => c.kind === 'seat').every(c => (c as SeatCell).seatType === 'SEM')).toBeTrue();
  });

  it('numeración independiente por piso: P1 ventana impar, P2 ventana par', () => {
    const r = SeatChatEngine.respond('2 pisos, abajo 12 camas 2+1 ventana impar pasillo par, arriba 40 semicama ventana par pasillo impar, escalera al centro, sin baño', {}, CAT);
    expect(r.status).toBe('ready');
    expect(r.numbering).toEqual({ deck_1: 'sides', deck_2: 'aisleOdd' });
    const layout = SeatLayoutEngine.buildFromSpec('v', r.spec!, plan(r), 'perDeck');
    const first = (d: number) => { const deck = layout.decks[d]; const row = deck.cells.findIndex(l => l[0].kind === 'seat'); return { win: (deck.cells[row][0] as SeatCell).number, ais: (deck.cells[row][deck.aisleCol - 1] as SeatCell).number }; };
    expect(first(0).win % 2).toBe(1); expect(first(0).ais % 2).toBe(0);
    expect(first(1).win % 2).toBe(0); expect(first(1).ais % 2).toBe(1);
  });

  it('el baño nunca ocupa el pasillo: queda continuo de punta a punta', () => {
    const r = SeatChatEngine.respond('Bus 2 pisos, abajo 9 camas 2+1, arriba 36 semicama, escalera delantera, baño en el acceso', {}, CAT);
    const layout = SeatLayoutEngine.buildFromSpec('v', r.spec!, plan(r), 'continuous');
    for (const deck of layout.decks) for (const line of deck.cells) expect(line[deck.aisleCol].kind === 'aisle' || line[deck.aisleCol].kind === 'seat').toBeTrue();
    const p1 = layout.decks[0];
    expect(p1.cells.flat().some(c => c.kind === 'bathroom')).toBeTrue();
    expect(p1.cells.slice(1).flat().some(c => c.kind === 'bathroom')).toBeFalse();   // en el vestíbulo
  });

  it('texto vacío devuelve unclear con guía, sin inventar un bus', () => {
    const r = SeatChatEngine.respond('');
    expect(r.status).toBe('unclear');
    expect(r.spec).toBeNull();
  });

  it('es determinista: mismas entradas, misma respuesta', () => {
    const a = SeatChatEngine.respond(PHRASE, { p1_orientation: '1+2' });
    const b = SeatChatEngine.respond(PHRASE, { p1_orientation: '1+2' });
    expect(a).toEqual(b);
  });

  it('el intérprete reconoce 1+2 como esquema explícito con una sola columna a la izquierda', () => {
    const r = SeatPromptEngine.parse('12 camas 1+2');
    expect(r.spec!.decks[0]).toEqual(jasmine.objectContaining({ left: 1, right: 2 }));
    expect(r.decks[0].explicitScheme).toBeTrue();
  });
});

describe('INTEGRITY GUARDIAN: Invertir lados', () => {
  it('1+2 ⇄ 2+1 conserva las butacas y renumera; cabina y puerta no viajan', () => {
    let layout = SeatLayoutEngine.buildFromSpec('v', { decks: [{ length: 5, left: 1, right: 2, seatType: 'CAM', seats: 10 }], bathroom: 'none', doors: 'front', stairs: 'none' }, 'sides', 'continuous');
    const before = seatsOf(layout, 0).length;
    layout = SeatLayoutEngine.swapSides(layout, 0, 'sides', 'continuous');
    const d = layout.decks[0];
    expect(d.left).toBe(2); expect(d.right).toBe(1); expect(d.aisleCol).toBe(2);
    expect(seatsOf(layout, 0).length).toBe(before);
    expect(d.cells[0][0].kind).toBe('cabin');
    expect(d.doors).toEqual([{ row: 0, side: 'right' }]);   // la puerta no viaja: sigue en la acera
    const nums = seatsOf(layout, 0).map(s => s.number).sort((a, b) => a - b);
    expect(nums).toEqual(nums.map((_, i) => i + 1));
  });

  it('invertir dos veces devuelve el esquema original', () => {
    const start = SeatLayoutEngine.buildFromSpec('v', { decks: [{ length: 6, left: 2, right: 1, seatType: 'SEM' }], bathroom: 'rear-right', doors: 'front', stairs: 'none' }, 'sides', 'continuous');
    const twice = SeatLayoutEngine.swapSides(SeatLayoutEngine.swapSides(start, 0), 0);
    expect(twice.decks[0].left).toBe(start.decks[0].left);
    expect(twice.decks[0].right).toBe(start.decks[0].right);
    expect(seatsOf(twice, 0).length).toBe(seatsOf(start, 0).length);
  });
});

describe('INTEGRITY GUARDIAN: Mover butacas', () => {
  const base = () => SeatLayoutEngine.buildFromSpec('v', { decks: [{ length: 5, left: 2, right: 2, seatType: 'SEM', seats: 10 }], bathroom: 'none', doors: 'front', stairs: 'none' }, 'sides', 'continuous');
  const at = (l: ReturnType<typeof base>, row: number, col: number) => l.decks[0].cells[row][col];

  it('a un hueco: se muda y conserva número y tipo; el origen queda vacío', () => {
    const l = base();
    const deck = l.decks[0];
    let from: { row: number; col: number } | null = null, to: { row: number; col: number } | null = null;
    deck.cells.forEach((line, row) => line.forEach((c, col) => { if (!from && c.kind === 'seat') from = { row, col }; if (!to && c.kind === 'empty' && row > 0) to = { row, col }; }));
    const moved = SeatLayoutEngine.moveCell(l, { deck: 0, ...from! }, { deck: 0, ...to! });
    expect(at(moved, to!.row, to!.col)).toEqual(at(l, from!.row, from!.col));
    expect(at(moved, from!.row, from!.col).kind).toBe('empty');
  });

  it('sobre otra butaca: se intercambian sin renumerar', () => {
    const l = base();
    const a = { deck: 0, row: 1, col: 0 }, b = { deck: 0, row: 2, col: 3 };
    const swapped = SeatLayoutEngine.moveCell(l, a, b);
    expect(at(swapped, 1, 0)).toEqual(at(l, 2, 3));
    expect(at(swapped, 2, 3)).toEqual(at(l, 1, 0));
    expect(SeatLayoutEngine.stats(swapped, null).totalSeats).toBe(SeatLayoutEngine.stats(l, null).totalSeats);
  });

  it('pasillo y cabina son intocables; mover entre pisos no está permitido', () => {
    const l = base();
    const aisle = l.decks[0].aisleCol;
    expect(SeatLayoutEngine.moveCell(l, { deck: 0, row: 1, col: 0 }, { deck: 0, row: 1, col: aisle })).toBe(l);
    expect(SeatLayoutEngine.moveCell(l, { deck: 0, row: 1, col: 0 }, { deck: 0, row: 0, col: 0 })).toBe(l);
    expect(SeatLayoutEngine.moveCell(l, { deck: 0, row: 0, col: 0 }, { deck: 0, row: 1, col: 0 })).toBe(l);
    expect(SeatLayoutEngine.moveCell(l, { deck: 0, row: 1, col: 0 }, { deck: 1, row: 1, col: 0 })).toBe(l);
  });
});

describe('INTEGRITY GUARDIAN: Casos críticos del parser y del plano', () => {
  const TYPES = [{ code: 'EST', name: 'Estándar' }, { code: 'SEM', name: 'Semicama' }, { code: 'CAM', name: 'Cama' }, { code: 'VIP', name: 'VIP' }, { code: 'REL', name: 'Relevo' }];
  const numbersOf = (layout: ReturnType<typeof SeatLayoutEngine.buildFromSpec>, deck = 0) =>
    (layout.decks[deck].cells.flat().filter(c => c.kind === 'seat') as SeatCell[]).map(s => s.number);

  it('3 · borrar butacas a mano no deja boletos fantasma: la serie se compacta sin reordenar', () => {
    const layout = SeatLayoutEngine.buildFromSpec('v', { decks: [{ length: 4, left: 2, right: 2, seatType: 'SEM', seats: 12 }], bathroom: 'none', doors: 'front', stairs: 'none' }, 'sides', 'continuous');
    let broken = SeatLayoutEngine.applyTool(layout, SeatLayoutEngine.findSeat(layout, 7)!, { kind: 'erase' });
    broken = SeatLayoutEngine.applyTool(broken, SeatLayoutEngine.findSeat(broken, 8)!, { kind: 'erase' });
    expect([...numbersOf(broken)].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 9, 10, 11, 12]);   // falta el 7 y el 8

    expect(SeatLayoutEngine.needsCompaction(broken)).toBeTrue();
    const fixed = SeatLayoutEngine.recompact(broken);
    expect([...numbersOf(fixed)].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    // Compactar cierra huecos pero NO reordena: el orden relativo se conserva.
    const rank = (list: number[]) => list.map((_, i) => i).sort((a, b) => list[a] - list[b]);
    expect(rank(numbersOf(fixed))).toEqual(rank(numbersOf(broken)));
    // Nadie numera un hueco: las celdas vacías siguen vacías.
    expect(fixed.decks[0].cells.flat().filter(c => c.kind === 'empty').length)
      .toBe(broken.decks[0].cells.flat().filter(c => c.kind === 'empty').length);
  });

  it('4 · "un bus de 1 piso, en el piso 1 pon 44 semicamas" no inventa un segundo piso', () => {
    const r = SeatChatEngine.respond('Un bus de 1 piso, en el piso 1 pon 44 semicamas', { bathroom_setup: 'none' }, TYPES);
    expect(r.status).toBe('ready');
    expect(r.spec!.decks.length).toBe(1);
    expect(r.spec!.decks[0]).toEqual(jasmine.objectContaining({ seats: 44, seatType: 'SEM' }));
    // "piso" y "pon" jamás son un tipo de butaca, ni siquiera uno nuevo.
    expect(SeatTypeResolver.resolve('piso', TYPES).status).toBe('unknown');
    expect(SeatPromptEngine.parse('Un bus de 1 piso, en el piso 1 pon 44 semicamas', TYPES).decks[0].unknownType).toBeNull();
  });

  it('5 · la puerta central no se come ninguna butaca: es un marcador de borde', () => {
    const spec: BuildSpec = { decks: [{ length: 11, left: 2, right: 2, seatType: 'SEM', seats: 44 }], bathroom: 'none', doors: 'front-middle', stairs: 'none' };
    const layout = SeatLayoutEngine.buildFromSpec('v', spec, 'sides', 'continuous');
    expect(numbersOf(layout).length).toBe(44);
    expect(layout.decks[0].doors!.length).toBe(2);
    expect(layout.decks[0].cells.flat().some(c => c.kind === 'door')).toBeFalse();
  });

  it('6 · la escalera está enlazada entre pisos: mover un extremo alinea el otro', () => {
    const spec: BuildSpec = {
      decks: [{ length: 6, left: 2, right: 2, seatType: 'CAM', seats: 12 }, { length: 8, left: 2, right: 2, seatType: 'SEM', seats: 28 }],
      bathroom: 'none', doors: 'front', stairs: 'middle-left'
    };
    const layout = SeatLayoutEngine.buildFromSpec('v', spec, 'sides', 'continuous');
    // Nace y desemboca del mismo lado: no puede cruzar el bus por el aire.
    expect(SeatLayoutEngine.stairsSideOf(layout.decks[0])).toBe('left');
    expect(SeatLayoutEngine.stairsSideOf(layout.decks[1])).toBe('left');

    let hole = { deck: 1, row: 0, col: 0 };
    layout.decks[1].cells.forEach((line, row) => line.forEach((c, col) => { if (c.kind === 'stairs') hole = { deck: 1, row, col }; }));
    const moved = SeatLayoutEngine.setCell(
      SeatLayoutEngine.setCell(layout, hole, { kind: 'empty' }),
      { deck: 1, row: hole.row, col: layout.decks[1].width - 1 }, { kind: 'stairs' }
    );
    expect(SeatLayoutEngine.stairsSideOf(moved.decks[1])).toBe('right');
    expect(SeatLayoutEngine.stats(moved, null).issues.some(i => i.code === 'STAIRS_MISALIGNED')).toBeTrue();

    const linked = SeatLayoutEngine.syncStairs(moved, 1);
    expect(SeatLayoutEngine.stairsSideOf(linked.decks[0])).toBe('right');
    expect(SeatLayoutEngine.stats(linked, null).issues.some(i => i.code === 'STAIRS_MISALIGNED')).toBeFalse();
    expect(numbersOf(linked).length).toBe(numbersOf(layout).length);   // el enlace no pierde butacas
  });

  it('6b · una escalera en un solo piso se avisa', () => {
    const spec: BuildSpec = {
      decks: [{ length: 6, left: 2, right: 2, seatType: 'CAM', seats: 12 }, { length: 8, left: 2, right: 2, seatType: 'SEM', seats: 28 }],
      bathroom: 'none', doors: 'front', stairs: 'front-right'
    };
    let layout = SeatLayoutEngine.buildFromSpec('v', spec, 'sides', 'continuous');
    layout.decks[1].cells.forEach((line, row) => line.forEach((c, col) => {
      if (c.kind === 'stairs') layout = SeatLayoutEngine.setCell(layout, { deck: 1, row, col }, { kind: 'empty' });
    }));
    expect(SeatLayoutEngine.stats(layout, null).issues.some(i => i.code === 'STAIRS_UNPAIRED')).toBeTrue();
  });

  it('8 · dos esquemas incompatibles se preguntan, no se eligen por el operador', () => {
    const T = 'Pon 2+1 pero con 4 filas de 4 asientos';
    const q = SeatChatEngine.respond(T, {}, TYPES);
    expect(q.status).toBe('needs_clarification');
    expect(q.questions[0].id).toBe('scheme_conflict');
    expect(q.message).toContain('Detecté dos esquemas incompatibles: 2+1 (3 asientos por fila) y filas de 4 asientos (2+2)');
    expect(q.questions[0].options.map(o => o.value)).toEqual(['2+1', '2+2']);

    const chosen = SeatChatEngine.respond(T, { scheme_conflict: '2+2', bathroom_setup: 'none' }, TYPES);
    expect(chosen.status).toBe('ready');
    expect(chosen.spec!.decks[0]).toEqual(jasmine.objectContaining({ left: 2, right: 2, seats: 16 }));
  });

  it('9 · "sin baño ni cafetera" apaga el servicio y NO vuelve a preguntarlo', () => {
    const r = SeatChatEngine.respond('Bus doble piso, 12 abajo y 36 arriba sin baño ni cafetera, escalera al centro', {}, TYPES);
    expect(r.questions.map(q => q.id)).not.toContain('bathroom_setup');
    const parsed = SeatPromptEngine.parse('Bus doble piso, 12 abajo y 36 arriba sin baño ni cafetera', TYPES);
    expect(parsed.denied.bathroom).toBeTrue();
    expect(parsed.spec!.bathroom).toBe('none');
    expect(parsed.spec!.decks[0].seats).toBe(12);
    expect(parsed.spec!.decks[1].seats).toBe(36);
  });

  it('9b · "no lleva escalera" y "sin puerta trasera" también se respetan', () => {
    const noStairs = SeatPromptEngine.parse('doble piso, abajo 12 camas, arriba 40 semicama, no lleva escalera', TYPES);
    expect(noStairs.spec!.stairs).toBe('none');
    expect(noStairs.mentioned.stairs).toBeTrue();
    expect(SeatPromptEngine.parse('un piso 30 semicama sin puerta trasera', TYPES).spec!.doors).toBe('front');
  });
});
