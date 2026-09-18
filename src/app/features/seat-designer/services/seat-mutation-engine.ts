import { SEAT_LAYOUT_RULES } from '@core';
import { MutationResult, NumberingDirection, NumberingScope, NumberingStrategy, SeatTypeCode, SeatTypeItem, VehicleLayout } from '../models/seat-layout.model';
import { SeatLayoutEngine } from './seat-layout-engine';
import { SeatPromptEngine } from './seat-prompt-engine';
import { SeatTypeResolver } from './seat-type-resolver';

/** Estado de numeración vigente en el lienzo cuando llega el comando. */
export interface MutationContext {
  /** Una regla por piso (ya resuelta, sin huecos). */
  readonly plan: readonly NumberingStrategy[];
  readonly scope: NumberingScope;
  /** Piso que el operador está mirando: es el sujeto tácito de "invierte". */
  readonly activeDeck: number;
  readonly direction?: NumberingDirection;
  /** Tipos de butaca vigentes, para resolver "que sea cama". */
  readonly catalog?: readonly SeatTypeItem[];
}

/**
 * ============================================================================
 * MOTOR DE MUTACIONES (`SeatMutationEngine`)
 * ============================================================================
 * Con un bus ya dibujado, el operador no vuelve a describirlo entero: pide un
 * retoque ("modifícame los asientos del segundo piso: impares en ventana y
 * pares en pasillo"). Este motor entiende ese tipo de orden y la aplica SOBRE
 * el plano existente, sin rearmar nada ni perder el resto del diseño.
 *
 * REGLAS:
 *
 * 1. INTENCIÓN ANTES QUE GRAMÁTICA
 *    `isMutation` decide si el texto es un retoque o un bus nuevo. Solo hay
 *    retoque si YA hay un plano; un texto con pisos y plazas ("2 pisos, abajo
 *    12 camas") es siempre creación, aunque lleve verbo.
 *
 * 1b. LOS RETOQUES SON ATÓMICOS
 *    Quitar dos plazas, cambiar la butaca 12 o pintar un rango tocan solo lo
 *    nombrado; la serie se compacta después para no dejar boletos fantasma.
 *
 * 2. ÁMBITO EXPLÍCITO
 *    "segundo piso / planta alta / arriba" → P2; "primer piso / abajo" → P1;
 *    sin mención, la numeración se aplica a TODO el bus y el volteo al piso
 *    que se está mirando.
 *
 * 3. NADA MÁS SE TOCA
 *    Cambiar la numeración de P2 no altera P1, ni el baño, ni la escalera, ni
 *    las plazas. La mutación es quirúrgica y devuelve un plano nuevo.
 *
 * 4. SI YA ESTABA ASÍ, SE DICE
 *    Un comando entendido que no cambia nada devuelve `noop` con la razón, en
 *    vez de rehacer trabajo y ensuciar el historial de deshacer.
 *
 * 5. SI NO SE ENTIENDE, NO SE ADIVINA
 *    `unknown` devuelve el turno al flujo de creación del asistente.
 *
 * Es una función pura de (plano, texto, contexto) → resultado.
 * ============================================================================
 */
export class SeatMutationEngine {
  /** Verbos de retoque. El texto ya viene normalizado (sin tildes, en minúsculas). */
  private static readonly VERBS = /\b(modific\w*|cambi\w*|renumer\w*|numer\w*|invert\w*|invier\w*|volte\w*|gir\w*|intercambi\w*|actualiz\w*|muev\w*|mover|pon|ponme|pongo|poner|pasa|pasame|pasar|haz|hazme|deja|dejame|quiero que|corrige|corrigeme|arregla|quita\w*|elimin\w*|borra\w*|resta\w*|saca\w*|agrega\w*|anad\w*|sum\w*|compact\w*)\b/;
  /** Describir pisos y plazas es crear un bus, no retocarlo. */
  private static readonly CREATION = /\b\d{1,3}\s*(?:pisos?|camas?|semicamas?|asientos|butacas|plazas|pasajeros|pax)\b|\b(?:doble piso|dos pisos|un piso|minibus)\b/;

  /**
   * ¿Es una orden de retoque sobre el plano actual? Sin plano dibujado nunca
   * lo es. Un texto que enumera plazas o pisos tampoco: eso es un bus nuevo.
   */
  static isMutation(text: string, hasLayout: boolean): boolean {
    if (!hasLayout) return false;
    const raw = SeatPromptEngine.normalize(text);
    // Un verbo explícito ("quita 2 asientos") pesa más que la heurística de
    // creación: si luego no se reconoce el comando, `apply` devuelve `unknown`
    // y el turno cae solo al flujo de creación.
    if (this.VERBS.test(raw)) return true;
    // Nombrar una butaca concreta o un rango de números es, por sí solo, un
    // retoque: "el asiento 12 que sea de relevo" no describe un bus nuevo.
    if (/\b(?:asiento|butaca|plaza)\s+(?:n[°º]?\s*)?\d{1,3}\b/.test(raw)) return true;
    if (/\bdel?\s+\d{1,3}\s+(?:al|hasta el|hasta)\s+\d{1,3}\b/.test(raw)) return true;
    if (this.CREATION.test(raw)) return false;
    return SeatPromptEngine.numberingIn(raw) !== null || this.swapIntent(raw) !== null;
  }

  static apply(layout: VehicleLayout, text: string, context: MutationContext): MutationResult {
    const raw = SeatPromptEngine.normalize(text);
    const plan = layout.decks.map((_, i) => SeatLayoutEngine.strategyFor(context.plan.length ? context.plan : undefined, i));
    const nothing: MutationResult = { status: 'unknown', kind: null, message: '', layout: null, numbering: null, scope: null, deckIndex: null };

    // "Numeración corrida" pide otro ALCANCE, no otra regla de recorrido: la
    // regla solo cambia si el texto nombra la ventana, el pasillo o la fila.
    const scope = this.scopeIn(raw);
    const namesRule = /\b(ventanas?|pasillos?|por fila|cruzando)\b/.test(raw);
    const target = namesRule ? SeatPromptEngine.numberingIn(raw) : null;
    if (target) return this.renumber(layout, raw, plan, context, target);

    // Retoques atómicos, de lo más concreto a lo más general.
    const range = this.ranges(layout, raw, context);
    if (range) return range;

    const seat = this.seatCommand(layout, raw, context);
    if (seat) return seat;

    const quantity = this.quantity(layout, raw, context);
    if (quantity) return quantity;

    const swap = this.swapIntent(raw);
    if (swap !== null) return this.swap(layout, raw, plan, context, swap);

    // Sentido del recorrido: "numera de atrás hacia adelante".
    const direction = SeatPromptEngine.directionIn(raw);
    const current = context.direction ?? (SEAT_LAYOUT_RULES.NUMBERING.DEFAULT_DIRECTION as NumberingDirection);
    if (direction) {
      if (direction.origin === current.origin && direction.side === current.side) {
        return { ...nothing, status: 'noop', kind: 'direction', message: `La numeración ya va ${SeatPromptEngine.directionLabel(direction)}.` };
      }
      return {
        status: 'applied', kind: 'direction', deckIndex: null, numbering: plan, scope: context.scope, direction,
        message: `Listo: ahora la numeración va ${SeatPromptEngine.directionLabel(direction)}.`,
        layout: SeatLayoutEngine.autoNumber(layout, plan, context.scope, direction)
      };
    }

    if (scope && scope !== context.scope) {
      return {
        status: 'applied', kind: 'scope', deckIndex: null, numbering: plan, scope,
        message: `Listo: la numeración pasa a ser ${scope === 'continuous' ? 'corrida de 1 a N entre los dos pisos' : 'independiente, cada piso desde el 1'}.`,
        layout: SeatLayoutEngine.autoNumber(layout, plan, scope)
      };
    }
    if (scope) return { ...nothing, status: 'noop', kind: 'scope', message: `La numeración ya es ${scope === 'continuous' ? 'corrida' : 'por piso'}.` };

    return nothing;
  }

  // --------------------------------------------------------------------------

  private static renumber(
    layout: VehicleLayout, raw: string, plan: NumberingStrategy[], context: MutationContext, target: NumberingStrategy
  ): MutationResult {
    const decks = this.decksIn(raw, layout.decks.length);
    if (decks === 'missing') {
      return { status: 'noop', kind: 'numbering', message: 'Este bus tiene un solo piso, así que no hay segundo piso que renumerar.', layout: null, numbering: null, scope: null, deckIndex: null };
    }
    const indices = decks ?? layout.decks.map((_, i) => i);
    if (indices.every(i => plan[i] === target)) {
      const who = indices.length === layout.decks.length ? (layout.decks.length === 1 ? 'el bus' : 'todo el bus') : this.deckName(indices[0], layout.decks.length);
      return { status: 'noop', kind: 'numbering', message: `${this.cap(who)} ya numera ${this.numberingLabel(target)}.`, layout: null, numbering: null, scope: null, deckIndex: null };
    }

    const next = [...plan];
    for (const i of indices) next[i] = target;
    const scope = this.scopeIn(raw) ?? context.scope;
    const untouched = layout.decks.length > 1 && indices.length === 1
      ? ` El ${indices[0] === 0 ? 'segundo' : 'primer'} piso y los servicios se quedan como estaban.`
      : '';
    return {
      status: 'applied', kind: 'numbering', deckIndex: indices.length === layout.decks.length ? null : indices[0], numbering: next, scope,
      message: `Listo: he actualizado la numeración ${this.deckPhrase(indices, layout.decks.length)} a ${this.numberingLabel(target)}.${untouched}`,
      layout: SeatLayoutEngine.autoNumber(layout, next, scope)
    };
  }

  private static swap(
    layout: VehicleLayout, raw: string, plan: NumberingStrategy[], context: MutationContext, side: 'left' | 'right' | 'flip'
  ): MutationResult {
    const decks = this.decksIn(raw, layout.decks.length);
    if (decks === 'missing') {
      return { status: 'noop', kind: 'swap', message: 'Este bus tiene un solo piso.', layout: null, numbering: null, scope: null, deckIndex: null };
    }
    const index = decks ? decks[0] : context.activeDeck;
    const deck = layout.decks[index];
    if (!deck) return { status: 'unknown', kind: null, message: '', layout: null, numbering: null, scope: null, deckIndex: null };

    const name = this.deckName(index, layout.decks.length);
    if (deck.left === deck.right) {
      return { status: 'noop', kind: 'swap', message: `${this.cap(name)} es simétrica (${deck.left}+${deck.right}): no hay fila individual que cambiar de lado.`, layout: null, numbering: null, scope: null, deckIndex: index };
    }
    // La fila individual es el lado con menos columnas.
    const soloSide = deck.left < deck.right ? 'left' : 'right';
    if (side !== 'flip' && soloSide === side) {
      return { status: 'noop', kind: 'swap', message: `${this.cap(name)} ya tiene las butacas individuales a la ${side === 'left' ? 'izquierda' : 'derecha'} (${deck.left}+${deck.right}).`, layout: null, numbering: null, scope: null, deckIndex: index };
    }

    const next = SeatLayoutEngine.swapSides(layout, index, plan, context.scope);
    const after = next.decks[index];
    return {
      status: 'applied', kind: 'swap', deckIndex: index, numbering: plan, scope: context.scope, layout: next,
      message: `Listo: en ${name} las butacas individuales pasan a la ${after.left < after.right ? 'izquierda' : 'derecha'} (${after.left}+${after.right}) y renumeré ese piso. Nada más se movió.`
    };
  }

  /**
   * Caso 7: "del 1 al 12 que sean cama y del 13 al 44 semicama". Se admiten
   * varios rangos en un mismo mensaje y se aplican en orden.
   */
  private static ranges(layout: VehicleLayout, raw: string, context: MutationContext): MutationResult | null {
    const matches = [...raw.matchAll(/del?\s+(\d{1,3})\s+(?:al|hasta el|hasta)\s+(\d{1,3})\s*(?:que\s+sean?\s+|en\s+|de\s+|:\s*)?([a-z][a-z ]{2,24}?)?(?=\s*(?:$|[,.;]|\s+y\s+del?\s+\d))/g)];
    if (!matches.length) return null;

    let next = layout;
    const applied: string[] = [];
    const unknown: string[] = [];
    for (const m of matches) {
      const from = Number(m[1]), to = Number(m[2]);
      const phrase = (m[3] ?? '').trim();
      if (!phrase) continue;
      const resolved = SeatTypeResolver.resolve(phrase, context.catalog ?? []);
      if (!resolved.code) { unknown.push(phrase); continue; }
      const before = next;
      next = SeatLayoutEngine.applyRangeType(next, from, to, resolved.code, context.scope);
      if (next !== before) applied.push(`${from}–${to} ${this.typeLabel(resolved.code)}`);
    }

    if (!applied.length) {
      const why = unknown.length ? `No tengo el tipo "${unknown[0]}" en el catálogo.` : 'No encontré butacas con esos números.';
      return { status: 'noop', kind: 'range', message: why, layout: null, numbering: null, scope: null, deckIndex: null };
    }
    return {
      status: 'applied', kind: 'range', deckIndex: null, numbering: null, scope: null, layout: next,
      message: `Listo: ${applied.join(' y ')}. Los números no cambian, solo el tipo de butaca.`
    };
  }

  /** Caso 2: "el asiento 12 que sea de relevo", "borra el asiento 5". */
  private static seatCommand(layout: VehicleLayout, raw: string, context: MutationContext): MutationResult | null {
    const m = /\b(?:asiento|butaca|plaza)\s+(?:n[°º]?\s*)?(\d{1,3})\b/.exec(raw);
    if (!m) return null;
    const number = Number(m[1]);
    const pos = SeatLayoutEngine.findSeat(layout, number);
    if (!pos) {
      return { status: 'noop', kind: 'seat', message: `No hay ninguna butaca numerada ${number} en este plano.`, layout: null, numbering: null, scope: null, deckIndex: null };
    }

    // Borrar la butaca y cerrar el hueco de la serie.
    if (/\b(borra\w*|elimin\w*|quita\w*|saca\w*|anula\w*)\b/.test(raw)) {
      return {
        status: 'applied', kind: 'seat', deckIndex: pos.deck, numbering: null, scope: null,
        layout: SeatLayoutEngine.eraseSeatByNumber(layout, number, context.scope),
        message: `Listo: quité la butaca ${number} y compacté la numeración para que no quede un boleto inexistente.`
      };
    }

    // Cambiar su tipo: lo que va tras "que sea" / "cambia a" / "ponla como".
    const phrase = /(?:que\s+sea\s+(?:para\s+|de\s+|el\s+|un\s+|una\s+)?|cambia\w*\s+a\s+|ponla?\s+(?:como|de)\s+|pasa\w*\s+a\s+)([a-z][a-z ]{2,26})/.exec(raw);
    if (!phrase) return null;
    const resolved = SeatTypeResolver.resolve(phrase[1].trim(), context.catalog ?? []);
    if (!resolved.code) {
      return {
        status: 'noop', kind: 'seat', deckIndex: pos.deck, numbering: null, scope: null, layout: null,
        message: `No tengo el tipo "${phrase[1].trim()}" en el catálogo. Créalo en el panel de Asientos y te lo aplico.`
      };
    }
    const sellable = SeatLayoutEngine.isSellable(resolved.code);
    return {
      status: 'applied', kind: 'seat', deckIndex: pos.deck, numbering: null, scope: null,
      layout: SeatLayoutEngine.setSeatTypeByNumber(layout, number, resolved.code, context.scope),
      message: `Listo: la butaca ${number} pasa a ${this.typeLabel(resolved.code)}.${sellable ? '' : ' No se vende, así que sale de la serie y el resto se compacta.'}`
    };
  }

  /** Caso 1: "quítame 2 asientos del piso 2", "agrega una fila más abajo". */
  private static quantity(layout: VehicleLayout, raw: string, context: MutationContext): MutationResult | null {
    // El sustantivo es obligatorio: sin él, "pon 44 semicamas" sería un bus nuevo.
    const m = /\b(quita\w*|elimin\w*|borra\w*|resta\w*|saca\w*|agrega\w*|anad\w*|sum\w*|pon\w*|mete\w*)\b[^.]{0,20}?\b(\d{1,2}|un|una|dos|tres|cuatro)\s+(filas?|asientos?|butacas?|plazas?)\b/.exec(raw);
    if (!m) return null;
    const removing = /^(quita|elimin|borra|resta|saca)/.test(m[1]);
    const count = ({ un: 1, una: 1, dos: 2, tres: 3, cuatro: 4 } as Record<string, number>)[m[2]] ?? Number(m[2]);
    const byRow = /^fila/.test(m[3]);
    if (!count || count <= 0) return null;

    const decks = this.decksIn(raw, layout.decks.length);
    if (decks === 'missing') {
      return { status: 'noop', kind: 'quantity', message: 'Este bus tiene un solo piso.', layout: null, numbering: null, scope: null, deckIndex: null };
    }
    const index = decks ? decks[0] : context.activeDeck;
    const deck = layout.decks[index];
    if (!deck) return null;
    const perRow = deck.left + deck.right;
    const seats = byRow ? count * perRow : count;

    const next = removing
      ? SeatLayoutEngine.removeSeats(layout, index, seats, context.scope)
      : byRow
        ? SeatLayoutEngine.addRows(layout, index, count, undefined, context.scope)
        : SeatLayoutEngine.addSeats(layout, index, seats, undefined, context.scope);

    if (next === layout) {
      return {
        status: 'noop', kind: 'quantity', deckIndex: index, numbering: null, scope: null, layout: null,
        message: removing ? `${this.cap(this.deckName(index, layout.decks.length))} no tiene butacas que quitar.` : 'El piso ya está lleno: no caben más butacas sin alargar el bus.'
      };
    }
    const before = SeatLayoutEngine.stats(layout, null).byDeck[index] ?? 0;
    const after = SeatLayoutEngine.stats(next, null).byDeck[index] ?? 0;
    const moved = Math.abs(after - before);
    const what = byRow ? `${count} fila${count === 1 ? '' : 's'}` : `${moved} butaca${moved === 1 ? '' : 's'}`;
    return {
      status: 'applied', kind: 'quantity', deckIndex: index, numbering: null, scope: null, layout: next,
      message: `Listo: ${removing ? 'quité' : 'agregué'} ${what} ${removing ? `del fondo ${this.ofDeck(index, layout.decks.length)}` : `en ${this.deckName(index, layout.decks.length)}`}. Quedan ${after} plazas ahí y la numeración se compactó sola.`
    };
  }

  private static typeLabel(code: SeatTypeCode): string {
    return (SEAT_LAYOUT_RULES.SEAT_APPEARANCE as Record<string, { label: string }>)[code]?.label ?? code;
  }

  /** `null` = no hay orden de volteo; `flip` = invertir sin lado preferido. */
  private static swapIntent(raw: string): 'left' | 'right' | 'flip' | null {
    const solo = /\b(?:fila|butacas?|asientos?|columna)\s*(?:de\s+)?(?:individual\w*|sola|simple)\b|\bindividual\w*\b/;
    const toRight = /\b(?:a la |hacia la |al lado )?derecha\b/;
    const toLeft = /\b(?:a la |hacia la |al lado )?izquierda\b/;
    const scheme = /\b(\d)\s*\+\s*(\d)\b/.exec(raw);
    if (scheme) {
      const [, l, r] = scheme;
      if (l !== r) return Number(l) < Number(r) ? 'left' : 'right';
    }
    if (solo.test(raw) && (toRight.test(raw) || toLeft.test(raw))) return toRight.test(raw) ? 'right' : 'left';
    if (/\b(invert\w*|invier\w*|volte\w*|intercambi\w*|gir\w*)\b[^.]*\b(lados?|columnas?|filas?|asientos?|butacas?|pasillo)\b/.test(raw)) return 'flip';
    if (/\b(invierte|inviertelo|invertir|voltea|voltealo)\b/.test(raw)) return 'flip';
    return null;
  }

  private static scopeIn(raw: string): NumberingScope | null {
    if (/\b(corrida|continua|seguida|de 1 a n|entre (?:los )?(?:dos )?pisos)\b/.test(raw)) return 'continuous';
    if (/\b(por piso|cada piso|independiente|desde (?:el )?1 en cada)\b/.test(raw)) return 'perDeck';
    return null;
  }

  /**
   * Pisos citados: `null` = ninguno (el que corresponda por defecto),
   * `'missing'` = citó un piso que este bus no tiene.
   */
  private static decksIn(raw: string, floors: number): number[] | null | 'missing' {
    const upper = /\b(segundo piso|2do piso|2o piso|piso 2|p2|planta alta|arriba|piso de arriba|superior)\b/.test(raw);
    const lower = /\b(primer piso|1er piso|1ro piso|piso 1|p1|planta baja|abajo|piso de abajo|inferior)\b/.test(raw);
    const all = /\b(todo el bus|todos los pisos|ambos pisos|los dos pisos|todo)\b/.test(raw);
    if (all) return null;
    if (upper && lower) return null;
    if (upper) return floors > 1 ? [1] : 'missing';
    if (lower) return [0];
    return null;
  }

  private static deckPhrase(indices: readonly number[], floors: number): string {
    if (floors === 1 || indices.length === floors) return floors === 1 ? 'del bus' : 'de todo el bus';
    return indices[0] === 0 ? 'de la Planta Baja' : 'del Segundo Piso';
  }

  /** "de la Planta Baja" / "del Segundo Piso": la contracción, resuelta. */
  private static ofDeck(index: number, floors: number): string {
    return floors === 1 ? 'del bus' : index === 0 ? 'de la Planta Baja' : 'del Segundo Piso';
  }

  private static deckName(index: number, floors: number): string {
    return floors === 1 ? 'el bus' : index === 0 ? 'la Planta Baja' : 'el Segundo Piso';
  }

  private static numberingLabel(n: NumberingStrategy): string {
    return {
      sides: 'impares en ventana y pares en pasillo',
      aisleOdd: 'pares en ventana e impares en pasillo',
      rows: 'por fila, cruzando el pasillo'
    }[n];
  }

  private static cap(text: string): string { return text.charAt(0).toUpperCase() + text.slice(1); }
}