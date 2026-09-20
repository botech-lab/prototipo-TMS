import { MasterRoute } from '../../../../models/route.model';
import {
  CheckLevel,
  CityOption,
  DraftChannelCards,
  DraftCheck,
  DraftCity,
  DraftConfiguration,
  DraftFareCard,
  DraftPath,
  DraftSchedule,
  DraftStop,
  DraftTramo,
  PriceGrid,
  RouteDraft,
  TimedStop,
  Weekday,
  WEEKDAYS,
  WizardStepKey
} from '../models/route-draft.model';

/**
 * ============================================================================
 * MOTOR DEL BORRADOR DE RUTA MAESTRA (FUNCIONES PURAS)
 * ============================================================================
 * Toda la lógica del asistente vive aquí, sin Angular: armar el recorrido,
 * generar tramos, calcular tiempos acumulados, validar antes de activar y
 * crear la ruta de vuelta. Los componentes solo muestran y llaman a esto.
 * Para integrar con el backend de Aleta basta con mapear `RouteDraft` a sus
 * endpoints (rutas-maestras, etapas, mapas, horarios, tarjetas, configuraciones).
 * ============================================================================
 */

let sequence = 0;
/** Id local para elementos nuevos del borrador (el backend asignará los reales). */
export function localId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence}`;
}

export const ALL_DAYS: readonly Weekday[] = WEEKDAYS.map(day => day.key);

export function createStop(name: string, isMain = false): DraftStop {
  return {
    id: localId('stp'),
    name,
    distanceKm: null,
    travelMinutes: null,
    waitMinutes: 0,
    address: '',
    reference: '',
    mapUrl: '',
    contactName: '',
    contactPhone: '',
    pin: '',
    isMain,
    isDepartmentMain: false,
    isMainArrival: false,
    apiAccessible: false,
    active: true
  };
}

/** Ciudad nueva con su etapa principal ("Terminal <ciudad>") ya creada. */
export function createCity(option: CityOption): DraftCity {
  return {
    id: localId('cty'),
    name: option.name,
    department: option.department,
    hiddenOnWeb: false,
    stops: [createStop(`Terminal ${option.name}`, true)]
  };
}

export function defaultSchedule(channelIds: readonly string[]): DraftSchedule {
  return {
    name: '',
    description: '',
    days: [...ALL_DAYS],
    alternateDays: false,
    reservations: true,
    reservationDaysAhead: 30,
    allowCancellation: true,
    allowDiscount: false,
    showDiscountToCustomer: false,
    phoneLock: false,
    channelIds: [...channelIds]
  };
}

export function defaultConfiguration(): DraftConfiguration {
  return {
    name: '',
    description: '',
    channelCards: {},
    usageTypeId: null,
    fixedTicket: false,
    active: true,
    omissions: []
  };
}

export function emptyDraft(id: string, code: string, defaultChannelIds: readonly string[]): RouteDraft {
  return {
    id,
    code,
    status: 'BORRADOR',
    customName: '',
    description: '',
    paths: [createPath('Tramo principal', 'BORRADOR')],
    createReturn: false,
    reverseOf: null,
    tramos: [],
    schedule: defaultSchedule(defaultChannelIds),
    buses: [],
    fareCards: [],
    configuration: defaultConfiguration()
  };
}

// ============================================================================
// RECORRIDO Y TRAMOS (CAMINOS)
// ============================================================================

export function createPath(name: string, status: RouteDraft['status'], cities: readonly DraftCity[] = []): DraftPath {
  return { id: localId('pth'), name, status, cities };
}

/** Tramo principal: el primero. Define el orden de origen y destino que ven todos. */
export function mainPath(draft: RouteDraft): DraftPath {
  return draft.paths[0];
}

export function pathById(draft: RouteDraft, id: string | null | undefined): DraftPath {
  return draft.paths.find(path => path.id === id) ?? mainPath(draft);
}

export function origin(draft: RouteDraft): DraftCity | null {
  const cities = mainPath(draft).cities;
  return cities.length ? cities[0] : null;
}

export function destination(draft: RouteDraft): DraftCity | null {
  const cities = mainPath(draft).cities;
  return cities.length > 1 ? cities[cities.length - 1] : null;
}

export function intermediates(path: DraftPath): readonly DraftCity[] {
  return path.cities.slice(1, -1);
}

/** Ciudades intermedias de todos los tramos, sin repetir (por nombre). */
export function allIntermediates(draft: RouteDraft): DraftCity[] {
  const seen = new Map<string, DraftCity>();
  for (const path of draft.paths) {
    for (const city of intermediates(path)) {
      if (!seen.has(city.name)) seen.set(city.name, city);
    }
  }
  return [...seen.values()];
}

/** "vía Oruro, Potosí" o "directo" si no tiene ciudades intermedias. */
export function pathVia(path: DraftPath): string {
  const middle = intermediates(path).map(city => city.name);
  return middle.length ? `vía ${middle.join(', ')}` : 'directo, sin ciudades intermedias';
}

/** Nombre automático "La Paz – Santa Cruz" (el mismo criterio que Aleta). */
export function autoName(draft: RouteDraft): string {
  const from = origin(draft)?.name;
  const to = destination(draft)?.name;
  if (!from) return 'Nueva ruta maestra';
  return to ? `${from} – ${to}` : from;
}

export function routeName(draft: RouteDraft): string {
  return draft.customName.trim() || autoName(draft);
}

/** Copia de una ciudad con ids nuevos (para otro tramo). */
function cloneCity(city: DraftCity): DraftCity {
  return { ...city, id: localId('cty'), stops: city.stops.map(stop => ({ ...stop, id: localId('stp') })) };
}

/**
 * Deja el borrador coherente después de cualquier cambio de tramos: regenera
 * los viajes (conservando lo ya configurado) y limpia omisiones que ya no existen.
 */
function withPaths(draft: RouteDraft, paths: readonly DraftPath[]): RouteDraft {
  const tramos = syncTramos(paths, draft.tramos);
  const tramoKeys = new Set(tramos.map(tramo => tramo.key));
  const cityNames = new Set(paths.flatMap(path => path.cities.map(city => city.name)));
  const omissions = draft.configuration.omissions.filter(omission =>
    omission.kind === 'CITY' ? cityNames.has(omission.ref) : tramoKeys.has(omission.ref)
  );
  return { ...draft, paths, tramos, configuration: { ...draft.configuration, omissions } };
}

/** Reemplaza las ciudades de un tramo (intermedias, orden). */
export function withPathCities(draft: RouteDraft, pathId: string, cities: readonly DraftCity[]): RouteDraft {
  return withPaths(draft, draft.paths.map(path => (path.id === pathId ? { ...path, cities } : path)));
}

/** Compatibilidad: ciudades del tramo principal. */
export function withCities(draft: RouteDraft, cities: readonly DraftCity[]): RouteDraft {
  return withPathCities(draft, mainPath(draft).id, cities);
}

/**
 * Cambia el origen o el destino en TODOS los tramos (son compartidos).
 * `null` deja el extremo como está.
 */
export function withEnds(draft: RouteDraft, from: CityOption | null, to: CityOption | null): RouteDraft {
  const paths = draft.paths.map(path => {
    const list = [...path.cities];
    if (from) {
      if (list.length) list[0] = createCity(from);
      else list.push(createCity(from));
    }
    if (to && list.length) {
      if (list.length >= 2) list[list.length - 1] = createCity(to);
      else list.push(createCity(to));
    }
    return { ...path, cities: list };
  });
  return withPaths(draft, paths);
}

/** Invierte origen y destino de todos los tramos. */
export function swapEnds(draft: RouteDraft): RouteDraft {
  return withPaths(draft, draft.paths.map(path => ({ ...path, cities: [...path.cities].reverse() })));
}

/** Nuevo tramo con el mismo origen y destino (copiados con sus paradas), sin intermedias. */
export function addPath(draft: RouteDraft, name?: string): { readonly draft: RouteDraft; readonly pathId: string } {
  const main = mainPath(draft);
  const ends = main.cities.length >= 2 ? [main.cities[0], main.cities[main.cities.length - 1]] : main.cities;
  const path = createPath(name ?? `Tramo ${draft.paths.length + 1}`, 'BORRADOR', ends.map(cloneCity));
  return { draft: withPaths(draft, [...draft.paths, path]), pathId: path.id };
}

/** Quita un tramo. El principal no se puede quitar; en una ruta activa, solo los que están en borrador. */
export function canRemovePath(draft: RouteDraft, pathId: string): boolean {
  const path = draft.paths.find(item => item.id === pathId);
  return !!path && path.id !== mainPath(draft).id && path.status === 'BORRADOR';
}

export function removePath(draft: RouteDraft, pathId: string): RouteDraft {
  if (!canRemovePath(draft, pathId)) return draft;
  return withPaths(draft, draft.paths.filter(path => path.id !== pathId));
}

export function renamePath(draft: RouteDraft, pathId: string, name: string): RouteDraft {
  return { ...draft, paths: draft.paths.map(path => (path.id === pathId ? { ...path, name } : path)) };
}

export function tramoKey(from: string, to: string): string {
  return `${from}>${to}`;
}

/** Todos los pares i < j de cada tramo, sin repetir (Aleta: "Al crear el mapa se generan todos los tramos"). */
export function syncTramos(paths: readonly DraftPath[], previous: readonly DraftTramo[]): DraftTramo[] {
  const byKey = new Map(previous.map(tramo => [tramo.key, tramo]));
  const result = new Map<string, DraftTramo>();
  for (const path of paths) {
    const cities = path.cities;
    for (let i = 0; i < cities.length; i++) {
      for (let j = i + 1; j < cities.length; j++) {
        const key = tramoKey(cities[i].name, cities[j].name);
        const current = result.get(key);
        if (current) {
          result.set(key, { ...current, pathIds: [...current.pathIds, path.id] });
          continue;
        }
        const kept = byKey.get(key);
        result.set(key, {
          key,
          from: cities[i].name,
          to: cities[j].name,
          pathIds: [path.id],
          enabled: kept?.enabled ?? true,
          webSale: kept?.webSale ?? true,
          direct: kept?.direct ?? false
        });
      }
    }
  }
  return [...result.values()];
}

/** Primera ciudad con ese nombre en cualquier tramo. */
export function cityByName(draft: RouteDraft, name: string): DraftCity | undefined {
  for (const path of draft.paths) {
    const found = path.cities.find(city => city.name === name);
    if (found) return found;
  }
  return undefined;
}

export function tramoLabel(_draft: RouteDraft, tramo: DraftTramo): string {
  return `${tramo.from} → ${tramo.to}`;
}

export function enabledTramos(draft: RouteDraft): DraftTramo[] {
  return draft.tramos.filter(tramo => tramo.enabled);
}

/** Nombres de los tramos (caminos) en los que existe un viaje, o "" si la ruta tiene uno solo. */
export function tramoPathsLabel(draft: RouteDraft, tramo: DraftTramo): string {
  if (draft.paths.length < 2) return '';
  if (tramo.pathIds.length === draft.paths.length) return 'En todos los tramos';
  return draft.paths.filter(path => tramo.pathIds.includes(path.id)).map(path => path.name).join(' y ');
}

// ============================================================================
// TIEMPOS (RELATIVOS A LA SALIDA DEL SERVICIO)
// ============================================================================

/** Un tramo, o la ruta completa (se usa su tramo principal). */
export type Line = RouteDraft | DraftPath;

function lineCities(line: Line): readonly DraftCity[] {
  return 'paths' in line ? mainPath(line).cities : line.cities;
}

/** Etapas en orden con llegada/salida acumuladas en minutos desde la salida del origen. */
export function timeline(line: Line): TimedStop[] {
  const result: TimedStop[] = [];
  let clock = 0;
  let km = 0;
  const flat = lineCities(line).flatMap(city => city.stops.map(stop => ({ city, stop })));
  flat.forEach(({ city, stop }, index) => {
    const isFirst = index === 0;
    if (!isFirst) {
      clock += stop.travelMinutes ?? 0;
      km += stop.distanceKm ?? 0;
    }
    const arrivalOffset = clock;
    const isLast = index === flat.length - 1;
    // En la primera etapa la espera es el embarque ANTES de la salida: el servicio
    // sale a su hora (offset 0). En las demás, la espera se suma al viaje.
    const departureOffset = isFirst || isLast ? clock : clock + stop.waitMinutes;
    clock = departureOffset;
    result.push({ cityId: city.id, cityName: city.name, stop, arrivalOffset, departureOffset, km, isFirst, isLast });
  });
  return result;
}

export interface RouteTotals {
  readonly km: number;
  readonly minutes: number;
  readonly stops: number;
}

export function totals(line: Line): RouteTotals {
  const entries = timeline(line);
  const last = entries[entries.length - 1];
  return { km: last?.km ?? 0, minutes: last?.arrivalOffset ?? 0, stops: entries.length };
}

/** Punto de referencia de una ciudad en la línea de tiempo: su etapa principal (o la primera). */
function cityAnchor(entries: readonly TimedStop[], cityName: string): TimedStop | undefined {
  const own = entries.filter(entry => entry.cityName === cityName);
  return own.find(entry => entry.stop.isMain) ?? own[0];
}

/** Tramo (camino) con el que se miden km y tiempo de un viaje: el primero donde existe. */
function tramoPath(draft: RouteDraft, tramo: DraftTramo): DraftPath {
  return pathById(draft, tramo.pathIds[0]);
}

export function tramoKm(draft: RouteDraft, tramo: DraftTramo, path = tramoPath(draft, tramo)): number {
  const entries = timeline(path);
  const from = cityAnchor(entries, tramo.from);
  const to = cityAnchor(entries, tramo.to);
  return from && to ? Math.max(0, to.km - from.km) : 0;
}

export function tramoMinutes(draft: RouteDraft, tramo: DraftTramo, path = tramoPath(draft, tramo)): number {
  const entries = timeline(path);
  const from = cityAnchor(entries, tramo.from);
  const to = cityAnchor(entries, tramo.to);
  return from && to ? Math.max(0, to.arrivalOffset - from.departureOffset) : 0;
}

/** "3 h 50 min", "45 min", "0 min". */
export function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Hora de reloj para una salida de ejemplo: "09:50", con "+1" si pasa la medianoche. */
export function clockAt(startMinutes: number, offset: number): { readonly time: string; readonly nextDay: number } {
  const total = startMinutes + offset;
  const nextDay = Math.floor(total / 1440);
  const inDay = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(inDay / 60)).padStart(2, '0');
  const mm = String(inDay % 60).padStart(2, '0');
  return { time: `${hh}:${mm}`, nextDay };
}

// ============================================================================
// TARIFAS
// ============================================================================

export function priceOf(grid: PriceGrid, key: string, seatTypeId: string): number | null {
  return grid[key]?.[seatTypeId] ?? null;
}

export function withPrice(grid: PriceGrid, key: string, seatTypeId: string, value: number | null): PriceGrid {
  return { ...grid, [key]: { ...(grid[key] ?? {}), [seatTypeId]: value } };
}

/**
 * Sugiere precios proporcionales a la distancia a partir del precio del recorrido
 * completo (origen → destino). Redondea a 5 Bs. Solo llena celdas vacías.
 */
export function suggestByDistance(
  draft: RouteDraft,
  grid: PriceGrid,
  seatTypeId: string,
  fullPrice: number
): PriceGrid {
  const full = totals(draft).km;
  if (!full || fullPrice <= 0) return grid;
  let next = grid;
  for (const tramo of enabledTramos(draft)) {
    if (priceOf(next, tramo.key, seatTypeId) != null) continue;
    const km = tramoKm(draft, tramo);
    const raw = (fullPrice * km) / full;
    const rounded = Math.max(5, Math.round(raw / 5) * 5);
    next = withPrice(next, tramo.key, seatTypeId, rounded);
  }
  return next;
}

/** Ajuste masivo de Aleta: incrementar o decrementar por porcentaje o monto fijo. */
export function adjustGrid(
  grid: PriceGrid,
  direction: 'UP' | 'DOWN',
  mode: 'PERCENT' | 'AMOUNT',
  value: number
): PriceGrid {
  if (!value) return grid;
  const sign = direction === 'UP' ? 1 : -1;
  const next: Record<string, Record<string, number | null>> = {};
  for (const [key, row] of Object.entries(grid)) {
    next[key] = {};
    for (const [seat, price] of Object.entries(row)) {
      if (price == null) {
        next[key][seat] = null;
        continue;
      }
      const changed = mode === 'PERCENT' ? price * (1 + (sign * value) / 100) : price + sign * value;
      next[key][seat] = Math.max(0, Math.round(changed * 100) / 100);
    }
  }
  return next;
}

/** Precio de un asiento en "boleto fijo": el de cualquier viaje habilitado que ya lo tenga. */
export function fixedPriceOf(draft: RouteDraft, grid: PriceGrid, seatTypeId: string): number | null {
  for (const tramo of enabledTramos(draft)) {
    const price = priceOf(grid, tramo.key, seatTypeId);
    if (price != null) return price;
  }
  return null;
}

/** Boleto fijo: el mismo precio del asiento en todos los viajes habilitados. */
export function withFixedPrice(draft: RouteDraft, grid: PriceGrid, seatTypeId: string, value: number | null): PriceGrid {
  return enabledTramos(draft).reduce((next, tramo) => withPrice(next, tramo.key, seatTypeId, value), grid);
}

/** Al activar el boleto fijo, cada asiento toma un solo precio (el del viaje completo si existe) en todos los viajes. */
export function applyFixedTicket(draft: RouteDraft): RouteDraft {
  const from = origin(draft)?.name;
  const to = destination(draft)?.name;
  const fullKey = from && to ? tramoKey(from, to) : '';
  const fix = (card: DraftFareCard, grid: PriceGrid): PriceGrid =>
    card.seatTypeIds.reduce((next, seat) => {
      const value = priceOf(grid, fullKey, seat) ?? fixedPriceOf(draft, grid, seat);
      return value == null ? next : withFixedPrice(draft, next, seat, value);
    }, grid);
  return {
    ...draft,
    fareCards: draft.fareCards.map(card => ({
      ...card,
      prices: fix(card, card.prices),
      pricesByDay: card.pricesByDay
        ? (Object.fromEntries(Object.entries(card.pricesByDay).map(([day, grid]) => [day, fix(card, grid)])) as Record<Weekday, PriceGrid>)
        : null
    }))
  };
}

/** Tramos habilitados que no tienen ningún precio en la tarjeta (considera precios por día). */
export function tramosWithoutPrice(draft: RouteDraft, card: DraftFareCard): DraftTramo[] {
  const grids = card.pricesByDay ? Object.values(card.pricesByDay) : [card.prices];
  return enabledTramos(draft).filter(tramo =>
    grids.some(grid => !card.seatTypeIds.some(seat => (priceOf(grid, tramo.key, seat) ?? 0) > 0))
  );
}

export function splitByDay(card: DraftFareCard): DraftFareCard {
  if (card.pricesByDay) return card;
  const pricesByDay = Object.fromEntries(ALL_DAYS.map(day => [day, card.prices])) as Record<Weekday, PriceGrid>;
  return { ...card, pricesByDay };
}

export function mergeDays(card: DraftFareCard): DraftFareCard {
  if (!card.pricesByDay) return card;
  return { ...card, prices: card.pricesByDay.LUN, pricesByDay: null };
}

// ============================================================================
// BUSES Y CONFIGURACIÓN (UNA POR TIPO DE BUS)
// ============================================================================

/** Tipos de vehículo de los buses de la ruta, sin repetir, en el orden en que se eligieron. */
export function busTypes(draft: RouteDraft): { readonly id: string; readonly name: string }[] {
  const seen = new Map<string, string>();
  for (const bus of draft.buses) {
    if (!seen.has(bus.vehicleTypeId)) seen.set(bus.vehicleTypeId, bus.vehicleTypeName);
  }
  return [...seen].map(([id, name]) => ({ id, name }));
}

export function cardsOfType(draft: RouteDraft, vehicleTypeId: string): DraftFareCard[] {
  return draft.fareCards.filter(card => card.vehicleTypeId === vehicleTypeId);
}

export function channelCardsOf(draft: RouteDraft, vehicleTypeId: string): DraftChannelCards {
  return draft.configuration.channelCards[vehicleTypeId] ?? { defaultCardId: null, agentCardId: null, webCardId: null };
}

/** Tarjeta predeterminada de un tipo de bus: la elegida o, si no, la primera de ese tipo. */
export function defaultCard(draft: RouteDraft, vehicleTypeId: string): DraftFareCard | undefined {
  const cards = cardsOfType(draft, vehicleTypeId);
  return cards.find(card => card.id === channelCardsOf(draft, vehicleTypeId).defaultCardId) ?? cards[0];
}

/** Quita una tarjeta de la tarifa por canal de todos los tipos (al eliminarla o cambiarla de tipo). */
export function withoutCardInChannels(configuration: DraftConfiguration, cardId: string): DraftConfiguration {
  const clear = (id: string | null) => (id === cardId ? null : id);
  const channelCards = Object.fromEntries(
    Object.entries(configuration.channelCards).map(([type, cards]) => [
      type,
      { defaultCardId: clear(cards.defaultCardId), agentCardId: clear(cards.agentCardId), webCardId: clear(cards.webCardId) }
    ])
  );
  return { ...configuration, channelCards };
}

// ============================================================================
// VERIFICACIÓN PREVIA A LA ACTIVACIÓN
// ============================================================================

function check(id: string, step: WizardStepKey, level: CheckLevel, label: string, detail = ''): DraftCheck {
  return { id, step, level, label, detail };
}

function list(names: readonly string[], max = 3): string {
  if (names.length <= max) return names.join(', ');
  return `${names.slice(0, max).join(', ')} y ${names.length - max} más`;
}

export function checks(draft: RouteDraft): DraftCheck[] {
  const result: DraftCheck[] = [];
  const from = origin(draft);
  const to = destination(draft);

  // 1 Recorrido
  if (!from || !to) {
    result.push(check('route', 'recorrido', 'missing', 'Origen y destino', 'Elige la ciudad de origen y la de destino.'));
  } else if (from.name === to.name) {
    result.push(check('route', 'recorrido', 'missing', 'Origen y destino', 'El origen y el destino no pueden ser la misma ciudad.'));
  } else {
    result.push(check('route', 'recorrido', 'ok', `Recorrido ${from.name} → ${to.name}`, ''));
  }
  const many = draft.paths.length > 1;
  const prefix = (path: DraftPath) => (many ? `${path.name}: ` : '');
  for (const path of draft.paths) {
    const names = path.cities.map(city => city.name);
    const repeated = names.filter((name, index) => names.indexOf(name) !== index);
    if (repeated.length) {
      result.push(check(`repeated-${path.id}`, 'recorrido', 'missing', `${prefix(path)}Ciudades repetidas`, `${list([...new Set(repeated)])} aparece más de una vez.`));
    }
  }
  if (many) {
    const pathNames = draft.paths.map(path => path.name.trim().toLowerCase());
    if (pathNames.some(name => !name)) {
      result.push(check('path-names', 'recorrido', 'missing', 'Nombre de los tramos', 'Ponle nombre a cada tramo (por ejemplo «Tramo por arriba»).'));
    } else if (new Set(pathNames).size !== pathNames.length) {
      result.push(check('path-names', 'recorrido', 'missing', 'Nombre de los tramos', 'Dos tramos tienen el mismo nombre.'));
    }
    const seen = new Map<string, string>();
    for (const path of draft.paths) {
      const signature = path.cities.map(city => city.name).join('>');
      const twin = seen.get(signature);
      if (twin) {
        result.push(check(`same-${path.id}`, 'recorrido', 'missing', 'Tramos iguales', `${twin} y ${path.name} pasan por las mismas ciudades. Cambia las ciudades de uno o quítalo.`));
      } else {
        seen.set(signature, path.name);
      }
    }
    if (!result.some(item => item.step === 'recorrido' && item.level === 'missing')) {
      result.push(check('paths', 'recorrido', 'ok', `${draft.paths.length} tramos: ${list(draft.paths.map(path => path.name))}`));
    }
  }

  // 2 Paradas y tiempos (por tramo)
  for (const path of mainPath(draft).cities.length >= 2 ? draft.paths : []) {
    const cities = path.cities;
    const id = many ? `-${path.id}` : '';
    const noStops = cities.filter(city => !city.stops.length).map(city => city.name);
    const noMain = cities.filter(city => city.stops.length && !city.stops.some(stop => stop.isMain)).map(city => city.name);
    const unnamed = cities.filter(city => city.stops.some(stop => !stop.name.trim())).map(city => city.name);
    const line = timeline(path).slice(1);
    const noTime = [...new Set(line.filter(entry => !entry.stop.travelMinutes).map(entry => entry.cityName))];
    const noKm = [...new Set(line.filter(entry => !entry.stop.distanceKm).map(entry => entry.cityName))];

    if (noStops.length) {
      result.push(check(`stops${id}`, 'paradas', 'missing', `${prefix(path)}Cada ciudad necesita al menos una parada`, `Sin paradas: ${list(noStops)}.`));
    } else if (unnamed.length) {
      result.push(check(`stops${id}`, 'paradas', 'missing', `${prefix(path)}Paradas sin nombre`, `Revisa las paradas de ${list(unnamed)}.`));
    } else if (noMain.length) {
      result.push(check(`stops${id}`, 'paradas', 'missing', `${prefix(path)}Falta la parada principal`, `Marca la principal en ${list(noMain)}.`));
    } else {
      result.push(check(`stops${id}`, 'paradas', 'ok', `${prefix(path)}${totals(path).stops} paradas definidas`));
    }
    if (noTime.length) {
      result.push(check(`times${id}`, 'paradas', 'missing', `${prefix(path)}Tiempos de viaje`, `Falta cuánto se tarda en llegar a ${list(noTime)}.`));
    } else {
      result.push(check(`times${id}`, 'paradas', 'ok', `${prefix(path)}Viaje completo: ${formatDuration(totals(path).minutes)}`));
    }
    if (noKm.length) {
      result.push(check(`km${id}`, 'paradas', 'warn', `${prefix(path)}Distancias`, `Sin kilómetros en ${list(noKm)}. Sirven para sugerir precios e informes.`));
    }
  }

  // 3 Viajes que se venden
  if (mainPath(draft).cities.length >= 2) {
    const enabled = enabledTramos(draft);
    const main = from && to ? draft.tramos.find(tramo => tramo.key === tramoKey(from.name, to.name)) : undefined;
    if (!enabled.length) {
      result.push(check('tramos', 'tramos', 'missing', 'Viajes que se venden', 'Habilita al menos un viaje para poder crear servicios.'));
    } else {
      result.push(check('tramos', 'tramos', 'ok', `${enabled.length} de ${draft.tramos.length} viajes se venden`));
    }
    if (main && !main.enabled) {
      result.push(check('main-tramo', 'tramos', 'warn', 'Viaje completo deshabilitado', `No se podrá vender ${from?.name} → ${to?.name} de punta a punta.`));
    }
  }

  // 4 Operación y venta
  const schedule = draft.schedule;
  if (!schedule.days.length) {
    result.push(check('days', 'operacion', 'missing', 'Días de operación', 'Marca al menos un día.'));
  } else {
    result.push(check('days', 'operacion', 'ok', `Opera ${daysLabel(schedule.days)}`));
  }
  if (!schedule.channelIds.length) {
    result.push(check('channels', 'operacion', 'missing', 'Canales de venta', 'Habilita al menos un canal para vender pasajes.'));
  } else {
    result.push(check('channels', 'operacion', 'ok', `${schedule.channelIds.length} canales de venta`));
  }
  if (schedule.reservations && !schedule.reservationDaysAhead) {
    result.push(check('reservations', 'operacion', 'missing', 'Reservas', 'Indica con cuántos días de anticipación se puede reservar.'));
  }

  // 5 Buses y tarifas
  const types = busTypes(draft);
  if (!draft.buses.length) {
    result.push(check('buses', 'tarifas', 'missing', 'Buses de la ruta', 'Elige al menos un bus que haga esta ruta.'));
  } else {
    result.push(check('buses', 'tarifas', 'ok', `${draft.buses.length} ${draft.buses.length === 1 ? 'bus' : 'buses'}: ${list(types.map(type => type.name))}`));
  }
  for (const type of types) {
    if (!cardsOfType(draft, type.id).length) {
      result.push(check(`type-${type.id}`, 'tarifas', 'missing', `Precios de ${type.name}`, `Crea los precios para los buses ${type.name}.`));
    }
  }
  for (const card of draft.fareCards) {
    const missing = tramosWithoutPrice(draft, card);
    if (draft.buses.length && !types.some(type => type.id === card.vehicleTypeId)) {
      result.push(check(`card-${card.id}`, 'tarifas', 'missing', card.name, 'Ningún bus de la ruta es de este tipo. Cambia el tipo de bus o elimina estos precios.'));
    } else if (!card.seatTypeIds.length) {
      result.push(check(`card-${card.id}`, 'tarifas', 'missing', card.name, 'Elige al menos un tipo de asiento.'));
    } else if (missing.length) {
      result.push(
        check(`card-${card.id}`, 'tarifas', 'missing', card.name, `Sin precio: ${list(missing.map(tramo => tramoLabel(draft, tramo)))}.`)
      );
    } else {
      result.push(check(`card-${card.id}`, 'tarifas', 'ok', `${card.name}: todos los tramos con precio`));
    }
  }

  // Tarifa por canal: cada canal usa una tarjeta del mismo tipo de bus.
  const config = draft.configuration;
  for (const [typeId, cards] of Object.entries(config.channelCards)) {
    const main = defaultCard(draft, typeId);
    const channels = [
      { label: 'agentes y boletería', id: cards.agentCardId },
      { label: 'web y app', id: cards.webCardId }
    ];
    for (const channel of channels) {
      const card = draft.fareCards.find(item => item.id === channel.id);
      if (main && card && card.vehicleTypeId !== typeId) {
        result.push(
          check(
            `vehicle-${typeId}-${channel.label}`,
            'tarifas',
            'missing',
            'Vehículo distinto por canal',
            `La tarifa de ${channel.label} («${card.name}») es de otro tipo de bus que la predeterminada («${main.name}»).`
          )
        );
      }
    }
  }
  if (config.omissions.length) {
    const orphan = config.omissions.filter(omission => !types.some(type => type.id === omission.vehicleTypeId));
    if (orphan.length) {
      result.push(check('omissions-orphan', 'tarifas', 'warn', 'Paradas omitidas', `${orphan.length} omisión(es) de un tipo de bus que ya no está en la ruta; no se aplicarán.`));
    }
    result.push(check('omissions', 'tarifas', 'warn', 'Paradas omitidas', `${config.omissions.length} ciudad(es) o viaje(s) donde algún tipo de bus no para.`));
  }

  return result;
}

export function blockingChecks(draft: RouteDraft): DraftCheck[] {
  return checks(draft).filter(item => item.level === 'missing');
}

export type StepState = 'done' | 'warn' | 'todo';

export function stepState(draft: RouteDraft, step: WizardStepKey): StepState {
  if (step === 'revision') {
    return blockingChecks(draft).length ? 'todo' : 'done';
  }
  const own = checks(draft).filter(item => item.step === step);
  if (!own.length) return 'todo';
  if (own.some(item => item.level === 'missing')) return 'todo';
  return own.some(item => item.level === 'warn') ? 'warn' : 'done';
}

export function daysLabel(days: readonly Weekday[]): string {
  if (days.length === 7) return 'todos los días';
  const order = WEEKDAYS.filter(day => days.includes(day.key));
  const weekdays: Weekday[] = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE'];
  if (days.length === 5 && weekdays.every(day => days.includes(day))) return 'de lunes a viernes';
  if (days.length === 2 && days.includes('SAB') && days.includes('DOM')) return 'fines de semana';
  return order.map(day => day.short).join(', ');
}

// ============================================================================
// RUTA DE VUELTA ("Creación automática de retorno")
// ============================================================================

/**
 * Copia TODO en sentido inverso: ciudades, etapas (con sus tiempos y distancias
 * reubicados en el tramo correcto), tramos, horario, tarjetas y configuración.
 * Queda como BORRADOR aparte: el usuario la revisa, ajusta y activa.
 */
export function reverseDraft(draft: RouteDraft, id: string, code: string): RouteDraft {
  const paths = draft.paths.map(path => ({ ...reversePath(path), id: localId('pth'), status: 'BORRADOR' as const }));
  const reverseKey = (key: string) => key.split('>').reverse().join('>');

  const tramos = syncTramos(paths, []).map(fresh => {
    const original = draft.tramos.find(tramo => reverseKey(tramo.key) === fresh.key);
    return original ? { ...fresh, enabled: original.enabled, webSale: original.webSale, direct: original.direct } : fresh;
  });

  const remapGrid = (grid: PriceGrid): PriceGrid =>
    Object.fromEntries(Object.entries(grid).map(([key, row]) => [reverseKey(key), row]));

  const cardIds = new Map(draft.fareCards.map(card => [card.id, localId('card')]));
  const fareCards: DraftFareCard[] = draft.fareCards.map(card => ({
    ...card,
    id: cardIds.get(card.id)!,
    prices: remapGrid(card.prices),
    pricesByDay: card.pricesByDay
      ? (Object.fromEntries(Object.entries(card.pricesByDay).map(([day, grid]) => [day, remapGrid(grid)])) as Record<Weekday, PriceGrid>)
      : null
  }));

  const mapCard = (cardId: string | null) => (cardId ? cardIds.get(cardId) ?? null : null);
  const configuration: DraftConfiguration = {
    ...draft.configuration,
    channelCards: Object.fromEntries(
      Object.entries(draft.configuration.channelCards).map(([type, cards]) => [
        type,
        { defaultCardId: mapCard(cards.defaultCardId), agentCardId: mapCard(cards.agentCardId), webCardId: mapCard(cards.webCardId) }
      ])
    ),
    omissions: draft.configuration.omissions.map(omission =>
      omission.kind === 'CITY' ? omission : { ...omission, ref: reverseKey(omission.ref) }
    )
  };

  return {
    ...draft,
    id,
    code,
    status: 'BORRADOR',
    customName: '',
    createReturn: false,
    reverseOf: draft.code,
    paths,
    tramos,
    fareCards,
    configuration
  };
}

/** Un tramo en sentido inverso, con los tiempos y distancias reubicados en la llegada correcta. */
function reversePath(path: DraftPath): DraftPath {
  const cityIds = new Map(path.cities.map(city => [city.id, localId('cty')]));
  const flat = path.cities.flatMap(city => city.stops.map(stop => ({ city, stop })));
  const reversedFlat = [...flat].reverse().map(({ city, stop }, index, all) => {
    // En la vuelta, el tramo que llega a esta etapa es el que salía de ella en la ida.
    const originalIndex = flat.length - 1 - index;
    const leg = index === 0 ? null : flat[originalIndex + 1]?.stop;
    const reversedStop: DraftStop = {
      ...stop,
      id: localId('stp'),
      distanceKm: leg ? leg.distanceKm : null,
      travelMinutes: leg ? leg.travelMinutes : null,
      waitMinutes: index === all.length - 1 ? 0 : stop.waitMinutes
    };
    return { cityId: city.id, stop: reversedStop };
  });
  const cities: DraftCity[] = [...path.cities].reverse().map(city => ({
    ...city,
    id: cityIds.get(city.id)!,
    stops: reversedFlat.filter(entry => entry.cityId === city.id).map(entry => entry.stop)
  }));
  return { ...path, cities };
}

// ============================================================================
// PUENTE CON EL CATÁLOGO DE RUTAS MAESTRAS
// ============================================================================

/** Convierte el borrador en la tarjeta del catálogo (Rutas maestras). */
export function toMasterRoute(draft: RouteDraft): MasterRoute {
  const cities = mainPath(draft).cities;
  return {
    id: draft.id,
    code: draft.code,
    name: draft.customName.trim() || routeName(draft).replace(' – ', ' → '),
    originDepartment: origin(draft)?.department ?? '',
    destinationDepartment: destination(draft)?.department,
    status: draft.status,
    stopsCount: cities.length,
    isExpanded: false,
    stops: cities.map((city, index) => ({
      id: city.id,
      order: index + 1,
      name: city.name,
      isOrigin: index === 0,
      isDestination: index === cities.length - 1
    })),
    derivedServices: [],
    pathNames: draft.paths.length > 1 ? draft.paths.map(path => `${path.name} (${pathVia(path)})`) : undefined
  };
}

/** Origen y destino de una ruta del catálogo, por nombre ("Tarija Terminal" cuenta como Tarija). */
export function catalogEnds(route: MasterRoute): { readonly from: string; readonly to: string } | null {
  const stops = [...route.stops].sort((a, b) => a.order - b.order);
  if (stops.length < 2) return null;
  const clean = (name: string) => name.replace(/\s+Terminal$/i, '').trim();
  return { from: clean(stops[0].name), to: clean(stops[stops.length - 1].name) };
}

/**
 * Ruta del catálogo con el mismo origen y destino (en ese sentido) que el
 * borrador. Una ruta maestra no se puede repetir: los caminos distintos se
 * agregan como tramos dentro de la que ya existe.
 */
export function sameEndsRoute(draft: RouteDraft, routes: readonly MasterRoute[]): MasterRoute | undefined {
  const from = origin(draft)?.name;
  const to = destination(draft)?.name;
  if (!from || !to) return undefined;
  return routes.find(route => {
    if (route.id === draft.id) return false;
    const ends = catalogEnds(route);
    return !!ends && ends.from === from && ends.to === to;
  });
}
