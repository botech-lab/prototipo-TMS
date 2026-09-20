import { InjectionToken, Signal, inject } from '@angular/core';
import { MockCatalogsAdapter, MockFleetAdapter, MockMasterRoutesAdapter } from './mock.adapters';
import { City, Department, FareCategoryType, RouteUsageType, SalesChannel, SeatType, VehicleTypeEntry } from '../../../parametric/models/parametric.model';
import { Vehicle } from '../../../fleet/models/vehicle.model';
import { MasterRoute } from '../../../../models/route.model';

/**
 * ============================================================================
 * PUERTOS DEL ASISTENTE DE RUTA MAESTRA
 * ============================================================================
 * Esto es TODO lo que el asistente necesita del mundo exterior. El store no
 * conoce servicios concretos: solo estos tres contratos.
 *
 * Para conectar el asistente a Aleta TMS no se toca ni el store ni la lógica:
 * se escribe un adaptador que cumpla estos contratos y se registra en su token.
 * Hay dos adaptadores:
 *
 *   ports/mock.adapters.ts   datos de mentira (el prototipo tal como se ve hoy)
 *   ports/aleta.adapter.ts   esqueleto contra /api/v1/... (para completar)
 *
 * Todo lo que se lee son SIGNALS: el asistente se recalcula solo cuando los
 * datos cambian. Un adaptador HTTP puede exponer `httpResource`, `toSignal` de
 * un observable o un `signal` que se llena al cargar; al asistente le da igual.
 * ============================================================================
 */

/** Catálogos de Paramétricas que el asistente lee (nunca escribe). */
export interface CatalogsPort {
  readonly cities: Signal<readonly City[]>;
  readonly departments: Signal<readonly Department[]>;
  readonly salesChannels: Signal<readonly SalesChannel[]>;
  readonly vehicleTypes: Signal<readonly VehicleTypeEntry[]>;
  readonly routeUsageTypes: Signal<readonly RouteUsageType[]>;
  readonly fareCategoryTypes: Signal<readonly FareCategoryType[]>;
  readonly seatTypes: Signal<readonly SeatType[]>;
}

/** La flota: qué buses hay y qué asientos tiene cada uno. */
export interface FleetPort {
  readonly vehicles: Signal<readonly Vehicle[]>;
  /**
   * Códigos de tipo de asiento presentes en el plano guardado del bus
   * ("STD", "SCM"…). Vacío si el bus todavía no tiene plano: entonces el
   * asistente asume los asientos de su tipo de vehículo.
   */
  seatCodesOf(vehicleId: string): readonly string[];
}

/** El catálogo de rutas maestras: leer las que existen y guardar la nueva. */
export interface MasterRoutesPort {
  readonly routes: Signal<readonly MasterRoute[]>;
  /** Siguiente código libre ("RM-11"). En Aleta lo da el servidor al crear. */
  nextCode(): string;
  /** Alta o actualización de la ruta en el catálogo. */
  upsert(route: MasterRoute): void;
}

/**
 * Tokens. Cada uno trae de fábrica el adaptador de mentira, así el prototipo
 * y las pruebas funcionan sin configurar nada. Para usar Aleta se sobrescribe
 * en el arranque de la app:
 *
 *   bootstrapApplication(App, {
 *     providers: [provideAletaWizard()]   // ver ports/aleta.adapter.ts
 *   });
 */
export const CATALOGS_PORT = new InjectionToken<CatalogsPort>('CatalogsPort', {
  providedIn: 'root',
  factory: () => inject(MockCatalogsAdapter)
});

export const FLEET_PORT = new InjectionToken<FleetPort>('FleetPort', {
  providedIn: 'root',
  factory: () => inject(MockFleetAdapter)
});

export const MASTER_ROUTES_PORT = new InjectionToken<MasterRoutesPort>('MasterRoutesPort', {
  providedIn: 'root',
  factory: () => inject(MockMasterRoutesAdapter)
});
