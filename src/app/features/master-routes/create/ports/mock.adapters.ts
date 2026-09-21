import { Injectable, computed, inject } from '@angular/core';
import { ParametricCatalogsService } from '../../../parametric/services/parametric-catalogs.service';
import { VehiclesService } from '../../../fleet/services/vehicles.service';
import { SeatLayoutStore } from '../../../seat-designer/services/seat-layout.store';
import { RoutesService } from '../../../../services/routes.service';
import { VEHICLE_SEAT_CODES_MOCK } from '../data/vehicle-seats.mock';
import { MasterRoute } from '../../../../models/route.model';
import type { CatalogsPort, FleetPort, MasterRoutesPort } from './wizard-ports';

/**
 * ============================================================================
 * ADAPTADORES DE MENTIRA (el prototipo tal como se ve hoy)
 * ============================================================================
 * Cumplen los puertos leyendo los servicios en memoria del prototipo. Son el
 * valor por defecto de los tokens, así que el asistente y las pruebas
 * funcionan sin configurar nada.
 *
 * Al integrar con Aleta se reemplazan por `aleta.adapter.ts`; esto queda como
 * ejemplo vivo de qué debe devolver cada puerto.
 *
 * Nota: `wizard-ports.ts` importa estas clases y este archivo importa solo los
 * TIPOS de allá (`import type`), que se borran al compilar. No hay ciclo.
 * ============================================================================
 */

@Injectable({ providedIn: 'root' })
export class MockCatalogsAdapter implements CatalogsPort {
  private readonly catalogs = inject(ParametricCatalogsService);

  readonly cities = this.catalogs.cities.all;
  readonly departments = this.catalogs.departments.all;
  readonly salesChannels = this.catalogs.salesChannels.all;
  readonly vehicleTypes = this.catalogs.vehicleTypes.all;
  readonly routeUsageTypes = this.catalogs.routeUsageTypes.all;
  readonly fareCategoryTypes = this.catalogs.fareCategoryTypes.all;
  readonly seatTypes = this.catalogs.seatTypes.all;
}

@Injectable({ providedIn: 'root' })
export class MockFleetAdapter implements FleetPort {
  private readonly fleet = inject(VehiclesService);
  private readonly layouts = inject(SeatLayoutStore);

  readonly vehicles = this.fleet.all;

  seatCodesOf(vehicleId: string): readonly string[] {
    const layout = this.layouts.present(vehicleId);
    // Sin plano dibujado, los asientos de prueba de ese bus; si tampoco hay,
    // el asistente cae a los del tipo de vehículo.
    if (!layout) return VEHICLE_SEAT_CODES_MOCK[vehicleId] ?? [];
    const codes = new Set<string>();
    for (const deck of layout.decks) {
      for (const row of deck.cells) {
        for (const cell of row) {
          if (cell.kind === 'seat') codes.add(cell.seatType);
        }
      }
    }
    return [...codes];
  }
}

@Injectable({ providedIn: 'root' })
export class MockMasterRoutesAdapter implements MasterRoutesPort {
  private readonly service = inject(RoutesService);

  /** Se lee del signal de grupos, así el asistente reacciona a lo que se guarda. */
  readonly routes = computed<readonly MasterRoute[]>(() => this.service.departmentGroups().flatMap(group => group.routes));

  nextCode(): string {
    return this.service.nextCode();
  }

  upsert(route: MasterRoute): void {
    this.service.upsertRoute(route);
  }
}
