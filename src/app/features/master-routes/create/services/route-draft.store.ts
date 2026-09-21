import { Injectable, computed, inject, signal } from '@angular/core';
import { SeatType } from '../../../parametric/models/parametric.model';
import { Vehicle } from '../../../fleet/models/vehicle.model';
import { CATALOGS_PORT, FLEET_PORT, MASTER_ROUTES_PORT } from '../ports/wizard-ports';
import { ROUTE_GRAPH_RULES } from '../../../../core/constants/route-graph-rules';
import { CityOption, DraftBus, DraftCheck, DraftCity, DraftFareCard, DraftStatus, RouteDraft, Weekday } from '../models/route-draft.model';
import { MasterRoute } from '../../../../models/route.model';
import * as Engine from './route-draft-engine';
import { VEHICLE_SEAT_TYPES_MOCK } from '../data/vehicle-seats.mock';

/**
 * ============================================================================
 * STORE DEL ASISTENTE "NUEVA RUTA MAESTRA" (SIGNALS)
 * ============================================================================
 * Guarda el borrador en edición y los borradores guardados (para "Continuar"
 * desde la tarjeta de la ruta). Toda regla vive en `route-draft-engine`;
 * aquí solo se aplica y se publica en el catálogo de Rutas maestras.
 *
 * Integración con Aleta: `saveDraft` / `activate` son los puntos donde
 * llamar a la API (POST rutas-maestras, etapas, mapa, horario, tarjetas,
 * configuración y, por último, el cambio de estado a ACTIVO).
 * ============================================================================
 */
const DISMISSED_KEY = 'rm-wizard.inherits-dismissed';

/** Preferencias del asistente en este navegador; si el almacenamiento no está disponible, se usan los valores por defecto. */
function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento: la preferencia dura solo esta sesión.
  }
}

/** Bus de la flota tal como se ofrece en el asistente. */
export interface BusOption {
  readonly vehicle: Vehicle;
  readonly vehicleTypeId: string;
  readonly vehicleTypeName: string;
  readonly seatTypeIds: readonly string[];
  /** false: el bus no tiene plano de asientos y se asumen los de su tipo. */
  readonly seatsFromPlan: boolean;
  /** Códigos de otras rutas maestras que ya usan este bus. */
  readonly alsoIn: readonly string[];
}

@Injectable({ providedIn: 'root' })
export class RouteDraftStore {
  // Solo contratos: el asistente no sabe de dónde salen los datos.
  private readonly routes = inject(MASTER_ROUTES_PORT);
  private readonly catalogs = inject(CATALOGS_PORT);
  private readonly fleet = inject(FLEET_PORT);

  /** Borradores guardados, por id de ruta. */
  private readonly saved = signal<ReadonlyMap<string, RouteDraft>>(new Map());

  readonly draft = signal<RouteDraft | null>(null);

  /** Preferencia de quien usa el asistente (se recuerda en este navegador). Pasos cuyo recuadro "Lo heredan los servicios" ya se cerró con "Entendido". */
  readonly dismissedInherits = signal<ReadonlySet<string>>(new Set((readPref(DISMISSED_KEY) ?? '').split(',').filter(Boolean)));

  setInheritsDismissed(step: string, dismissed: boolean): void {
    const next = new Set(this.dismissedInherits());
    if (dismissed) next.add(step);
    else next.delete(step);
    this.dismissedInherits.set(next);
    writePref(DISMISSED_KEY, [...next].join(','));
  }

  /** Tramo (camino) que se está editando en Recorrido y Paradas. */
  readonly activePathId = signal<string | null>(null);
  readonly activePath = computed(() => {
    const draft = this.draft();
    return draft ? Engine.pathById(draft, this.activePathId()) : null;
  });

  /**
   * Ruta ya existente con el mismo origen y destino. Si hay una, no se puede
   * crear otra: el camino distinto se agrega como tramo dentro de esa ruta.
   */
  readonly duplicate = computed(() => {
    const draft = this.draft();
    return draft ? Engine.sameEndsRoute(draft, this.routes.routes()) ?? null : null;
  });

  /** Ciudades del catálogo + las ya usadas en rutas maestras, sin repetir, por departamento. */
  readonly cityOptions = computed<CityOption[]>(() => {
    const byName = new Map<string, CityOption>();
    const mapped = ROUTE_GRAPH_RULES.PALETTE.CITY_DEPARTMENT as Record<string, string>;
    for (const [name, department] of Object.entries(mapped)) {
      if (name === 'Tarija Terminal') continue;
      byName.set(name, { name, department });
    }
    for (const city of this.catalogs.cities()) {
      if (city.status !== 'ACTIVO') continue;
      const name = city.name === 'Santa Cruz de la Sierra' ? 'Santa Cruz' : city.name;
      if (!byName.has(name)) byName.set(name, { name, department: city.department.toUpperCase() });
    }
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  });

  /** Capitales de departamento (para marcarlas en la lista de ciudades). */
  readonly capitals = computed<ReadonlySet<string>>(() => {
    const names = this.catalogs.departments().map(dep => (dep.capital === 'Santa Cruz de la Sierra' ? 'Santa Cruz' : dep.capital));
    return new Set(names);
  });

  /** Ciudades que más aparecen en las rutas maestras (sugeridas para origen y destino). */
  readonly popularCities = computed<string[]>(() => {
    const count = new Map<string, number>();
    for (const route of this.routes.routes()) {
      for (const stop of route.stops) {
        const name = stop.name.replace(/\s+Terminal$/i, '').trim();
        count.set(name, (count.get(name) ?? 0) + 1);
      }
    }
    const known = new Set(this.cityOptions().map(option => option.name));
    return [...count]
      .filter(([name]) => known.has(name))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
      .slice(0, 8)
      .map(([name]) => name);
  });

  readonly activeChannels = computed(() => this.catalogs.salesChannels().filter(c => c.status === 'ACTIVO'));
  readonly vehicleTypes = computed(() => this.catalogs.vehicleTypes().filter(t => t.status === 'ACTIVO' && t.description));
  /** Uso de ruta por defecto: "Regular", la línea comercial de todos los días. */
  readonly defaultUsage = computed(() => {
    const usages = this.usageTypes();
    return usages.find(u => u.name === 'Regular') ?? usages.find(u => u.isDefault) ?? usages[0];
  });
  readonly usageTypes = computed(() => this.catalogs.routeUsageTypes().filter(t => t.status === 'ACTIVO' && t.appliesCard));
  /**
   * Para quién es un precio: solo tipos de pasajero. De aletadev se dejan fuera
   * WEB, Agente y Predeterminado (se deciden en "¿Qué precios usa cada canal?")
   * y VIP, Premium y Ejecutivo (se confunden con el tipo de asiento o de bus).
   */
  readonly priceCategories = computed(() => {
    const order = ['Normal', 'Estudiante', 'Niño', 'Tercera edad'];
    return order.map(name => this.fareCategories().find(item => item.name === name)).filter((item): item is NonNullable<typeof item> => !!item);
  });
  /** Categorías que no existen en aletadev (se marcan "★ Nuevo"). */
  readonly newCategoryIds: ReadonlySet<string> = new Set(['fct-nino', 'fct-tercera-edad']);
  readonly fareCategories = computed(() => this.catalogs.fareCategoryTypes().filter(t => t.status === 'ACTIVO'));
  readonly seatTypes = computed(() => this.catalogs.seatTypes().filter(t => t.status === 'ACTIVO'));

  /**
   * Buses de la flota para elegir en "¿Qué buses hacen esta ruta?", agrupables
   * por tipo. Los asientos salen del plano del bus (diseñador de plazas); si el
   * bus aún no tiene plano, se asumen los de su tipo.
   */
  readonly busOptions = computed<BusOption[]>(() => {
    const draft = this.draft();
    const otherRoutes = [...this.saved().values()].filter(route => route.id !== draft?.id);
    return this.fleet.vehicles().map(vehicle => {
      const type = this.catalogs.vehicleTypes().find(item => item.name === vehicle.type);
      const fromPlan = this.planSeatTypes(vehicle);
      const typeId = type?.id ?? '';
      return {
        vehicle,
        vehicleTypeId: typeId,
        vehicleTypeName: type?.name ?? vehicle.type,
        seatTypeIds: fromPlan.length ? fromPlan : (VEHICLE_SEAT_TYPES_MOCK[typeId] ?? []),
        seatsFromPlan: fromPlan.length > 0,
        alsoIn: otherRoutes.filter(route => route.buses.some(bus => bus.vehicleId === vehicle.id)).map(route => route.code)
      };
    });
  });

  /**
   * Asientos que se pueden vender con un tipo de bus: los que tienen los buses
   * de ese tipo elegidos en la ruta (en el orden del catálogo de asientos).
   */
  seatTypesFor(vehicleTypeId: string): SeatType[] {
    const chosen = new Set(this.draft()?.buses.map(bus => bus.vehicleId) ?? []);
    const ids = new Set(
      this.busOptions()
        .filter(option => option.vehicleTypeId === vehicleTypeId && chosen.has(option.vehicle.id))
        .flatMap(option => option.seatTypeIds)
    );
    return this.seatTypes().filter(seat => ids.has(seat.id));
  }

  toggleBus(option: BusOption): void {
    this.update(draft => {
      const has = draft.buses.some(bus => bus.vehicleId === option.vehicle.id);
      const bus: DraftBus = {
        vehicleId: option.vehicle.id,
        plate: option.vehicle.plate,
        vehicleTypeId: option.vehicleTypeId,
        vehicleTypeName: option.vehicleTypeName
      };
      return { ...draft, buses: has ? draft.buses.filter(item => item.vehicleId !== bus.vehicleId) : [...draft.buses, bus] };
    });
    // Las clases de asiento cambiaron: se rearman las listas de precios.
    this.syncFareCards();
  }

  /** Tipos de asiento (ids del catálogo) presentes en el plano guardado del bus. */
  private planSeatTypes(vehicle: Vehicle): string[] {
    const codes = new Set(this.fleet.seatCodesOf(vehicle.id));
    if (!codes.size) return [];
    return this.seatTypes().filter(seat => codes.has(seat.code)).map(seat => seat.id);
  }


  // ==========================================================================
  // PRECIOS POR CLASE DE ASIENTO
  // ==========================================================================
  // Quien pone precios piensa "La Paz → Oruro en semicama cuesta 60", no
  // "la lista del Bus Mixto". Por dentro Aleta necesita una tarjeta por TIPO
  // DE BUS (`rm-tarjetas-tarifa`), así que las tarjetas se arman solas: una por
  // tipo de bus, y el precio de una clase se escribe en todas las que llevan
  // ese asiento. Así el mismo asiento no puede terminar con dos precios según
  // qué bus le toque al pasajero.

  /** Clases de asiento que se venden en la ruta: las de los buses elegidos, sin repetir. */
  readonly routeSeatTypes = computed<SeatType[]>(() => {
    const draft = this.draft();
    if (!draft) return [];
    const ids = new Set(Engine.busTypes(draft).flatMap(type => this.seatTypesFor(type.id).map(seat => seat.id)));
    return this.seatTypes().filter(seat => ids.has(seat.id));
  });

  /** Las tarifas de la ruta, en el orden en que se crearon. */
  readonly tariffs = computed<{ id: string; name: string }[]>(() => {
    const out: { id: string; name: string }[] = [];
    for (const card of this.draft()?.fareCards ?? []) {
      if (out.some(item => item.id === card.tariffId)) continue;
      out.push({ id: card.tariffId, name: tariffName(card) });
    }
    return out;
  });

  /**
   * Deja una lista de precios por tipo de bus para esa tarifa, con los asientos
   * que ese tipo tiene. Quita las de tipos que ya no están en la ruta.
   */
  syncFareCards(tariff?: { id: string; name: string; categoryId?: string }): void {
    const draft = this.draft();
    if (!draft) return;
    const types = Engine.busTypes(draft);
    if (!types.length) return;

    const existing = this.tariffs();
    const objetivo = tariff
      ? [tariff]
      : existing.length
        ? existing.map(item => ({ id: item.id, name: item.name, categoryId: undefined }))
        : [{ id: 'trf-normal', name: 'Normal', categoryId: undefined }];

    this.update(current => {
      let cards = current.fareCards.filter(card => types.some(type => type.id === card.vehicleTypeId));
      for (const item of objetivo) {
        const categoryId = item.categoryId
          ?? cards.find(card => card.tariffId === item.id)?.categoryId
          ?? this.categoryFor(item.name);
        for (const type of types) {
          const seatTypeIds = this.seatTypesFor(type.id).map(seat => seat.id);
          if (!seatTypeIds.length) continue;
          const found = cards.find(card => card.tariffId === item.id && card.vehicleTypeId === type.id);
          if (found) {
            // Los asientos siguen a los buses: si cambia la flota, cambian solos.
            cards = cards.map(card => (card.id === found.id ? { ...card, seatTypeIds, name: `${item.name} · ${type.name}` } : card));
            continue;
          }
          cards = [...cards, {
            id: Engine.localId('card'),
            tariffId: item.id,
            name: `${item.name} · ${type.name}`,
            vehicleTypeId: type.id,
            usageTypeId: current.configuration.usageTypeId ?? this.defaultUsage()?.id ?? '',
            categoryId,
            seatTypeIds,
            // El boleto fijo es de la tarifa: una tarjeta nueva copia el de sus hermanas.
            fixedTicket: cards.find(card => card.tariffId === item.id)?.fixedTicket ?? false,
            prices: {},
            pricesByDay: null
          }];
        }
      }
      return { ...current, fareCards: cards };
    });
  }

  /**
   * Categoría del catálogo que le corresponde a una tarifa por su nombre. Si no
   * se parece a ninguna (p. ej. "Feriados"), va como Normal: en Aleta la
   * categoría es obligatoria y el nombre propio viaja aparte.
   */
  private categoryFor(name: string): string {
    const wanted = name.trim().toLowerCase();
    const match = this.fareCategories().find(item => item.name.toLowerCase() === wanted);
    return match?.id ?? this.fareCategories().find(item => item.name === 'Normal')?.id ?? this.fareCategories()[0]?.id ?? '';
  }

  /** Listas de precios de una tarifa (una por tipo de bus). */
  cardsOfTariff(tariffId: string): DraftFareCard[] {
    return this.draft()?.fareCards.filter(card => card.tariffId === tariffId) ?? [];
  }

  /** Precio de una clase de asiento; todas las listas que la llevan tienen el mismo. */
  classPrice(tariffId: string, tramoKey: string, seatId: string, day: Weekday | null): number | null {
    for (const card of this.cardsOfTariff(tariffId)) {
      if (!card.seatTypeIds.includes(seatId)) continue;
      const grid = day && card.pricesByDay ? card.pricesByDay[day] : card.prices;
      const value = Engine.priceOf(grid, tramoKey, seatId);
      if (value !== null) return value;
    }
    return null;
  }

  // ---- Celdas sugeridas ----------------------------------------------------
  /**
   * Precios que puso una herramienta de llenado y todavía nadie miró.
   *
   * Ninguna herramienta calcula costos: reparten o copian un precio que la
   * persona decidió. El número sale redondo y con cara de calculado, así que
   * conviene que se vea de dónde viene hasta que alguien lo dé por bueno.
   *
   * Vive fuera del borrador a propósito: es cómo se llegó al precio, no el
   * precio, y no se manda a Aleta. Se pierde al recargar la página.
   */
  private readonly suggestedCells = signal<ReadonlySet<string>>(new Set());

  readonly suggestedCount = computed(() => this.suggestedCells().size);

  private cellKey(tariffId: string, tramoKey: string, seatId: string, day: Weekday | null): string {
    return `${tariffId}|${day ?? ''}|${tramoKey}|${seatId}`;
  }

  isSuggested(tariffId: string, tramoKey: string, seatId: string, day: Weekday | null): boolean {
    return this.suggestedCells().has(this.cellKey(tariffId, tramoKey, seatId, day));
  }

  /** Marca como sugeridas las celdas que acaba de escribir una herramienta. */
  markSuggested(cells: readonly { tariffId: string; tramoKey: string; seatId: string; day: Weekday | null }[]): void {
    if (!cells.length) return;
    const next = new Set(this.suggestedCells());
    for (const cell of cells) next.add(this.cellKey(cell.tariffId, cell.tramoKey, cell.seatId, cell.day));
    this.suggestedCells.set(next);
  }

  /** "Los doy por buenos": deja de marcarlos. Sin tarifa, limpia todo. */
  confirmSuggested(tariffId?: string): void {
    if (!tariffId) {
      this.suggestedCells.set(new Set());
      return;
    }
    const next = new Set([...this.suggestedCells()].filter(key => !key.startsWith(`${tariffId}|`)));
    this.suggestedCells.set(next);
  }

  /** Escribe el precio de una clase en todas las listas de esa tarifa que la llevan. */
  setClassPrice(tariffId: string, tramoKey: string, seatId: string, day: Weekday | null, value: number | null): void {
    if (!this.cardsOfTariff(tariffId).length) this.syncFareCards();
    // Escribirlo a mano es mirarlo: deja de ser una sugerencia.
    const key = this.cellKey(tariffId, tramoKey, seatId, day);
    if (this.suggestedCells().has(key)) {
      const next = new Set(this.suggestedCells());
      next.delete(key);
      this.suggestedCells.set(next);
    }
    this.update(draft => ({
      ...draft,
      fareCards: draft.fareCards.map(card => {
        if (card.tariffId !== tariffId || !card.seatTypeIds.includes(seatId)) return card;
        if (day && card.pricesByDay) {
          return { ...card, pricesByDay: { ...card.pricesByDay, [day]: Engine.withPrice(card.pricesByDay[day], tramoKey, seatId, value) } };
        }
        return { ...card, prices: Engine.withPrice(card.prices, tramoKey, seatId, value) };
      })
    }));
  }

  /** Cambia todas las listas de una tarifa de una sola vez. */
  updateTariff(tariffId: string, change: (card: DraftFareCard) => DraftFareCard): void {
    this.update(draft => ({
      ...draft,
      fareCards: draft.fareCards.map(card => (card.tariffId === tariffId ? change(card) : card))
    }));
  }

  renameTariff(tariffId: string, name: string): void {
    this.update(draft => ({
      ...draft,
      fareCards: draft.fareCards.map(card =>
        card.tariffId === tariffId ? { ...card, name: `${name} · ${this.typeName(card.vehicleTypeId)}` } : card
      )
    }));
  }

  private typeName(vehicleTypeId: string): string {
    return this.vehicleTypes().find(type => type.id === vehicleTypeId)?.name ?? '';
  }

  removeTariff(tariffId: string): void {
    this.update(draft => ({ ...draft, fareCards: draft.fareCards.filter(card => card.tariffId !== tariffId) }));
  }

  hasSavedDraft(id: string): boolean {
    return this.saved().has(id);
  }

  /**
   * Lo que falta para poder activar esa ruta, o [] si está lista. Vacío también
   * cuando la ruta no se creó con el asistente: de esas no hay borrador que
   * revisar (en el sistema real esto lo valida el servidor).
   */
  blockingFor(routeId: string): readonly DraftCheck[] {
    const draft = this.saved().get(routeId);
    return draft ? Engine.blockingChecks(draft) : [];
  }

  /**
   * Cambia el estado del borrador guardado para que la lista y el asistente
   * digan lo mismo. Al activar, sus tramos también quedan activos.
   */
  setSavedStatus(routeId: string, status: DraftStatus): void {
    const draft = this.saved().get(routeId);
    if (!draft) return;
    const next: RouteDraft = { ...draft, status, paths: draft.paths.map(path => ({ ...path, status })) };
    this.saved.update(map => new Map(map).set(routeId, next));
    if (this.draft()?.id === routeId) this.draft.set(next);
  }

  /** Empieza un borrador nuevo; `originName` preselecciona el origen ("+ Nueva ruta desde Oruro"). */
  start(originName?: string | null): RouteDraft {
    const code = this.routes.nextCode();
    // Todos los canales activos vienen marcados: el administrador desmarca los
    // que esta ruta no usa, en vez de tener que armar la lista desde cero.
    const defaultChannels = this.activeChannels().map(channel => channel.id);
    let draft = Engine.emptyDraft(`rm-${code.toLowerCase()}`, code, defaultChannels);
    draft = { ...draft, configuration: { ...draft.configuration, usageTypeId: this.defaultUsage()?.id ?? null } };
    const option = originName ? this.findCity(originName) : undefined;
    if (option) draft = Engine.withCities(draft, [Engine.createCity(option)]);
    this.confirmSuggested();
    this.draft.set(draft);
    this.activePathId.set(Engine.mainPath(draft).id);
    return draft;
  }

  /** Retoma un borrador guardado. Devuelve false si no existe. */
  resume(id: string): boolean {
    const found = this.saved().get(id);
    if (!found) return false;
    this.confirmSuggested();
    this.draft.set(found);
    this.activePathId.set(Engine.mainPath(found).id);
    return true;
  }

  /**
   * Abre una ruta existente para agregarle un tramo nuevo (en borrador).
   * Si la ruta se creó con el asistente se retoma tal cual; si viene del
   * catálogo, se arma con sus ciudades (sin paradas ni precios, que en el
   * prototipo no existen para esas rutas).
   */
  openToAddPath(routeId: string): boolean {
    if (!this.resume(routeId)) {
      const route = this.routes.routes().find(item => item.id === routeId);
      if (!route) return false;
      this.draft.set(this.fromCatalog(route));
    }
    this.addPath();
    return true;
  }

  private fromCatalog(route: MasterRoute): RouteDraft {
    const ends = Engine.catalogEnds(route);
    const names = [...route.stops].sort((a, b) => a.order - b.order).map(stop => stop.name.replace(/\s+Terminal$/i, '').trim());
    const middle = [...new Set(names.slice(1, -1))].filter(name => name !== ends?.from && name !== ends?.to);
    const options = [ends?.from, ...middle, ends?.to]
      .map(name => (name ? this.findCity(name) : undefined))
      .filter((option): option is CityOption => !!option);
    const status = route.status === 'ACTIVO' ? 'ACTIVO' : 'BORRADOR';
    const channels = this.activeChannels().map(channel => channel.id);
    let draft = Engine.emptyDraft(route.id, route.code, channels);
    draft = { ...draft, status, configuration: { ...draft.configuration, usageTypeId: this.defaultUsage()?.id ?? null } };
    draft = Engine.withCities(draft, options.map(option => Engine.createCity(option)));
    return { ...draft, paths: draft.paths.map(path => ({ ...path, status })) };
  }

  addPath(): void {
    const draft = this.draft();
    if (!draft) return;
    const result = Engine.addPath(draft);
    this.draft.set(result.draft);
    this.activePathId.set(result.pathId);
  }

  removePath(pathId: string): void {
    this.update(draft => Engine.removePath(draft, pathId));
    const draft = this.draft();
    if (draft && !draft.paths.some(path => path.id === this.activePathId())) this.activePathId.set(Engine.mainPath(draft).id);
  }

  renamePath(pathId: string, name: string): void {
    this.update(draft => Engine.renamePath(draft, pathId, name));
  }

  /** Cambia el origen/destino de todos los tramos. */
  setEnds(from: CityOption | null, to: CityOption | null): void {
    this.update(draft => Engine.withEnds(draft, from, to));
  }

  swapEnds(): void {
    this.update(draft => Engine.swapEnds(draft));
  }

  /** Ciudades del tramo que se está editando. */
  setPathCities(cities: readonly DraftCity[]): void {
    const pathId = this.activePath()?.id;
    if (pathId) this.update(draft => Engine.withPathCities(draft, pathId, cities));
  }

  update(change: (draft: RouteDraft) => RouteDraft): void {
    this.draft.update(current => (current ? change(current) : current));
  }

  /** Reemplaza una ciudad (por id) en el tramo donde esté: paradas, "omitir en web"… */
  patchCity(cityId: string, change: (city: DraftCity) => DraftCity): void {
    this.update(draft => ({
      ...draft,
      paths: draft.paths.map(path => ({ ...path, cities: path.cities.map(city => (city.id === cityId ? change(city) : city)) }))
    }));
  }

  /**
   * Ciudad por nombre exacto. Si llega un departamento ("Beni", desde
   * "+ Nueva ruta desde Beni"), devuelve su capital según el catálogo.
   */
  findCity(name: string): CityOption | undefined {
    const wanted = name.trim().toLowerCase();
    const options = this.cityOptions();
    const exact = options.find(option => option.name.toLowerCase() === wanted);
    if (exact) return exact;
    const department = this.catalogs.departments().find(dep => dep.name.toLowerCase() === wanted);
    const capital = department?.capital === 'Santa Cruz de la Sierra' ? 'Santa Cruz' : department?.capital;
    return options.find(option => option.name === capital) ?? options.find(option => option.department.toLowerCase() === wanted);
  }

  /**
   * Guarda como BORRADOR y lo publica en Rutas maestras. Una ruta ya activa
   * sigue activa: solo sus tramos nuevos quedan en borrador. Si se pidió la ruta
   * de vuelta, la crea también como borrador aparte (una sola vez).
   * Devuelve el código de la vuelta creada, si la hubo.
   */
  saveDraft(): string | null {
    const draft = this.draft();
    if (!draft) return null;
    return this.persist(draft.status === 'ACTIVO' ? draft : { ...draft, status: 'BORRADOR' });
  }

  /** Aprueba y activa. Solo si no queda nada obligatorio pendiente. */
  activate(): { readonly ok: boolean; readonly returnCode: string | null } {
    const draft = this.draft();
    if (!draft || Engine.blockingChecks(draft).length) return { ok: false, returnCode: null };
    const paths = draft.paths.map(path => ({ ...path, status: 'ACTIVO' as const }));
    const returnCode = this.persist({ ...draft, status: 'ACTIVO', paths });
    return { ok: true, returnCode };
  }

  discard(): void {
    this.draft.set(null);
  }

  private persist(draft: RouteDraft): string | null {
    let returnCode: string | null = null;
    let toSave = draft;
    if (draft.createReturn && Engine.mainPath(draft).cities.length >= 2) {
      // La vuelta se crea después de reservar el código de la ida.
      this.routes.upsert(Engine.toMasterRoute(draft));
      const code = this.routes.nextCode();
      const reverse = Engine.reverseDraft(draft, `rm-${code.toLowerCase()}`, code);
      this.store(reverse);
      returnCode = code;
      toSave = { ...draft, createReturn: false };
    }
    this.store(toSave);
    this.draft.set(toSave);
    return returnCode;
  }

  private store(draft: RouteDraft): void {
    this.routes.upsert(Engine.toMasterRoute(draft));
    this.saved.update(map => new Map(map).set(draft.id, draft));
  }
}

/** "Feriados · Bus Cama" → "Feriados". */
function tariffName(card: DraftFareCard): string {
  const parte = card.name.split(' · ')[0]?.trim();
  return parte || 'Normal';
}
