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
  // --- Flota de prueba para los precios del paso 5 ---
  {
    id: 'veh-mixto-2p',
    plate: 'LPZ-2201',
    type: 'Bus Mixto',
    brand: 'Scania',
    model: 'Marcopolo G7 doble piso',
    floors: 2,
    passengerCapacity: 52,
    cargoCapacityKg: 3000,
    status: 'ACTIVO'
  },
  {
    id: 'veh-semicama-1p',
    plate: 'LPZ-3310',
    type: 'Bus Semicama',
    brand: 'Mercedes-Benz',
    model: 'O-500 piso simple',
    floors: 1,
    passengerCapacity: 44,
    cargoCapacityKg: 2500,
    status: 'ACTIVO'
  },
  {
    id: 'veh-individual',
    plate: 'LPZ-4420',
    type: 'Bus Cama Completo',
    brand: 'Volvo',
    model: '9800 cama individual',
    floors: 1,
    passengerCapacity: 24,
    cargoCapacityKg: 2000,
    status: 'ACTIVO'
  },
  {
    id: 'veh-supervip',
    plate: 'LPZ-5500',
    type: 'Bus Ejecutivo',
    brand: 'Scania',
    model: 'K410 Súper VIP',
    floors: 2,
    passengerCapacity: 30,
    cargoCapacityKg: 2000,
    status: 'ACTIVO'
  },
  {
    id: 'veh-premium',
    plate: 'LPZ-6600',
    type: 'Bus Ejecutivo',
    brand: 'Volvo',
    model: '9800 Leito',
    floors: 2,
    passengerCapacity: 36,
    cargoCapacityKg: 2000,
    status: 'ACTIVO'
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
  },
  // --- Flota grande de prueba: 170 buses, como una empresa mediana de verdad.
  //     Sirve para ver que elegir buses no se convierta en una lista infinita.
  ...flotaDePrueba()
];

/** Buses de relleno para probar la pantalla con muchas unidades. */
function flotaDePrueba(): Vehicle[] {
  const modelos: readonly { tipo: string; marca: string; modelo: string; pisos: number; pax: number }[] = [
    { tipo: 'Bus Semicama', marca: 'Mercedes-Benz', modelo: 'O-500 RSD', pisos: 2, pax: 52 },
    { tipo: 'Bus Cama Completo', marca: 'Volvo', modelo: '9800 DD', pisos: 2, pax: 42 },
    { tipo: 'Bus Normal', marca: 'Scania', modelo: 'K360', pisos: 1, pax: 48 },
    { tipo: 'Bus Mixto', marca: 'Scania', modelo: 'Marcopolo G7', pisos: 2, pax: 52 },
    { tipo: 'Bus Ejecutivo', marca: 'Volvo', modelo: '9800 Ejecutivo', pisos: 2, pax: 36 }
  ];
  const cuantos = [64, 26, 48, 20, 12];
  const salida: Vehicle[] = [];
  modelos.forEach((base, indice) => {
    for (let numero = 1; numero <= cuantos[indice]; numero++) {
      const placa = `${1000 + indice * 500 + numero}-LPZ`;
      salida.push({
        id: `veh-flota-${indice}-${numero}`,
        plate: placa,
        type: base.tipo,
        brand: base.marca,
        model: base.modelo,
        floors: base.pisos,
        passengerCapacity: base.pax,
        cargoCapacityKg: 2000,
        status: numero % 17 === 0 ? 'INACTIVO' : 'ACTIVO'
      });
    }
  });
  return salida;
}
