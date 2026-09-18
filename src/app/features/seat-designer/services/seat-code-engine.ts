/**
 * ============================================================================
 * GENERADOR DE CÓDIGOS DE TIPO DE ASIENTO (`SeatCodeEngine`)
 * ============================================================================
 * "Cama Suite Plus" → `CSP`. Si ya existe, `CSP2`, `CSP3`… Función pura con
 * garantía de unicidad frente al catálogo: el spawner nunca crea un código
 * repetido, que rompería la paleta y la numeración por tipo.
 * ============================================================================
 */
export class SeatCodeEngine {
  static suggest(name: string, existing: readonly string[]): string {
    const taken = new Set(existing.map(code => code.toUpperCase()));
    const base = this.initials(name);
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base}${n}`)) n++;
    return `${base}${n}`;
  }

  /** Iniciales de hasta 3 palabras; una sola palabra usa sus 3 primeras letras. */
  static initials(name: string): string {
    const words = name
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .split(/[^A-Z0-9]+/)
      .filter(Boolean);
    if (!words.length) return 'NVO';
    if (words.length === 1) return words[0].slice(0, 3).padEnd(2, 'X');
    return words.slice(0, 3).map(w => w[0]).join('');
  }
}
