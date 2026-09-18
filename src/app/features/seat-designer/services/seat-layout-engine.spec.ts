import { SEAT_LAYOUT_RULES } from '@core';
import { Vehicle } from '../../fleet/models/vehicle.model';
import { CellPosition, ChassisPreset, SeatCell, VehicleLayout } from '../models/seat-layout.model';
import { SeatLayoutEngine, cellKey } from './seat-layout-engine';

function buildVehicle(o: Partial<Vehicle> = {}): Vehicle {
  return { id: 'veh-test', plate: 'TEST-001', type: 'Bus Normal', brand: 'Volvo', model: 'Test', floors: 1, passengerCapacity: 40, cargoCapacityKg: null, status: 'ACTIVO', ...o };
}
function seats(layout: VehicleLayout): SeatCell[] {
  const out: SeatCell[] = [];
  for (const d of layout.decks) for (const line of d.cells) for (const c of line) if (c.kind === 'seat') out.push(c);
  return out;
}
const P = (row: number, col: number, deck = 0): CellPosition => ({ deck, row, col });
const numbersSorted = (l: VehicleLayout) => seats(l).map(s => s.number).sort((a, b) => a - b);

describe('INTEGRITY GUARDIAN: Motor del Plano de Plazas', () => {
  const { GRID } = SEAT_LAYOUT_RULES;

  it('las reglas del diseñador deben ser inmutables', () => {
    expect(Object.isFrozen(SEAT_LAYOUT_RULES)).toBeTrue();
    expect(() => { (SEAT_LAYOUT_RULES.GRID as any).MAX_LENGTH = 1; }).toThrow();
  });

  describe('Creación coherente con la unidad', () => {
    it('debe crear tantos pisos como declare el vehículo', () => {
      expect(SeatLayoutEngine.createForVehicle(buildVehicle({ floors: 2 })).decks.length).toBe(2);
    });
    it('debe elegir la disposición por densidad', () => {
      expect(SeatLayoutEngine.createForVehicle(buildVehicle({ passengerCapacity: 40 })).decks[0].width).toBe(GRID.SEATS_ACROSS_NORMAL + 1);
      expect(SeatLayoutEngine.createForVehicle(buildVehicle({ passengerCapacity: 60 })).decks[0].width).toBe(GRID.SEATS_ACROSS_DENSE + 1);
    });
    it('todo piso debe tener exactamente una columna de pasillo en `left`', () => {
      const layout = SeatLayoutEngine.createForVehicle(buildVehicle({ floors: 2 }));
      for (const deck of layout.decks) {
        expect(deck.aisleCol).toBe(deck.left);
        expect(deck.width).toBe(deck.left + 1 + deck.right);
        for (const line of deck.cells) expect(line.filter(c => c.kind === 'aisle').length).toBe(1);
      }
    });
    it('la planta baja trae cabina y puerta; los dos pisos, escalera', () => {
      const layout = SeatLayoutEngine.createForVehicle(buildVehicle({ floors: 2 }));
      const kinds = (d: number) => layout.decks[d].cells.flat().map(c => c.kind);
      expect(kinds(0)).toContain('cabin');
      // La puerta es un marcador de borde (no ocupa celda), a la altura de la cabina.
      expect(layout.decks[0].doors).toEqual([{ row: 0, side: 'right' }]);
      expect(kinds(0)).not.toContain('door');
      expect(kinds(0)).toContain('stairs'); expect(kinds(1)).toContain('stairs');
    });
  });

  describe('Regla 1: el pasillo es inviolable', () => {
    it('ninguna herramienta ni selección escribe sobre el pasillo', () => {
      const layout = SeatLayoutEngine.createForVehicle(buildVehicle());
      const aisle = P(3, layout.decks[0].aisleCol);
      expect(SeatLayoutEngine.applyTool(layout, aisle, { kind: 'seat', seatType: 'EST' })).toBe(layout);
      expect(SeatLayoutEngine.applyToSelection(layout, new Set([cellKey(aisle)]), { kind: 'seatType', seatType: 'EST' })).toBe(layout);
      expect(SeatLayoutEngine.keysInRect(layout.decks[0], 0, 0, 0, 5, 4)).not.toContain(cellKey(aisle));
    });
  });

  describe('Inmutabilidad', () => {
    it('colocar devuelve un plano nuevo sin tocar el original', () => {
      const before = SeatLayoutEngine.createForVehicle(buildVehicle());
      const snapshot = JSON.stringify(before);
      const after = SeatLayoutEngine.placeSeat(before, P(2, 0), 'EST');
      expect(after).not.toBe(before);
      expect(JSON.stringify(before)).toBe(snapshot);
    });
    it('una operación sin efecto devuelve la MISMA referencia', () => {
      const layout = SeatLayoutEngine.createForVehicle(buildVehicle());
      expect(SeatLayoutEngine.applyTool(layout, P(2, 0), { kind: 'erase' })).toBe(layout);
      expect(SeatLayoutEngine.shiftSelection(layout, new Set(), 1)).toBe(layout);
      expect(SeatLayoutEngine.resizeWidth(layout, 0, layout.decks[0].left, layout.decks[0].right)).toBe(layout);
    });
  });

  describe('Regla 2 y 3: numeración', () => {
    it('colocar a mano toma el siguiente número libre', () => {
      let l = SeatLayoutEngine.createForVehicle(buildVehicle());
      l = SeatLayoutEngine.placeSeat(l, P(1, 0), 'EST'); l = SeatLayoutEngine.placeSeat(l, P(5, 3), 'EST');
      expect(numbersSorted(l)).toEqual([1, 2]); expect(SeatLayoutEngine.nextSeatNumber(l)).toBe(3);
    });
    it('por lado: ventana impar, pasillo par, y el derecho continúa', () => {
      let l = SeatLayoutEngine.clearDeck(SeatLayoutEngine.createForVehicle(buildVehicle({ passengerCapacity: 16 })), 0);
      l = SeatLayoutEngine.fillTemplate(l, 0, 'EST', 'sides');
      const d = l.decks[0]; const at = (r: number, c: number) => (d.cells[r][c] as SeatCell).number;
      expect(at(0, 0)).toBe(1); expect(at(0, 1)).toBe(2); expect(at(1, 0)).toBe(3);
      expect(at(0, d.aisleCol + 1)).toBe(d.length * d.left + 1);
    });
    it('por fila: 1,2 | 3,4', () => {
      let l = SeatLayoutEngine.clearDeck(SeatLayoutEngine.createForVehicle(buildVehicle({ passengerCapacity: 16 })), 0);
      l = SeatLayoutEngine.fillTemplate(l, 0, 'EST', 'rows');
      expect((l.decks[0].cells[0].filter(c => c.kind === 'seat') as SeatCell[]).map(s => s.number)).toEqual([1, 2, 3, 4]);
    });
    it('alcance por piso reinicia en 1; corrida continúa', () => {
      const v = buildVehicle({ floors: 2 });
      let l = SeatLayoutEngine.createForVehicle(v);
      l = SeatLayoutEngine.fillTemplate(l, 0, 'EST', 'sides', 'perDeck'); l = SeatLayoutEngine.fillTemplate(l, 1, 'EST', 'sides', 'perDeck');
      const minOf = (d: number) => Math.min(...(l.decks[d].cells.flat().filter(c => c.kind === 'seat') as SeatCell[]).map(s => s.number));
      expect(minOf(0)).toBe(1); expect(minOf(1)).toBe(1);
      const cont = SeatLayoutEngine.autoNumber(l, 'sides', 'continuous');
      expect(Math.min(...(cont.decks[1].cells.flat().filter(c => c.kind === 'seat') as SeatCell[]).map(s => s.number))).toBeGreaterThan(1);
      expect(new Set(numbersSorted(cont)).size).toBe(seats(cont).length);
    });
    it('los ambulatorios no consumen número', () => {
      let l = SeatLayoutEngine.createForVehicle(buildVehicle());
      l = SeatLayoutEngine.placeSeat(l, P(1, 0), 'EST'); l = SeatLayoutEngine.placeSeat(l, P(1, 1), 'AMB'); l = SeatLayoutEngine.placeSeat(l, P(1, 3), 'EST');
      l = SeatLayoutEngine.autoNumber(l);
      expect(seats(l).filter(s => s.seatType !== 'AMB').map(s => s.number).sort()).toEqual([1, 2]);
    });
  });

  describe('Regla 6: insertar un número empuja los siguientes', () => {
    it('la butaca toma n y toda ≥ n sube uno, sin duplicados', () => {
      let l = SeatLayoutEngine.fillTemplate(SeatLayoutEngine.createForVehicle(buildVehicle()), 0, 'EST');
      const total = seats(l).length;
      const target = l.decks[0].cells.flatMap((line, r) => line.map((c, col) => ({ c, r, col }))).find(x => x.c.kind === 'seat' && (x.c as SeatCell).number === 10)!;
      l = SeatLayoutEngine.insertNumber(l, P(target.r, target.col), 5);
      const nums = numbersSorted(l);
      expect(new Set(nums).size).toBe(total);
      expect(nums[nums.length - 1]).toBe(total + 1);
      expect(nums.filter(n => n === 5).length).toBe(1);
    });
  });

  describe('Serpiente: numera siguiendo el trazo', () => {
    it('asigna 1..N en el orden del recorrido e ignora repetidos', () => {
      let l = SeatLayoutEngine.fillTemplate(SeatLayoutEngine.createForVehicle(buildVehicle()), 0, 'EST');
      const path = [P(3, 3), P(2, 3), P(1, 3), P(2, 3), P(1, 0)];
      l = SeatLayoutEngine.renumberPath(l, path);
      expect((SeatLayoutEngine.cellAt(l, P(3, 3)) as SeatCell).number).toBe(1);
      expect((SeatLayoutEngine.cellAt(l, P(2, 3)) as SeatCell).number).toBe(2);
      expect((SeatLayoutEngine.cellAt(l, P(1, 3)) as SeatCell).number).toBe(3);
      expect((SeatLayoutEngine.cellAt(l, P(1, 0)) as SeatCell).number).toBe(4);
    });
  });

  describe('Lasso: selección masiva', () => {
    it('cambia el tipo de todas las butacas seleccionadas a la vez', () => {
      let l = SeatLayoutEngine.fillTemplate(SeatLayoutEngine.createForVehicle(buildVehicle()), 0, 'EST');
      const keys = new Set(SeatLayoutEngine.keysInRect(l.decks[0], 0, 1, 0, 3, 1));
      l = SeatLayoutEngine.applyToSelection(l, keys, { kind: 'seatType', seatType: 'CAM' });
      for (const k of keys) expect((SeatLayoutEngine.cellAt(l, { deck: 0, row: +k.split(':')[1], col: +k.split(':')[2] }) as SeatCell).seatType).toBe('CAM');
      expect(seats(l).filter(s => s.seatType === 'CAM').length).toBe(6);
    });
    it('mueve un bloque una fila si hay sitio; si no, no hace nada', () => {
      let l = SeatLayoutEngine.createForVehicle(buildVehicle());
      l = SeatLayoutEngine.placeSeat(l, P(2, 0), 'EST'); l = SeatLayoutEngine.placeSeat(l, P(2, 1), 'EST');
      const block = new Set([cellKey(P(2, 0)), cellKey(P(2, 1))]);
      const moved = SeatLayoutEngine.shiftSelection(l, block, 1);
      expect(SeatLayoutEngine.cellAt(moved, P(3, 0))?.kind).toBe('seat'); expect(SeatLayoutEngine.cellAt(moved, P(2, 0))?.kind).toBe('empty');
      const blocked = SeatLayoutEngine.placeSeat(l, P(3, 0), 'VIP');
      expect(SeatLayoutEngine.shiftSelection(blocked, block, 1)).toBe(blocked);
    });
    it('la tarifa manual y las comodidades se asignan en bloque', () => {
      let l = SeatLayoutEngine.fillTemplate(SeatLayoutEngine.createForVehicle(buildVehicle()), 0, 'EST');
      const keys = new Set(SeatLayoutEngine.keysInRect(l.decks[0], 0, 1, 0, 1, 1));
      l = SeatLayoutEngine.applyToSelection(l, keys, { kind: 'fare', fareCategoryId: 'fct-vip' });
      l = SeatLayoutEngine.applyToSelection(l, keys, { kind: 'amenity', amenity: 'usb', on: true });
      const c = SeatLayoutEngine.cellAt(l, P(1, 0)) as SeatCell;
      expect(c.fareCategoryId).toBe('fct-vip'); expect(c.amenities).toEqual(['usb']);
      l = SeatLayoutEngine.applyToSelection(l, keys, { kind: 'fare', fareCategoryId: null });
      expect((SeatLayoutEngine.cellAt(l, P(1, 0)) as SeatCell).fareCategoryId).toBeUndefined();
    });
  });

  describe('Stamp & Chain', () => {
    it('duplicar una fila inserta copias detrás con números libres', () => {
      let l = SeatLayoutEngine.createForVehicle(buildVehicle());
      l = SeatLayoutEngine.placeSeat(l, P(1, 0), 'CAM'); l = SeatLayoutEngine.placeSeat(l, P(1, 1), 'CAM');
      const before = l.decks[0].length;
      l = SeatLayoutEngine.duplicateRow(l, 0, 1, 3);
      expect(l.decks[0].length).toBe(before + 3);
      expect(seats(l).length).toBe(8);
      expect(new Set(numbersSorted(l)).size).toBe(8);
      expect((SeatLayoutEngine.cellAt(l, P(4, 0)) as SeatCell).seatType).toBe('CAM');
    });
    it('el mobiliario no se duplica: una fila-plantilla estampa butacas, no baños', () => {
      let l = SeatLayoutEngine.createForVehicle(buildVehicle({ floors: 2 }));
      l = SeatLayoutEngine.setCell(l, P(0, 1), { kind: 'bathroom' });
      l = SeatLayoutEngine.placeSeat(l, P(0, 3), 'EST');
      l = SeatLayoutEngine.duplicateRow(l, 0, 0, 1);
      const copy = l.decks[0].cells[1];
      expect(copy.some(c => SeatLayoutEngine.isFixture(c.kind))).toBeFalse();
      expect(copy.filter(c => c.kind === 'seat').length).toBe(1);
    });
    it('extendTo estampa la última fila hasta el largo pedido y respeta el tope', () => {
      let l = SeatLayoutEngine.createForVehicle(buildVehicle());
      const last = l.decks[0].length - 1;
      l = SeatLayoutEngine.placeSeat(l, P(last, 0), 'SEM');
      const grown = SeatLayoutEngine.extendTo(l, 0, l.decks[0].length + 3);
      expect(grown.decks[0].length).toBe(l.decks[0].length + 3);
      expect((SeatLayoutEngine.cellAt(grown, P(last + 3, 0)) as SeatCell).seatType).toBe('SEM');
      expect(SeatLayoutEngine.extendTo(l, 0, 999).decks[0].length).toBe(GRID.MAX_LENGTH);
    });
  });

  describe('Regla 4: morph de columnas conserva las butacas ancladas a su ventana', () => {
    it('2+2 → 3+2 mantiene ventana izquierda y ventana derecha', () => {
      let l = SeatLayoutEngine.fillTemplate(SeatLayoutEngine.createForVehicle(buildVehicle()), 0, 'EST');
      const d0 = l.decks[0];
      const leftWindow = (d0.cells[2][0] as SeatCell).number, rightWindow = (d0.cells[2][d0.width - 1] as SeatCell).number;
      l = SeatLayoutEngine.resizeWidth(l, 0, 3, 2);
      const d = l.decks[0];
      expect(d.width).toBe(6); expect(d.aisleCol).toBe(3);
      expect((d.cells[2][0] as SeatCell).number).toBe(leftWindow);
      expect((d.cells[2][d.width - 1] as SeatCell).number).toBe(rightWindow);
      expect(d.cells[2][2].kind).toBe('empty');
    });
    it('2+2 → 2+1 pierde solo la columna que deja de caber', () => {
      let l = SeatLayoutEngine.fillTemplate(SeatLayoutEngine.createForVehicle(buildVehicle()), 0, 'EST');
      const before = seats(l).length;
      l = SeatLayoutEngine.resizeWidth(l, 0, 2, 1);
      expect(l.decks[0].width).toBe(4);
      expect(seats(l).length).toBe(before - (l.decks[0].length - 1));
    });
    it('una columna (1+0) sigue teniendo pasillo', () => {
      const l = SeatLayoutEngine.resizeWidth(SeatLayoutEngine.createForVehicle(buildVehicle()), 0, 1, 0);
      expect(l.decks[0].width).toBe(2); expect(l.decks[0].cells[0][1].kind).toBe('aisle');
    });
  });

  describe('Regla 5: espejo respeta la asimetría', () => {
    it('refleja tantas columnas como tenga el lado corto', () => {
      let l = SeatLayoutEngine.resizeWidth(SeatLayoutEngine.createForVehicle(buildVehicle()), 0, 3, 2);
      l = SeatLayoutEngine.placeSeat(l, P(2, 2), 'VIP'); l = SeatLayoutEngine.placeSeat(l, P(2, 1), 'CAM'); l = SeatLayoutEngine.placeSeat(l, P(2, 0), 'EST');
      l = SeatLayoutEngine.mirror(l, 0);
      const d = l.decks[0];
      expect((d.cells[2][d.aisleCol + 1] as SeatCell).seatType).toBe('VIP');
      expect((d.cells[2][d.aisleCol + 2] as SeatCell).seatType).toBe('CAM');
    });
  });

  describe('Presets de chasis', () => {
    it('arma un bus completo, numerado y con baño', () => {
      const preset = SEAT_LAYOUT_RULES.CHASSIS_PRESETS[0] as ChassisPreset;
      const l = SeatLayoutEngine.fromPreset('veh-x', preset, 'sides', 'continuous');
      expect(l.decks.length).toBe(preset.floors);
      expect(l.decks[0].left).toBe(preset.left); expect(l.decks[0].right).toBe(preset.right);
      expect(l.decks[0].cells.flat().some(c => c.kind === 'bathroom')).toBeTrue();
      expect(seats(l).length).toBeGreaterThan(0);
      expect(new Set(numbersSorted(l)).size).toBe(seats(l).filter(s => s.seatType !== 'AMB').length);
    });
    it('clonar conserva el plano y cambia solo la unidad', () => {
      const src = SeatLayoutEngine.fillTemplate(SeatLayoutEngine.createForVehicle(buildVehicle()), 0, 'CAM');
      const clone = SeatLayoutEngine.cloneFrom(src, 'veh-otro');
      expect(clone.vehicleId).toBe('veh-otro'); expect(clone.decks).toBe(src.decks);
    });
  });

  describe('Regla 7: la validación informa, nunca bloquea', () => {
    it('marca como error superar la capacidad y detecta duplicados y huecos', () => {
      const v = buildVehicle({ passengerCapacity: 4 });
      const over = SeatLayoutEngine.fillTemplate(SeatLayoutEngine.createForVehicle(v), 0, 'EST');
      expect(SeatLayoutEngine.stats(over, v).issues.find(i => i.code === 'OVER_CAPACITY')?.level).toBe('error');
      let l = SeatLayoutEngine.createForVehicle(buildVehicle());
      l = SeatLayoutEngine.placeSeat(l, P(1, 0), 'EST'); l = SeatLayoutEngine.placeSeat(l, P(1, 1), 'EST');
      expect(SeatLayoutEngine.stats(SeatLayoutEngine.renumberSeat(l, P(1, 1), 1), buildVehicle()).issues.map(i => i.code)).toContain('DUPLICATE_NUMBERS');
      expect(SeatLayoutEngine.stats(SeatLayoutEngine.renumberSeat(l, P(1, 1), 9), buildVehicle()).issues.map(i => i.code)).toContain('NUMBER_GAPS');
    });
    it('un plano completo y bien numerado no tiene avisos', () => {
      const v = buildVehicle({ passengerCapacity: 200 });
      expect(SeatLayoutEngine.stats(SeatLayoutEngine.fillTemplate(SeatLayoutEngine.createForVehicle(v), 0, 'EST'), v).issues).toEqual([]);
    });
  });
});
