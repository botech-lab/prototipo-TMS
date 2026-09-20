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
  'vt-van': ['seat-est']
};
