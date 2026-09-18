import { SEAT_LAYOUT_RULES } from '@core';
import { Vehicle } from '../../fleet/models/vehicle.model';
import {
  Amenity,
  BodyTemplate,
  BuildSpec,
  CellKey,
  CellPosition,
  ChassisPreset,
  DeckLayout,
  DeckSpec,
  DoorMarker,
  StairsPlacement,
  DesignerTool,
  FixtureKind,
  LayoutCell,
  LayoutIssue,
  LayoutStats,
  NumberingDirection,
  NumberingPlan,
  NumberingScope,
  NumberingStrategy,
  RowOverride,
  SeatCell,
  SeatTypeCode,
  SelectionOperation,
  TrafficLightCheck,
  VehicleLayout
} from '../models/seat-layout.model';

const EMPTY: LayoutCell = Object.freeze({ kind: 'empty' });
const AISLE: LayoutCell = Object.freeze({ kind: 'aisle' });

export function cellKey(pos: CellPosition): CellKey {
  return `${pos.deck}:${pos.row}:${pos.col}`;
}

export function parseKey(key: CellKey): CellPosition {
  const [deck, row, col] = key.split(':').map(Number);
  return { deck, row, col };
}

/**
 * ============================================================================
 * MOTOR PURO DEL PLANO DE PLAZAS (`SeatLayoutEngine`)
 * ============================================================================
 * Toda la lógica del editor es una función pura: recibe un plano y devuelve
 * OTRO plano. Nunca muta la entrada. Por eso deshacer/rehacer es mover un
 * puntero entre planos, y por eso las operaciones masivas del lasso se
 * deshacen igual que una butaca suelta.
 *
 * LAS 7 REGLAS:
 *
 * 0. LO QUE NO SE VENDE NO SE NUMERA
 *    `NUMBERING.UNNUMBERED` (ambulatorio, relevo) se salta al numerar y no
 *    entra en el manifiesto: son plazas de servicio, no de venta.
 *
 * 1. EL PASILLO ES INVIOLABLE (salvo la banqueta trasera)
 *    Ninguna herramienta escribe sobre la columna de pasillo. La única
 *    excepción es la última fila: un `rearBench` coloca ahí la butaca central
 *    de la fila de 5 de un 2+2. Borrarla devuelve la celda al pasillo.
 *
 * 2. NUMERACIÓN CONTINUA SIN HUECOS NI DUPLICADOS
 *    `autoNumber` recorre en orden real de bus (por lado o por fila) y asigna
 *    1..N; los ambulatorios se saltan. Con alcance `perDeck`, cada piso
 *    reinicia en 1.
 *
 * 3. UNA BUTACA NUEVA RECIBE EL SIGUIENTE NÚMERO LIBRE
 *    Colocar a mano nunca genera duplicados.
 *
 * 4. EL MORPH CONSERVA LAS BUTACAS ANCLADAS A SU VENTANA
 *    Al cambiar 2+2 → 3+2, las de la izquierda mantienen su distancia a la
 *    ventana izquierda y las de la derecha a la derecha. Solo se pierden las
 *    que dejan de caber.
 *
 * 5. EL ESPEJO COPIA VENTANA→VENTANA
 *    Y respeta la asimetría: refleja tantas columnas como tenga el lado corto.
 *
 * 6. INSERTAR UN NÚMERO EMPUJA LOS SIGUIENTES
 *    `insertNumber(pos, 5)`: la butaca toma 5 y toda ≥5 sube uno. Sin duplicados.
 *
 * 7. LA VALIDACIÓN INFORMA; SOLO EL ROJO BLOQUEA
 *    Exceso de capacidad y números duplicados hacen el plano operativamente
 *    inválido y bloquean el guardado. Todo lo demás (huecos, falta de
 *    escalera) es ámbar: avisa y deja guardar un borrador.
 * ============================================================================
 */
export class SeatLayoutEngine {

  // ==========================================
  // CREACIÓN
  // ==========================================

  static createForVehicle(vehicle: Vehicle): VehicleLayout {
    const { GRID } = SEAT_LAYOUT_RULES;
    const floors = Math.max(1, vehicle.floors);
    const perDeck = Math.ceil(vehicle.passengerCapacity / floors);
    const dense = perDeck > GRID.DENSE_THRESHOLD;
    const side = dense ? GRID.SEATS_ACROSS_DENSE / 2 : GRID.SEATS_ACROSS_NORMAL / 2;
    const length = Math.min(
      GRID.MAX_LENGTH,
      Math.max(GRID.MIN_LENGTH, Math.ceil(perDeck / (side * 2)) + 1)
    );

    const decks: DeckLayout[] = [];
    for (let floor = 1; floor <= floors; floor++) {
      decks.push(this.createDeck(floor, length, side, side, floor === 1, floors > 1));
    }
    return { vehicleId: vehicle.id, decks, updatedAt: new Date().toISOString() };
  }

  static createDeck(
    floor: number,
    length: number,
    left: number,
    right: number,
    withCabinAndDoor: boolean,
    withStairs: boolean
  ): DeckLayout {
    const doors: DoorMarker[] = [];
    const { GRID } = SEAT_LAYOUT_RULES;
    const safeLeft = Math.min(GRID.MAX_SIDE, Math.max(1, left));
    const safeRight = Math.min(GRID.MAX_SIDE, Math.max(0, right));
    const width = safeLeft + GRID.AISLE_WIDTH + safeRight;
    const aisleCol = safeLeft;

    const cells: LayoutCell[][] = [];
    for (let row = 0; row < length; row++) {
      const line: LayoutCell[] = [];
      for (let col = 0; col < width; col++) {
        line.push(col === aisleCol ? AISLE : EMPTY);
      }
      cells.push(line);
    }

    if (withCabinAndDoor) {
      cells[0][0] = { kind: 'cabin' };
      if (safeRight > 0) {
        doors.push({ row: 0, side: right > 0 ? 'right' : 'left' });
      }
    }
    if (withStairs && safeRight > 0) {
      cells[length - 1][aisleCol + 1] = { kind: 'stairs' };
    }

    return { floor, length, left: safeLeft, right: safeRight, width, aisleCol, cells, doors };
  }

  /** Arma un bus completo desde un preset de chasis. */
  static fromPreset(vehicleId: string, preset: ChassisPreset, strategy: NumberingPlan, scope: NumberingScope): VehicleLayout {
    const decks: DeckLayout[] = [];
    for (let floor = 1; floor <= preset.floors; floor++) {
      let deck = this.createDeck(floor, preset.length, preset.left, preset.right, floor === 1, preset.floors > 1);
      if (preset.bathroom) {
        // El baño va al fondo, en la ventana derecha (o izquierda si no hay lado derecho).
        const col = deck.right > 0 ? deck.width - 1 : 0;
        const row = deck.length - 1;
        if (deck.cells[row][col].kind === 'empty') {
          deck = this.setDeckCell(deck, row, col, { kind: 'bathroom' });
        }
      }
      decks.push(deck);
    }
    let layout: VehicleLayout = { vehicleId, decks, updatedAt: new Date().toISOString() };
    preset.seatTypes.forEach((seatType, index) => {
      if (layout.decks[index]) {
        layout = this.fillTemplate(layout, index, seatType, strategy, scope);
      }
    });
    return layout;
  }

  /**
   * GRID BUILDER: arma un bus completo desde parámetros. Es lo que alimentan
   * el configurador por sliders, el Quick Prompt y las carrocerías.
   *
   * Reglas de colocación del mobiliario:
   *  - Cabina: siempre frente-izquierda de la planta baja.
   *  - Puertas: en el lado derecho (acera). `front` delante; `front-rear`
   *    añade una al fondo; `front-middle` añade una a mitad del piso.
   *  - Baño: ventana derecha o izquierda del fondo, o a mitad del piso; solo
 *    en la planta baja.
   *  - Escalera: solo con dos pisos; misma celda en ambos (es un hueco).
   */
  static buildFromSpec(vehicleId: string, spec: BuildSpec, strategy: NumberingPlan, scope: NumberingScope): VehicleLayout {
    const floors = Math.max(1, Math.min(2, spec.decks.length));
    const { MAX_LENGTH } = SEAT_LAYOUT_RULES.GRID;
    const decks: DeckLayout[] = [];

    for (let index = 0; index < floors; index++) {
      const ds = spec.decks[index];
      // EL DATO MANDA SOBRE LA GEOMETRÍA: si el piso pide N butacas y el
      // mobiliario (baño, escalera, puerta) se come celdas, el piso crece
      // fila a fila hasta que quepan exactamente N.
      let length = ds.length;
      let deck = this.furnishDeck(index, ds, length, spec, floors);
      while (ds.seats !== undefined && length < MAX_LENGTH && this.roomFor(deck, ds.rearBench ?? false) < ds.seats) {
        length++;
        deck = this.furnishDeck(index, ds, length, spec, floors);
      }
      decks.push(deck);
    }

    let layout: VehicleLayout = { vehicleId, decks, updatedAt: new Date().toISOString() };
    spec.decks.slice(0, floors).forEach((ds, index) => {
      layout = this.fillTemplate(layout, index, ds.seatType, strategy, scope, ds.seats, ds.rearBench ?? false, ds.rowOverrides ?? []);
    });
    return layout;
  }

  /** Celdas donde cabe una butaca: huecos fuera de la fila de cabina (+ banqueta). */
  private static roomFor(deck: DeckLayout, rearBench: boolean): number {
    let room = 0;
    deck.cells.forEach((line, row) => {
      if (line.some(c => c.kind === 'cabin')) return;
      line.forEach((c, col) => {
        if (c.kind === 'empty') room++;
        else if (rearBench && row === deck.length - 1 && col === deck.aisleCol && c.kind === 'aisle') room++;
      });
    });
    return room;
  }

  /**
   * Un piso vacío con su mobiliario colocado según la especificación.
   *
   * FÍSICA DEL DOBLE PISO (la escalera es asimétrica):
   *  - Planta baja: el VESTÍBULO es la fila de cabina. Ahí viven puerta,
   *    subida de escalera y baño "de acceso"; luego va la mampara y el salón
   *    arranca en la fila siguiente sin obstáculos. No se quitan butacas.
   *  - Planta alta: la escalera DESEMBOCA en el salón: `stairsRow` (o la
   *    posición de `stairs`) reserva esa celda como hueco.
   */
  private static furnishDeck(index: number, ds: DeckSpec, length: number, spec: BuildSpec, floors: number): DeckLayout {
    let deck = this.createDeck(index + 1, length, ds.left, ds.right, index === 0, false);
    const lastRow = deck.length - 1;
    const midRow = Math.floor(deck.length / 2);
    const rightWindow = deck.right > 0 ? deck.width - 1 : null;
    const entryBath = spec.bathroom === 'entry' || spec.bathroom === 'entry-both';

    if (index === 0) {
      // Puertas adicionales (lado derecho, acera): marcadores de borde.
      if (rightWindow !== null) {
        if (spec.doors === 'front-rear') deck = this.withDoor(deck, lastRow, 'right');
        if (spec.doors === 'front-middle') deck = this.withDoor(deck, midRow, 'right');
      }

      // Vestíbulo: huecos de la fila de cabina, primero junto al conductor y
      // luego junto a la puerta (que es un marcador de borde y no ocupa
      // celda). EL PASILLO NUNCA SE OCUPA: queda continuo de punta a punta.
      // Solo si no cupiera nada más, va detrás de la mampara (fila 2, lado
      // de la puerta), pero con el vestíbulo libre eso no ocurre en 2+1 ni 2+2.
      const V = SEAT_LAYOUT_RULES.VESTIBULE.ROW;
      const leftSlots: { row: number; col: number }[] = [];
      const rightSlots: { row: number; col: number }[] = [];
      for (let c = 1; c < deck.aisleCol; c++) leftSlots.push({ row: V, col: c });
      for (let c = deck.aisleCol + 1; c < deck.width; c++) rightSlots.push({ row: V, col: c });
      const fallback = (n: number) => ({ row: Math.min(lastRow, V + 1 + Math.floor(n / 2)), col: rightWindow ?? 0 });
      let used = 0;
      const place = (cell: LayoutCell, prefer: 'left' | 'right') => {
        const first = prefer === 'left' ? leftSlots : rightSlots, second = prefer === 'left' ? rightSlots : leftSlots;
        const at = first.shift() ?? second.shift() ?? fallback(used++);
        deck = this.putIfEmpty(deck, at.row, at.col, cell);
      };
      // La escalera nace del MISMO lado por el que desemboca arriba (no puede
      // cruzar el bus por el aire); el baño de acceso ocupa el otro hueco.
      const stairsSide: 'left' | 'right' = spec.stairs.endsWith('left') ? 'left' : 'right';
      if (floors > 1 && spec.stairs !== 'none') place({ kind: 'stairs' }, stairsSide);
      if (entryBath) place({ kind: 'bathroom' }, stairsSide === 'left' ? 'right' : 'left');

      // Baño clásico de salón (fondo o mitad).
      if (spec.bathroom !== 'none' && !entryBath) {
        const col = spec.bathroom === 'rear-left' ? 0 : (rightWindow ?? 0);
        const row = spec.bathroom === 'middle-right' ? midRow : lastRow;
        deck = this.putIfEmpty(deck, row, col, { kind: 'bathroom' });
      }
    } else {
      // Planta alta: hueco de escalera donde desemboca.
      if (spec.stairs !== 'none') {
        const row = Math.min(lastRow, Math.max(0, spec.stairsRow ?? (
          spec.stairs === 'front-right' ? SEAT_LAYOUT_RULES.VESTIBULE.FRONT_ARRIVAL_ROW : spec.stairs.startsWith('rear') ? lastRow : midRow
        )));
        const right = !spec.stairs.endsWith('left') && rightWindow !== null;
        const col = right ? deck.aisleCol + 1 : deck.aisleCol - 1;
        deck = this.putIfEmpty(deck, row, col, { kind: 'stairs' }, true);
      }
      if (spec.bathroom === 'entry-both') deck = this.putIfEmpty(deck, lastRow, rightWindow ?? 0, { kind: 'bathroom' });
    }

    const exits = spec.emergencyExitRows?.[index];
    return exits ? { ...deck, emergencyExitRows: exits.filter(r => r >= 0 && r < deck.length) } : deck;
  }

  /** Digital Twin: arma el bus desde una carrocería de referencia. */
  static fromBody(vehicleId: string, body: BodyTemplate, strategy: NumberingPlan, scope: NumberingScope): VehicleLayout {
    return this.buildFromSpec(vehicleId, body.spec, strategy, scope);
  }

  /**
   * Infiere la especificación de un plano existente, para que el Grid Builder
   * abra con los valores actuales en vez de en blanco.
   */
  static specOf(layout: VehicleLayout): BuildSpec {
    const decks = layout.decks.map(deck => {
      const counts = new Map<SeatTypeCode, number>();
      for (const line of deck.cells) for (const c of line) if (c.kind === 'seat') counts.set(c.seatType, (counts.get(c.seatType) ?? 0) + 1);
      const seatType = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'EST';
      return { length: deck.length, left: deck.left, right: deck.right, seatType };
    });
    const d0 = layout.decks[0];
    const find = (kind: string): { row: number; col: number }[] => {
      const out: { row: number; col: number }[] = [];
      d0?.cells.forEach((line, row) => line.forEach((c, col) => { if (c.kind === kind) out.push({ row, col }); }));
      return out;
    };
    const baths = find('bathroom'), doors = [...(d0?.doors ?? [])];
    const last = (d0?.length ?? 1) - 1, mid = Math.floor((d0?.length ?? 1) / 2);

    // La escalera se describe por dónde DESEMBOCA en la planta alta.
    const d1 = layout.decks[1];
    let stairs: StairsPlacement = 'none';
    let stairsRow: number | undefined;
    d1?.cells.forEach((line, row) => line.forEach((c, col) => {
      if (c.kind !== 'stairs' || stairs !== 'none') return;
      const side = col < d1.aisleCol ? 'left' : 'right';
      const last1 = d1.length - 1, mid1 = Math.floor(d1.length / 2);
      stairs = row === last1 ? `rear-${side}` : row === mid1 ? `middle-${side}` : side === 'right' && row === SEAT_LAYOUT_RULES.VESTIBULE.FRONT_ARRIVAL_ROW ? 'front-right' : `middle-${side}`;
      if (stairs.startsWith('middle') && row !== mid1) stairsRow = row;
    }));

    const entry = baths.some(b => b.row === SEAT_LAYOUT_RULES.VESTIBULE.ROW);
    const upperBath = !!d1?.cells.flat().some(c => c.kind === 'bathroom');
    return {
      decks,
      bathroom: !baths.length ? 'none' : entry ? (upperBath ? 'entry-both' : 'entry') : baths[0].col === 0 ? 'rear-left' : baths[0].row === mid ? 'middle-right' : 'rear-right',
      doors: doors.length < 2 ? 'front' : doors.some(d => d.row === last) ? 'front-rear' : 'front-middle',
      stairs,
      ...(stairsRow !== undefined ? { stairsRow } : {}),
      emergencyExitRows: layout.decks.map(d => d.emergencyExitRows ?? [])
    };
  }

  /**
   * MOVER: lleva la celda `from` a `to` dentro del mismo piso. Sobre un hueco
   * se muda (el origen queda vacío); sobre otra butaca o mobiliario se
   * intercambian. El pasillo y la cabina no se tocan; la butaca conserva su
   * número, tipo y tarifa: mover no renumera.
   */
  static moveCell(layout: VehicleLayout, from: CellPosition, to: CellPosition): VehicleLayout {
    if (from.deck !== to.deck || (from.row === to.row && from.col === to.col)) return layout;
    const deck = layout.decks[from.deck];
    const source = this.cellAt(layout, from), target = this.cellAt(layout, to);
    if (!deck || !source || !target) return layout;
    if (source.kind === 'aisle' || source.kind === 'empty' || source.kind === 'cabin') return layout;
    if (target.kind === 'aisle' || target.kind === 'cabin') return layout;
    const cells = deck.cells.map(line => [...line]);
    cells[to.row][to.col] = source;
    cells[from.row][from.col] = target.kind === 'empty' ? EMPTY : target;
    return this.replaceDeck(layout, from.deck, { ...deck, cells });
  }

  /** Semáforo: tres luces y si se puede guardar. */
  static trafficLights(layout: VehicleLayout, vehicle: Vehicle | null): TrafficLightCheck {
    const stats = this.stats(layout, vehicle);
    const codes = new Set(stats.issues.map(i => i.code));
    const blocking = stats.issues.filter(i => (SEAT_LAYOUT_RULES.TRAFFIC.BLOCKING_CODES as readonly string[]).includes(i.code));

    const capacity = codes.has('OVER_CAPACITY') ? 'red' : codes.has('NO_SEATS') ? 'amber' : 'green';
    const exits = codes.has('NO_DOOR') ? 'red' : codes.has('NO_STAIRS') ? 'amber' : 'green';
    const numbering = codes.has('DUPLICATE_NUMBERS') ? 'red' : codes.has('NUMBER_GAPS') ? 'amber' : 'green';

    return { capacity, exits, numbering, canSave: blocking.length === 0 && exits !== 'red', firstIssue: this.firstIssueCell(layout, stats.capacity, codes), blocking };
  }

  /** Primera celda culpable de un rojo: duplicado o exceso de capacidad. */
  private static firstIssueCell(layout: VehicleLayout, capacity: number, codes: Set<string>): CellPosition | null {
    const seen = new Set<number>();
    let count = 0;
    for (let d = 0; d < layout.decks.length; d++) {
      const deck = layout.decks[d];
      for (let row = 0; row < deck.length; row++) for (let col = 0; col < deck.width; col++) {
        const c = deck.cells[row][col];
        if (c.kind !== 'seat') continue;
        count++;
        if (codes.has('OVER_CAPACITY') && capacity > 0 && count > capacity) return { deck: d, row, col };
        if (codes.has('DUPLICATE_NUMBERS') && this.isSellable(c.seatType)) {
          if (seen.has(c.number)) return { deck: d, row, col };
          seen.add(c.number);
        }
      }
    }
    return null;
  }

  private static putIfEmpty(deck: DeckLayout, row: number, col: number, cell: LayoutCell, force = false): DeckLayout {
    const current = deck.cells[row]?.[col];
    if (!current || current.kind === 'aisle' || (!force && current.kind !== 'empty')) return deck;
    return this.setDeckCell(deck, row, col, cell);
  }

  /** Copia el plano de otra unidad conservando el identificador propio. */
  static cloneFrom(source: VehicleLayout, vehicleId: string): VehicleLayout {
    return { ...source, vehicleId, updatedAt: new Date().toISOString() };
  }

  // ==========================================
  // EDICIÓN PUNTUAL
  // ==========================================

  static cellAt(layout: VehicleLayout, pos: CellPosition): LayoutCell | null {
    return layout.decks[pos.deck]?.cells[pos.row]?.[pos.col] ?? null;
  }

  static applyTool(layout: VehicleLayout, pos: CellPosition, tool: DesignerTool): VehicleLayout {
    const current = this.cellAt(layout, pos);
    if (!current || current.kind === 'aisle') {
      return layout;
    }
    switch (tool.kind) {
      case 'select':
      case 'number':
      case 'move':
        return layout;
      case 'erase': {
        if (current.kind === 'empty') {
          // Sobre un hueco: si hay una puerta a esa altura y de ese lado, se quita.
          const deck = layout.decks[pos.deck];
          const side = deck && pos.col < deck.aisleCol ? 'left' : 'right';
          return deck?.doors?.some(d => d.row === pos.row && d.side === side) ? this.replaceDeck(layout, pos.deck, this.withoutDoor(deck!, pos.row, side)) : layout;
        }
        // Una butaca de banqueta vive en la columna del pasillo: al borrarla
        // la celda vuelve a ser pasillo, no un hueco pintable.
        const deck = layout.decks[pos.deck];
        return this.setCell(layout, pos, deck && pos.col === deck.aisleCol ? AISLE : EMPTY);
      }
      case 'fixture':
        if (tool.fixture === 'door') {
          const deck = layout.decks[pos.deck];
          return deck ? this.replaceDeck(layout, pos.deck, this.withDoor(deck, pos.row, pos.col < deck.aisleCol ? 'left' : 'right')) : layout;
        }
        return current.kind === tool.fixture ? layout : this.setCell(layout, pos, { kind: tool.fixture });
      case 'seat':
        return this.placeSeat(layout, pos, tool.seatType);
    }
  }

  static placeSeat(layout: VehicleLayout, pos: CellPosition, seatType: SeatTypeCode): VehicleLayout {
    const current = this.cellAt(layout, pos);
    if (!current || current.kind === 'aisle') {
      return layout;
    }
    if (current.kind === 'seat') {
      return current.seatType === seatType ? layout : this.setCell(layout, pos, { ...current, seatType });
    }
    return this.setCell(layout, pos, { kind: 'seat', number: this.nextSeatNumber(layout), seatType });
  }

  static renumberSeat(layout: VehicleLayout, pos: CellPosition, number: number): VehicleLayout {
    const current = this.cellAt(layout, pos);
    if (!current || current.kind !== 'seat') {
      return layout;
    }
    const safe = Math.max(1, Math.floor(number));
    return safe === current.number ? layout : this.setCell(layout, pos, { ...current, number: safe });
  }

  /** Regla 6: la butaca toma `number` y toda ≥ number sube uno. */
  static insertNumber(layout: VehicleLayout, pos: CellPosition, number: number): VehicleLayout {
    const target = this.cellAt(layout, pos);
    if (!target || target.kind !== 'seat') {
      return layout;
    }
    const n = Math.max(1, Math.floor(number));
    const decks = layout.decks.map((deck, d) => ({
      ...deck,
      cells: deck.cells.map((line, r) =>
        line.map((cell, c) => {
          if (cell.kind !== 'seat') {
            return cell;
          }
          if (d === pos.deck && r === pos.row && c === pos.col) {
            return { ...cell, number: n };
          }
          return cell.number >= n && this.isSellable(cell.seatType) ? { ...cell, number: cell.number + 1 } : cell;
        })
      )
    }));
    return { ...layout, decks, updatedAt: new Date().toISOString() };
  }

  static setCell(layout: VehicleLayout, pos: CellPosition, cell: LayoutCell): VehicleLayout {
    const deck = layout.decks[pos.deck];
    if (!deck || !deck.cells[pos.row] || pos.col < 0 || pos.col >= deck.width) {
      return layout;
    }
    return this.replaceDeck(layout, pos.deck, this.setDeckCell(deck, pos.row, pos.col, cell));
  }

  static nextSeatNumber(layout: VehicleLayout): number {
    let max = SEAT_LAYOUT_RULES.NUMBERING.FIRST_NUMBER - 1;
    for (const deck of layout.decks) for (const line of deck.cells) for (const cell of line) {
      if (cell.kind === 'seat' && cell.number > max) max = cell.number;
    }
    return max + 1;
  }

  // ==========================================
  // SELECCIÓN MASIVA (LASSO)
  // ==========================================

  /** Claves de todas las celdas no-pasillo dentro de un rectángulo del piso. */
  static keysInRect(deck: DeckLayout, deckIndex: number, r1: number, c1: number, r2: number, c2: number): CellKey[] {
    const keys: CellKey[] = [];
    const [rowA, rowB] = [Math.min(r1, r2), Math.max(r1, r2)];
    const [colA, colB] = [Math.min(c1, c2), Math.max(c1, c2)];
    for (let row = Math.max(0, rowA); row <= Math.min(deck.length - 1, rowB); row++) {
      for (let col = Math.max(0, colA); col <= Math.min(deck.width - 1, colB); col++) {
        if (deck.cells[row][col].kind !== 'aisle') {
          keys.push(cellKey({ deck: deckIndex, row, col }));
        }
      }
    }
    return keys;
  }

  static applyToSelection(layout: VehicleLayout, keys: ReadonlySet<CellKey>, op: SelectionOperation): VehicleLayout {
    let next = layout;
    for (const key of keys) {
      const pos = parseKey(key);
      const cell = this.cellAt(next, pos);
      if (!cell) continue;

      switch (op.kind) {
        case 'erase':
          if (cell.kind !== 'empty' && cell.kind !== 'aisle') next = this.setCell(next, pos, EMPTY);
          break;
        case 'seatType':
          if (cell.kind === 'seat' || cell.kind === 'empty') next = this.placeSeat(next, pos, op.seatType);
          break;
        case 'fare':
          if (cell.kind === 'seat') {
            const { fareCategoryId, ...rest } = cell;
            next = this.setCell(next, pos, op.fareCategoryId ? { ...cell, fareCategoryId: op.fareCategoryId } : rest);
          }
          break;
        case 'amenity':
          if (cell.kind === 'seat') {
            const current = new Set<Amenity>(cell.amenities ?? []);
            op.on ? current.add(op.amenity) : current.delete(op.amenity);
            next = this.setCell(next, pos, { ...cell, amenities: [...current] });
          }
          break;
      }
    }
    return next;
  }

  /**
   * Mueve un bloque seleccionado ±filas. Solo si TODOS los destinos están
   * libres (o son parte del propio bloque): un bloque nunca pisa butacas.
   */
  static shiftSelection(layout: VehicleLayout, keys: ReadonlySet<CellKey>, deltaRows: number): VehicleLayout {
    if (!keys.size || deltaRows === 0) return layout;
    const positions = [...keys].map(parseKey);
    const deckIndex = positions[0].deck;
    const deck = layout.decks[deckIndex];
    if (!deck || positions.some(p => p.deck !== deckIndex)) return layout;

    for (const p of positions) {
      const target = { deck: deckIndex, row: p.row + deltaRows, col: p.col };
      if (target.row < 0 || target.row >= deck.length) return layout;
      const cell = deck.cells[target.row][target.col];
      const insideBlock = keys.has(cellKey(target));
      if (cell.kind === 'aisle' || (cell.kind !== 'empty' && !insideBlock)) return layout;
    }

    const moved = new Map<CellKey, LayoutCell>();
    for (const p of positions) {
      moved.set(cellKey({ deck: deckIndex, row: p.row + deltaRows, col: p.col }), deck.cells[p.row][p.col]);
    }
    const cells = deck.cells.map((line, row) =>
      line.map((cell, col) => {
        const key = cellKey({ deck: deckIndex, row, col });
        if (moved.has(key)) return moved.get(key)!;
        return keys.has(key) ? EMPTY : cell;
      })
    );
    return this.replaceDeck(layout, deckIndex, { ...deck, cells });
  }

  // ==========================================
  // CONSTRUCCIÓN RÁPIDA
  // ==========================================

  /**
   * Stamp & Chain: duplica una fila `count` veces justo detrás de ella.
   * Solo se estampan BUTACAS: el mobiliario (cabina, puerta, baño, escalera,
   * mesa) es singular por naturaleza y se deja vacío en las copias. Las
   * butacas nuevas toman números libres.
   */
  static duplicateRow(layout: VehicleLayout, deckIndex: number, row: number, count = 1): VehicleLayout {
    const deck = layout.decks[deckIndex];
    if (!deck || row < 0 || row >= deck.length || count < 1) return layout;
    const { MAX_LENGTH } = SEAT_LAYOUT_RULES.GRID;
    const room = MAX_LENGTH - deck.length;
    const copies = Math.min(count, room);
    if (copies <= 0) return layout;

    let next = layout;
    let nextNumber = this.nextSeatNumber(layout);
    const template = deck.cells[row].map(cell => (this.isFixture(cell.kind) ? EMPTY : cell));

    const newLines: LayoutCell[][] = [];
    for (let i = 0; i < copies; i++) {
      newLines.push(template.map(cell => (cell.kind === 'seat' ? { ...cell, number: nextNumber++ } : cell)));
    }
    const cells = [...deck.cells.slice(0, row + 1), ...newLines, ...deck.cells.slice(row + 1)];
    next = this.replaceDeck(next, deckIndex, { ...deck, length: cells.length, cells });
    return next;
  }

  /** Estira el chasis hasta `length` estampando la última fila. */
  static extendTo(layout: VehicleLayout, deckIndex: number, length: number): VehicleLayout {
    const deck = layout.decks[deckIndex];
    if (!deck) return layout;
    const target = Math.min(SEAT_LAYOUT_RULES.GRID.MAX_LENGTH, Math.max(SEAT_LAYOUT_RULES.GRID.MIN_LENGTH, Math.floor(length)));
    if (target > deck.length) return this.duplicateRow(layout, deckIndex, deck.length - 1, target - deck.length);
    if (target < deck.length) return this.resizeDeck(layout, deckIndex, target);
    return layout;
  }

  /** Regla 4: morph de columnas conservando las butacas ancladas a su ventana. */
  static resizeWidth(layout: VehicleLayout, deckIndex: number, left: number, right: number): VehicleLayout {
    const deck = layout.decks[deckIndex];
    if (!deck) return layout;
    const { GRID } = SEAT_LAYOUT_RULES;
    const newLeft = Math.min(GRID.MAX_SIDE, Math.max(1, left));
    const newRight = Math.min(GRID.MAX_SIDE, Math.max(0, right));
    if (newLeft === deck.left && newRight === deck.right) return layout;

    const width = newLeft + GRID.AISLE_WIDTH + newRight;
    const cells = deck.cells.map(line => {
      const out: LayoutCell[] = [];
      for (let col = 0; col < width; col++) {
        if (col === newLeft) { out.push(AISLE); continue; }
        if (col < newLeft) {
          // Lado izquierdo: misma distancia a la ventana izquierda.
          out.push(col < deck.left ? line[col] : EMPTY);
        } else {
          // Lado derecho: misma distancia a la ventana derecha.
          const fromRight = width - 1 - col;
          out.push(fromRight < deck.right ? line[deck.width - 1 - fromRight] : EMPTY);
        }
      }
      return out;
    });
    return this.replaceDeck(layout, deckIndex, { ...deck, left: newLeft, right: newRight, width, aisleCol: newLeft, cells });
  }

  /**
   * INVERTIR LADOS: permuta las columnas de un lado y otro del pasillo
   * (1+2 ⇄ 2+1) y renumera con la regla activa. Cabina y puerta no viajan:
   * están anclados a su lado físico (conductor a la izquierda, acera a la
   * derecha), así que se vuelven a colocar en su sitio tras el volteo.
   */
  static swapSides(layout: VehicleLayout, deckIndex: number, strategy?: NumberingPlan, scope?: NumberingScope): VehicleLayout {
    const deck = layout.decks[deckIndex];
    if (!deck) return layout;
    const newLeft = deck.right, newRight = deck.left;
    const width = deck.width, aisleCol = newLeft;

    const cells = deck.cells.map(line => {
      const flipped = [...line].reverse();
      const out = flipped.map((cell, col) => {
        if (col === aisleCol) return line[deck.aisleCol];   // el pasillo (o su banqueta) se queda
        if (cell.kind === 'aisle') return EMPTY;            // el antiguo pasillo pasa a hueco
        return cell;
      });
      // Anclaje físico: la cabina vuelve a su lado (las puertas son marcadores
      // de borde con lado propio y no viajan).
      const hadCabin = line.some(c => c.kind === 'cabin');
      for (let c = 0; c < width; c++) if (out[c].kind === 'cabin') out[c] = EMPTY;
      if (hadCabin) out[0] = { kind: 'cabin' };
      return out;
    });

    const swapped = this.replaceDeck(layout, deckIndex, { ...deck, left: newLeft, right: newRight, aisleCol, cells });
    return this.autoNumber(swapped, strategy, scope);
  }

  static resizeDeck(layout: VehicleLayout, deckIndex: number, length: number): VehicleLayout {
    const deck = layout.decks[deckIndex];
    if (!deck) return layout;
    const { MIN_LENGTH, MAX_LENGTH } = SEAT_LAYOUT_RULES.GRID;
    const target = Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, Math.floor(length)));
    if (target === deck.length) return layout;
    const cells = deck.cells.slice(0, target).map(line => [...line]);
    while (cells.length < target) {
      const line: LayoutCell[] = [];
      for (let col = 0; col < deck.width; col++) line.push(col === deck.aisleCol ? AISLE : EMPTY);
      cells.push(line);
    }
    return this.replaceDeck(layout, deckIndex, { ...deck, length: target, cells });
  }

  static clearDeck(layout: VehicleLayout, deckIndex: number): VehicleLayout {
    const deck = layout.decks[deckIndex];
    if (!deck) return layout;
    const cells = deck.cells.map(line => line.map(cell => (cell.kind === 'aisle' ? AISLE : EMPTY)));
    return this.replaceDeck(layout, deckIndex, { ...deck, cells });
  }

  /** Regla 5: refleja el lado corto sobre el otro y renumera. */
  static mirror(layout: VehicleLayout, deckIndex: number, strategy?: NumberingPlan, scope?: NumberingScope): VehicleLayout {
    const deck = layout.decks[deckIndex];
    if (!deck || deck.right === 0) return layout;
    const span = Math.min(deck.left, deck.right);
    const cells = deck.cells.map(line => {
      const copy = [...line];
      for (let k = 0; k < span; k++) {
        const source = line[deck.left - 1 - k];          // desde el pasillo hacia la ventana izq
        const targetCol = deck.aisleCol + 1 + k;          // desde el pasillo hacia la ventana der
        if (source.kind === 'cabin' || source.kind === 'door') continue;
        copy[targetCol] = source.kind === 'seat' ? { ...source } : source;
      }
      return copy;
    });
    return this.autoNumber(this.replaceDeck(layout, deckIndex, { ...deck, cells }), strategy, scope);
  }

  /**
   * Plantilla: llena las celdas vacías salvo la fila de cabina, y numera.
   *  - `limit`     tope de butacas: se rellena fila a fila y la última queda
   *                parcial ("33 semicama" son 33, no 36).
   *  - `rearBench` la última fila ocupa también la posición del pasillo.
   */
  static fillTemplate(
    layout: VehicleLayout, deckIndex: number, seatType: SeatTypeCode,
    strategy?: NumberingPlan, scope?: NumberingScope, limit?: number, rearBench = false,
    rowOverrides: readonly RowOverride[] = []
  ): VehicleLayout {
    const deck = layout.decks[deckIndex];
    if (!deck) return layout;
    let remaining = limit ?? Number.POSITIVE_INFINITY;
    const lastRow = deck.length - 1;

    // Piso mixto: la fila N del SALÓN (sin contar la de cabina) lleva otro tipo.
    const firstSalonRow = deck.cells.findIndex(line => !line.some(c => c.kind === 'cabin'));
    const typeForRow = (row: number): SeatTypeCode =>
      rowOverrides.find(o => o.row === row - Math.max(0, firstSalonRow))?.seatType ?? seatType;

    // La banqueta se reserva ANTES del relleno: es la butaca del fondo por
    // definición, y con tope de plazas el recorrido fila a fila no llegaría.
    let cells = deck.cells.map(line => [...line]);
    if (rearBench && remaining > 0 && cells[lastRow]?.[deck.aisleCol]?.kind === 'aisle') {
      cells[lastRow][deck.aisleCol] = { kind: 'seat', number: 0, seatType } as SeatCell;
      remaining--;
    }

    cells = cells.map((line, row) => {
      const isDriverRow = line.some(cell => cell.kind === 'cabin');
      return line.map(cell => {
        if (cell.kind !== 'empty' || isDriverRow || remaining <= 0) return cell;
        remaining--;
        return { kind: 'seat', number: 0, seatType: typeForRow(row) } as SeatCell;
      });
    });
    return this.autoNumber(this.replaceDeck(layout, deckIndex, { ...deck, cells }), strategy, scope);
  }

  // ==========================================
  // NUMERACIÓN
  // ==========================================

  static autoNumber(
    layout: VehicleLayout,
    strategy: NumberingPlan = SEAT_LAYOUT_RULES.NUMBERING.DEFAULT_STRATEGY,
    scope: NumberingScope = SEAT_LAYOUT_RULES.NUMBERING.DEFAULT_SCOPE,
    direction?: NumberingDirection
  ): VehicleLayout {
    let next = SEAT_LAYOUT_RULES.NUMBERING.FIRST_NUMBER;
    const decks = layout.decks.map((deck, index) => {
      if (scope === 'perDeck') next = SEAT_LAYOUT_RULES.NUMBERING.FIRST_NUMBER;
      const cells = deck.cells.map(line => [...line]);
      for (const { row, col } of this.traversalOrder(deck, this.strategyFor(strategy, index), direction)) {
        const cell = cells[row][col];
        if (cell.kind === 'seat' && this.isSellable(cell.seatType)) cells[row][col] = { ...cell, number: next++ };
      }
      return { ...deck, cells };
    });
    return { ...layout, decks, updatedAt: new Date().toISOString() };
  }

  /** Serpiente: numera 1..N las butacas del trazo en el orden recorrido. */
  /**
   * COMPACTAR: cierra los huecos de la serie SIN reordenar nada. Recorre las
   * butacas vendibles en el orden que YA tienen y les reasigna 1..N, así que
   * borrar la 7 y la 8 no deja boletos inexistentes en ventanilla ni destruye
   * una numeración dibujada a mano con la serpiente. Las celdas vacías, el
   * pasillo y el mobiliario se ignoran; ambulatorias y relevo no llevan número.
   */
  static recompact(layout: VehicleLayout, scope: NumberingScope = SEAT_LAYOUT_RULES.NUMBERING.DEFAULT_SCOPE): VehicleLayout {
    let next = SEAT_LAYOUT_RULES.NUMBERING.FIRST_NUMBER;
    let changed = false;

    const decks = layout.decks.map(deck => {
      if (scope === 'perDeck') next = SEAT_LAYOUT_RULES.NUMBERING.FIRST_NUMBER;
      // Desempate estable para las butacas aún sin número (recién pintadas).
      const rank = new Map<string, number>();
      this.traversalOrder(deck, 'sides').forEach((p, i) => rank.set(`${p.row}:${p.col}`, i));

      const seats: { row: number; col: number; order: number }[] = [];
      const clear: { row: number; col: number }[] = [];
      deck.cells.forEach((line, row) => line.forEach((cell, col) => {
        if (cell.kind !== 'seat') return;
        if (this.isSellable(cell.seatType)) seats.push({ row, col, order: cell.number > 0 ? cell.number : Number.MAX_SAFE_INTEGER });
        // Lo que deja de venderse suelta su número: si no, quedaría un
        // duplicado cuando la serie se cierre sobre el hueco que dejó.
        else if (cell.number !== 0) clear.push({ row, col });
      }));
      seats.sort((a, b) => a.order - b.order || (rank.get(`${a.row}:${a.col}`) ?? 0) - (rank.get(`${b.row}:${b.col}`) ?? 0));

      const cells = deck.cells.map(line => [...line]);
      for (const seat of seats) {
        const cell = cells[seat.row][seat.col] as SeatCell;
        const number = next++;
        if (cell.number !== number) { cells[seat.row][seat.col] = { ...cell, number }; changed = true; }
      }
      for (const spot of clear) {
        cells[spot.row][spot.col] = { ...(cells[spot.row][spot.col] as SeatCell), number: 0 };
        changed = true;
      }
      return { ...deck, cells };
    });

    return changed ? { ...layout, decks, updatedAt: new Date().toISOString() } : layout;
  }

  /** ¿La serie tiene huecos o butacas sin numerar? (dispara la compactación) */
  static needsCompaction(layout: VehicleLayout): boolean {
    return this.recompact(layout) !== layout;
  }

  /** Tipo de butaca predominante de un piso: el que se usa al añadir plazas. */
  static dominantSeatType(deck: DeckLayout): SeatTypeCode {
    const counts = new Map<SeatTypeCode, number>();
    for (const line of deck.cells) for (const cell of line) {
      if (cell.kind === 'seat') counts.set(cell.seatType, (counts.get(cell.seatType) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'SEM';
  }

  /**
   * QUITAR PLAZAS: retira `count` butacas empezando POR EL FONDO ("quítame 2
   * del piso 2, queda muy apretado"). Dentro de cada fila se van las del lado
   * de la puerta primero, para que la ventana del conductor sea la última en
   * perderse. Al terminar, la serie se compacta.
   */
  static removeSeats(layout: VehicleLayout, deckIndex: number, count: number, scope?: NumberingScope): VehicleLayout {
    const deck = layout.decks[deckIndex];
    if (!deck || count <= 0) return layout;
    const cells = deck.cells.map(line => [...line]);
    let left = count;
    for (let row = deck.length - 1; row >= 0 && left > 0; row--) {
      for (let col = deck.width - 1; col >= 0 && left > 0; col--) {
        const cell = cells[row][col];
        if (cell.kind !== 'seat') continue;
        cells[row][col] = col === deck.aisleCol ? AISLE : EMPTY;
        left--;
      }
    }
    if (left === count) return layout;
    return this.recompact(this.replaceDeck(layout, deckIndex, { ...deck, cells }), scope);
  }

  /**
   * AÑADIR PLAZAS: llena los huecos existentes de frente a fondo y, si no
   * bastan, alarga el piso lo justo. Nunca escribe sobre el pasillo ni sobre
   * la fila de cabina.
   */
  static addSeats(layout: VehicleLayout, deckIndex: number, count: number, seatType?: SeatTypeCode, scope?: NumberingScope): VehicleLayout {
    const start = layout.decks[deckIndex];
    if (!start || count <= 0) return layout;
    const type = seatType ?? this.dominantSeatType(start);
    let current = layout;
    let left = count;

    for (let guard = 0; guard < SEAT_LAYOUT_RULES.GRID.MAX_LENGTH && left > 0; guard++) {
      const deck = current.decks[deckIndex];
      const cells = deck.cells.map(line => [...line]);
      let placed = 0;
      for (const { row, col } of this.traversalOrder(deck, 'rows')) {
        if (left - placed <= 0) break;
        if (cells[row][col].kind !== 'empty' || cells[row].some(c => c.kind === 'cabin')) continue;
        cells[row][col] = { kind: 'seat', number: 0, seatType: type } as SeatCell;
        placed++;
      }
      if (placed) { current = this.replaceDeck(current, deckIndex, { ...deck, cells }); left -= placed; }
      if (left <= 0) break;
      if (deck.length >= SEAT_LAYOUT_RULES.GRID.MAX_LENGTH) break;      // no cabe más bus
      current = this.extendTo(current, deckIndex, deck.length + 1);
    }
    return left === count ? layout : this.recompact(current, scope);
  }

  /**
   * Añade filas completas al fondo. Alargar el piso ya arrastra una copia de
   * la última fila, así que solo se rellena lo que falte para completarlas:
   * de lo contrario se colarían butacas en huecos anteriores del salón.
   */
  static addRows(layout: VehicleLayout, deckIndex: number, rows = 1, seatType?: SeatTypeCode, scope?: NumberingScope): VehicleLayout {
    const deck = layout.decks[deckIndex];
    if (!deck || rows <= 0) return layout;
    const perRow = deck.left + deck.right;
    const before = this.countSeats(deck);
    const stretched = this.extendTo(layout, deckIndex, deck.length + rows);
    const added = this.countSeats(stretched.decks[deckIndex]) - before;
    const missing = perRow * rows - added;
    return missing > 0 ? this.addSeats(stretched, deckIndex, missing, seatType, scope) : this.recompact(stretched, scope);
  }

  private static countSeats(deck: DeckLayout): number {
    let n = 0;
    for (const line of deck.cells) for (const cell of line) if (cell.kind === 'seat') n++;
    return n;
  }

  /** Localiza una butaca por su número de venta. */
  static findSeat(layout: VehicleLayout, number: number): CellPosition | null {
    for (let d = 0; d < layout.decks.length; d++) {
      const deck = layout.decks[d];
      for (let row = 0; row < deck.length; row++) for (let col = 0; col < deck.width; col++) {
        const cell = deck.cells[row][col];
        if (cell.kind === 'seat' && this.isSellable(cell.seatType) && cell.number === number) return { deck: d, row, col };
      }
    }
    return null;
  }

  /**
   * Cambia el tipo de una butaca por su número. Si el tipo nuevo no se vende
   * (relevo, ambulatorio) la serie se compacta: su número vuelve al pozo.
   */
  static setSeatTypeByNumber(layout: VehicleLayout, number: number, seatType: SeatTypeCode, scope?: NumberingScope): VehicleLayout {
    const pos = this.findSeat(layout, number);
    if (!pos) return layout;
    const next = this.setCell(layout, pos, { kind: 'seat', number, seatType });
    return this.isSellable(seatType) ? next : this.recompact(next, scope);
  }

  /** Borra una butaca por su número y cierra el hueco de la serie. */
  static eraseSeatByNumber(layout: VehicleLayout, number: number, scope?: NumberingScope): VehicleLayout {
    const pos = this.findSeat(layout, number);
    if (!pos) return layout;
    return this.recompact(this.applyTool(layout, pos, { kind: 'erase' }), scope);
  }

  /** "Del 1 al 12 que sean cama": aplica un tipo a un rango de números. */
  static applyRangeType(layout: VehicleLayout, from: number, to: number, seatType: SeatTypeCode, scope?: NumberingScope): VehicleLayout {
    const low = Math.min(from, to), high = Math.max(from, to);
    let next = layout;
    for (let n = low; n <= high; n++) {
      const pos = this.findSeat(next, n);
      if (pos) next = this.setCell(next, pos, { kind: 'seat', number: n, seatType });
    }
    return this.isSellable(seatType) ? next : this.recompact(next, scope);
  }

  /** Lado del pasillo donde está la escalera de un piso. */
  static stairsSideOf(deck: DeckLayout): 'left' | 'right' | null {
    for (let row = 0; row < deck.length; row++) for (let col = 0; col < deck.width; col++) {
      if (deck.cells[row][col].kind === 'stairs') return col < deck.aisleCol ? 'left' : 'right';
    }
    return null;
  }

  /**
   * ESCALERA ENLAZADA. La escalera es UNA sola pieza: nace en el vestíbulo de
   * la planta baja y desemboca en el salón del piso alto, pero no puede
   * cruzar el bus por el aire. Si un piso cambia de lado, el otro lo sigue:
   * se busca la celda espejo en su misma fila y se intercambia el contenido,
   * de modo que no se pierde ninguna butaca.
   */
  static syncStairs(layout: VehicleLayout, sourceDeck: number): VehicleLayout {
    if (layout.decks.length < 2) return layout;
    const source = layout.decks[sourceDeck];
    const side = source && this.stairsSideOf(source);
    if (!side) return layout;

    let next = layout;
    layout.decks.forEach((deck, index) => {
      if (index === sourceDeck) return;
      const other = this.stairsSideOf(deck);
      if (!other || other === side) return;
      let at: CellPosition | null = null;
      deck.cells.forEach((line, row) => line.forEach((c, col) => { if (c.kind === 'stairs' && !at) at = { deck: index, row, col }; }));
      if (!at) return;
      const spot = at as CellPosition;
      const mirror = deck.width - 1 - spot.col;
      if (mirror === deck.aisleCol || mirror < 0 || mirror >= deck.width) return;
      const occupant = deck.cells[spot.row][mirror];
      if (occupant.kind === 'aisle' || occupant.kind === 'cabin') return;
      const cells = deck.cells.map(line => [...line]);
      cells[spot.row][mirror] = { kind: 'stairs' };
      cells[spot.row][spot.col] = occupant.kind === 'stairs' ? EMPTY : occupant;
      next = this.replaceDeck(next, index, { ...deck, cells });
    });
    return next;
  }

  /** Regla de un piso dentro del plan: la suya, o la última definida, o la de fábrica. */
  static strategyFor(plan: NumberingPlan | undefined, deckIndex: number): NumberingStrategy {
    if (!plan) return SEAT_LAYOUT_RULES.NUMBERING.DEFAULT_STRATEGY;
    if (typeof plan === 'string') return plan;
    return plan[deckIndex] ?? plan[plan.length - 1] ?? SEAT_LAYOUT_RULES.NUMBERING.DEFAULT_STRATEGY;
  }

  static renumberPath(layout: VehicleLayout, path: readonly CellPosition[], start = SEAT_LAYOUT_RULES.NUMBERING.FIRST_NUMBER): VehicleLayout {
    let next = layout;
    let n = start;
    const seen = new Set<CellKey>();
    for (const pos of path) {
      const key = cellKey(pos);
      if (seen.has(key)) continue;
      const cell = this.cellAt(next, pos);
      if (cell?.kind === 'seat' && this.isSellable(cell.seatType)) {
        seen.add(key);
        if (cell.number !== n) next = this.setCell(next, pos, { ...cell, number: n });
        n++;
      }
    }
    return next;
  }

  /**
   * Recorrido de numeración.
   *  - `rows`      fila a fila cruzando el pasillo.
   *  - `sides`     lado izquierdo completo de ventana→pasillo, luego el derecho
   *                de pasillo→ventana. La ventana recibe impares.
   *  - `aisleOdd`  igual por lados, pero dentro de cada fila se recorre desde
   *                el pasillo hacia la ventana: el pasillo recibe impares.
   * Las butacas de banqueta (columna del pasillo) van siempre al final.
   */
  private static traversalOrder(deck: DeckLayout, strategy: NumberingStrategy, direction?: NumberingDirection): CellPosition[] {
    const order: CellPosition[] = [];
    const d = deck.floor - 1;
    const dir = direction ?? (SEAT_LAYOUT_RULES.NUMBERING.DEFAULT_DIRECTION as NumberingDirection);
    // Sentido a lo largo del bus: del frente al fondo, o al revés.
    const rows = Array.from({ length: deck.length }, (_, r) => r);
    if (dir.origin === 'rear') rows.reverse();

    const bench: CellPosition[] = [];
    for (const row of rows) {
      if (deck.cells[row][deck.aisleCol]?.kind === 'seat') bench.push({ deck: d, row, col: deck.aisleCol });
    }

    if (strategy === 'rows') {
      const cols = Array.from({ length: deck.width }, (_, c) => c).filter(c => c !== deck.aisleCol);
      if (dir.side === 'door') cols.reverse();
      for (const row of rows) for (const col of cols) order.push({ deck: d, row, col });
      return [...order, ...bench];
    }

    // `sides`: izquierda ventana→pasillo, derecha pasillo→ventana (regla 2 y 3
    // del motor). `aisleOdd`: la izquierda se recorre al revés, pasillo→ventana,
    // y la derecha ya lo hace; con lados pares el pasillo queda impar.
    const leftCols = Array.from({ length: deck.aisleCol }, (_, c) => c);
    const rightCols = Array.from({ length: deck.right }, (_, k) => deck.aisleCol + 1 + k);
    const leftOrder = strategy === 'aisleOdd' ? [...leftCols].reverse() : leftCols;
    // Con qué costado abre la serie: el del conductor (izquierda) o el de la puerta.
    const sides = dir.side === 'door' ? [rightCols, leftOrder] : [leftOrder, rightCols];

    for (const cols of sides) for (const row of rows) for (const col of cols) order.push({ deck: d, row, col });
    return [...order, ...bench];
  }

  // ==========================================
  // LECTURA
  // ==========================================

  static stats(layout: VehicleLayout, vehicle: Vehicle | null): LayoutStats {
    const byType = new Map<SeatTypeCode, number>();
    const byDeck: number[] = [];
    const numbers: number[] = [];
    let totalSeats = 0, hasDoor = false, hasStairs = false;

    for (const deck of layout.decks) {
      let deckSeats = 0;
      for (const line of deck.cells) for (const cell of line) {
        if (cell.kind === 'seat') {
          deckSeats++; totalSeats++;
          byType.set(cell.seatType, (byType.get(cell.seatType) ?? 0) + 1);
          if (this.isSellable(cell.seatType)) numbers.push(cell.number);
        } else if (cell.kind === 'door') hasDoor = true;
        else if (cell.kind === 'stairs') hasStairs = true;
      }
      if (deck.doors?.length) hasDoor = true;
      byDeck.push(deckSeats);
    }

    const capacity = vehicle?.passengerCapacity ?? 0;
    return {
      totalSeats, byType, byDeck, capacity,
      fillRatio: capacity > 0 ? Math.min(1, totalSeats / capacity) : 0,
      issues: this.validate({
        totalSeats, numbers, capacity, hasDoor, hasStairs, decks: layout.decks.length,
        stairsSides: layout.decks.map(d => this.stairsSideOf(d))
      })
    };
  }

  private static validate(input: {
    totalSeats: number; numbers: number[]; capacity: number; hasDoor: boolean; hasStairs: boolean; decks: number;
    stairsSides?: readonly ('left' | 'right' | null)[];
  }): LayoutIssue[] {
    const issues: LayoutIssue[] = [];
    if (input.totalSeats === 0) issues.push({ level: 'warning', code: 'NO_SEATS', message: 'El plano no tiene butacas todavía.' });
    if (input.capacity > 0 && input.totalSeats > input.capacity) {
      issues.push({ level: 'error', code: 'OVER_CAPACITY', message: `Hay ${input.totalSeats} butacas y la unidad admite ${input.capacity}.` });
    }
    const seen = new Set<number>(), duplicates = new Set<number>();
    for (const n of input.numbers) { if (seen.has(n)) duplicates.add(n); seen.add(n); }
    if (duplicates.size) {
      issues.push({ level: 'error', code: 'DUPLICATE_NUMBERS', message: `Números repetidos: ${[...duplicates].sort((a, b) => a - b).join(', ')}.` });
    }
    if (input.numbers.length && !duplicates.size) {
      const sorted = [...input.numbers].sort((a, b) => a - b);
      const gaps = sorted[sorted.length - 1] - sorted[0] + 1 - sorted.length;
      if (gaps > 0) issues.push({ level: 'warning', code: 'NUMBER_GAPS', message: `La numeración tiene ${gaps} hueco${gaps === 1 ? '' : 's'}. Usa Auto-numerar.` });
    }
    if (!input.hasDoor) issues.push({ level: 'warning', code: 'NO_DOOR', message: 'El plano no tiene puerta.' });
    if (input.decks > 1 && !input.hasStairs) issues.push({ level: 'warning', code: 'NO_STAIRS', message: 'Un bus de dos pisos necesita escalera.' });

    // La escalera es una sola pieza: tiene que existir y estar del mismo lado
    // en los dos pisos, o un pasajero subiría contra el piso macizo.
    const sides = input.stairsSides ?? [];
    if (input.decks > 1 && input.hasStairs) {
      if (sides.some(side => side === null)) {
        issues.push({ level: 'warning', code: 'STAIRS_UNPAIRED', message: 'La escalera está en un solo piso: falta su otro extremo.' });
      } else if (new Set(sides).size > 1) {
        issues.push({ level: 'warning', code: 'STAIRS_MISALIGNED', message: 'La escalera cambia de lado entre pisos: no encajan.' });
      }
    }
    return issues;
  }

  /** ¿Esta butaca se vende y por tanto lleva número? */
  static isSellable(seatType: SeatTypeCode): boolean {
    return !(SEAT_LAYOUT_RULES.NUMBERING.UNNUMBERED as readonly string[]).includes(seatType);
  }

  static isFixture(kind: LayoutCell['kind']): kind is FixtureKind {
    return kind === 'cabin' || kind === 'door' || kind === 'bathroom' || kind === 'stairs' || kind === 'table';
  }

  private static setDeckCell(deck: DeckLayout, row: number, col: number, cell: LayoutCell): DeckLayout {
    return { ...deck, cells: deck.cells.map((line, r) => (r === row ? line.map((c, k) => (k === col ? cell : c)) : line)) };
  }

  private static replaceDeck(layout: VehicleLayout, index: number, deck: DeckLayout): VehicleLayout {
    // Las puertas viven en filas: si el piso se acorta, las que sobran caen.
    const doors = (deck.doors ?? []).filter(d => d.row >= 0 && d.row < deck.length);
    return { ...layout, decks: layout.decks.map((d, i) => (i === index ? { ...deck, doors } : d)), updatedAt: new Date().toISOString() };
  }

  /** Añade una puerta (marcador de borde) si no existe ya a esa altura y lado. */
  static withDoor(deck: DeckLayout, row: number, side: DoorMarker['side']): DeckLayout {
    if (row < 0 || row >= deck.length) return deck;
    const doors = deck.doors ?? [];
    return doors.some(d => d.row === row && d.side === side) ? deck : { ...deck, doors: [...doors, { row, side }] };
  }

  static withoutDoor(deck: DeckLayout, row: number, side: DoorMarker['side']): DeckLayout {
    return { ...deck, doors: (deck.doors ?? []).filter(d => !(d.row === row && d.side === side)) };
  }

  static addDoor(layout: VehicleLayout, deckIndex: number, row: number, side: DoorMarker['side']): VehicleLayout {
    const deck = layout.decks[deckIndex];
    return deck ? this.replaceDeck(layout, deckIndex, this.withDoor(deck, row, side)) : layout;
  }

  static removeDoor(layout: VehicleLayout, deckIndex: number, row: number, side: DoorMarker['side']): VehicleLayout {
    const deck = layout.decks[deckIndex];
    return deck ? this.replaceDeck(layout, deckIndex, this.withoutDoor(deck, row, side)) : layout;
  }

  /**
   * Planos guardados antes de este cambio traen la puerta como celda. Se
   * convierte en marcador y la celda queda libre. Idempotente.
   */
  static migrate(layout: VehicleLayout): VehicleLayout {
    let changed = false;
    const decks = layout.decks.map(deck => {
      const doors = [...(deck.doors ?? [])];
      const cells = deck.cells.map((line, row) => line.map((cell, col) => {
        if (cell.kind !== 'door') return cell;
        changed = true;
        const side: DoorMarker['side'] = col < deck.aisleCol ? 'left' : 'right';
        if (!doors.some(d => d.row === row && d.side === side)) doors.push({ row, side });
        return EMPTY;
      }));
      return changed || !deck.doors ? { ...deck, cells, doors } : deck;
    });
    return changed ? { ...layout, decks } : layout.decks.every(d => d.doors) ? layout : { ...layout, decks };
  }
}
