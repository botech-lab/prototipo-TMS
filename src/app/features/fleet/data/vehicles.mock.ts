import { Vehicle } from '../models/vehicle.model';

/**
 * Datos de demostración de la flota.
 * Reemplazar por `GET /api/v1/parametric/vehiculos` cuando el backend esté listo.
 */
export const VEHICLES_MOCK: readonly Vehicle[] = [
  {
    id: 'veh-1234',
    plate: '1234',
    type: 'Bus Normal',
    brand: 'toyota',
    model: 'Toyota',
    floors: 2,
    passengerCapacity: 50,
    cargoCapacityKg: null,
    status: 'ACTIVO'
  },
  {
    id: 'veh-dfe658',
    plate: 'DFE-658',
    type: 'Bus Normal',
    brand: 'Toyota',
    model: 'Van',
    floors: 3,
    passengerCapacity: 40,
    cargoCapacityKg: 1000,
    status: 'ACTIVO'
  },
  {
    id: 'veh-ghu891',
    plate: 'GHU891',
    type: 'Bus Normal',
    brand: 'Volvo',
    model: 'Bus cama',
    floors: 1,
    passengerCapacity: 50,
    cargoCapacityKg: 5000,
    status: 'INACTIVO'
  },
  {
    id: 'veh-non',
    plate: 'NON',
    type: 'Bus Semicama',
    brand: 'kj',
    model: 'lbj',
    floors: 1,
    passengerCapacity: 34,
    cargoCapacityKg: 234,
    status: 'ACTIVO'
  }
];
