import { DATA_TABLE_DIMENSIONS } from '@core';

export interface PageInfo {
  /** Índice de página, 0-based. */
  readonly pageIndex: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
  /** Primer registro visible, 1-based. `0` cuando no hay registros. */
  readonly from: number;
  /** Último registro visible, 1-based. */
  readonly to: number;
  /** Índices de página a dibujar; `-1` representa una elipsis. */
  readonly pages: readonly number[];
  readonly hasPrevious: boolean;
  readonly hasNext: boolean;
  readonly label: string;
}

/**
 * ============================================================================
 * MOTOR PURO DE PAGINACIÓN (`PaginationEngine`)
 * ============================================================================
 * Resuelve la aritmética del pie de los catálogos ("Muestra 1–10 de 21").
 *
 * LAS 3 ECUACIONES:
 *
 * 1. TOTAL DE PÁGINAS
 *    totalPages = max(1, ⌈totalItems / pageSize⌉)
 *    Siempre existe al menos una página, aunque el catálogo esté vacío.
 *
 * 2. RANGO VISIBLE 1-BASED
 *    from = pageIndex · pageSize + 1      to = min(from + pageSize − 1, total)
 *    Con catálogo vacío el rango es 0–0, nunca 1–0.
 *
 * 3. VENTANA DESLIZANTE DE BOTONES
 *    Se dibujan como máximo `maxPageButtons`. Al superarlo, la ventana se
 *    centra en la página activa y se insertan elipsis (-1) conservando
 *    siempre la primera y la última página como anclas de navegación.
 * ============================================================================
 */
export class PaginationEngine {
  static calculate(
    totalItems: number,
    pageIndex: number,
    pageSize: number = DATA_TABLE_DIMENSIONS.defaultPageSize,
    maxButtons: number = DATA_TABLE_DIMENSIONS.maxPageButtons
  ): PageInfo {
    const safeTotal = Math.max(0, Math.floor(totalItems));
    const safeSize = Math.max(1, Math.floor(pageSize));

    // ---- Ecuación 1 ----------------------------------------------------
    const totalPages = Math.max(1, Math.ceil(safeTotal / safeSize));
    const safeIndex = Math.min(Math.max(0, Math.floor(pageIndex)), totalPages - 1);

    // ---- Ecuación 2 ----------------------------------------------------
    const from = safeTotal === 0 ? 0 : safeIndex * safeSize + 1;
    const to = safeTotal === 0 ? 0 : Math.min(from + safeSize - 1, safeTotal);

    return {
      pageIndex: safeIndex,
      pageSize: safeSize,
      totalItems: safeTotal,
      totalPages,
      from,
      to,
      pages: this.buildWindow(totalPages, safeIndex, Math.max(3, maxButtons)),
      hasPrevious: safeIndex > 0,
      hasNext: safeIndex < totalPages - 1,
      label: `Muestra ${from}–${to} de ${safeTotal}`
    };
  }

  /** Ecuación 3: ventana deslizante con anclas en los extremos. */
  private static buildWindow(totalPages: number, current: number, maxButtons: number): number[] {
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, index) => index);
    }

    const pages: number[] = [0];
    // Espacio disponible descontando primera, última y las dos elipsis.
    const inner = maxButtons - 4;
    const half = Math.floor(inner / 2);

    let start = Math.max(1, current - half);
    let end = Math.min(totalPages - 2, start + inner - 1);
    start = Math.max(1, end - inner + 1);

    if (start > 1) {
      pages.push(-1);
    }
    for (let page = start; page <= end; page++) {
      pages.push(page);
    }
    if (end < totalPages - 2) {
      pages.push(-1);
    }
    pages.push(totalPages - 1);

    return pages;
  }
}
