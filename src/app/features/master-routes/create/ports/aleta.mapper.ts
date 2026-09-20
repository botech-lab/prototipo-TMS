import { DraftCity, DraftFareCard, DraftPath, RouteDraft, Weekday } from '../models/route-draft.model';
import * as Engine from '../services/route-draft-engine';

/**
 * ============================================================================
 * TRADUCCIÓN: BORRADOR DEL ASISTENTE → API DE ALETA TMS
 * ============================================================================
 * Este archivo responde a una sola pregunta: **¿este campo a dónde va?**
 * Cada función arma el cuerpo de un endpoint de /api/v1/route-master/.
 *
 * ⚠️ SOBRE LOS NOMBRES DE CAMPO
 * Confirmados leyendo las respuestas de aletadev: `esTramoDirecto`,
 * `idTipoVehiculo`, `idRutaMaestra`, `idMapaRuta`. El resto son PROPUESTAS con
 * el estilo camelCase que usa la API; hay que confirmarlos contra el swagger o
 * una respuesta real antes de usarlos. Están marcados con `// confirmar`.
 * Lo que importa aquí no es el nombre exacto, es **qué dato va en qué
 * endpoint y en qué orden**: eso sí está verificado contra el prototipo.
 *
 * CAMPOS QUE HOY NO EXISTEN EN ALETA (ver docs/INTEGRACION-ALETA.md §4):
 *   - `rm-vehiculos`            tabla nueva: qué buses hacen la ruta
 *   - `rm-etapas.idMapaRuta`    para tener tiempos distintos por tramo
 *   - `servicios.idMapaRuta`    por qué tramo va el servicio
 *   - `rm-mapas-ruta.estado`    un tramo nuevo nace en BORRADOR
 * Van marcados con `// ★ nuevo`.
 * ============================================================================
 */

/** Un paso del guardado: a qué endpoint va, con qué cuerpo y de qué depende. */
export interface SaveStep {
  readonly endpoint: string;
  readonly method: 'POST' | 'PATCH';
  /** Qué id del paso anterior hace falta para poder llamar a este. */
  readonly needs: readonly string[];
  readonly label: string;
  readonly body: unknown;
}

const DAY_NUMBER: Readonly<Record<Weekday, number>> = { LUN: 1, MAR: 2, MIE: 3, JUE: 4, VIE: 5, SAB: 6, DOM: 7 };

// ---------------------------------------------------------------------------
// 1. La ruta
// ---------------------------------------------------------------------------

export function rutaMaestraBody(draft: RouteDraft) {
  const cities = Engine.mainPath(draft).cities;
  return {
    codigo: draft.code, // confirmar
    nombre: draft.customName.trim() || `${cities[0]?.name ?? ''} – ${cities.at(-1)?.name ?? ''}`, // confirmar
    descripcion: draft.description, // confirmar
    estado: draft.status, // BORRADOR | ACTIVO — confirmar
    /** "Es reversión de": código de la ruta de ida cuando esta es la vuelta. */
    esReversionDe: draft.reverseOf // confirmar
  };
}

// ---------------------------------------------------------------------------
// 2. Ciudades del recorrido (rm-ciudades)
// ---------------------------------------------------------------------------

/**
 * Una fila por ciudad, en orden. Las ciudades son de la RUTA, no del tramo:
 * si dos tramos pasan por la misma ciudad, va una sola vez.
 */
export function ciudadesBody(draft: RouteDraft, idRutaMaestra: string) {
  const seen = new Map<string, DraftCity>();
  for (const path of draft.paths) {
    for (const city of path.cities) if (!seen.has(city.name)) seen.set(city.name, city);
  }
  return [...seen.values()].map((city, index) => ({
    idRutaMaestra,
    idCiudad: city.id, // el id del catálogo de ciudades — confirmar
    orden: index + 1, // confirmar
    /** "Omitir en web": la ciudad no se ofrece como origen ni destino en la venta web. */
    omitirEnWeb: city.hiddenOnWeb // confirmar
  }));
}

// ---------------------------------------------------------------------------
// 3. Tramos = mapas de ruta (rm-mapas-ruta) y sus etapas (rm-etapas)
// ---------------------------------------------------------------------------

export function mapaRutaBody(draft: RouteDraft, path: DraftPath, idRutaMaestra: string) {
  return {
    idRutaMaestra,
    nombre: path.name, // "Tramo por arriba"
    descripcion: Engine.pathVia(path), // "vía Oruro, Potosí" — confirmar
    estado: path.status // ★ nuevo: un tramo agregado a una ruta activa nace en BORRADOR
  };
}

/**
 * Etapas (paradas físicas) de UN tramo, en orden, con tiempos RELATIVOS:
 * `minutosViaje` se mide desde la etapa anterior y `minutosEspera` es la
 * parada en esta etapa. La hora real la pone el servicio al crearse.
 *
 * ★ nuevo: hoy `rm-etapas` cuelga de la ruta, así que dos tramos no pueden
 * tener tiempos distintos. Con `idMapaRuta` cada tramo tiene los suyos.
 */
export function etapasBody(draft: RouteDraft, path: DraftPath, idRutaMaestra: string, idMapaRuta: string) {
  return Engine.timeline(path).map((timed, index) => ({
    idRutaMaestra,
    idMapaRuta, // ★ nuevo
    idCiudad: timed.cityId, // confirmar
    orden: index + 1, // confirmar
    nombre: timed.stop.name, // "Terminal Bimodal"
    distanciaKm: timed.stop.distanceKm, // desde la etapa anterior — confirmar
    minutosViaje: timed.stop.travelMinutes, // confirmar
    minutosEspera: timed.stop.waitMinutes, // confirmar
    direccion: timed.stop.address,
    referencia: timed.stop.reference,
    urlMapa: timed.stop.mapUrl,
    contactoNombre: timed.stop.contactName,
    contactoTelefono: timed.stop.contactPhone,
    esPrincipal: timed.stop.isMain, // la parada que ven los pasajeros al comprar
    esPrincipalDepartamento: timed.stop.isDepartmentMain,
    esPrincipalLlegada: timed.stop.isMainArrival,
    accesibleApi: timed.stop.apiAccessible,
    activo: timed.stop.active
  }));
}

// ---------------------------------------------------------------------------
// 4. Viajes que se venden (rm-mapa-pares-ciudad)
// ---------------------------------------------------------------------------

/**
 * Un par por viaje vendible. El asistente los identifica por NOMBRE de ciudad,
 * así La Paz → Tarija es el mismo viaje (y el mismo precio) vaya por el tramo
 * de arriba o el de abajo; por eso se emite un par por cada mapa donde existe.
 */
export function paresCiudadBody(draft: RouteDraft, idMapaRutaPorTramo: Readonly<Record<string, string>>) {
  const rows: unknown[] = [];
  for (const tramo of draft.tramos) {
    if (!tramo.enabled) continue;
    for (const pathId of tramo.pathIds) {
      const idMapaRuta = idMapaRutaPorTramo[pathId];
      if (!idMapaRuta) continue;
      rows.push({
        idMapaRuta,
        ciudadOrigen: tramo.from, // idCiudad en la API — confirmar
        ciudadDestino: tramo.to, // confirmar
        ventaWeb: tramo.webSale, // confirmar
        /** Siempre false: si el servicio va directo se decide al crear el servicio. */
        esTramoDirecto: tramo.direct
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 5. Horario y canales (rm-horarios, rm-horario-canales)
// ---------------------------------------------------------------------------

export function horarioBody(draft: RouteDraft, idRutaMaestra: string) {
  const schedule = draft.schedule;
  return {
    idRutaMaestra,
    nombre: schedule.name,
    descripcion: schedule.description,
    dias: schedule.days.map(day => DAY_NUMBER[day]), // 1 = lunes — confirmar
    diasAlternos: schedule.alternateDays, // confirmar
    permiteReservas: schedule.reservations, // confirmar
    diasAnticipacionReserva: schedule.reservationDaysAhead,
    permiteAnulacion: schedule.allowCancellation,
    permiteDescuento: schedule.allowDiscount,
    muestraDescuentoCliente: schedule.showDiscountToCustomer,
    bloqueoTelefono: schedule.phoneLock
  };
}

export function horarioCanalesBody(draft: RouteDraft, idHorario: string) {
  return draft.schedule.channelIds.map(idCanal => ({ idHorario, idCanal })); // confirmar
}

// ---------------------------------------------------------------------------
// 6. Buses de la ruta (rm-vehiculos)  ★ NUEVO: la tabla no existe
// ---------------------------------------------------------------------------

export function vehiculosBody(draft: RouteDraft, idRutaMaestra: string) {
  return draft.buses.map(bus => ({
    idRutaMaestra,
    idVehiculo: bus.vehicleId,
    /** Redundante (sale del vehículo), útil para filtrar sin join. */
    idTipoVehiculo: bus.vehicleTypeId
  }));
}

// ---------------------------------------------------------------------------
// 7. Tarifas (rm-tarjetas-tarifa, rm-tarifa-detalles)
// ---------------------------------------------------------------------------

export function tarjetaTarifaBody(card: DraftFareCard, idRutaMaestra: string) {
  return {
    idRutaMaestra,
    nombre: card.name,
    idTipoVehiculo: card.vehicleTypeId,
    idTipoUsoRuta: card.usageTypeId, // siempre "Regular": el asistente ya no lo pregunta
    idCategoriaTarifa: card.categoryId // tipo de pasajero: Normal, Estudiante, Niño, Tercera edad
  };
}

/**
 * Un detalle por viaje × tipo de asiento (× día, si hay precios por día).
 * Con "boleto fijo" el asistente ya copió el mismo precio a todos los viajes,
 * así que desde aquí se ve igual que cualquier otra tarjeta.
 */
export function tarifaDetallesBody(draft: RouteDraft, card: DraftFareCard, idTarjeta: string) {
  const rows: unknown[] = [];
  const emit = (grid: typeof card.prices, dia: number | null) => {
    for (const tramo of draft.tramos) {
      if (!tramo.enabled) continue;
      for (const idTipoAsiento of card.seatTypeIds) {
        const precio = grid[tramo.key]?.[idTipoAsiento] ?? null;
        if (precio === null) continue;
        rows.push({
          idTarjetaTarifa: idTarjeta,
          ciudadOrigen: tramo.from, // idCiudad — confirmar
          ciudadDestino: tramo.to, // confirmar
          idTipoAsiento,
          precio,
          dia // null = mismo precio toda la semana; 1..7 si hay precios por día
        });
      }
    }
  };
  if (card.pricesByDay) {
    for (const [day, grid] of Object.entries(card.pricesByDay)) emit(grid, DAY_NUMBER[day as Weekday]);
  } else {
    emit(card.prices, null);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 8. Configuraciones (rm-configuraciones, rm-ciudades-omitidas-config)
// ---------------------------------------------------------------------------

/**
 * Aleta guarda una configuración POR TIPO DE VEHÍCULO. El asistente ya no la
 * pregunta: la arma con los buses de la ruta, el mapa y el horario elegidos.
 */
export function configuracionesBody(draft: RouteDraft, idRutaMaestra: string, idHorario: string, idMapaRuta: string) {
  return Engine.busTypes(draft).map(type => {
    const cards = draft.configuration.channelCards[type.id];
    return {
      idRutaMaestra,
      idTipoVehiculo: type.id,
      idHorario,
      idMapaRuta,
      idTipoUsoRuta: draft.configuration.usageTypeId, // "Regular"
      nombre: draft.configuration.name,
      descripcion: draft.configuration.description,
      /** Tarjeta que usa cada canal de venta. */
      idTarjetaPredeterminada: cards?.defaultCardId ?? null, // confirmar
      idTarjetaAgente: cards?.agentCardId ?? null, // confirmar
      idTarjetaWeb: cards?.webCardId ?? null, // confirmar
      boletoFijo: draft.configuration.fixedTicket, // confirmar
      activo: draft.configuration.active
    };
  });
}

/** Ciudades o viajes donde ESE tipo de bus no para. */
export function ciudadesOmitidasBody(draft: RouteDraft, idConfiguracionPorTipo: Readonly<Record<string, string>>) {
  return draft.configuration.omissions
    .map(omission => {
      const idConfiguracion = idConfiguracionPorTipo[omission.vehicleTypeId];
      if (!idConfiguracion) return null;
      const [origen, destino] = omission.kind === 'TRAMO' ? omission.ref.split('>') : [omission.ref, null];
      return { idConfiguracion, tipo: omission.kind, ciudadOrigen: origen, ciudadDestino: destino }; // confirmar
    })
    .filter((row): row is NonNullable<typeof row> => !!row);
}

// ---------------------------------------------------------------------------
// 9. El orden de guardado
// ---------------------------------------------------------------------------

/**
 * Los pasos en el orden en que hay que llamarlos, con lo que cada uno necesita
 * del anterior. Sirve de guía y de documentación ejecutable: el adaptador real
 * puede recorrer esta lista en vez de repetir el orden a mano.
 *
 * Conviene que el backend ofrezca un endpoint que reciba todo junto y lo
 * guarde en una transacción: si falla el paso 7, no debería quedar media ruta
 * creada. Hoy eso no existe y el asistente tendría que deshacer a mano.
 */
export function savePlan(draft: RouteDraft): readonly SaveStep[] {
  const steps: SaveStep[] = [
    { endpoint: 'rutas-maestras', method: 'POST', needs: [], label: 'La ruta', body: rutaMaestraBody(draft) },
    { endpoint: 'rm-ciudades', method: 'POST', needs: ['idRutaMaestra'], label: 'Ciudades del recorrido', body: ciudadesBody(draft, ':idRutaMaestra') }
  ];
  for (const path of draft.paths) {
    steps.push({ endpoint: 'rm-mapas-ruta', method: 'POST', needs: ['idRutaMaestra'], label: `Tramo "${path.name}"`, body: mapaRutaBody(draft, path, ':idRutaMaestra') });
    steps.push({ endpoint: 'rm-etapas', method: 'POST', needs: ['idMapaRuta'], label: `Paradas de "${path.name}"`, body: etapasBody(draft, path, ':idRutaMaestra', ':idMapaRuta') });
  }
  steps.push(
    { endpoint: 'rm-mapa-pares-ciudad', method: 'POST', needs: ['idMapaRuta'], label: 'Viajes que se venden', body: paresCiudadBody(draft, {}) },
    { endpoint: 'rm-horarios', method: 'POST', needs: ['idRutaMaestra'], label: 'Días y reservas', body: horarioBody(draft, ':idRutaMaestra') },
    { endpoint: 'rm-horario-canales', method: 'POST', needs: ['idHorario'], label: 'Canales de venta', body: horarioCanalesBody(draft, ':idHorario') },
    { endpoint: 'rm-vehiculos ★ nuevo', method: 'POST', needs: ['idRutaMaestra'], label: 'Buses de la ruta', body: vehiculosBody(draft, ':idRutaMaestra') }
  );
  for (const card of draft.fareCards) {
    steps.push({ endpoint: 'rm-tarjetas-tarifa', method: 'POST', needs: ['idRutaMaestra'], label: `Tarifa "${card.name}"`, body: tarjetaTarifaBody(card, ':idRutaMaestra') });
    steps.push({ endpoint: 'rm-tarifa-detalles', method: 'POST', needs: ['idTarjetaTarifa'], label: `Precios de "${card.name}"`, body: tarifaDetallesBody(draft, card, ':idTarjetaTarifa') });
  }
  steps.push(
    { endpoint: 'rm-configuraciones', method: 'POST', needs: ['idHorario', 'idMapaRuta'], label: 'Configuración por tipo de bus', body: configuracionesBody(draft, ':idRutaMaestra', ':idHorario', ':idMapaRuta') },
    { endpoint: 'rm-ciudades-omitidas-config', method: 'POST', needs: ['idConfiguracion'], label: 'Ciudades que no se atienden', body: ciudadesOmitidasBody(draft, {}) }
  );
  if (draft.status === 'ACTIVO') {
    steps.push({ endpoint: 'rutas-maestras/:id', method: 'PATCH', needs: ['idRutaMaestra'], label: 'Activar la ruta', body: { estado: 'ACTIVO' } });
  }
  return steps;
}
