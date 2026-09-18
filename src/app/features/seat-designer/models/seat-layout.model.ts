/**
 * ============================================================================
 * MODELO DEL PLANO DE PLAZAS
 * ============================================================================
 * El plano vive en COORDENADAS DE BUS: `row` recorre el vehículo del frente
 * hacia atrás, `col` lo cruza de ventana a ventana. La orientación en pantalla
 * es una transposición al renderizar y nunca altera el dato.
 *
 * El pasillo puede ser ASIMÉTRICO: `left` butacas a la izquierda, `right` a la
 * derecha (2+1, 3+2...). `aisleCol === left` y `width === left + 1 + right`.
 * ============================================================================
 */

/** Código del catálogo `tipos-asiento` (EST, SEM, CAM, VIP, AMB...). */
export type SeatTypeCode = string;

/** Elementos fijos del vehículo que ocupan una celda. */
export type FixtureKind = 'cabin' | 'door' | 'bathroom' | 'stairs' | 'table';

/** Comodidades asignables a mano a una butaca. */
export type Amenity = 'usb' | 'screen' | 'wifi' | 'outlet' | 'tray';

/**
 * Características DERIVADAS de la geometría, al estilo de los códigos IATA
 * de característica de asiento (W ventana, A pasillo, K mampara, L espacio).
 * Nunca se etiquetan: se calculan del plano.
 */
export type SeatTrait = 'window' | 'aisle' | 'bulkhead' | 'panoramic' | 'lavatory' | 'legroom';

export interface SeatCell {
  readonly kind: 'seat';
  readonly number: number;
  readonly seatType: SeatTypeCode;
  /** Categoría de tarifa forzada a mano. `undefined` = la decide el motor. */
  readonly fareCategoryId?: string;
  readonly amenities?: readonly Amenity[];
}

export interface FixtureCell {
  readonly kind: FixtureKind;
}

export interface EmptyCell {
  readonly kind: 'empty';
}

export interface AisleCell {
  readonly kind: 'aisle';
}

export type LayoutCell = SeatCell | FixtureCell | EmptyCell | AisleCell;

export type CellKind = LayoutCell['kind'];

/** Un piso del vehículo. */
/**
 * Puerta de embarque: un marcador DELGADO en el borde de la carrocería, a la
 * altura de una fila. No ocupa celda: el vestíbulo queda libre para baño y
 * escalera, y la puerta se dibuja pegada al cuadrado, no como un cuadrado.
 */
export interface DoorMarker {
  readonly row: number;
  readonly side: 'left' | 'right';
}

export interface DeckLayout {
  /** Número de piso, 1 = planta baja. */
  readonly floor: number;
  /** Puertas de embarque (marcadores de borde, no celdas). */
  readonly doors?: readonly DoorMarker[];
  /** Filas a lo largo del bus (frente → atrás). */
  readonly length: number;
  /** Butacas a la izquierda del pasillo. */
  readonly left: number;
  /** Butacas a la derecha del pasillo. Puede ser 0 (minibús de una columna). */
  readonly right: number;
  /** Posiciones a lo ancho, pasillo incluido: `left + 1 + right`. */
  readonly width: number;
  /** Columna del pasillo: siempre `left`. */
  readonly aisleCol: number;
  /** `cells[row][col]`. */
  readonly cells: readonly (readonly LayoutCell[])[];
  /** Filas con salida de emergencia: marcador en el borde, no ocupa celda. */
  readonly emergencyExitRows?: readonly number[];
}

export interface VehicleLayout {
  readonly vehicleId: string;
  readonly decks: readonly DeckLayout[];
  /** ISO 8601 de la última modificación. */
  readonly updatedAt: string;
}

export interface CellPosition {
  readonly deck: number;
  readonly row: number;
  readonly col: number;
}

/** Clave estable de una celda: `deck:row:col`. */
export type CellKey = string;

/** Herramienta activa del editor. */
export type DesignerTool =
  | { readonly kind: 'select' }
  | { readonly kind: 'erase' }
  | { readonly kind: 'number' }
  /** Mover: arrastrar una celda a otra posición (hueco → se mueve; butaca → se intercambian). */
  | { readonly kind: 'move' }
  | { readonly kind: 'seat'; readonly seatType: SeatTypeCode }
  | { readonly kind: 'fixture'; readonly fixture: FixtureKind };

/**
 * Estrategia de recorrido de la numeración automática.
 *  - `sides`     por lado, ventana impar / pasillo par (01 ventana, 02 pasillo)
 *  - `aisleOdd`  por lado, pasillo impar / ventana par (01 pasillo, 02 ventana)
 *  - `rows`      por fila cruzando el pasillo: 1,2 | 3,4
 */
export type NumberingStrategy = 'sides' | 'aisleOdd' | 'rows';
/**
 * Sentido del recorrido, ortogonal a la estrategia:
 *  - `origin` por dónde empieza la serie a lo largo del bus.
 *  - `side`   con qué costado abre cada fila (conductor o puerta).
 */
export interface NumberingDirection {
  readonly origin: 'front' | 'rear';
  readonly side: 'driver' | 'door';
}

/** Una regla para todo el bus, o una por piso (índice = piso). */
export type NumberingPlan = NumberingStrategy | readonly NumberingStrategy[];
/** Contrato del asistente: regla por piso. */
export interface NumberingByDeck { readonly deck_1: NumberingStrategy; readonly deck_2?: NumberingStrategy; }

/**
 * Resultado de un comando de MUTACIÓN sobre un plano ya armado.
 *  - `applied`  el plano cambió; `layout` trae el nuevo.
 *  - `noop`     se entendió pero ya estaba así (o no aplica): se explica y no se toca nada.
 *  - `unknown`  no es un comando de mutación: el chat sigue con el flujo de creación.
 */
export interface MutationResult {
  readonly status: 'applied' | 'noop' | 'unknown';
  readonly kind: 'numbering' | 'scope' | 'swap' | 'direction' | 'quantity' | 'seat' | 'range' | null;
  readonly message: string;
  readonly layout: VehicleLayout | null;
  /** Plan de numeración actualizado (una regla por piso). */
  readonly numbering: readonly NumberingStrategy[] | null;
  readonly scope: NumberingScope | null;
  /** Sentido del recorrido actualizado, si el comando lo cambió. */
  readonly direction?: NumberingDirection | null;
  /** Piso afectado, para que el lienzo salte a él. */
  readonly deckIndex: number | null;
}

/** Entrada del catálogo de tipos de butaca (lo que el asistente puede resolver). */
export interface SeatTypeItem { readonly code: string; readonly name: string; }
export interface SeatResolutionResult {
  readonly status: 'exact' | 'fuzzy' | 'unknown';
  readonly raw: string;
  readonly code: SeatTypeCode | null;
  /** Palabra o nombre del catálogo con el que casó. */
  readonly matched: string | null;
  readonly distance: number;
  /** El más parecido cuando no casa: se ofrece como alternativa a crear. */
  readonly closest: { readonly code: SeatTypeCode; readonly name: string; readonly distance: number } | null;
}

/** Alcance de la numeración: corrida entre pisos o reiniciada en cada uno. */
export type NumberingScope = 'continuous' | 'perDeck';

/** Capa de inspección activa sobre el plano. */
export type InspectionLayer = 'passenger' | 'fare' | 'amenities';

/** Operación masiva sobre una selección. */
export type SelectionOperation =
  | { readonly kind: 'seatType'; readonly seatType: SeatTypeCode }
  | { readonly kind: 'fare'; readonly fareCategoryId: string | null }
  | { readonly kind: 'amenity'; readonly amenity: Amenity; readonly on: boolean }
  | { readonly kind: 'erase' };

/** Resultado de una validación del plano frente a su vehículo. */
export interface LayoutIssue {
  readonly level: 'error' | 'warning';
  readonly code:
    | 'OVER_CAPACITY'
    | 'DUPLICATE_NUMBERS'
    | 'NUMBER_GAPS'
    | 'NO_SEATS'
    | 'NO_DOOR'
    | 'NO_STAIRS'
    /** La escalera existe en un solo piso, o cambia de lado entre pisos. */
    | 'STAIRS_UNPAIRED'
    | 'STAIRS_MISALIGNED';
  readonly message: string;
}

export interface LayoutStats {
  readonly totalSeats: number;
  readonly byType: ReadonlyMap<SeatTypeCode, number>;
  readonly byDeck: readonly number[];
  readonly capacity: number;
  /** Proporción configurada / capacidad, acotada a 1. */
  readonly fillRatio: number;
  readonly issues: readonly LayoutIssue[];
}

/** Preset de chasis: arma un bus completo de un toque. */
export interface ChassisPreset {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly floors: number;
  readonly length: number;
  readonly left: number;
  readonly right: number;
  /** Tipo de butaca por piso (índice 0 = planta baja). */
  readonly seatTypes: readonly SeatTypeCode[];
  readonly bathroom: boolean;
}

// ---------------------------------------------------------------------------
// CONSTRUCCIÓN POR ESPECIFICACIÓN (Grid Builder, Quick Prompt, Digital Twin)
// ---------------------------------------------------------------------------

/**
 * Baño: `entry` = en el vestíbulo de acceso de la planta baja (junto a la
 * puerta y la mampara); `entry-both` añade otro al fondo del piso alto.
 */
export type BathroomPlacement = 'none' | 'rear-right' | 'rear-left' | 'middle-right' | 'entry' | 'entry-both';
export type DoorPlacement = 'front' | 'front-rear' | 'front-middle';
/**
 * Escalera. Es ASIMÉTRICA: en la planta baja siempre nace en el vestíbulo
 * (fila de cabina, no quita butacas); este valor describe dónde DESEMBOCA en
 * la planta alta. `front-right` = fila 2 derecha (estándar Marcopolo / Comil).
 */
export type StairsPlacement = 'none' | 'front-right' | 'rear-left' | 'rear-right' | 'middle-left' | 'middle-right';

/** Piso mixto: filas del salón (0 = primera fila de butacas) con otro tipo. */
export interface RowOverride {
  readonly row: number;
  readonly seatType: SeatTypeCode;
}

/** Un piso descrito por parámetros, no por celdas. */
export interface DeckSpec {
  readonly length: number;
  readonly left: number;
  readonly right: number;
  readonly seatType: SeatTypeCode;
  /**
   * Butacas exactas a colocar. Sin él se llenan todas las filas; con él la
   * última fila queda parcial ("33 semicama" son 33, no 36).
   */
  readonly seats?: number;
  /**
   * Banqueta trasera: la última fila ocupa también la posición del pasillo
   * (la fila de 5 de un 2+2). Única excepción a la regla del pasillo.
   */
  readonly rearBench?: boolean;
  /** Sobrescritura por fila para pisos mixtos ("1 fila cama y el resto semicama"). */
  readonly rowOverrides?: readonly RowOverride[];
}

/** Especificación completa de un bus: lo que rellenan el Grid Builder y el Quick Prompt. */
export interface BuildSpec {
  readonly decks: readonly DeckSpec[];
  readonly bathroom: BathroomPlacement;
  readonly doors: DoorPlacement;
  readonly stairs: StairsPlacement;
  /** Fila exacta (0-based) donde emerge la escalera en la planta alta; manda sobre `stairs`. */
  readonly stairsRow?: number;
  /** Filas con salida de emergencia por piso (marcador en el borde, no ocupa celda). */
  readonly emergencyExitRows?: readonly (readonly number[])[];
}

/**
 * Carrocería de referencia de fábrica. `homologated` es SIEMPRE `false` en el
 * catálogo interno: son medidas públicas aproximadas, no fichas oficiales.
 * La costura de integración es reemplazar cada entrada por datos del fabricante.
 */
export interface BodyTemplate {
  readonly id: string;
  readonly brand: string;
  readonly model: string;
  readonly homologated: boolean;
  readonly reference: string;
  readonly spec: BuildSpec;
}

/** Preset industrial para crear una unidad con un clic. */
export interface VehiclePreset {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  /** Nombre del registro en `tipo-vehiculos`: de ahí salen peso y licencia. */
  readonly vehicleTypeName: string;
  readonly floors: number;
  readonly passengerCapacity: number;
  /** `null` = lienzo limpio. */
  readonly spec: BuildSpec | null;
}

export type TrafficLight = 'green' | 'amber' | 'red';

/** Semáforo de coherencia. El rojo bloquea el guardado; el ámbar solo avisa. */
export interface TrafficLightCheck {
  readonly capacity: TrafficLight;
  readonly exits: TrafficLight;
  readonly numbering: TrafficLight;
  readonly canSave: boolean;
  /** Primera celda que provoca un rojo, para saltar a ella. */
  readonly firstIssue: CellPosition | null;
  readonly blocking: readonly LayoutIssue[];
}

/** Detalle de lo leído en un piso: lo que el chat necesita para saber qué preguntar. */
export interface PromptDeckDetail {
  /** Plazas pedidas, o `null` si el tramo no se entendió. */
  readonly seats: number | null;
  readonly seatType: SeatTypeCode;
  /** El texto dijo "2+1" / "1+2" explícitamente. */
  readonly explicitScheme: boolean;
  /** Plazas que no completan la última fila (33 en 2+2 → 1). */
  readonly leftover: number;
  /** El texto habló de butacas individuales / compartidas (salón mixto). */
  readonly soloSeats: boolean;
  /** Tipo pedido que no existe en el catálogo ("Ultra VIP"), pendiente de decidir. */
  readonly unknownType: string | null;
  /** Tipo corregido por distancia de edición ("semikma" → semicama). */
  readonly fuzzyFrom: string | null;
  /** Filas explícitas ("4 filas abajo"), si las dijo. */
  readonly rows: number | null;
}

/** Dos esquemas de columnas que no pueden ser ciertos a la vez. */
export interface SchemeConflict {
  readonly deck: number;
  /** Esquema dicho explícitamente, p. ej. "2+1". */
  readonly said: string;
  /** Esquema implicado por las plazas por fila, p. ej. "2+2". */
  readonly implied: string;
  readonly perRowSaid: number;
  readonly perRowImplied: number;
  /** Filas dichas en la misma frase: con ellas se recalculan las plazas. */
  readonly rows: number | null;
}

/** Carrocería reconocida en el texto: fija valores por defecto de fábrica. */
export type ChassisBrand = 'marcopolo' | 'comil' | 'irizar';

/** Resultado del intérprete de texto natural. */
export interface PromptResult {
  readonly spec: BuildSpec | null;
  /** Lo que se entendió, en lenguaje llano, para revisarlo en 5 segundos. */
  readonly understood: readonly string[];
  readonly warnings: readonly string[];
  readonly decks: readonly PromptDeckDetail[];
  /** Regla de numeración detectada en el texto, si la hubo. */
  readonly numbering: NumberingStrategy | null;
  /** Servicios que el texto mencionó explícitamente. */
  readonly mentioned: { readonly bathroom: boolean; readonly doors: boolean; readonly stairs: boolean };
  readonly chassis: ChassisBrand | null;
  /** "entre el asiento 3 y 4" → fila (0-based) donde emerge la escalera en P2. */
  readonly stairsRow: number | null;
  /** Regla de numeración dicha dentro de cada tramo (null = no la dijo). */
  readonly numberingByDeck: readonly (NumberingStrategy | null)[];
  /** Servicios negados en el texto ("sin baño"): resueltos, no se preguntan. */
  readonly denied: { readonly bathroom: boolean; readonly doors: boolean; readonly stairs: boolean };
  /** Dos geometrías incompatibles en la misma frase ("2+1 con filas de 4"). */
  readonly conflict: SchemeConflict | null;
  /** Sentido de la numeración pedido en el texto, si lo dijo. */
  readonly direction: NumberingDirection | null;
}


// ---------------------------------------------------------------------------
// ASISTENTE CONVERSACIONAL
// ---------------------------------------------------------------------------

export interface ChatOption {
  readonly label: string;
  readonly value: string;
}

export interface ChatQuestion {
  readonly id: string;
  readonly text: string;
  readonly options: readonly ChatOption[];
}

/** Respuestas acumuladas: id de pregunta → id de opción elegida. */
export type ChatAnswers = Readonly<Record<string, string>>;

export interface ChatSummary {
  readonly floors: number;
  readonly decks: readonly { readonly floor: number; readonly seats: number; readonly seatType: SeatTypeCode; readonly layout: string }[];
  readonly bathroom: BathroomPlacement;
  readonly doors: DoorPlacement;
  readonly stairs: StairsPlacement;
  readonly numbering: NumberingStrategy;
}

/**
 * Contrato del asistente. Es el MISMO JSON que produciría un LLM con el
 * prompt de sistema: hoy lo genera la gramática determinista; mañana puede
 * generarlo un modelo sin que el chat cambie una línea.
 */
export interface ChatResponse {
  readonly status: 'needs_clarification' | 'ready' | 'unclear';
  readonly message: string;
  readonly questions: readonly ChatQuestion[];
  /** Resumen en una frase de lo entendido hasta ahora. */
  readonly summary: string | null;
  /** El mismo resumen, estructurado, para pintar tarjetas o auditar. */
  readonly outline: ChatSummary | null;
  /** Especificación lista para `buildFromSpec` cuando `status === 'ready'`. */
  readonly spec: BuildSpec | null;
  readonly numbering: NumberingByDeck | null;
  /** Tipos que el usuario pidió crear al vuelo: el cliente los inyecta al catálogo antes de armar. */
  readonly newSeatTypes: readonly SeatTypeItem[];
}

export interface ChatMessage {
  readonly role: 'user' | 'assistant';
  readonly text: string;
  readonly questions?: readonly ChatQuestion[];
  readonly answered?: ChatAnswers;
  /** Estado del contrato en el momento de la respuesta (colorea la burbuja). */
  readonly status?: ChatResponse['status'];
}
