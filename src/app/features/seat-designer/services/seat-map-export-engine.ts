import { SEAT_LAYOUT_RULES } from '@core';
import { CellPosition, DeckLayout, SeatCell, VehicleLayout } from '../models/seat-layout.model';
import { SeatLayoutEngine } from './seat-layout-engine';

export interface ManifestRow {
  readonly deck: number;
  readonly number: number | null;
  readonly seatType: string;
  readonly fare: string | null;
  /** Vacío hasta que exista venta: es la columna que rellena el módulo de ventas. */
  readonly passenger: string;
}

/** Grilla simplificada del boletero: `null` = no hay butaca. */
export interface SalesGrid {
  readonly decks: readonly { readonly floor: number; readonly rows: readonly (readonly (number | null)[])[] }[];
}

export interface MobileSeat {
  readonly deck: number;
  readonly row: number;
  readonly col: number;
  readonly number: number;
  readonly seatType: string;
  readonly fare: string | null;
  readonly traits: readonly string[];
}

export interface SyncBundle {
  readonly svg: string;
  readonly manifestCsv: string;
  readonly manifest: readonly ManifestRow[];
  readonly salesGrid: SalesGrid;
  readonly mobileMap: { readonly vehicleId: string; readonly seats: readonly MobileSeat[]; readonly generatedAt: string };
}

/** Resolutor opcional de tarifa y rasgos por butaca, para enriquecer las salidas. */
export interface SeatEnricher {
  fare(pos: CellPosition): string | null;
  traits(pos: CellPosition): readonly string[];
}

/**
 * ============================================================================
 * MOTOR DE EXPORTACIÓN OMNICANAL (`SeatMapExportEngine`)
 * ============================================================================
 * "Smart Sync": del mismo plano salen, en cliente y sin red, los cuatro
 * productos que consumen los demás canales:
 *
 *  1. MICRO-SVG vectorial para el ticket térmico: sin fuentes externas, sin
 *     estilos, ~2 KB. Se imprime a cualquier tamaño sin perder nitidez.
 *  2. MANIFIESTO del conductor: una fila por butaca con columna Pasajero
 *     vacía; CSV listo para la tablet.
 *  3. GRILLA del boletero: matriz de números por piso, nada más.
 *  4. MAPA para la app móvil: JSON con rasgos y tarifa por butaca.
 *
 * Costura de integración: cuando exista backend, `bundle()` es lo que se
 * envía al guardar. Nada cambia en el editor.
 * ============================================================================
 */
export class SeatMapExportEngine {

  static bundle(layout: VehicleLayout, enricher?: SeatEnricher): SyncBundle {
    const manifest = this.manifest(layout, enricher);
    return {
      svg: this.svg(layout),
      manifest,
      manifestCsv: this.manifestCsv(manifest),
      salesGrid: this.salesGrid(layout),
      mobileMap: { vehicleId: layout.vehicleId, seats: this.mobileSeats(layout, enricher), generatedAt: new Date().toISOString() }
    };
  }

  /** Regla 1: micro-SVG. Los pisos van apilados, cada uno con su etiqueta. */
  static svg(layout: VehicleLayout): string {
    const { SVG_CELL: C, SVG_GAP: G, SVG_AISLE: A, SVG_FONT: F } = SEAT_LAYOUT_RULES.EXPORT;
    const parts: string[] = [];
    let y = 0;
    let maxWidth = 0;

    layout.decks.forEach((deck, index) => {
      const width = this.deckWidth(deck, C, G, A);
      maxWidth = Math.max(maxWidth, width);
      if (layout.decks.length > 1) {
        parts.push(`<text x="0" y="${y + F}" font-size="${F}" font-family="monospace">P${deck.floor}</text>`);
        y += F + G;
      }
      deck.cells.forEach((line, row) => {
        let x = 0;
        line.forEach((cell, col) => {
          const w = col === deck.aisleCol ? A : C;
          if (cell.kind === 'seat') {
            const n = SeatLayoutEngine.isSellable(cell.seatType) ? String(cell.number) : '·';
            parts.push(`<rect x="${x}" y="${y}" width="${C}" height="${C}" rx="1.5" fill="none" stroke="#000" stroke-width="0.6"/>`);
            parts.push(`<text x="${x + C / 2}" y="${y + C / 2 + F * 0.35}" font-size="${F}" font-family="monospace" text-anchor="middle">${n}</text>`);
          } else if (cell.kind !== 'empty' && cell.kind !== 'aisle') {
            const glyph = cell.kind === 'cabin' ? 'C' : cell.kind === 'door' ? 'P' : cell.kind === 'bathroom' ? 'WC' : cell.kind === 'stairs' ? 'E' : 'M';
            parts.push(`<rect x="${x}" y="${y}" width="${C}" height="${C}" rx="1.5" fill="#000" fill-opacity="0.12" stroke="none"/>`);
            parts.push(`<text x="${x + C / 2}" y="${y + C / 2 + F * 0.35}" font-size="${F * 0.8}" font-family="monospace" text-anchor="middle">${glyph}</text>`);
          }
          x += w + G;
        });
        y += C + G;
      });
      if (index < layout.decks.length - 1) y += G * 2;
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${maxWidth} ${Math.max(1, y - G)}" width="${maxWidth}" height="${Math.max(1, y - G)}">${parts.join('')}</svg>`;
  }

  /** Regla 2: manifiesto por butaca, en orden de numeración. */
  static manifest(layout: VehicleLayout, enricher?: SeatEnricher): ManifestRow[] {
    const rows: ManifestRow[] = [];
    layout.decks.forEach((deck, d) => {
      deck.cells.forEach((line, row) => line.forEach((cell, col) => {
        if (cell.kind !== 'seat') return;
        const pos = { deck: d, row, col };
        rows.push({ deck: deck.floor, number: SeatLayoutEngine.isSellable(cell.seatType) ? cell.number : null, seatType: cell.seatType, fare: enricher?.fare(pos) ?? null, passenger: '' });
      }));
    });
    return rows.sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity));
  }

  static manifestCsv(rows: readonly ManifestRow[]): string {
    const escape = (v: string | number | null) => v === null ? '' : `"${String(v).replace(/"/g, '""')}"`;
    const head = ['piso', 'butaca', 'tipo', 'tarifa', 'pasajero'].join(',');
    return [head, ...rows.map(r => [r.deck, r.number, r.seatType, r.fare, r.passenger].map(escape).join(','))].join('\n');
  }

  /** Regla 3: grilla del boletero. */
  static salesGrid(layout: VehicleLayout): SalesGrid {
    return {
      decks: layout.decks.map(deck => ({
        floor: deck.floor,
        rows: deck.cells.map(line => line.filter(c => c.kind !== 'aisle').map(c => (c.kind === 'seat' && SeatLayoutEngine.isSellable(c.seatType) ? (c as SeatCell).number : null)))
      }))
    };
  }

  /** Regla 4: mapa para la app móvil. */
  static mobileSeats(layout: VehicleLayout, enricher?: SeatEnricher): MobileSeat[] {
    const out: MobileSeat[] = [];
    layout.decks.forEach((deck, d) => deck.cells.forEach((line, row) => line.forEach((cell, col) => {
      if (cell.kind !== 'seat') return;
      const pos = { deck: d, row, col };
      out.push({ deck: deck.floor, row, col, number: cell.number, seatType: cell.seatType, fare: enricher?.fare(pos) ?? null, traits: enricher?.traits(pos) ?? [] });
    })));
    return out;
  }

  private static deckWidth(deck: DeckLayout, cell: number, gap: number, aisle: number): number {
    return deck.left * cell + aisle + deck.right * cell + (deck.width - 1) * gap;
  }
}
