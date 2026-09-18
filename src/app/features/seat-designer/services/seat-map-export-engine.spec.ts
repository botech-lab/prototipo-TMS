import { SEAT_LAYOUT_RULES } from '@core';
import { BodyTemplate, BuildSpec, VehiclePreset } from '../models/seat-layout.model';
import { SeatLayoutEngine } from './seat-layout-engine';
import { SeatMapExportEngine } from './seat-map-export-engine';
import { Vehicle } from '../../fleet/models/vehicle.model';

const vehicle: Vehicle = { id: 'v', plate: 'P', type: 'Bus Normal', brand: 'B', model: 'M', floors: 2, passengerCapacity: 60, cargoCapacityKg: null, status: 'ACTIVO' };
const spec: BuildSpec = { decks: [{ length: 5, left: 2, right: 1, seatType: 'CAM' }, { length: 8, left: 2, right: 2, seatType: 'SEM' }], bathroom: 'rear-right', doors: 'front-middle', stairs: 'middle-left', emergencyExitRows: [[2], [3, 6]] };

describe('INTEGRITY GUARDIAN: Construcción por especificación y Smart Sync', () => {
  const layout = SeatLayoutEngine.buildFromSpec('v', spec, 'sides', 'continuous');
  const seats = layout.decks.flatMap(d => d.cells.flat()).filter(c => c.kind === 'seat');

  describe('Grid Builder', () => {
    it('arma los pisos con su esquema, tipo y mobiliario', () => {
      expect(layout.decks.length).toBe(2);
      expect(layout.decks[0].left).toBe(2); expect(layout.decks[0].right).toBe(1);
      expect(layout.decks[1].width).toBe(5);
      const k0 = layout.decks[0].cells.flat().map(c => c.kind);
      expect(layout.decks[0].doors!.length).toBe(2);                 // delantera + central, como marcadores de borde
      expect(k0).toContain('bathroom'); expect(k0).toContain('stairs'); expect(k0).toContain('cabin');
      expect(layout.decks[1].cells.flat().map(c => c.kind)).toContain('stairs');
      expect(layout.decks[0].emergencyExitRows).toEqual([2]);
      expect(layout.decks[1].emergencyExitRows).toEqual([3, 6]);
    });
    it('la escalera es asimétrica: abajo nace en el vestíbulo (fila de cabina), arriba desemboca donde dice la spec', () => {
      const find = (d: number) => { let at = null as null | [number, number]; layout.decks[d].cells.forEach((l, r) => l.forEach((c, k) => { if (c.kind === 'stairs') at = [r, k]; })); return at; };
      expect(find(0)![0]).toBe(0);
      expect(layout.decks[0].cells[0].map(c => c.kind)).toContain('cabin');
      const d1 = layout.decks[1];
      expect(find(1)).toEqual([Math.floor(d1.length / 2), d1.aisleCol - 1]);   // middle-left
    });
    it('numera todo sin duplicados', () => {
      const nums = seats.filter(s => s.kind === 'seat' && s.seatType !== 'AMB').map(s => (s as any).number);
      expect(new Set(nums).size).toBe(nums.length);
    });
    it('specOf recupera la especificación de un plano armado', () => {
      const inferred = SeatLayoutEngine.specOf(layout);
      expect(inferred.decks[0]).toEqual(jasmine.objectContaining({ left: 2, right: 1, seatType: 'CAM', length: 5 }));
      expect(inferred.bathroom).toBe('rear-right'); expect(inferred.doors).toBe('front-middle'); expect(inferred.stairs).toBe('middle-left');
    });
  });

  describe('Digital Twin', () => {
    it('todas las carrocerías del catálogo se declaran NO homologadas', () => {
      for (const body of SEAT_LAYOUT_RULES.BODY_TEMPLATES as readonly BodyTemplate[]) expect(body.homologated).toBeFalse();
    });
    it('cada carrocería arma un bus válido', () => {
      for (const body of SEAT_LAYOUT_RULES.BODY_TEMPLATES as readonly BodyTemplate[]) {
        const l = SeatLayoutEngine.fromBody('v', body, 'sides', 'continuous');
        expect(l.decks.length).withContext(body.model).toBe(body.spec.decks.length);
        expect(l.decks.flatMap(d => d.cells.flat()).some(c => c.kind === 'seat')).withContext(body.model).toBeTrue();
      }
    });
    it('cada preset industrial apunta a un tipo de vehículo del catálogo', () => {
      const names = ['Bus Semicama', 'Bus Cama Completo', 'Minibús', 'Bus Normal'];
      for (const p of SEAT_LAYOUT_RULES.VEHICLE_PRESETS as readonly VehiclePreset[]) expect(names).withContext(p.id).toContain(p.vehicleTypeName);
    });
  });

  describe('Semáforo', () => {
    it('verde cuando el plano cabe, tiene puerta y numera bien', () => {
      const t = SeatLayoutEngine.trafficLights(layout, vehicle);
      expect(t.capacity).toBe('green'); expect(t.exits).toBe('green'); expect(t.numbering).toBe('green');
      expect(t.canSave).toBeTrue(); expect(t.firstIssue).toBeNull();
    });
    it('rojo bloquea: exceso de capacidad y duplicados; y señala la primera celda culpable', () => {
      const small = { ...vehicle, passengerCapacity: 4 };
      const over = SeatLayoutEngine.trafficLights(layout, small);
      expect(over.capacity).toBe('red'); expect(over.canSave).toBeFalse(); expect(over.firstIssue).not.toBeNull();
      const dup = SeatLayoutEngine.renumberSeat(layout, { deck: 0, row: 1, col: 1 }, 1);
      const t = SeatLayoutEngine.trafficLights(dup, vehicle);
      expect(t.numbering).toBe('red'); expect(t.canSave).toBeFalse();
      expect(t.firstIssue).toEqual({ deck: 0, row: 1, col: 1 });
    });
    it('ámbar avisa pero deja guardar: huecos y falta de escalera', () => {
      const gap = SeatLayoutEngine.renumberSeat(layout, { deck: 0, row: 1, col: 1 }, 999);
      const t = SeatLayoutEngine.trafficLights(gap, vehicle);
      expect(t.numbering).toBe('amber'); expect(t.canSave).toBeTrue();
    });
    it('sin puerta es rojo: un bus sin acceso no se guarda', () => {
      let noDoor = layout;
      for (const d of layout.decks[0].doors ?? []) noDoor = SeatLayoutEngine.removeDoor(noDoor, 0, d.row, d.side);
      const t = SeatLayoutEngine.trafficLights(noDoor, vehicle);
      expect(t.exits).toBe('red'); expect(t.canSave).toBeFalse();
    });
  });

  describe('Smart Sync', () => {
    const bundle = SeatMapExportEngine.bundle(layout, { fare: () => 'Normal', traits: () => ['window'] });
    it('el micro-SVG dibuja una celda por butaca y pesa poco', () => {
      const rects = (bundle.svg.match(/<rect /g) || []).length;
      expect(bundle.svg.startsWith('<svg xmlns=')).toBeTrue();
      expect(rects).toBeGreaterThanOrEqual(seats.length);
      expect(bundle.svg.length).toBeLessThan(12000);
      expect(bundle.svg).not.toContain('<style');
    });
    it('el manifiesto tiene una fila por butaca, ordenada, con pasajero vacío', () => {
      expect(bundle.manifest.length).toBe(seats.length);
      expect(bundle.manifest.every(r => r.passenger === '')).toBeTrue();
      const nums = bundle.manifest.map(r => r.number ?? Infinity);
      expect([...nums].sort((a, b) => a - b)).toEqual(nums);
      expect(bundle.manifestCsv.split('\n')[0]).toBe('piso,butaca,tipo,tarifa,pasajero');
      expect(bundle.manifestCsv.split('\n').length).toBe(seats.length + 1);
    });
    it('la grilla del boletero excluye el pasillo y respeta las dimensiones', () => {
      expect(bundle.salesGrid.decks[0].rows.length).toBe(layout.decks[0].length);
      expect(bundle.salesGrid.decks[0].rows[0].length).toBe(layout.decks[0].width - 1);
    });
    it('el mapa móvil lleva tarifa y rasgos por butaca', () => {
      expect(bundle.mobileMap.seats.length).toBe(seats.length);
      expect(bundle.mobileMap.seats[0].fare).toBe('Normal');
      expect(bundle.mobileMap.seats[0].traits).toEqual(['window']);
      expect(bundle.mobileMap.vehicleId).toBe('v');
    });
  });
});
