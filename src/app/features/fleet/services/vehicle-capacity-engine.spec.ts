import { VEHICLE_CAPACITY_RULES } from '@core';
import { Vehicle } from '../models/vehicle.model';
import { VehicleCapacityEngine } from './vehicle-capacity-engine';

function buildVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 'veh-test',
    plate: 'TEST-001',
    type: 'Bus Normal',
    brand: 'Volvo',
    model: 'Test',
    floors: 2,
    passengerCapacity: 50,
    cargoCapacityKg: null,
    status: 'ACTIVO',
    ...overrides
  };
}

describe('INTEGRITY GUARDIAN: Motor del Mapa de Plazas', () => {
  const { DECKS, CARGO } = VEHICLE_CAPACITY_RULES;

  it('las reglas de capacidad deben ser inmutables', () => {
    expect(Object.isFrozen(VEHICLE_CAPACITY_RULES)).toBeTrue();
    expect(() => {
      (VEHICLE_CAPACITY_RULES.DECKS as any).MAX_RENDERED = 99;
    }).toThrow();
  });

  // ---- ECUACIÓN 1 -------------------------------------------------------
  describe('Ecuación 1: reparto entero sin pérdida', () => {
    it('la suma de plazas debe igualar EXACTAMENTE la capacidad', () => {
      for (const [capacity, floors] of [[50, 2], [40, 3], [34, 1], [37, 4], [13, 3], [60, 6]]) {
        const output = VehicleCapacityEngine.calculate(
          buildVehicle({ passengerCapacity: capacity, floors })
        );
        const drawn = output.decks.reduce((total, deck) => total + deck.seats, 0);
        expect(drawn)
          .withContext(`capacidad ${capacity} en ${floors} pisos`)
          .toBe(capacity);
      }
    });

    it('debe repartir el resto hacia los pisos inferiores', () => {
      // 40 pax / 3 pisos → base 13, resto 1 → el piso 1 recibe la plaza extra.
      const output = VehicleCapacityEngine.calculate(
        buildVehicle({ passengerCapacity: 40, floors: 3 })
      );
      const byFloor = new Map(output.decks.map(deck => [deck.floorNumber, deck.seats]));
      expect(byFloor.get(1)).toBe(14);
      expect(byFloor.get(2)).toBe(13);
      expect(byFloor.get(3)).toBe(13);
    });

    it('debe ordenar los pisos de mayor a menor', () => {
      const output = VehicleCapacityEngine.calculate(buildVehicle({ floors: 3 }));
      expect(output.decks.map(deck => deck.floorNumber)).toEqual([3, 2, 1]);
    });
  });

  // ---- ECUACIÓN 2 -------------------------------------------------------
  describe('Ecuación 2: densidad adaptativa de disposición', () => {
    it('debe usar 2+pasillo+2 en pisos normales', () => {
      const output = VehicleCapacityEngine.calculate(
        buildVehicle({ passengerCapacity: 25, floors: 1 })
      );
      expect(output.decks[0].seatsAcross).toBe(DECKS.SEATS_ACROSS_NORMAL);
    });

    it('debe pasar a disposición densa en pisos muy cargados', () => {
      const output = VehicleCapacityEngine.calculate(
        buildVehicle({ passengerCapacity: 60, floors: 1 })
      );
      expect(output.decks[0].seatsAcross).toBe(DECKS.SEATS_ACROSS_DENSE);
    });

    it('las filas deben derivarse de plazas y disposición', () => {
      const output = VehicleCapacityEngine.calculate(
        buildVehicle({ passengerCapacity: 25, floors: 1 })
      );
      // 25 plazas en filas de 4 → 7 filas, la última con 1 butaca.
      expect(output.decks[0].rows).toBe(7);
    });
  });

  // ---- ECUACIÓN 3 -------------------------------------------------------
  describe('Ecuación 3: agregación anti-huérfanos', () => {
    it('debe agregar los pisos excedentes en la última columna', () => {
      const output = VehicleCapacityEngine.calculate(
        buildVehicle({ passengerCapacity: 60, floors: 6 })
      );
      expect(output.decks.length).toBe(DECKS.MAX_RENDERED);
      expect(output.decks[output.decks.length - 1].label).toBe('P1-3');
      // El invariante de la Ecuación 1 sobrevive a la agregación.
      expect(output.decks.reduce((total, deck) => total + deck.seats, 0)).toBe(60);
    });

    it('no debe agregar cuando los pisos caben', () => {
      const output = VehicleCapacityEngine.calculate(buildVehicle({ floors: 3 }));
      expect(output.decks.every(deck => deck.label.startsWith('PISO'))).toBeTrue();
    });
  });

  // ---- CARGA ------------------------------------------------------------
  describe('Carga', () => {
    it('no debe existir cuando la unidad no transporta kilogramos', () => {
      expect(VehicleCapacityEngine.calculate(buildVehicle({ cargoCapacityKg: null })).cargo)
        .toBeNull();
      expect(VehicleCapacityEngine.calculate(buildVehicle({ cargoCapacityKg: 0 })).cargo)
        .toBeNull();
    });

    it('debe acotar la proporción a 1 cuando supera la referencia de flota', () => {
      const output = VehicleCapacityEngine.calculate(
        buildVehicle({ cargoCapacityKg: CARGO.REFERENCE_MAX_KG * 3 })
      );
      expect(output.cargo?.ratio).toBe(1);
    });

    it('debe normalizar contra la referencia de flota', () => {
      const output = VehicleCapacityEngine.calculate(buildVehicle({ cargoCapacityKg: 1000 }));
      expect(output.cargo?.ratio).toBeCloseTo(0.2, 5);
    });
  });

  // ---- PUREZA -----------------------------------------------------------
  it('debe ser una función pura', () => {
    const vehicle = buildVehicle({ passengerCapacity: 40, floors: 3, cargoCapacityKg: 1000 });
    expect(VehicleCapacityEngine.calculate(vehicle))
      .toEqual(VehicleCapacityEngine.calculate(vehicle));
  });

  it('debe tolerar la ausencia de vehículo', () => {
    const output = VehicleCapacityEngine.calculate(null);
    expect(output.decks).toEqual([]);
    expect(output.cargo).toBeNull();
    expect(output.totalSeats).toBe(0);
  });
});
