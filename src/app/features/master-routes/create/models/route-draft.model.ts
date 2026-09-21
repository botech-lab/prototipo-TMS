/**
 * ============================================================================
 * BORRADOR DE RUTA MAESTRA (ASISTENTE DE CREACIÓN)
 * ============================================================================
 * Espejo del modelo de aletadev (/rutas/nueva), reagrupado por pasos:
 *
 *   Aleta TMS (pestañas)         → Asistente
 *   Información general          → 1 Recorrido
 *   Ciudades y etapas            → 1 Recorrido (ciudades) + 2 Paradas y tiempos (etapas)
 *   Mapa y tramos                → 3 Tramos
 *   Horarios y canales           → 4 Operación y venta
 *   (nuevo) buses de la ruta     → 5 Buses y tarifas
 *   Tarifas y precios            → 5 Buses y tarifas
 *   Configuraciones              → 5 Buses y tarifas (se arma sola, una por tipo de bus)
 *   (estado BORRADOR → ACTIVO)   → 6 Revisión y activación
 *
 * Los tiempos de la ruta maestra son RELATIVOS (cuánto se tarda y cuánto se
 * espera en cada etapa). La hora real de salida (06:00, 07:00…) la pone cada
 * servicio al crearse; el servicio hereda estas etapas y puede ajustarlas.
 * ============================================================================
 */

export type Weekday = 'LUN' | 'MAR' | 'MIE' | 'JUE' | 'VIE' | 'SAB' | 'DOM';

export const WEEKDAYS: readonly { readonly key: Weekday; readonly short: string; readonly long: string }[] = [
  { key: 'LUN', short: 'Lun', long: 'Lunes' },
  { key: 'MAR', short: 'Mar', long: 'Martes' },
  { key: 'MIE', short: 'Mié', long: 'Miércoles' },
  { key: 'JUE', short: 'Jue', long: 'Jueves' },
  { key: 'VIE', short: 'Vie', long: 'Viernes' },
  { key: 'SAB', short: 'Sáb', long: 'Sábado' },
  { key: 'DOM', short: 'Dom', long: 'Domingo' }
];

/** Ciudad disponible para armar el recorrido (catálogo de ciudades). */
export interface CityOption {
  readonly name: string;
  /** Departamento en mayúsculas, como en el catálogo de rutas ("LA PAZ"). */
  readonly department: string;
}

/**
 * Etapa (parada física) dentro de una ciudad: terminal, tranca, surtidor…
 * `distanceKm` y `travelMinutes` se miden desde la etapa anterior del recorrido
 * (0 en la primera etapa de la ruta). `waitMinutes` es la espera en esta etapa.
 */
export interface DraftStop {
  readonly id: string;
  readonly name: string;
  readonly distanceKm: number | null;
  readonly travelMinutes: number | null;
  readonly waitMinutes: number;
  readonly address: string;
  readonly reference: string;
  readonly mapUrl: string;
  readonly contactName: string;
  readonly contactPhone: string;
  readonly pin: string;
  /** Etapa principal de la ciudad (la que ven los pasajeros al comprar). */
  readonly isMain: boolean;
  readonly isDepartmentMain: boolean;
  readonly isMainArrival: boolean;
  readonly apiAccessible: boolean;
  readonly active: boolean;
}

/** Ciudad de un tramo, en orden. La primera es el origen y la última el destino. */
export interface DraftCity {
  readonly id: string;
  readonly name: string;
  readonly department: string;
  /** "Omitir en web": la ciudad no se ofrece como origen/destino en la venta web. */
  readonly hiddenOnWeb: boolean;
  readonly stops: readonly DraftStop[];
}

/**
 * Tramo (camino) de la ruta: por qué ciudades pasa entre el origen y el destino.
 * Una ruta maestra puede tener varios (La Paz → Tarija "por arriba" y "por
 * abajo"); todos comparten origen, destino, días, buses y precios, y cambian
 * solo en ciudades y paradas. Cada servicio elige por cuál tramo va.
 * Aleta: lo más parecido es `rm-mapas-ruta` (varios mapas con nombre por ruta);
 * sus etapas (`rm-etapas`) son una sola lista por ruta, así que hará falta
 * guardar las etapas por mapa para tener tiempos distintos por tramo.
 */
export interface DraftPath {
  readonly id: string;
  /** "Tramo principal", "Tramo por arriba"… */
  readonly name: string;
  /** Un tramo nuevo de una ruta ya activa queda en BORRADOR hasta aprobarlo. */
  readonly status: DraftStatus;
  readonly cities: readonly DraftCity[];
}

/**
 * Viaje que se vende entre dos ciudades (i < j en algún tramo). En pantalla:
 * "Viajes que se venden"; Aleta: `rm-mapa-pares-ciudad`. Se identifica por los
 * NOMBRES de las ciudades, así La Paz → Tarija es el mismo viaje (y precio)
 * vaya por arriba o por abajo.
 */
export interface DraftTramo {
  /** `${origen}>${destino}` por nombre de ciudad. */
  readonly key: string;
  readonly from: string;
  readonly to: string;
  /** Tramos (caminos) en los que existe este viaje. */
  readonly pathIds: readonly string[];
  /** Si está habilitado, se pueden crear servicios y vender pasajes de este tramo. */
  readonly enabled: boolean;
  readonly webSale: boolean;
  /**
   * Aleta: `esTramoDirecto`. No se elige en la ruta maestra (queda en false):
   * si el servicio va directo o para en las intermedias se decide al crear el servicio.
   */
  readonly direct: boolean;
}

export interface DraftSchedule {
  readonly name: string;
  readonly description: string;
  readonly days: readonly Weekday[];
  readonly alternateDays: boolean;
  readonly reservations: boolean;
  readonly reservationDaysAhead: number | null;
  readonly allowCancellation: boolean;
  readonly allowDiscount: boolean;
  readonly showDiscountToCustomer: boolean;
  readonly phoneLock: boolean;
  /** Ids del catálogo de canales de venta. */
  readonly channelIds: readonly string[];
}

/** Precios de una tarjeta: tramo → tipo de asiento → precio en Bs. */
export type PriceGrid = Readonly<Record<string, Readonly<Record<string, number | null>>>>;

export interface DraftFareCard {
  readonly id: string;
  /**
   * Tarifa a la que pertenece. Una tarifa ("Feriados", "Tercera edad") tiene
   * una tarjeta por tipo de bus, todas con el mismo `tariffId`: en pantalla se
   * ve una sola tabla de precios y Aleta recibe sus tarjetas de siempre.
   */
  readonly tariffId: string;
  /** Nombre que le puso quien crea la ruta ("Feriados · Bus Cama"). */
  readonly name: string;
  readonly vehicleTypeId: string;
  readonly usageTypeId: string;
  /**
   * Categoría del catálogo de Aleta (`idCategoriaTarifa`). El nombre visible lo
   * pone la persona; esto es solo para que la API reciba algo válido.
   */
  readonly categoryId: string;
  /** Tipos de asiento que se venden con esta tarjeta (columnas de la matriz). */
  readonly seatTypeIds: readonly string[];
  /**
   * Boleto fijo: un solo precio por asiento, el mismo para cualquier viaje.
   * Es de la TARIFA, no de la ruta: "Feriados" puede cobrar parejo mientras
   * "Normal" cobra por distancia. Todas las tarjetas de una tarifa lo comparten.
   */
  readonly fixedTicket: boolean;
  /** Precio base, igual toda la semana. */
  readonly prices: PriceGrid;
  /** Si no es null, cada día tiene su propia matriz (Aleta: matriz Lunes…Domingo). */
  readonly pricesByDay: Readonly<Record<Weekday, PriceGrid>> | null;
}

export type OmissionKind = 'CITY' | 'TRAMO';

/**
 * Ciudad o viaje donde un TIPO DE BUS no para (p. ej. "el bus cama no para en
 * El Alto"). Aleta: `rm-ciudades-omitidas-config`, dentro de la configuración
 * de ese tipo de vehículo. Para toda la ruta no hace falta: eso es apagar el
 * viaje (paso 3) o quitar la ciudad del tramo.
 */
export interface DraftOmission {
  readonly kind: OmissionKind;
  /** Nombre de ciudad o clave del viaje (`Origen>Destino`). */
  readonly ref: string;
  /** Tipo de bus al que se aplica. */
  readonly vehicleTypeId: string;
}

/**
 * Bus de la flota que hace esta ruta (pantalla Vehículos). Se guarda una copia
 * mínima al elegirlo para que las reglas del borrador no dependan del catálogo.
 * Integración con Aleta: hoy no existe esta relación (la configuración solo
 * guarda `idTipoVehiculo`); hace falta una tabla ruta ↔ `idVehiculo`.
 */
export interface DraftBus {
  readonly vehicleId: string;
  readonly plate: string;
  readonly vehicleTypeId: string;
  readonly vehicleTypeName: string;
}

/** Tarjeta de tarifa por canal (Aleta: Predeterminada, Agente, Web). */
export interface DraftChannelCards {
  readonly defaultCardId: string | null;
  readonly agentCardId: string | null;
  readonly webCardId: string | null;
}

/**
 * Configuración (Aleta: "Configuraciones"). No tiene paso propio: se arma sola.
 * Aleta guarda una configuración por tipo de vehículo; aquí eso es
 * `channelCards` (tipo de vehículo → tarifa por canal), y el resto (boleto
 * fijo, omisiones) se comparte entre todas. Mapa y horario salen de los pasos 3 y 4.
 */
export interface DraftConfiguration {
  readonly name: string;
  readonly description: string;
  /** Por id de tipo de vehículo. Si falta, la predeterminada es la primera tarjeta de ese tipo. */
  readonly channelCards: Readonly<Record<string, DraftChannelCards>>;
  /**
   * Uso de ruta de Aleta (Regular, Estacional, Escolar…). No se muestra: en
   * aletadev no cambia precios, ventas ni servicios, así que se guarda siempre
   * "Regular" en cada tarjeta y configuración.
   */
  readonly usageTypeId: string | null;
  readonly active: boolean;
  readonly omissions: readonly DraftOmission[];
}

export type DraftStatus = 'BORRADOR' | 'ACTIVO';

export interface RouteDraft {
  readonly id: string;
  readonly code: string;
  readonly status: DraftStatus;
  /** Nombre propio; si está vacío se usa "Origen – Destino". */
  readonly customName: string;
  readonly description: string;
  /** Al menos uno. El primero es el tramo principal. */
  readonly paths: readonly DraftPath[];
  /** "Crear también la ruta de vuelta": al guardar se crea la inversa como borrador. */
  readonly createReturn: boolean;
  /** Código de la ruta de la que esta es la vuelta ("Es reversión de"). */
  readonly reverseOf: string | null;
  readonly tramos: readonly DraftTramo[];
  readonly schedule: DraftSchedule;
  /** Buses que hacen la ruta; de ellos salen los tipos de vehículo y los asientos. */
  readonly buses: readonly DraftBus[];
  readonly fareCards: readonly DraftFareCard[];
  readonly configuration: DraftConfiguration;
}

/** Pasos del asistente, en orden. */
export type WizardStepKey = 'recorrido' | 'paradas' | 'tramos' | 'operacion' | 'tarifas' | 'revision';

export type CheckLevel = 'ok' | 'warn' | 'missing';

/** Un punto de la lista de verificación previa a la activación. */
export interface DraftCheck {
  readonly id: string;
  readonly step: WizardStepKey;
  readonly level: CheckLevel;
  readonly label: string;
  /** Qué falta o qué conviene revisar (vacío si está bien). */
  readonly detail: string;
}

/** Etapa con sus tiempos acumulados desde la salida del origen. */
export interface TimedStop {
  readonly cityId: string;
  readonly cityName: string;
  readonly stop: DraftStop;
  /** Minutos desde la salida hasta la llegada a esta etapa. */
  readonly arrivalOffset: number;
  /** Minutos desde la salida hasta que el bus sale de esta etapa (llegada + espera). */
  readonly departureOffset: number;
  /** Kilómetros acumulados desde el origen. */
  readonly km: number;
  readonly isFirst: boolean;
  readonly isLast: boolean;
}
