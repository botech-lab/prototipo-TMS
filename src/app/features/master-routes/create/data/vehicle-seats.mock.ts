/**
 * Asientos que se asumen para un bus que todavía no tiene plano de asientos,
 * según su tipo de vehículo. Si el bus tiene plano (diseñador de plazas), manda
 * el plano. En Aleta el plano es `/parametric/vehiculo-asientos`.
 */
export const VEHICLE_SEAT_TYPES_MOCK: Readonly<Record<string, readonly string[]>> = {
  'vt-bus-cama': ['seat-cam'],
  'vt-bus-semicama': ['seat-sem'],
  'vt-bus-ejecutivo': ['seat-sem', 'seat-cam', 'seat-vip'],
  'vt-bus-normal': ['seat-est'],
  'vt-minibus': ['seat-est', 'seat-amb'],
  'vt-van': ['seat-est'],
  'vt-bus-mixto': ['seat-cam', 'seat-sem']
};

/**
 * Asientos de un BUS concreto, cuando no son los de su tipo. Un bus de dos
 * pisos puede llevar cama arriba y semicama abajo, y otro del mismo tipo llevar
 * solo asientos individuales. Son CÓDIGOS del catálogo de tipos de asiento.
 *
 * En el sistema real esto sale del plano de asientos de cada vehículo
 * (Aleta: `/parametric/vehiculo-asientos`), que hoy no existe por bus.
 */
export const VEHICLE_SEAT_CODES_MOCK: Readonly<Record<string, readonly string[]>> = {
  // Dos pisos: cama arriba, semicama abajo.
  'veh-mixto-2p': ['CAM', 'SEM'],
  // Un piso, todo semicama.
  'veh-semicama-1p': ['SEM'],
  // Solo asientos individuales, de las dos clases.
  'veh-individual': ['CAMI', 'SEMI'],
  // Súper VIP arriba, cama abajo.
  'veh-supervip': ['SVIP', 'CAM'],
  // El caso extremo: cuatro clases en un mismo bus.
  'veh-premium': ['SCAM', 'LEITO', 'CAM', 'SVIP']
};
