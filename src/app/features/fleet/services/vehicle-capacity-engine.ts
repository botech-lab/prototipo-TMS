import { VEHICLE_CAPACITY_RULES } from '@core';
import { Vehicle } from '../models/vehicle.model';

/** Reparto de plazas de un piso. */
export interface DeckDistribution {
  readonly floorNumber: number;
  /** `PISO 2`, o `P1-3` cuando la columna agrega varios pisos. */
  readonly label: string;
  readonly seats: number;
  /** Butacas por fila: 4 en disposición estándar, 6 en densa. */
  readonly seatsAcross: number;
  /** Filas completas más la incompleta final. */
  readonly rows: number;
}

export interface CargoLoad {
  readonly kg: number;
  /** Proporción respecto de `REFERENCE_MAX_KG`, acotada a 1. */
  readonly ratio: number;
}

export interface CapacityEngineOutput {
  readonly decks: readonly DeckDistribution[];
  readonly cargo: CargoLoad | null;
  readonly totalSeats: number;
  readonly declaredFloors: number;
}

/**
 * ============================================================================
 * MOTOR DE DOMINIO DEL MAPA DE PLAZAS (`VehicleCapacityEngine`)
 * ============================================================================
 * Función pura: mismo vehículo dentro, mismo reparto fuera.
 *
 * Calcula QUÉ se dibuja -cuántas butacas por piso, en qué disposición- y deja
 * el DÓNDE a CSS Grid. Esa separación es la que permite que la misma tarjeta
 * se componga distinto a 358px y a 504px sin deformar la tipografía.
 *
 * LAS 3 ECUACIONES DE DOMINIO:
 *
 * 1. REPARTO ENTERO SIN PÉRDIDA
 *    base = ⌊pax / pisos⌋      resto = pax mod pisos
 *    El resto se asigna a los pisos INFERIORES, uno a uno.
 *    Invariante: Σ butacas === passengerCapacity. Se dibujan tantas butacas
 *    como plazas declara la unidad, ni una más ni una menos.
 *
 * 2. DENSIDAD ADAPTATIVA DE DISPOSICIÓN
 *    ≤40 plazas por piso → 2+pasillo+2   ·   >40 → 3+pasillo+3
 *    Análoga a los tres radios de nodo del grafo de rutas.
 *
 * 3. AGREGACIÓN ANTI-HUÉRFANOS
 *    Por encima de MAX_RENDERED pisos, los excedentes se suman en la última
 *    columna en vez de generar columnas de una sola butaca.
 *
 * (La contención y el centrado, que antes eran las ecuaciones 4 y 5, dejan de
 *  ser necesarios: CSS Grid no puede desbordar su contenedor.)
 * ============================================================================
 */
export class VehicleCapacityEngine {
  static calculate(vehicle: Vehicle | null): CapacityEngineOutput {
    const { DECKS, CARGO } = VEHICLE_CAPACITY_RULES;

    if (!vehicle) {
      return { decks: [], cargo: null, totalSeats: 0, declaredFloors: 0 };
    }

    const declaredFloors = Math.max(1, vehicle.floors);
    const renderedDecks = Math.min(declaredFloors, DECKS.MAX_RENDERED);

    // ---- Ecuación 1: reparto entero sin pérdida ------------------------
    const totalSeats = Math.max(0, vehicle.passengerCapacity);
    const base = Math.floor(totalSeats / declaredFloors);
    const remainder = totalSeats % declaredFloors;
    const seatsOfFloor = (n: number): number => base + (n <= remainder ? 1 : 0);

    const decks: DeckDistribution[] = [];
    for (let index = 0; index < renderedDecks; index++) {
      const floorNumber = declaredFloors - index; // de arriba hacia abajo
      const isLast = index === renderedDecks - 1;

      // ---- Ecuación 3: agregación anti-huérfanos ----------------------
      const aggregates = isLast && declaredFloors > DECKS.MAX_RENDERED;

      let seats: number;
      let label: string;
      let representedFloor: number;

      if (aggregates) {
        seats = 0;
        for (let n = 1; n <= floorNumber; n++) {
          seats += seatsOfFloor(n);
        }
        label = `P1-${floorNumber}`;
        representedFloor = 1;
      } else {
        seats = seatsOfFloor(floorNumber);
        label = `PISO ${floorNumber}`;
        representedFloor = floorNumber;
      }

      // ---- Ecuación 2: densidad adaptativa ---------------------------
      const seatsAcross =
        seats > DECKS.DENSE_THRESHOLD
          ? DECKS.SEATS_ACROSS_DENSE
          : DECKS.SEATS_ACROSS_NORMAL;

      decks.push({
        floorNumber: representedFloor,
        label,
        seats,
        seatsAcross,
        rows: Math.max(1, Math.ceil(seats / seatsAcross))
      });
    }

    const hasCargo = vehicle.cargoCapacityKg !== null && vehicle.cargoCapacityKg > 0;
    const cargo: CargoLoad | null = hasCargo
      ? {
          kg: vehicle.cargoCapacityKg as number,
          ratio: Math.min(1, (vehicle.cargoCapacityKg as number) / CARGO.REFERENCE_MAX_KG)
        }
      : null;

    return { decks, cargo, totalSeats, declaredFloors };
  }
}
