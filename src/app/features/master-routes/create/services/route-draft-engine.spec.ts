import { DraftFareCard, RouteDraft } from '../models/route-draft.model';
import * as Engine from './route-draft-engine';

/** La Paz → El Alto → Oruro con tiempos y distancias cargados. */
function sampleDraft(): RouteDraft {
  let draft = Engine.emptyDraft('rm-t', 'RM-T', ['chn-web']);
  const cities = [
    Engine.createCity({ name: 'La Paz', department: 'LA PAZ' }),
    Engine.createCity({ name: 'El Alto', department: 'LA PAZ' }),
    Engine.createCity({ name: 'Oruro', department: 'ORURO' })
  ];
  draft = Engine.withCities(draft, cities);
  const legs = [
    { km: null, min: null, wait: 20 },
    { km: 15, min: 40, wait: 10 },
    { km: 215, min: 180, wait: 0 }
  ];
  const main = Engine.mainPath(draft);
  const timed = main.cities.map((city, i) => ({
    ...city,
    stops: city.stops.map(stop => ({ ...stop, distanceKm: legs[i].km, travelMinutes: legs[i].min, waitMinutes: legs[i].wait }))
  }));
  return Engine.withPathCities(draft, main.id, timed);
}

function withCard(draft: RouteDraft, prices: Record<string, number>): RouteDraft {
  const card: DraftFareCard = {
    id: 'card-1',
    name: 'Tarifa Normal',
    vehicleTypeId: 'vt-bus-semicama',
    usageTypeId: 'rut-comercial',
    categoryId: 'fct-normal',
    seatTypeIds: ['seat-sem'],
    prices: Object.fromEntries(Object.entries(prices).map(([key, value]) => [key, { 'seat-sem': value }])),
    pricesByDay: null
  };
  return { ...draft, buses: [SEMICAMA_BUS], fareCards: [card] };
}

const SEMICAMA_BUS = { vehicleId: 'veh-non', plate: 'NON', vehicleTypeId: 'vt-bus-semicama', vehicleTypeName: 'Bus Semicama' };
const CAMA_BUS = { vehicleId: 'veh-cama', plate: 'CAM-1', vehicleTypeId: 'vt-bus-cama', vehicleTypeName: 'Bus Cama Completo' };

describe('RouteDraftEngine', () => {
  it('genera todos los tramos i < j del recorrido', () => {
    const draft = sampleDraft();
    expect(draft.tramos.length).toBe(3);
    expect(draft.tramos.map(t => Engine.tramoLabel(draft, t))).toEqual(['La Paz → El Alto', 'La Paz → Oruro', 'El Alto → Oruro']);
  });

  it('conserva la configuración de los tramos que siguen existiendo al cambiar ciudades', () => {
    const draft = sampleDraft();
    const off = { ...draft, tramos: draft.tramos.map((t, i) => (i === 0 ? { ...t, enabled: false } : t)) };
    const reordered = Engine.withCities(off, [...Engine.mainPath(off).cities, Engine.createCity({ name: 'Challapata', department: 'ORURO' })]);
    expect(reordered.tramos.length).toBe(6);
    expect(reordered.tramos[0].enabled).toBeFalse();
  });

  it('calcula tiempos relativos: el embarque del origen no retrasa la salida', () => {
    const line = Engine.timeline(sampleDraft());
    expect(line.map(e => e.arrivalOffset)).toEqual([0, 40, 230]);
    expect(line[0].departureOffset).toBe(0);
    expect(line[1].departureOffset).toBe(50);
    expect(Engine.totals(sampleDraft())).toEqual({ km: 230, minutes: 230, stops: 3 });
  });

  it('convierte a horas reales para una salida de ejemplo, con cambio de día', () => {
    expect(Engine.clockAt(6 * 60, 230)).toEqual({ time: '09:50', nextDay: 0 });
    expect(Engine.clockAt(22 * 60, 230)).toEqual({ time: '01:50', nextDay: 1 });
    expect(Engine.formatDuration(230)).toBe('3 h 50 min');
  });

  it('no deja activar sin tarjeta de tarifa y la activa cuando todo está completo', () => {
    const draft = sampleDraft();
    expect(Engine.blockingChecks(draft).map(c => c.step)).toContain('tarifas');
    const [a, b, c] = draft.tramos.map(t => t.key);
    const complete = withCard(draft, { [a]: 10, [b]: 40, [c]: 35 });
    expect(Engine.blockingChecks(complete)).toEqual([]);
  });

  it('pide buses y una tarjeta por cada tipo de bus de la ruta', () => {
    const draft = sampleDraft();
    const [a, b, c] = draft.tramos.map(t => t.key);
    const base = withCard(draft, { [a]: 10, [b]: 40, [c]: 35 });

    expect(Engine.blockingChecks({ ...base, buses: [] }).map(check => check.id)).toContain('buses');

    const mixed: RouteDraft = { ...base, buses: [SEMICAMA_BUS, CAMA_BUS] };
    expect(Engine.busTypes(mixed).map(type => type.id)).toEqual(['vt-bus-semicama', 'vt-bus-cama']);
    expect(Engine.blockingChecks(mixed).map(check => check.label)).toEqual(['Precios de Bus Cama Completo']);

    const cama: DraftFareCard = { ...base.fareCards[0], id: 'card-2', name: 'Tarifa Normal · Bus Cama', vehicleTypeId: 'vt-bus-cama' };
    expect(Engine.blockingChecks({ ...mixed, fareCards: [...mixed.fareCards, cama] })).toEqual([]);
  });

  it('no deja una tarjeta de un tipo de bus que la ruta no tiene', () => {
    const draft = sampleDraft();
    const [a, b, c] = draft.tramos.map(t => t.key);
    const base = withCard(draft, { [a]: 10, [b]: 40, [c]: 35 });
    const orphan = { ...base, buses: [CAMA_BUS] };
    expect(Engine.blockingChecks(orphan).map(check => check.id)).toContain('card-card-1');
  });

  it('no deja activar si un canal usa una tarifa de otro tipo de bus', () => {
    const draft = sampleDraft();
    const [a, b, c] = draft.tramos.map(t => t.key);
    const base = withCard(draft, { [a]: 10, [b]: 40, [c]: 35 });
    const cama: DraftFareCard = { ...base.fareCards[0], id: 'card-2', name: 'Tarifa Web · Bus Cama', vehicleTypeId: 'vt-bus-cama' };
    const mixed: RouteDraft = {
      ...base,
      buses: [SEMICAMA_BUS, CAMA_BUS],
      fareCards: [...base.fareCards, cama],
      configuration: {
        ...base.configuration,
        channelCards: { 'vt-bus-semicama': { defaultCardId: null, agentCardId: null, webCardId: 'card-2' } }
      }
    };

    const blocking = Engine.blockingChecks(mixed);
    expect(blocking.length).toBe(1);
    expect(blocking[0].step).toBe('tarifas');
    expect(blocking[0].label).toBe('Vehículo distinto por canal');
  });

  it('al quitar una tarjeta la saca de la tarifa por canal', () => {
    const config = Engine.withoutCardInChannels(
      { ...Engine.defaultConfiguration(), channelCards: { t: { defaultCardId: 'x', agentCardId: 'y', webCardId: 'x' } } },
      'x'
    );
    expect(config.channelCards['t']).toEqual({ defaultCardId: null, agentCardId: 'y', webCardId: null });
  });

  it('boleto fijo: un solo precio por asiento para todos los viajes', () => {
    const draft = sampleDraft();
    const [a, b, c] = draft.tramos.map(t => t.key);
    const priced = withCard(draft, { [b]: 40 });
    const fixed = Engine.applyFixedTicket({ ...priced, configuration: { ...priced.configuration, fixedTicket: true } });
    const grid = fixed.fareCards[0].prices;
    expect([a, b, c].map(key => Engine.priceOf(grid, key, 'seat-sem'))).toEqual([40, 40, 40]);
    expect(Engine.fixedPriceOf(fixed, grid, 'seat-sem')).toBe(40);
    expect(Engine.priceOf(Engine.withFixedPrice(fixed, grid, 'seat-sem', 25), c, 'seat-sem')).toBe(25);
  });

  it('avisa si una parada omitida es de un tipo de bus que ya no está en la ruta', () => {
    const draft = sampleDraft();
    const [a, b, c] = draft.tramos.map(t => t.key);
    const base = withCard(draft, { [a]: 10, [b]: 40, [c]: 35 });
    const ok = { ...base, configuration: { ...base.configuration, omissions: [{ kind: 'CITY' as const, ref: 'El Alto', vehicleTypeId: 'vt-bus-semicama' }] } };
    expect(Engine.checks(ok).map(item => item.id)).not.toContain('omissions-orphan');
    const orphan = { ...ok, configuration: { ...ok.configuration, omissions: [{ kind: 'CITY' as const, ref: 'El Alto', vehicleTypeId: 'vt-bus-cama' }] } };
    expect(Engine.checks(orphan).map(item => item.id)).toContain('omissions-orphan');
  });

  it('marca los tramos sin precio', () => {
    const draft = sampleDraft();
    const partial = withCard(draft, { [draft.tramos[1].key]: 40 });
    expect(Engine.tramosWithoutPrice(partial, partial.fareCards[0]).length).toBe(2);
  });

  it('sugiere precios proporcionales a la distancia, redondeados a 5 Bs', () => {
    const draft = sampleDraft();
    const grid = Engine.suggestByDistance(draft, {}, 'seat-sem', 46);
    const [a, b, c] = draft.tramos.map(t => t.key);
    expect(Engine.priceOf(grid, b, 'seat-sem')).toBe(45);
    expect(Engine.priceOf(grid, a, 'seat-sem')).toBe(5);
    expect(Engine.priceOf(grid, c, 'seat-sem')).toBe(45);
  });

  it('la ruta de vuelta copia todo en sentido inverso y queda como borrador', () => {
    const draft = sampleDraft();
    const [a, b, c] = draft.tramos.map(t => t.key);
    const source = { ...withCard(draft, { [a]: 10, [b]: 40, [c]: 35 }), status: 'ACTIVO' as const, createReturn: true };
    const back = Engine.reverseDraft(source, 'rm-v', 'RM-V');

    expect(back.status).toBe('BORRADOR');
    expect(back.reverseOf).toBe('RM-T');
    expect(Engine.mainPath(back).cities.map(city => city.name)).toEqual(['Oruro', 'El Alto', 'La Paz']);
    // Los tiempos se reubican: Oruro → El Alto tarda lo que El Alto → Oruro.
    expect(Engine.timeline(back).map(e => e.arrivalOffset)).toEqual([0, 180, 230]);
    expect(Engine.totals(back).km).toBe(230);
    // El precio de La Paz → Oruro pasa a Oruro → La Paz.
    const full = back.tramos.find(t => Engine.tramoLabel(back, t) === 'Oruro → La Paz')!;
    expect(Engine.priceOf(back.fareCards[0].prices, full.key, 'seat-sem')).toBe(40);
  });

  it('una ruta puede tener varios tramos con distintas ciudades y comparte los viajes por nombre', () => {
    const base = sampleDraft();
    const added = Engine.addPath(base, 'Tramo por abajo');
    const abajo = Engine.pathById(added.draft, added.pathId);
    expect(abajo.cities.map(city => city.name)).toEqual(['La Paz', 'Oruro']);

    const withMiddle = Engine.withPathCities(added.draft, added.pathId, [
      abajo.cities[0],
      Engine.createCity({ name: 'Caracollo', department: 'ORURO' }),
      abajo.cities[1]
    ]);
    const full = withMiddle.tramos.find(t => t.key === 'La Paz>Oruro')!;
    expect(full.pathIds.length).toBe(2);
    expect(withMiddle.tramos.find(t => t.key === 'La Paz>Caracollo')!.pathIds).toEqual([added.pathId]);
    expect(Engine.tramoPathsLabel(withMiddle, full)).toBe('En todos los tramos');
  });

  it('no deja dos tramos iguales ni tramos sin nombre', () => {
    const base = sampleDraft();
    const added = Engine.addPath(base, 'Otro');
    const main = Engine.mainPath(base);
    const twin = Engine.withPathCities(added.draft, added.pathId, main.cities.map(city => ({ ...city, id: city.id + '-b' })));
    expect(Engine.blockingChecks(twin).map(c => c.label)).toContain('Tramos iguales');
    const unnamed = Engine.renamePath(added.draft, added.pathId, ' ');
    expect(Engine.blockingChecks(unnamed).map(c => c.id)).toContain('path-names');
  });

  it('detecta una ruta del catálogo con el mismo origen y destino', () => {
    const draft = sampleDraft();
    const route = { ...Engine.toMasterRoute(draft), id: 'rm-otra', code: 'RM-99' };
    expect(Engine.sameEndsRoute(draft, [route])?.code).toBe('RM-99');
    expect(Engine.sameEndsRoute(draft, [{ ...route, id: draft.id }])).toBeUndefined();
    const reversed = { ...route, stops: [...route.stops].reverse().map((stop, i) => ({ ...stop, order: i + 1 })) };
    expect(Engine.sameEndsRoute(draft, [reversed])).toBeUndefined();
  });

  it('convierte el borrador en tarjeta del catálogo de rutas maestras', () => {
    const route = Engine.toMasterRoute(sampleDraft());
    expect(route.name).toBe('La Paz → Oruro');
    expect(route.originDepartment).toBe('LA PAZ');
    expect(route.stops.map(s => s.name)).toEqual(['La Paz', 'El Alto', 'Oruro']);
    expect(route.status).toBe('BORRADOR');
  });
});
