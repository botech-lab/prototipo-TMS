import { Signal, computed, signal } from '@angular/core';
import { PageInfo, PaginationEngine } from '@components/pagination/pagination-engine';
import { DATA_TABLE_DIMENSIONS } from '@core';
import { CatalogEntry, CatalogStatus } from '../models/parametric.model';

/**
 * ============================================================================
 * STORE REACTIVO GENÉRICO DE CATÁLOGO (`CatalogStore`)
 * ============================================================================
 * Estado compartido por los 16 catálogos paramétricos: búsqueda por texto,
 * paginación y mutaciones inmutables. Se compone -no se hereda- dentro de
 * `ParametricCatalogsService`.
 *
 * INVARIANTE DE PAGINACIÓN: al cambiar el término de búsqueda, la página
 * activa vuelve a la primera. Sin esto, buscar estando en la página 3 de un
 * catálogo que pasa a tener 2 resultados dejaría la tabla vacía sin motivo
 * aparente.
 * ============================================================================
 */
export class CatalogStore<T extends CatalogEntry> {
  private readonly source = signal<readonly T[]>([]);

  /** Término de búsqueda libre. */
  readonly searchQuery = signal<string>('');

  /** Página activa, 0-based. */
  readonly pageIndex = signal<number>(0);

  readonly pageSize: number;

  constructor(
    initial: readonly T[],
    /** Proyección de la entidad al texto sobre el que se busca. */
    private readonly searchableText: (row: T) => string,
    pageSize: number = DATA_TABLE_DIMENSIONS.defaultPageSize
  ) {
    this.source.set(initial);
    this.pageSize = pageSize;
  }

  /** Catálogo completo, sin filtrar. */
  readonly all: Signal<readonly T[]> = computed(() => this.source());

  /** Resultado de aplicar la búsqueda, antes de paginar. */
  readonly filtered: Signal<readonly T[]> = computed(() => {
    const term = this.searchQuery().trim().toLowerCase();
    if (!term) {
      return this.source();
    }
    return this.source().filter(row => this.searchableText(row).toLowerCase().includes(term));
  });

  readonly pageInfo: Signal<PageInfo> = computed(() =>
    PaginationEngine.calculate(this.filtered().length, this.pageIndex(), this.pageSize)
  );

  /** Registros de la página activa: lo que realmente consume la tabla. */
  readonly pageRows: Signal<readonly T[]> = computed(() => {
    const info = this.pageInfo();
    const start = info.pageIndex * info.pageSize;
    return this.filtered().slice(start, start + info.pageSize);
  });

  readonly totalCount = computed<number>(() => this.source().length);

  readonly activeCount = computed<number>(
    () => this.source().filter(row => row.status === 'ACTIVO').length
  );

  /** Actualiza la búsqueda y devuelve la vista a la primera página. */
  setSearch(term: string): void {
    this.searchQuery.set(term);
    this.pageIndex.set(0);
  }

  setPage(pageIndex: number): void {
    this.pageIndex.set(pageIndex);
  }

  /** Alta de un registro. Se antepone para que aparezca de inmediato. */
  add(row: T): void {
    this.source.update(list => [row, ...list]);
  }

  /** Reemplaza un registro existente (edición). Conserva su posición. */
  update(row: T): void {
    this.source.update(list => list.map(current => (current.id === row.id ? row : current)));
  }

  remove(id: string): void {
    this.source.update(list => list.filter(row => row.id !== id));
    this.clampPage();
  }

  /** Posición actual de un registro en el catálogo completo, o -1. */
  indexOf(id: string): number {
    return this.source().findIndex(row => row.id === id);
  }

  /** Reinserta un registro eliminado en su posición original (deshacer). */
  restore(row: T, index: number): void {
    this.source.update(list => {
      const at = Math.min(Math.max(index, 0), list.length);
      return [...list.slice(0, at), row, ...list.slice(at)];
    });
  }

  toggleStatus(id: string): void {
    this.source.update(list =>
      list.map(row =>
        row.id === id
          ? { ...row, status: this.flip(row.status) }
          : row
      )
    );
  }

  private flip(status: CatalogStatus): CatalogStatus {
    return status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
  }

  /** Tras eliminar, la página activa puede quedar fuera de rango. */
  private clampPage(): void {
    const info = PaginationEngine.calculate(
      this.filtered().length,
      this.pageIndex(),
      this.pageSize
    );
    if (info.pageIndex !== this.pageIndex()) {
      this.pageIndex.set(info.pageIndex);
    }
  }
}
