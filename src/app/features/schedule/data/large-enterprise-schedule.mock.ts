import { ScheduledCommercialService, DayDepartureSlot } from '../models/schedule.model';
import { CalendarWeekDay } from '../services/schedule-calendar.service';

export const MOCK_SCHEDULED_SERVICES: ScheduledCommercialService[] = [
  // ==========================================================
  // ORIGEN: LA PAZ
  // ==========================================================
  { id: 'SRV-LPZ-01', originCity: 'La Paz', destinationCity: 'Oruro', dailyDeparturesCount: 8, distanceKm: 228.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'MAÑANA' },
  { id: 'SRV-LPZ-02', originCity: 'La Paz', destinationCity: 'Cochabamba', dailyDeparturesCount: 6, distanceKm: 378.5, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'NOCHE' },
  { id: 'SRV-LPZ-03', originCity: 'La Paz', destinationCity: 'Santa Cruz', dailyDeparturesCount: 5, distanceKm: 852.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'NOCHE' },
  { id: 'SRV-LPZ-04', originCity: 'La Paz', destinationCity: 'Potosí', dailyDeparturesCount: 4, distanceKm: 538.0, operatingDays: ['Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'TARDE' },
  { id: 'SRV-LPZ-05', originCity: 'La Paz', destinationCity: 'Copacabana', dailyDeparturesCount: 4, distanceKm: 155.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'MAÑANA' },
  { id: 'SRV-LPZ-06', originCity: 'La Paz', destinationCity: 'Coroico (Yungas)', dailyDeparturesCount: 4, distanceKm: 98.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'MAÑANA' },

  // ==========================================================
  // ORIGEN: EL ALTO
  // ==========================================================
  { id: 'SRV-EAL-01', originCity: 'El Alto', destinationCity: 'Cochabamba', dailyDeparturesCount: 5, distanceKm: 365.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'MAÑANA' },
  { id: 'SRV-EAL-02', originCity: 'El Alto', destinationCity: 'Oruro', dailyDeparturesCount: 7, distanceKm: 215.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'TARDE' },
  { id: 'SRV-EAL-03', originCity: 'El Alto', destinationCity: 'Caranavi', dailyDeparturesCount: 3, distanceKm: 160.0, operatingDays: ['Lun','Mié','Vie','Dom'], status: 'ACTIVO', shift: 'MAÑANA' },
  { id: 'SRV-EAL-04', originCity: 'El Alto', destinationCity: 'Desaguadero (Frontera Perú)', dailyDeparturesCount: 6, distanceKm: 110.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'MAÑANA' },

  // ==========================================================
  // ORIGEN: ORURO
  // ==========================================================
  { id: 'SRV-ORU-01', originCity: 'Oruro', destinationCity: 'Potosí', dailyDeparturesCount: 5, distanceKm: 310.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'MAÑANA' },
  { id: 'SRV-ORU-02', originCity: 'Oruro', destinationCity: 'Cochabamba', dailyDeparturesCount: 6, distanceKm: 212.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'TARDE' },
  { id: 'SRV-ORU-03', originCity: 'Oruro', destinationCity: 'Uyuni', dailyDeparturesCount: 3, distanceKm: 314.0, operatingDays: ['Lun','Mié','Vie','Dom'], status: 'ACTIVO', shift: 'NOCHE' },
  { id: 'SRV-ORU-04', originCity: 'Oruro', destinationCity: 'Pisiga (Frontera Chile)', dailyDeparturesCount: 4, distanceKm: 240.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'MAÑANA' },

  // ==========================================================
  // ORIGEN: COCHABAMBA
  // ==========================================================
  { id: 'SRV-CBB-01', originCity: 'Cochabamba', destinationCity: 'Santa Cruz', dailyDeparturesCount: 9, distanceKm: 473.5, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'NOCHE' },
  { id: 'SRV-CBB-02', originCity: 'Cochabamba', destinationCity: 'Sucre', dailyDeparturesCount: 4, distanceKm: 322.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'NOCHE' },
  { id: 'SRV-CBB-03', originCity: 'Cochabamba', destinationCity: 'Villa Tunari', dailyDeparturesCount: 6, distanceKm: 160.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'TARDE' },
  { id: 'SRV-CBB-04', originCity: 'Cochabamba', destinationCity: 'Aiquile', dailyDeparturesCount: 3, distanceKm: 218.0, operatingDays: ['Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'MAÑANA' },

  // ==========================================================
  // ORIGEN: SANTA CRUZ
  // ==========================================================
  { id: 'SRV-SCZ-01', originCity: 'Santa Cruz', destinationCity: 'Cochabamba', dailyDeparturesCount: 8, distanceKm: 473.5, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'NOCHE' },
  { id: 'SRV-SCZ-02', originCity: 'Santa Cruz', destinationCity: 'Yacuiba', dailyDeparturesCount: 3, distanceKm: 540.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'NOCHE' },
  { id: 'SRV-SCZ-03', originCity: 'Santa Cruz', destinationCity: 'Montero', dailyDeparturesCount: 12, distanceKm: 50.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'MAÑANA' },
  { id: 'SRV-SCZ-04', originCity: 'Santa Cruz', destinationCity: 'Trinidad (Beni)', dailyDeparturesCount: 4, distanceKm: 554.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'NOCHE' },
  { id: 'SRV-SCZ-05', originCity: 'Santa Cruz', destinationCity: 'Puerto Quijarro (Frontera Brasil)', dailyDeparturesCount: 3, distanceKm: 650.0, operatingDays: ['Lun','Mié','Vie','Dom'], status: 'ACTIVO', shift: 'NOCHE' },

  // ==========================================================
  // ORIGEN: POTOSÍ
  // ==========================================================
  { id: 'SRV-PSI-01', originCity: 'Potosí', destinationCity: 'Tarija', dailyDeparturesCount: 4, distanceKm: 340.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'TARDE' },
  { id: 'SRV-PSI-02', originCity: 'Potosí', destinationCity: 'Sucre', dailyDeparturesCount: 7, distanceKm: 156.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'MAÑANA' },
  { id: 'SRV-PSI-03', originCity: 'Potosí', destinationCity: 'Uyuni', dailyDeparturesCount: 4, distanceKm: 204.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'MAÑANA' },
  { id: 'SRV-PSI-04', originCity: 'Potosí', destinationCity: 'Villazón (Frontera Argentina)', dailyDeparturesCount: 3, distanceKm: 345.0, operatingDays: ['Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'NOCHE' },

  // ==========================================================
  // ORIGEN: SUCRE (CHUQUISACA)
  // ==========================================================
  { id: 'SRV-SRE-01', originCity: 'Sucre', destinationCity: 'Potosí', dailyDeparturesCount: 7, distanceKm: 156.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'MAÑANA' },
  { id: 'SRV-SRE-02', originCity: 'Sucre', destinationCity: 'Cochabamba', dailyDeparturesCount: 4, distanceKm: 322.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'NOCHE' },
  { id: 'SRV-SRE-03', originCity: 'Sucre', destinationCity: 'Camiri', dailyDeparturesCount: 2, distanceKm: 420.0, operatingDays: ['Lun','Mié','Vie'], status: 'ACTIVO', shift: 'MAÑANA' },

  // ==========================================================
  // ORIGEN: TARIJA
  // ==========================================================
  { id: 'SRV-TRJ-01', originCity: 'Tarija', destinationCity: 'Potosí', dailyDeparturesCount: 3, distanceKm: 340.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'NOCHE' },
  { id: 'SRV-TRJ-02', originCity: 'Tarija', destinationCity: 'Bermejo (Frontera)', dailyDeparturesCount: 6, distanceKm: 200.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'MAÑANA' },
  { id: 'SRV-TRJ-03', originCity: 'Tarija', destinationCity: 'Villamontes', dailyDeparturesCount: 4, distanceKm: 245.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'TARDE' },

  // ==========================================================
  // ORIGEN: UYUNI
  // ==========================================================
  { id: 'SRV-UYU-01', originCity: 'Uyuni', destinationCity: 'Potosí', dailyDeparturesCount: 4, distanceKm: 204.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'TARDE' },
  { id: 'SRV-UYU-02', originCity: 'Uyuni', destinationCity: 'Oruro', dailyDeparturesCount: 3, distanceKm: 314.0, operatingDays: ['Lun','Mié','Vie','Dom'], status: 'ACTIVO', shift: 'MAÑANA' },
  { id: 'SRV-UYU-03', originCity: 'Uyuni', destinationCity: 'Tupiza', dailyDeparturesCount: 2, distanceKm: 200.0, operatingDays: ['Lun','Mar','Mié','Jue','Vie'], status: 'ACTIVO', shift: 'MAÑANA' },

  // ==========================================================
  // ORIGEN: TRINIDAD (BENI)
  // ==========================================================
  { id: 'SRV-TRI-01', originCity: 'Trinidad', destinationCity: 'Santa Cruz', dailyDeparturesCount: 4, distanceKm: 554.0, operatingDays: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], status: 'ACTIVO', shift: 'NOCHE' },
  { id: 'SRV-TRI-02', originCity: 'Trinidad', destinationCity: 'Riberalta', dailyDeparturesCount: 2, distanceKm: 850.0, operatingDays: ['Lun','Mié','Vie'], status: 'ACTIVO', shift: 'MAÑANA' }
];

export const MOCK_LARGE_ENTERPRISE_SERVICES = MOCK_SCHEDULED_SERVICES;

/**
 * Flota de pasajeros disponible para las salidas programadas.
 * La capacidad es el denominador de la ocupación de cada salida.
 * No incluye vehículos de carga: una salida programada es de pasajeros.
 */
export const MOCK_PASSENGER_FLEET: { label: string; seats: number }[] = [
  { label: 'Bus Cama Suite (36 Asientos)', seats: 36 },
  { label: 'Bus Leito VIP (42 Asientos)', seats: 42 },
  { label: 'Semi-Cama Directo (46 Asientos)', seats: 46 }
];

export const MOCK_DRIVERS: string[] = [
  'Carlos Mendoza (Cat. C)',
  'Roberto Gómez (Cat. C)',
  'Fernando Flores (Cat. T)',
  'Javier Mamani (Cat. C)'
];

/**
 * Ocupación de ejemplo por posición de la salida en la semana (vendidos / asientos).
 * Incluye salidas sobre el 85% para que haya ejemplos de "Casi llena".
 */
export const MOCK_SOLD_RATIOS: number[] = [0.5, 0.9, 0.61, 0.94, 0.48, 0.72, 0.88];

/** Umbral de ocupación a partir del cual una salida se considera casi llena. */
export const NEARLY_FULL_RATIO = 0.85;

/** Pasajes vendidos de ejemplo para la salida `idx` en un bus de `seats` asientos. */
export function mockSoldSeats(idx: number, seats: number): number {
  return Math.min(seats, Math.round(seats * MOCK_SOLD_RATIOS[idx % MOCK_SOLD_RATIOS.length]));
}

/**
 * Duración estimada del viaje en minutos: 60 km/h, redondeo a 15 min.
 * Fuente única para la tarjeta de ruta y la llegada de cada salida.
 */
export function estimateTripMinutes(distanceKm: number): number {
  if (!distanceKm || distanceKm <= 0) return 120;
  return Math.max(15, Math.round(distanceKm / 60 * 60 / 15) * 15);
}

/** Hora del despacho con el formato del contrato de datos ("07:00 Hrs"). */
export function formatMockClock(totalMinutes: number): string {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')} Hrs`;
}

// Generador de Salidas Semanales usando fechas reales de calendario.
// Datos coherentes: la llegada es salida + duración del viaje, la ocupación
// nunca supera la capacidad del bus asignado y solo se asigna flota de pasajeros.
export function generateWeekSlotsForService(
  serviceId: string,
  days: CalendarWeekDay[],
  tripMinutes = 240
): DayDepartureSlot[] {
  const parts = serviceId.split('-');
  const origCode = parts.length > 1 ? parts[1] : 'SRV';
  const numCode = parts.length > 2 ? parts[2] : '01';

  return days.map((dayItem, idx) => {
    const departure = (7 + (idx % 3) * 4) * 60 + (idx % 2 === 0 ? 0 : 30);
    const bus = MOCK_PASSENGER_FLEET[idx % MOCK_PASSENGER_FLEET.length];
    const sold = mockSoldSeats(idx, bus.seats);
    const isWarning = sold / bus.seats >= NEARLY_FULL_RATIO;

    return {
      id: `${serviceId}-${dayItem.isoString}`,
      serviceId,
      dayLabel: dayItem.badgeLabel,
      dayBadge: dayItem.badgeLabel,
      isoDate: dayItem.isoString,
      serviceCode: `DESP-${origCode}-${numCode}-${800 + idx * 30}`,
      departureTime: formatMockClock(departure),
      arrivalTime: formatMockClock(departure + tripMinutes),
      assignedVehicle: bus.label,
      vehicleType: bus.label,
      driverName: MOCK_DRIVERS[idx % MOCK_DRIVERS.length],
      licensePlate: `${3000 + idx * 111}-${origCode}`,
      occupancyCurrent: sold,
      occupancyTotal: bus.seats,
      isActive: true,
      statusVariant: isWarning ? 'warning' : 'active'
    };
  });
}
