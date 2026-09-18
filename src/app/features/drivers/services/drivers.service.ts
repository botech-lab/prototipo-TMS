import { Injectable, computed, signal } from '@angular/core';
import { FilterTab } from '@models';
import { ALL_CATEGORIES_ID, DRIVERS_MOCK, LICENSE_CATEGORIES } from '../data/drivers.mock';
import { Driver } from '../models/driver.model';

/**
 * ============================================================================
 * SIGNALS STORE - CONDUCTORES
 * ============================================================================
 * Combina dos ejes de filtrado independientes (categoría de licencia y
 * búsqueda por texto) mediante `computed`, sin suscripciones manuales.
 * ============================================================================
 */
@Injectable({ providedIn: 'root' })
export class DriversService {
  private readonly drivers = signal<readonly Driver[]>(DRIVERS_MOCK);

  readonly searchQuery = signal<string>('');

  /** Pestaña activa. `all` muestra el padrón completo. */
  readonly activeCategoryId = signal<string>(ALL_CATEGORIES_ID);

  /** Pestañas con su conteo real, recalculadas ante cualquier cambio del padrón. */
  readonly categoryTabs = computed<readonly FilterTab[]>(() => {
    const drivers = this.drivers();

    return [
      { id: ALL_CATEGORIES_ID, label: 'Todas', count: drivers.length },
      ...LICENSE_CATEGORIES.map(category => ({
        id: category.id,
        label: category.label,
        count: drivers.filter(driver => driver.licenseCategoryId === category.id).length
      }))
    ];
  });

  /** Padrón filtrado por categoría y término de búsqueda. */
  readonly filteredDrivers = computed<readonly Driver[]>(() => {
    const categoryId = this.activeCategoryId();
    const term = this.searchQuery().trim().toLowerCase();

    return this.drivers()
      .filter(driver => categoryId === ALL_CATEGORIES_ID || driver.licenseCategoryId === categoryId)
      .filter(driver =>
        !term ||
        `${driver.fullName} ${driver.documentNumber} ${driver.licenseNumber} ${driver.licenseCategoryLabel}`
          .toLowerCase()
          .includes(term)
      );
  });

  readonly totalCount = computed<number>(() => this.drivers().length);

  /** Alterna ACTIVO/INACTIVO de un conductor (switch de la tarjeta). */
  toggleStatus(id: string): void {
    this.drivers.update(list =>
      list.map(driver =>
        driver.id === id
          ? { ...driver, status: driver.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' }
          : driver
      )
    );
  }

  /** Alta. Se antepone para que aparezca de inmediato. */
  add(driver: Driver): void {
    this.drivers.update(list => [driver, ...list]);
  }

  /** Reemplaza un registro existente (edición). Conserva su posición. */
  update(driver: Driver): void {
    this.drivers.update(list => list.map(current => (current.id === driver.id ? driver : current)));
  }

  remove(id: string): void {
    this.drivers.update(list => list.filter(driver => driver.id !== id));
  }

  /** Posición actual en el padrón completo, o -1. */
  indexOf(id: string): number {
    return this.drivers().findIndex(driver => driver.id === id);
  }

  /** Reinserta un registro eliminado en su posición original (deshacer). */
  restore(driver: Driver, index: number): void {
    this.drivers.update(list => {
      const at = Math.min(Math.max(index, 0), list.length);
      return [...list.slice(0, at), driver, ...list.slice(at)];
    });
  }
}
