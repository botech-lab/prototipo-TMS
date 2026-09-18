/**
 * Manifiesto de ejemplo (solo prototipo). El sistema real lo obtiene del
 * backend de ventas; aquí se genera de forma determinista a partir de la
 * salida para que la vista sea estable entre recargas.
 */
export interface ManifestPassenger {
  readonly seat: number;
  readonly name: string;
  readonly ci: string;
}

const FIRST_NAMES = [
  'Rosa', 'Luis', 'Carmen', 'Jhonny', 'Gabriela', 'Wilson', 'Norma', 'Edwin',
  'Marcela', 'Freddy', 'Silvia', 'Álvaro', 'Ximena', 'René', 'Patricia', 'Óscar'
];
const LAST_NAMES = [
  'Mamani', 'Quispe', 'Choque', 'Condori', 'Flores', 'Apaza', 'Ticona', 'Huanca',
  'Limachi', 'Vargas', 'Rojas', 'Gutiérrez', 'Poma', 'Chambi', 'Arce', 'Torrez'
];

/** Semilla estable a partir del identificador de la salida. */
function seedOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** Pasajeros de ejemplo para una salida: tantos como pasajes vendidos, sin asientos repetidos. */
export function mockManifest(slotId: string, sold: number, seats: number): ManifestPassenger[] {
  const count = Math.max(0, Math.min(sold, seats));
  const seed = seedOf(slotId);
  const step = seats > 1 ? (seed % (seats - 1)) + 1 : 1;
  const used = new Set<number>();
  const list: ManifestPassenger[] = [];
  let seat = (seed % Math.max(seats, 1)) + 1;
  for (let k = 0; k < count; k++) {
    while (used.has(seat)) seat = (seat % seats) + 1;
    used.add(seat);
    const first = FIRST_NAMES[(seed + k * 7) % FIRST_NAMES.length];
    const last = LAST_NAMES[(seed + k * 5) % LAST_NAMES.length];
    list.push({ seat, name: `${first} ${last}`, ci: String(4_800_000 + ((seed + k * 13_721) % 3_000_000)) });
    seat = ((seat + step - 1) % seats) + 1;
  }
  return list.sort((a, b) => a.seat - b.seat);
}
