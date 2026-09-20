import { Injectable, computed, signal } from '@angular/core';
import { VEHICLES_MOCK } from '../data/vehicles.mock';
import { Vehicle } from '../models/vehicle.model';

/**
 * ============================================================================
 * SIGNALS STORE - FLOTA DE VEHÍCULOS
 * ============================================================================
 * Estado reactivo del catálogo. Todas las mutaciones son inmutables
 * (`signal.update`), conforme a la Regla 5 de arquitectura.
 * ============================================================================
 */
@Injectable({ providedIn: 'root' })
export class VehiclesService {
  /** Catálogo completo en memoria. */
  private readonly vehicles = signal<readonly Vehicle[]>(VEHICLES_MOCK);

  /** Catálogo completo, sin filtro de búsqueda (lo usa el asistente de rutas maestras). */
  readonly all = this.vehicles.asReadonly();

  /** Término de búsqueda por placa, marca o modelo. */
  readonly searchQuery = signal<string>('');

  /** Resultado filtrado que consume la tabla. */
  readonly filteredVehicles = computed<readonly Vehicle[]>(() => {
    const term = this.searchQuery().trim().toLowerCase();
    if (!term) {
      return this.vehicles();
    }

    return this.vehicles().filter(vehicle =>
      `${vehicle.plate} ${vehicle.brand} ${vehicle.model} ${vehicle.type}`
        .toLowerCase()
        .includes(term)
    );
  });

  readonly totalCount = computed<number>(() => this.vehicles().length);

  readonly activeCount = computed<number>(
    () => this.vehicles().filter(vehicle => vehicle.status === 'ACTIVO').length
  );

  /** Capacidad total de pasajeros de la flota, para indicadores de cabecera. */
  readonly totalPassengerCapacity = computed<number>(
    () => this.vehicles().reduce((sum, vehicle) => sum + vehicle.passengerCapacity, 0)
  );

  /** Alterna ACTIVO/INACTIVO de una unidad (switch de la tarjeta). */
  toggleStatus(id: string): void {
    this.vehicles.update(list =>
      list.map(vehicle =>
        vehicle.id === id
          ? { ...vehicle, status: vehicle.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' }
          : vehicle
      )
    );
  }

  /** Alta de una unidad. Se antepone para que aparezca de inmediato. */
  add(vehicle: Vehicle): void {
    this.vehicles.update(list => [vehicle, ...list]);
  }

  /** Reemplaza una unidad existente (edición de datos). Conserva su posición. */
  update(vehicle: Vehicle): void {
    this.vehicles.update(list => list.map(current => (current.id === vehicle.id ? vehicle : current)));
  }

  /** Unidad por identificador, o `null` si no existe. */
  byId(id: string): Vehicle | null {
    return this.vehicles().find(vehicle => vehicle.id === id) ?? null;
  }

  remove(id: string): void {
    this.vehicles.update(list => list.filter(vehicle => vehicle.id !== id));
  }

  /** Posición actual de una unidad en el catálogo, o -1. */
  indexOf(id: string): number {
    return this.vehicles().findIndex(vehicle => vehicle.id === id);
  }

  /** Reinserta una unidad eliminada en su posición original (deshacer). */
  restore(vehicle: Vehicle, index: number): void {
    this.vehicles.update(list => {
      const at = Math.min(Math.max(index, 0), list.length);
      return [...list.slice(0, at), vehicle, ...list.slice(at)];
    });
  }
}
