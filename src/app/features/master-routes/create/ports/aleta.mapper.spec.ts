import { DraftFareCard, RouteDraft } from '../models/route-draft.model';
import * as Engine from '../services/route-draft-engine';
import * as Mapper from './aleta.mapper';

/** La Paz → El Alto → Oruro, con kilómetros y tiempos cargados. */
function sampleDraft(): RouteDraft {
  let draft = Engine.emptyDraft('rm-t', 'RM-T', ['chn-web']);
  draft = Engine.withCities(draft, [
    Engine.createCity({ name: 'La Paz', department: 'LA PAZ' }),
    Engine.createCity({ name: 'El Alto', department: 'LA PAZ' }),
    Engine.createCity({ name: 'Oruro', department: 'ORURO' })
  ]);
  const legs = [
    { km: null, min: null, wait: 20 },
    { km: 15, min: 40, wait: 10 },
    { km: 215, min: 180, wait: 0 }
  ];
  const main = Engine.mainPath(draft);
  return Engine.withPathCities(
    draft,
    main.id,
    main.cities.map((city, i) => ({
      ...city,
      stops: city.stops.map(stop => ({ ...stop, distanceKm: legs[i].km, travelMinutes: legs[i].min, waitMinutes: legs[i].wait }))
    }))
  );
}

const CARD: DraftFareCard = {
  id: 'card-1',
  tariffId: 'trf-normal',
  fixedTicket: false,
  name: 'Tarifa Normal',
  vehicleTypeId: 'vt-bus-semicama',
  usageTypeId: 'rut-regular',
  categoryId: 'fct-normal',
  seatTypeIds: ['seat-sem'],
  prices: { 'La Paz>Oruro': { 'seat-sem': 40 }, 'La Paz>El Alto': { 'seat-sem': null } },
  pricesByDay: null
};

describe('AletaMapper', () => {
  it('manda las etapas con tiempos relativos, no con horas', () => {
    const draft = sampleDraft();
    const path = Engine.mainPath(draft);
    const rows = Mapper.etapasBody(draft, path, 'ruta-1', 'mapa-1') as Record<string, unknown>[];

    expect(rows.length).toBe(3);
    expect(rows[0]['orden']).toBe(1);
    expect(rows[1]['minutosViaje']).toBe(40);
    expect(rows[1]['distanciaKm']).toBe(15);
    expect(rows[1]['minutosEspera']).toBe(10);
    // Cada etapa cuelga del mapa (tramo), que es lo que hoy le falta a Aleta.
    expect(rows.every(row => row['idMapaRuta'] === 'mapa-1')).toBeTrue();
    expect(rows.some(row => 'horaLlegada' in row)).toBeFalse();
  });

  it('no repite una ciudad que está en dos tramos', () => {
    let draft = sampleDraft();
    const added = Engine.addPath(draft);
    draft = Engine.withPathCities(added.draft, added.pathId, [
      Engine.createCity({ name: 'La Paz', department: 'LA PAZ' }),
      Engine.createCity({ name: 'Patacamaya', department: 'LA PAZ' }),
      Engine.createCity({ name: 'Oruro', department: 'ORURO' })
    ]);
    const names = (Mapper.ciudadesBody(draft, 'ruta-1') as Record<string, unknown>[]).length;

    // La Paz y Oruro están en los dos tramos: 4 ciudades distintas, no 6.
    expect(names).toBe(4);
  });

  it('manda un precio por viaje y asiento, y omite los vacíos', () => {
    const draft = { ...sampleDraft(), fareCards: [CARD] };
    const rows = Mapper.tarifaDetallesBody(draft, CARD, 'tarjeta-1') as Record<string, unknown>[];

    expect(rows.length).toBe(1);
    expect(rows[0]).toEqual(jasmine.objectContaining({ ciudadOrigen: 'La Paz', ciudadDestino: 'Oruro', precio: 40, dia: null }));
  });

  it('guarda en orden: la ruta antes que sus ciudades, tramos y etapas', () => {
    const plan = Mapper.savePlan(sampleDraft());
    const order = plan.map(step => step.endpoint);

    expect(order[0]).toBe('rutas-maestras');
    expect(order.indexOf('rm-ciudades')).toBeLessThan(order.indexOf('rm-mapas-ruta'));
    expect(order.indexOf('rm-mapas-ruta')).toBeLessThan(order.indexOf('rm-etapas'));
    expect(order.indexOf('rm-horarios')).toBeLessThan(order.indexOf('rm-horario-canales'));
  });

  it('solo pide activar la ruta cuando el borrador ya está activo', () => {
    const draft = sampleDraft();
    const activar = (d: RouteDraft) => Mapper.savePlan(d).some(step => step.method === 'PATCH');

    expect(activar(draft)).toBeFalse();
    expect(activar({ ...draft, status: 'ACTIVO' })).toBeTrue();
  });
});
