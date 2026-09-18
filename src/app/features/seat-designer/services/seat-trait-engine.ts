import { SEAT_LAYOUT_RULES } from '@core';
import { CellKey, DeckLayout, SeatTrait } from '../models/seat-layout.model';

export interface FareAssignment {
  /** Nombre de la categoría en `tipos-categoria-tarifa`. */
  readonly fare: string;
  /** Rango 1 (económico) a 4 (premium): alimenta el heatmap. */
  readonly rank: number;
  /** `true` si lo fijó el usuario a mano; `false` si lo decidió una regla. */
  readonly manual: boolean;
}

/**
 * ============================================================================
 * MOTOR DE RASGOS Y TARIFA (`SeatTraitEngine`)
 * ============================================================================
 * Aplica al bus el principio de los códigos IATA de característica de
 * asiento: ventana, pasillo, mampara o espacio extra NO se etiquetan, se
 * DERIVAN de la geometría. Mueves el baño y todo se recalcula.
 *
 * LAS 6 REGLAS DE DERIVACIÓN (por celda con butaca):
 *
 * 1. VENTANA     columna 0 o columna `width-1`
 * 2. PASILLO     columna contigua al pasillo
 * 3. MAMPARA     la fila anterior tiene cabina o baño en cualquier columna
 * 4. PANORÁMICA  primera fila de un piso alto (floor > 1)
 * 5. JUNTO AL BAÑO   una celda ortogonalmente contigua es baño
 * 6. ESPACIO EXTRA   la fila anterior tiene escalera, o es la primera fila
 *                    de pasaje detrás de la puerta
 *
 * Y de los rasgos sale la TARIFA por reglas ordenadas (`FARE_RULES`): la
 * primera que coincide gana. Una tarifa fijada a mano siempre prevalece.
 * ============================================================================
 */
export class SeatTraitEngine {

  /** Rasgos de todas las butacas de un piso, indexados por clave de celda. */
  static traits(deck: DeckLayout, deckIndex: number): ReadonlyMap<CellKey, readonly SeatTrait[]> {
    const out = new Map<CellKey, SeatTrait[]>();
    const rowHas = (row: number, kinds: readonly string[]): boolean =>
      row >= 0 && row < deck.length && deck.cells[row].some(c => kinds.includes(c.kind));

    for (let row = 0; row < deck.length; row++) {
      for (let col = 0; col < deck.width; col++) {
        if (deck.cells[row][col].kind !== 'seat') continue;
        const traits: SeatTrait[] = [];

        // 1. Ventana
        if (col === 0 || col === deck.width - 1) traits.push('window');
        // 2. Pasillo
        if (col === deck.aisleCol - 1 || col === deck.aisleCol + 1) traits.push('aisle');
        // 3. Mampara
        if (rowHas(row - 1, ['cabin', 'bathroom'])) traits.push('bulkhead');
        // 4. Panorámica
        if (deck.floor > 1 && row === 0) traits.push('panoramic');
        // 5. Junto al baño
        const neighbours = [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]];
        if (neighbours.some(([r, c]) => deck.cells[r]?.[c]?.kind === 'bathroom')) traits.push('lavatory');
        // 6. Espacio extra
        const doorAhead = (deck.doors ?? []).some(d => d.row === row - 1 && (d.side === 'left' ? col < deck.aisleCol : col > deck.aisleCol));
        if (rowHas(row - 1, ['stairs']) || doorAhead) traits.push('legroom');

        out.set(`${deckIndex}:${row}:${col}`, traits);
      }
    }
    return out;
  }

  /** Tarifa de una butaca: manual si existe; si no, la primera regla que coincida. */
  static fare(traits: readonly SeatTrait[], manualFare: string | null, rankOf: (fare: string) => number | null): FareAssignment {
    if (manualFare) {
      return { fare: manualFare, rank: rankOf(manualFare) ?? SEAT_LAYOUT_RULES.FARE_DEFAULT.rank, manual: true };
    }
    for (const rule of SEAT_LAYOUT_RULES.FARE_RULES) {
      if (traits.includes(rule.trait)) return { fare: rule.fare, rank: rule.rank, manual: false };
    }
    return { fare: SEAT_LAYOUT_RULES.FARE_DEFAULT.fare, rank: SEAT_LAYOUT_RULES.FARE_DEFAULT.rank, manual: false };
  }

  /** Rango conocido de una tarifa por nombre (para las fijadas a mano). */
  static rankByName(fare: string): number | null {
    const rule = SEAT_LAYOUT_RULES.FARE_RULES.find(r => r.fare === fare);
    if (rule) return rule.rank;
    if (fare === SEAT_LAYOUT_RULES.FARE_DEFAULT.fare) return SEAT_LAYOUT_RULES.FARE_DEFAULT.rank;
    // Tarifas del catálogo sin regla: VIP/Premium arriba, Estudiante abajo, resto medio.
    const lower = fare.toLowerCase();
    if (lower.includes('vip') || lower.includes('premium')) return 4;
    if (lower.includes('ejecutiv')) return 3;
    if (lower.includes('estudiant')) return 1;
    return null;
  }
}
