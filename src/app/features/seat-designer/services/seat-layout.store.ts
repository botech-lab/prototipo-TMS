import { Injectable, signal } from '@angular/core';
import { SEAT_LAYOUT_RULES } from '@core';
import { Vehicle } from '../../fleet/models/vehicle.model';
import { VehicleLayout } from '../models/seat-layout.model';
import { SeatLayoutEngine } from './seat-layout-engine';

const STORAGE_KEY = 'pazavi.seat-layouts.v1';

interface History {
  readonly past: readonly VehicleLayout[];
  readonly present: VehicleLayout;
  readonly future: readonly VehicleLayout[];
  /** Último plano guardado, para saber si hay cambios pendientes. */
  readonly saved: VehicleLayout;
}

/**
 * ============================================================================
 * STORE DE PLANOS DE PLAZAS
 * ============================================================================
 * Un historial por vehículo. Como el motor es puro e inmutable, deshacer es
 * mover un puntero entre planos: no hay que "revertir" nada.
 *
 * Persiste en `localStorage` para que un prototipo sobreviva a la recarga.
 * Es la costura de integración: cuando exista backend, `persist()` y
 * `restore()` son los dos únicos puntos que cambian.
 * ============================================================================
 */
@Injectable({ providedIn: 'root' })
export class SeatLayoutStore {
  private readonly histories = signal<ReadonlyMap<string, History>>(this.restore());

  /** Plano actual de un vehículo, creándolo si no existe. */
  layoutFor(vehicle: Vehicle): VehicleLayout {
    const existing = this.histories().get(vehicle.id);
    if (existing) {
      return existing.present;
    }
    const fresh = SeatLayoutEngine.createForVehicle(vehicle);
    this.histories.update(map => {
      const next = new Map(map);
      next.set(vehicle.id, { past: [], present: fresh, future: [], saved: fresh });
      return next;
    });
    return fresh;
  }

  /** Plano actual, o `null` si el vehículo aún no tiene historial. */
  present(vehicleId: string): VehicleLayout | null {
    return this.histories().get(vehicleId)?.present ?? null;
  }

  canUndo(vehicleId: string): boolean {
    return (this.histories().get(vehicleId)?.past.length ?? 0) > 0;
  }

  canRedo(vehicleId: string): boolean {
    return (this.histories().get(vehicleId)?.future.length ?? 0) > 0;
  }

  isDirty(vehicleId: string): boolean {
    const h = this.histories().get(vehicleId);
    return !!h && h.present !== h.saved;
  }

  /** Versiones disponibles para el deslizador: pasado + presente + futuro. */
  historySize(vehicleId: string): number {
    const h = this.histories().get(vehicleId);
    return h ? h.past.length + 1 + h.future.length : 0;
  }

  /** Índice de la versión actual dentro del historial. */
  historyIndex(vehicleId: string): number {
    return this.histories().get(vehicleId)?.past.length ?? 0;
  }

  /**
   * Time Machine: salta a cualquier versión. Como cada plano es inmutable,
   * es solo repartir la lista entre pasado y futuro alrededor del índice.
   */
  jumpTo(vehicleId: string, index: number): void {
    this.histories.update(map => {
      const h = map.get(vehicleId);
      if (!h) return map;
      const all = [...h.past, h.present, ...h.future];
      const target = Math.min(all.length - 1, Math.max(0, Math.floor(index)));
      if (target === h.past.length) return map;
      const copy = new Map(map);
      copy.set(vehicleId, { past: all.slice(0, target), present: all[target], future: all.slice(target + 1), saved: h.saved });
      return copy;
    });
  }

  /** Planos guardados de OTRAS unidades, para clonar. */
  savedLayoutsExcept(vehicleId: string): readonly VehicleLayout[] {
    const out: VehicleLayout[] = [];
    this.histories().forEach((h, id) => { if (id !== vehicleId) out.push(h.saved); });
    return out;
  }

  /** Aplica una transformación pura y la registra en el historial. */
  commit(vehicleId: string, transform: (layout: VehicleLayout) => VehicleLayout): void {
    this.histories.update(map => {
      const h = map.get(vehicleId);
      if (!h) {
        return map;
      }
      const next = transform(h.present);
      // Una transformación sin efecto no ensucia el historial.
      if (next === h.present) {
        return map;
      }
      const past = [...h.past, h.present].slice(-SEAT_LAYOUT_RULES.HISTORY.MAX_STEPS);
      const copy = new Map(map);
      copy.set(vehicleId, { past, present: next, future: [], saved: h.saved });
      return copy;
    });
  }

  undo(vehicleId: string): void {
    this.histories.update(map => {
      const h = map.get(vehicleId);
      if (!h || !h.past.length) {
        return map;
      }
      const previous = h.past[h.past.length - 1];
      const copy = new Map(map);
      copy.set(vehicleId, {
        past: h.past.slice(0, -1),
        present: previous,
        future: [h.present, ...h.future],
        saved: h.saved
      });
      return copy;
    });
  }

  redo(vehicleId: string): void {
    this.histories.update(map => {
      const h = map.get(vehicleId);
      if (!h || !h.future.length) {
        return map;
      }
      const [next, ...rest] = h.future;
      const copy = new Map(map);
      copy.set(vehicleId, {
        past: [...h.past, h.present],
        present: next,
        future: rest,
        saved: h.saved
      });
      return copy;
    });
  }

  /** Marca el plano actual como guardado y lo persiste. */
  save(vehicleId: string): void {
    this.histories.update(map => {
      const h = map.get(vehicleId);
      if (!h) {
        return map;
      }
      const copy = new Map(map);
      copy.set(vehicleId, { ...h, saved: h.present });
      return copy;
    });
    this.persist();
  }

  /** Descarta los cambios no guardados. */
  revert(vehicleId: string): void {
    this.histories.update(map => {
      const h = map.get(vehicleId);
      if (!h) {
        return map;
      }
      const copy = new Map(map);
      copy.set(vehicleId, { past: [], present: h.saved, future: [], saved: h.saved });
      return copy;
    });
  }

  // ---- Costura de integración --------------------------------------------

  private persist(): void {
    try {
      const saved: Record<string, VehicleLayout> = {};
      this.histories().forEach((h, id) => (saved[id] = h.saved));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // Sin almacenamiento disponible: el prototipo sigue funcionando en memoria.
    }
  }

  private restore(): ReadonlyMap<string, History> {
    const map = new Map<string, History>();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return map;
      }
      const parsed = JSON.parse(raw) as Record<string, VehicleLayout>;
      for (const [id, layout] of Object.entries(parsed)) {
        if (layout && Array.isArray(layout.decks)) {
          const migrated = SeatLayoutEngine.migrate(layout);
          map.set(id, { past: [], present: migrated, future: [], saved: migrated });
        }
      }
    } catch {
      // Datos corruptos o sin acceso: se parte de cero.
    }
    return map;
  }
}
