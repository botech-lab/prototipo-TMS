import { SEAT_LAYOUT_RULES } from '@core';
import { Vehicle } from '../../fleet/models/vehicle.model';
import { CellPosition } from '../models/seat-layout.model';
import { SeatCodeEngine } from './seat-code-engine';
import { SeatLayoutEngine, cellKey } from './seat-layout-engine';
import { SeatTraitEngine } from './seat-trait-engine';

const vehicle: Vehicle = { id: 'v', plate: 'P', type: 'Bus Normal', brand: 'B', model: 'M', floors: 2, passengerCapacity: 60, cargoCapacityKg: null, status: 'ACTIVO' };
const P = (row: number, col: number, deck = 0): CellPosition => ({ deck, row, col });

describe('INTEGRITY GUARDIAN: Motor de Rasgos y Tarifa', () => {
  // Bus de dos pisos, 2+2, lleno, con baño en la fila 3 ventana derecha.
  let layout = SeatLayoutEngine.createForVehicle(vehicle);
  layout = SeatLayoutEngine.fillTemplate(layout, 0, 'EST');
  layout = SeatLayoutEngine.fillTemplate(layout, 1, 'EST');
  layout = SeatLayoutEngine.setCell(layout, P(3, 4), { kind: 'bathroom' });
  const d0 = layout.decks[0];
  const traits0 = SeatTraitEngine.traits(d0, 0);
  const traits1 = SeatTraitEngine.traits(layout.decks[1], 1);
  const T = (pos: CellPosition, map = traits0) => map.get(cellKey(pos)) ?? [];

  it('ventana: columnas de los bordes; pasillo: contiguas al pasillo', () => {
    expect(T(P(2, 0))).toContain('window'); expect(T(P(2, 4))).toContain('window');
    expect(T(P(2, 1))).toContain('aisle'); expect(T(P(2, 3))).toContain('aisle');
    expect(T(P(2, 1))).not.toContain('window');
  });
  it('mampara: la fila anterior tiene cabina o baño', () => {
    expect(T(P(1, 0))).toContain('bulkhead');
    expect(T(P(4, 0))).toContain('bulkhead');
    expect(T(P(2, 0))).not.toContain('bulkhead');
  });
  it('junto al baño: contigüidad ortogonal', () => {
    expect(T(P(3, 3))).toContain('lavatory'); expect(T(P(2, 4))).toContain('lavatory'); expect(T(P(4, 4))).toContain('lavatory');
    expect(T(P(2, 3))).not.toContain('lavatory');
  });
  it('panorámica: primera fila del piso alto, nunca del bajo', () => {
    expect(T(P(0, 0, 1), traits1)).toContain('panoramic');
    expect(T(P(1, 0))).not.toContain('panoramic');
  });
  it('espacio extra: detrás de la puerta o de la escalera', () => {
    expect(T(P(1, 3))).toContain('legroom');
  });
  it('mover el baño recalcula los rasgos sin etiquetar nada', () => {
    const moved = SeatLayoutEngine.setCell(SeatLayoutEngine.setCell(layout, P(3, 4), { kind: 'seat', number: 99, seatType: 'EST' }), P(6, 0), { kind: 'bathroom' });
    const t = SeatTraitEngine.traits(moved.decks[0], 0);
    expect(t.get(cellKey(P(3, 3)))).not.toContain('lavatory');
    expect(t.get(cellKey(P(5, 0)))).toContain('lavatory');
  });

  describe('Tarifa por reglas', () => {
    const rank = (f: string) => SeatTraitEngine.rankByName(f);
    it('la primera regla que coincide gana, en el orden declarado', () => {
      expect(SeatTraitEngine.fare(['panoramic', 'lavatory'], null, rank).fare).toBe('Premium');
      expect(SeatTraitEngine.fare(['bulkhead'], null, rank).fare).toBe('Ejecutivo');
      expect(SeatTraitEngine.fare(['lavatory', 'window'], null, rank).fare).toBe('Estudiante');
      expect(SeatTraitEngine.fare(['window'], null, rank).fare).toBe(SEAT_LAYOUT_RULES.FARE_DEFAULT.fare);
    });
    it('una tarifa fijada a mano siempre prevalece', () => {
      const f = SeatTraitEngine.fare(['panoramic'], 'Estudiante', rank);
      expect(f.fare).toBe('Estudiante'); expect(f.manual).toBeTrue(); expect(f.rank).toBe(1);
    });
    it('el rango sube con el precio: alimenta el heatmap', () => {
      expect(rank('Premium')!).toBeGreaterThan(rank('Ejecutivo')!);
      expect(rank('Ejecutivo')!).toBeGreaterThan(rank('Normal')!);
      expect(rank('Normal')!).toBeGreaterThan(rank('Estudiante')!);
      expect(rank('VIP')).toBe(4);
    });
    it('el heatmap tiene una rampa por cada rango posible', () => {
      const ranks = new Set([...SEAT_LAYOUT_RULES.FARE_RULES.map(r => r.rank), SEAT_LAYOUT_RULES.FARE_DEFAULT.rank]);
      for (const r of ranks) expect((SEAT_LAYOUT_RULES.FARE_HEAT as Record<number, unknown>)[r]).toBeDefined();
    });
  });

  describe('Códigos de tipo de asiento', () => {
    it('"Cama Suite Plus" → CSP, y evita colisiones', () => {
      expect(SeatCodeEngine.suggest('Cama Suite Plus', [])).toBe('CSP');
      expect(SeatCodeEngine.suggest('Cama Suite Plus', ['CSP'])).toBe('CSP2');
      expect(SeatCodeEngine.suggest('Cama Suite Plus', ['CSP', 'CSP2'])).toBe('CSP3');
    });
    it('una palabra usa sus 3 primeras letras; acentos y minúsculas no importan', () => {
      expect(SeatCodeEngine.suggest('ejecutivo', [])).toBe('EJE');
      expect(SeatCodeEngine.suggest('Semicámá Élite', [])).toBe('SE');
      expect(SeatCodeEngine.suggest('', [])).toBe('NVO');
    });
  });
});
