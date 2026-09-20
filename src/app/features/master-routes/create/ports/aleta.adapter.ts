import { Injectable, Provider, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MasterRoute } from '../../../../models/route.model';
import { City, Department, FareCategoryType, RouteUsageType, SalesChannel, SeatType, VehicleTypeEntry } from '../../../parametric/models/parametric.model';
import { Vehicle } from '../../../fleet/models/vehicle.model';
import { CATALOGS_PORT, FLEET_PORT, MASTER_ROUTES_PORT } from './wizard-ports';
import type { CatalogsPort, FleetPort, MasterRoutesPort } from './wizard-ports';

/**
 * ============================================================================
 * ADAPTADOR PARA ALETA TMS  —  ESQUELETO A COMPLETAR
 * ============================================================================
 * Esto es lo ÚNICO que hay que escribir para conectar el asistente al sistema
 * real. No se toca el store, ni el motor de reglas, ni los componentes.
 *
 * Cómo activarlo, en el arranque de la app:
 *
 *   bootstrapApplication(App, {
 *     providers: [provideHttpClient(), provideAletaWizard()]
 *   });
 *
 * Qué falta hacer en cada clase:
 *   1. Cargar los catálogos (una vez; se pueden cachear en un signal).
 *   2. Traducir la respuesta de la API al modelo del prototipo (`mapX`).
 *   3. En el alta, recorrer `savePlan(draft)` de `aleta.mapper.ts`, que ya
 *      trae los cuerpos y el orden correcto.
 *
 * Los tipos de respuesta se declaran como `unknown` a propósito: hay que
 * reemplazarlos por los DTO reales cuando se confirmen contra el swagger.
 * ============================================================================
 */

const API = '/api/v1';

@Injectable()
export class AletaCatalogsAdapter implements CatalogsPort {
  private readonly http = inject(HttpClient);

  // TODO: cargar una vez al arrancar (o con httpResource) y cachear.
  private readonly state = signal({
    cities: [] as readonly City[],
    departments: [] as readonly Department[],
    salesChannels: [] as readonly SalesChannel[],
    vehicleTypes: [] as readonly VehicleTypeEntry[],
    routeUsageTypes: [] as readonly RouteUsageType[],
    fareCategoryTypes: [] as readonly FareCategoryType[],
    seatTypes: [] as readonly SeatType[]
  });

  readonly cities = computed(() => this.state().cities);
  readonly departments = computed(() => this.state().departments);
  readonly salesChannels = computed(() => this.state().salesChannels);
  readonly vehicleTypes = computed(() => this.state().vehicleTypes);
  readonly routeUsageTypes = computed(() => this.state().routeUsageTypes);
  readonly fareCategoryTypes = computed(() => this.state().fareCategoryTypes);
  readonly seatTypes = computed(() => this.state().seatTypes);

  /**
   * TODO: llamar a los catálogos de Paramétricas y llenar `state`.
   *   GET {API}/parametric/ciudades
   *   GET {API}/parametric/departamentos
   *   GET {API}/parametric/canales-venta
   *   GET {API}/parametric/tipo-vehiculos
   *   GET {API}/parametric/tipo-uso-rutas
   *   GET {API}/parametric/categoria-tarifas
   *   GET {API}/parametric/tipo-asientos
   *
   * Ojo con dos cosas que el asistente da por hechas:
   *   - `department` va en MAYÚSCULAS ("LA PAZ").
   *   - "Santa Cruz de la Sierra" se muestra como "Santa Cruz".
   */
  async load(): Promise<void> {
    throw new Error('AletaCatalogsAdapter.load() sin implementar');
  }
}

@Injectable()
export class AletaFleetAdapter implements FleetPort {
  private readonly http = inject(HttpClient);

  private readonly state = signal<readonly Vehicle[]>([]);
  readonly vehicles = computed(() => this.state());

  /** TODO: GET {API}/parametric/vehiculos */
  async load(): Promise<void> {
    throw new Error('AletaFleetAdapter.load() sin implementar');
  }

  /**
   * TODO: códigos de tipo de asiento del plano del bus ("STD", "SCM"…).
   * Si Aleta no guarda planos de asientos, devolver [] siempre: el asistente
   * cae solo a los asientos del tipo de vehículo, que es el comportamiento
   * correcto y no rompe nada.
   */
  seatCodesOf(_vehicleId: string): readonly string[] {
    return [];
  }
}

@Injectable()
export class AletaMasterRoutesAdapter implements MasterRoutesPort {
  private readonly http = inject(HttpClient);

  private readonly state = signal<readonly MasterRoute[]>([]);
  readonly routes = computed(() => this.state());

  /** TODO: GET {API}/route-master/rutas-maestras → mapear a MasterRoute. */
  async load(): Promise<void> {
    throw new Error('AletaMasterRoutesAdapter.load() sin implementar');
  }

  /**
   * En Aleta el código lo asigna el servidor al crear la ruta. Este valor es
   * solo para mostrar algo mientras se llena el asistente; al guardar se
   * reemplaza por el que devuelva `POST rutas-maestras`.
   */
  nextCode(): string {
    const numbers = this.routes().map(route => Number(route.code.replace(/\D/g, '')) || 0);
    return `RM-${String(Math.max(0, ...numbers) + 1).padStart(2, '0')}`;
  }

  /**
   * TODO: el alta de verdad. Recorrer `savePlan(draft)` de `aleta.mapper.ts`:
   * ya trae cada endpoint, su cuerpo y qué id del paso anterior necesita.
   *
   *   const plan = savePlan(draft);
   *   let ids: Record<string, string> = {};
   *   for (const step of plan) { ...POST con ids... }
   *
   * Conviene pedir al backend un endpoint que reciba todo junto y lo guarde en
   * una transacción: si falla a mitad, hoy queda media ruta creada.
   *
   * Este método recibe `MasterRoute` (el resumen para la lista) porque es lo
   * que el store publica en el catálogo. Para el alta completa hace falta el
   * borrador entero: ver la nota de `provideAletaWizard()`.
   */
  upsert(_route: MasterRoute): void {
    throw new Error('AletaMasterRoutesAdapter.upsert() sin implementar');
  }
}

/**
 * Registra los tres adaptadores. Al llamarlo, el asistente deja de usar los
 * datos de mentira y habla con /api/v1.
 *
 * NOTA sobre el alta completa: hoy el store llama a `upsert(MasterRoute)`, que
 * es el resumen para la lista, no el borrador entero. Al integrar conviene
 * ampliar `MasterRoutesPort` con:
 *
 *   save(draft: RouteDraft): Promise<{ code: string }>
 *
 * y que el store lo llame en `saveDraft()` y `activate()`. Está marcado así a
 * propósito: es la única decisión de diseño que depende de cómo responda la
 * API real (un endpoint por tabla, o uno que reciba todo junto).
 */
export function provideAletaWizard(): Provider[] {
  return [
    AletaCatalogsAdapter,
    AletaFleetAdapter,
    AletaMasterRoutesAdapter,
    { provide: CATALOGS_PORT, useExisting: AletaCatalogsAdapter },
    { provide: FLEET_PORT, useExisting: AletaFleetAdapter },
    { provide: MASTER_ROUTES_PORT, useExisting: AletaMasterRoutesAdapter }
  ];
}
