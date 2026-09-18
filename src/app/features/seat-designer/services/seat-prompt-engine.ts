import { SEAT_LAYOUT_RULES } from '@core';
import { BathroomPlacement, BuildSpec, ChassisBrand, DeckSpec, DoorPlacement, NumberingDirection, NumberingStrategy, PromptDeckDetail, PromptResult, RowOverride, SchemeConflict, SeatTypeCode, SeatTypeItem, StairsPlacement } from '../models/seat-layout.model';
import { SeatTypeResolver } from './seat-type-resolver';

interface Scheme { readonly left: number; readonly right: number; }

/**
 * ============================================================================
 * INTÉRPRETE DE TEXTO NATURAL (`SeatPromptEngine`)
 * ============================================================================
 * Convierte una frase en español en una `BuildSpec`. Es una GRAMÁTICA
 * DETERMINISTA, no un modelo de lenguaje: la misma frase produce siempre el
 * mismo bus, y cada regla tiene un test. Funciona sin red.
 *
 *   "bus doble piso, abajo 12 camas con baño al fondo, arriba 40 semicama"
 *
 * LAS 5 REGLAS DE LECTURA:
 *
 * 1. PISOS   "doble piso", "dos pisos", "2 pisos" → 2. Si aparecen "arriba"
 *            y "abajo" también son 2. Si no, 1.
 * 2. TRAMOS  El texto se parte por "abajo / planta baja / piso 1 / primer
 *            piso" y "arriba / planta alta / piso 2 / segundo piso". Cada
 *            tramo describe un piso.
 * 3. PLAZAS  "12 camas", "40 semicama", "14 asientos estándar": cantidad +
 *            tipo. Las filas se derivan: ⌈plazas / butacas por fila⌉, más la
 *            fila del conductor en la planta baja.
 * 4. ESQUEMA "2+1", "2+2", "1+1", "3+2" explícito; si no, el esquema por
 *            defecto del tipo (cama → 2+1, semicama → 2+2). "minibús" o
 *            "express" fuerzan 2+1.
 * 5. SERVICIOS "baño al fondo / en medio / sin baño", "dos puertas / puerta
 *            trasera / puerta central", "escalera al centro / atrás".
 * 6. NUMERACIÓN "ventana pares / pasillo impares" → pasillo impar;
 *            "ventana impares" o "corrida" → ventana impar; "por fila".
 * 7. CARROCERÍA "Marcopolo G7", "Comil" → escalera de fábrica (fila 2 derecha).
 * 8. ESCALERA POR BUTACA "entre el asiento 3 y 4" → fila exacta en P2.
 * 9. SALÓN MIXTO "individuales y compartidas" → esquema asimétrico (2+1).
 * 10. TIPOS  la cantidad se lee aparte del nombre; el nombre pasa por el
 *            `SeatTypeResolver` (exacto → difuso → desconocido). "semikma" es
 *            semicama; "Ultra VIP" queda pendiente de crear o sustituir.
 * 11. FILAS  "4 filas abajo: 1 fila salón cama y el resto semicama" → largo
 *            explícito y sobrescritura por fila (piso mixto).
 * 12. NUMERACIÓN POR PISO la regla dicha dentro de "abajo …" o "arriba …"
 *            vale solo para ese piso; la dicha fuera vale para todos.
 * 13. NEGACIONES "sin baño", "no lleva escalera", "cero puertas traseras"
 *            apagan el servicio Y lo dan por resuelto: no se vuelve a preguntar.
 * 14. CONFLICTO si el texto dice "2+1" y a la vez "filas de 4 asientos", no se
 *            elige por el operador: se marca el choque para que el chat pregunte.
 * 15. SENTIDO "de atrás hacia adelante", "empezando por la derecha".
 * ============================================================================
 */
export class SeatPromptEngine {
  static parse(text: string, catalog: readonly SeatTypeItem[] = []): PromptResult {
    // "4 filas abajo: …" → "abajo 4 filas: …": las filas dichas antes de la
    // palabra clave pertenecen a ese tramo.
    const rawText = this.normalize(text)
      .replace(/\b(wc|sanitario|sanitarios|banos)\b/g, 'bano')
      .replace(/\b(\d{1,2}\s*filas?)\s+(abajo|arriba)\b/g, '$2 $1');

    // "12 abajo y 36 arriba" → "abajo 12 y arriba 36": la cantidad dicha antes
    // de la palabra clave pertenece a ese piso. Los esquemas "2+1" se enmascaran
    // primero, o el "1" de "2+1 arriba" viajaría como si fuera una cantidad.
    // La máscara es una LETRA a propósito: un separador no alfanumérico
    // dejaría un borde de palabra y "2+1 arriba" volvería a leerse como "1".
    const raw = rawText.replace(/(\d)\s*\+\s*(\d)/g, '$1q$2')
      .replace(/\b(\d{1,3}(?:\s+[a-z]+)?)\s+(abajo|arriba)\b/g, (m, what, where) => (/fila/.test(what) ? m : `${where} ${what}`))
      .replace(/(\d)q(\d)/g, '$1+$2');
    const understood: string[] = [];
    const warnings: string[] = [];
    const empty: PromptResult = {
      spec: null, understood, warnings: ['Escribe cómo es el bus.'], decks: [], numbering: null,
      mentioned: { bathroom: false, doors: false, stairs: false }, chassis: null, stairsRow: null, numberingByDeck: [],
      denied: { bathroom: false, doors: false, stairs: false }, conflict: null, direction: null
    };
    if (!raw.trim()) return empty;

    // ---- Regla 1: pisos --------------------------------------------------
    const mentionsUpper = /\b(arriba|planta alta|piso 2|segundo piso|2do piso)\b/.test(raw);
    const mentionsLower = /\b(abajo|planta baja|piso 1|primer piso|1er piso)\b/.test(raw);
    const twoFloors = /\b(doble piso|dos pisos|2 pisos|doble planta|dd)\b/.test(raw) || (mentionsUpper && mentionsLower) || mentionsUpper;
    const floors = twoFloors ? 2 : 1;
    understood.push(floors === 2 ? '2 pisos' : '1 piso');

    // ---- Regla 2: tramos -------------------------------------------------
    const lowerText = this.segment(raw, 'lower');
    const upperText = this.segment(raw, 'upper');
    const generic = floors === 1 ? raw : (lowerText || upperText ? '' : raw);

    const isMinibus = /\b(minibus|mini bus|transfer|express|van|combi)\b/.test(raw);

    // ---- Reglas 3 y 4: plazas y esquema por piso --------------------------
    const decks: DeckSpec[] = [];
    const details: PromptDeckDetail[] = [];
    const sources = floors === 2 ? [lowerText || generic, upperText || generic] : [generic || raw];
    sources.forEach((source, index) => {
      const parsed = this.parseDeck(source, index === 0, isMinibus, catalog);
      if (!parsed) {
        warnings.push(index === 0 ? 'No entendí las plazas de la planta baja; uso 2+2 con 10 filas.' : 'No entendí las plazas de la planta alta; uso 2+2 con 10 filas.');
        decks.push({ length: 10 + (index === 0 ? 1 : 0), left: 2, right: 2, seatType: 'SEM' });
        details.push({ seats: null, seatType: 'SEM', explicitScheme: false, leftover: 0, soloSeats: false, unknownType: null, fuzzyFrom: null, rows: null });
        return;
      }
      decks.push(parsed.deck);
      details.push({
        seats: parsed.seats, seatType: parsed.deck.seatType, explicitScheme: parsed.explicitScheme, leftover: parsed.leftover,
        soloSeats: parsed.soloSeats, unknownType: parsed.unknownType, fuzzyFrom: parsed.fuzzyFrom, rows: parsed.rows
      });
      const prefix = floors === 2 ? (index === 0 ? 'P1: ' : 'P2: ') : '';
      const typeLabel = parsed.unknownType ? `"${parsed.unknownType}" (tipo nuevo)` : this.seatLabel(parsed.deck.seatType);
      understood.push(`${prefix}${parsed.seats} ${typeLabel} · ${parsed.deck.left}+${parsed.deck.right} · ${parsed.deck.length} filas${parsed.fuzzyFrom ? ` · leí "${parsed.fuzzyFrom}" como ${this.seatLabel(parsed.deck.seatType)}` : ''}`);
      if (parsed.deck.rowOverrides?.length) understood.push(`${prefix}piso mixto: ${parsed.deck.rowOverrides.length} fila${parsed.deck.rowOverrides.length === 1 ? '' : 's'} ${this.seatLabel(parsed.deck.rowOverrides[0].seatType)}, resto ${this.seatLabel(parsed.deck.seatType)}`);
    });

    // ---- Reglas 6 y 12: numeración por frase, global o por tramo ---------
    const globalNumbering = this.numberingIn(raw);
    const numberingByDeck: (NumberingStrategy | null)[] = sources.map(src => (floors === 2 ? this.numberingIn(src) : null) ?? globalNumbering);
    const numbering: NumberingStrategy | null = globalNumbering ?? numberingByDeck.find(Boolean) ?? null;
    numberingByDeck.forEach((n, i) => {
      if (n) understood.push(`numeración${floors === 2 ? ` P${i + 1}` : ''}: ${this.numberingLabel(n)}`);
    });

    // ---- Regla 13: negaciones -------------------------------------------
    // Se leen ANTES que las posiciones: "no lleva baño" apaga el servicio y lo
    // da por resuelto, así que el asistente no vuelve a preguntar por él.
    const denied = {
      bathroom: this.denies(raw, 'bano'),
      doors: this.denies(raw, 'puertas?'),
      stairs: this.denies(raw, '(?:escaleras?|gradas?)')
    };

    // ---- Regla 5: servicios ----------------------------------------------
    let bathroom: BathroomPlacement = floors === 2 ? 'entry' : 'rear-right';
    if (denied.bathroom) bathroom = 'none';
    else if (/\bbano[^,.;]*\b(ambos|los dos|cada) pisos?\b/.test(raw)) bathroom = 'entry-both';
    else if (/\bbano (en (el|la) )?(acceso|entrada|vestibulo|delantero|adelante)\b/.test(raw)) bathroom = 'entry';
    else if (/\bbano (en (el )?medio|central|al centro)\b/.test(raw)) bathroom = 'middle-right';
    else if (/\bbano (al fondo|atras|trasero) (a la )?izquierda\b/.test(raw)) bathroom = 'rear-left';
    else if (/\bbano (al fondo|atras|trasero)\b/.test(raw)) bathroom = 'rear-right';
    else if (!/\b(bano|wc|sanitario)\b/.test(raw) && isMinibus) bathroom = 'none';
    understood.push(this.bathroomLabel(bathroom));

    // La puerta delantera siempre existe: negar "puertas" niega las EXTRA.
    let doors: DoorPlacement = 'front';
    if (denied.doors) doors = 'front';
    else if (/\b(dos puertas|2 puertas|puerta (trasera|atras|al fondo))\b/.test(raw)) doors = 'front-rear';
    else if (/\bpuerta (central|en el medio|al medio|intermedia)\b/.test(raw)) doors = 'front-middle';
    understood.push(doors === 'front' ? 'una puerta delantera' : doors === 'front-rear' ? 'puertas delantera y trasera' : 'puertas delantera y central');

    // ---- Regla 7: carrocería reconocida ---------------------------------
    const chassis = this.chassisOf(raw);
    if (chassis) understood.push(`carrocería ${chassis[0].toUpperCase()}${chassis.slice(1)}`);

    // ---- Reglas 8 y 5: escalera (solo importa dónde DESEMBOCA arriba) ----
    let stairs: StairsPlacement = floors === 2 ? 'middle-left' : 'none';
    let stairsRow: number | null = null;
    let stairsMentioned = /\b(escalera|gradas?)\b/.test(raw);
    if (denied.stairs) stairs = 'none';
    else if (floors === 2) {
      const between = /entre (?:el |la |los )?(?:asientos?|butacas?) (\d{1,3})(?:\s*(?:y|-|e)\s*(?:el )?(\d{1,3}))?/.exec(raw);
      const factory = chassis ? (SEAT_LAYOUT_RULES.VESTIBULE.CHASSIS_STAIRS as Partial<Record<ChassisBrand, StairsPlacement>>)[chassis] : undefined;
      if (between) {
        // La butaca N está en la fila ⌈N/2⌉ del lado que se numera primero.
        stairsRow = Math.max(0, Math.ceil(Number(between[1]) / 2) - 1);
        stairs = 'front-right';
        stairsMentioned = true;
        understood.push(`escalera arriba entre las butacas ${between[1]}${between[2] ? ` y ${between[2]}` : ''} (fila ${stairsRow + 1})`);
      } else if (/\b(escalera|gradas?) (al fondo|atras|trasera)\b/.test(raw)) { stairs = /derecha/.test(raw) ? 'rear-right' : 'rear-left'; }
      else if (/\b(escalera|gradas?) (al centro|central|en (el )?medio)\b/.test(raw)) { stairs = /derecha/.test(raw) ? 'middle-right' : 'middle-left'; }
      else if (/\b(escalera|gradas?) (delantera|adelante|al frente|tras el parabrisas)\b/.test(raw)) { stairs = 'front-right'; }
      else if (factory) { stairs = factory; stairsMentioned = true; }
      if (!between) understood.push(`escalera arriba ${this.stairsLabel(stairs)}${factory && stairs === factory ? ' (de fábrica)' : ''}`);
    }

    // ---- Regla 15: sentido del recorrido --------------------------------
    const direction = this.directionIn(raw);
    if (direction) understood.push(`numeración ${this.directionLabel(direction)}`);

    const spec: BuildSpec = { decks, bathroom, doors, stairs, ...(stairsRow !== null ? { stairsRow } : {}) };
    return {
      spec, understood, warnings, decks: details, numbering, chassis, stairsRow,
      mentioned: {
        bathroom: /\b(bano|wc|sanitario)\b/.test(raw) || denied.bathroom,
        doors: /\bpuertas?\b/.test(raw) || denied.doors,
        stairs: stairsMentioned || denied.stairs
      },
      numberingByDeck, denied, direction,
      conflict: this.conflictIn(sources, decks)
    };
  }

  /**
   * Regla 13: ¿el texto NIEGA este servicio? Cubre "sin baño", "no lleva
   * baño", "cero baños" y "no tiene gradas". La partícula tiene que estar
   * cerca del sustantivo: "sin ventanas polarizadas y con baño" no lo niega.
   */
  static denies(raw: string, noun: string): boolean {
    return new RegExp(`\\b(?:sin|cero|nada de)\\s+(?:\\w+\\s+){0,1}${noun}\\b|\\bno\\s+(?:lleva|tiene|hay|va con|quiero|queremos)\\s+(?:\\w+\\s+){0,1}${noun}\\b`).test(raw);
  }

  /**
   * Regla 14: dos geometrías que no pueden ser ciertas a la vez. "2+1 pero
   * con filas de 4 asientos" son 3 y 4 plazas por fila: no se elige por el
   * operador, se devuelve el choque para que el chat pregunte.
   */
  private static conflictIn(sources: readonly string[], decks: readonly DeckSpec[]): SchemeConflict | null {
    for (let index = 0; index < sources.length; index++) {
      const source = sources[index], deck = decks[index];
      if (!source || !deck) continue;
      const scheme = /(\d)\s*\+\s*(\d)/.exec(source);
      const perRow = /\bfilas?\s+de\s+(\d{1,2})\s*(?:asientos|butacas|plazas)?\b|\b(\d{1,2})\s*(?:asientos|butacas|plazas)\s+por\s+fila\b/.exec(source);
      if (!scheme || !perRow) continue;
      const said = Number(scheme[1]) + Number(scheme[2]);
      const implied = Number(perRow[1] ?? perRow[2]);
      if (!implied || implied === said) continue;
      const half = Math.floor(implied / 2);
      const rows = /\b(\d{1,2})\s*filas?\b/.exec(source);
      return {
        deck: index, said: `${scheme[1]}+${scheme[2]}`, implied: `${implied - half}+${half}`,
        perRowSaid: said, perRowImplied: implied, rows: rows ? Number(rows[1]) : null
      };
    }
    return null;
  }

  /**
   * Regla 15: sentido del recorrido dicho en el texto. `null` si no lo dice.
   * "de atrás hacia adelante" invierte el eje del bus; "empezando por la
   * derecha" abre cada fila por el lado de la puerta en vez del conductor.
   */
  static directionIn(raw: string): NumberingDirection | null {
    const backToFront = /\b(de atras (hacia|para) (adelante|el frente)|desde (el|la) (fondo|parte trasera|atras)|del fondo (hacia|al) (frente|adelante)|de atras a adelante|inversa)\b/.test(raw);
    const frontToBack = /\b(de adelante (hacia|para) atras|del frente al fondo|normal|habitual)\b/.test(raw);
    const doorFirst = /\b(desde la derecha|empezando por la (derecha|puerta)|primero (la|el lado) (derecha|puerta)|por el lado de la puerta)\b/.test(raw);
    const driverFirst = /\b(desde la izquierda|empezando por (la izquierda|el conductor)|por el lado del conductor)\b/.test(raw);
    if (!backToFront && !frontToBack && !doorFirst && !driverFirst) return null;
    return { origin: backToFront ? 'rear' : 'front', side: doorFirst ? 'door' : 'driver' };
  }

  /**
   * Regla de numeración dicha en un texto (o `null`). Acepta los dos órdenes
   * en que se dice de verdad: "ventana impar" y "impares en ventana".
   */
  static numberingIn(text: string): NumberingStrategy | null {
    const pair = (place: string, parity: string) =>
      new RegExp(`\\b(?:${place}s?\\s*(?:en\\s+)?${parity}(?:es)?|${parity}(?:es)?\\s*(?:en\\s+(?:el\\s+|la\\s+)?)?${place}s?)\\b`).test(text);
    // Dos señales por regla: la ventana y el pasillo. Gana la más apoyada.
    const aisleOdd = Number(pair('ventana', 'par')) + Number(pair('pasillo', 'impar'));
    const sides = Number(pair('ventana', 'impar')) + Number(pair('pasillo', 'par'));
    if (aisleOdd > sides) return 'aisleOdd';
    if (sides > aisleOdd) return 'sides';
    if (/\b(por fila|cruzando el pasillo)\b/.test(text)) return 'rows';
    if (/\b(corrida|secuencial|correlativ[ao])\b/.test(text)) return 'sides';
    return null;
  }

  static numberingLabel(n: NumberingStrategy): string {
    return n === 'aisleOdd' ? 'ventana par, pasillo impar' : n === 'rows' ? 'por fila' : 'ventana impar, pasillo par';
  }

  static chassisOf(raw: string): ChassisBrand | null {
    const patterns = SEAT_LAYOUT_RULES.VESTIBULE.CHASSIS_PATTERNS as Record<ChassisBrand, string>;
    for (const brand of Object.keys(patterns) as ChassisBrand[]) if (new RegExp(patterns[brand]).test(raw)) return brand;
    return null;
  }

  static directionLabel(d: NumberingDirection): string {
    const L = SEAT_LAYOUT_RULES.NUMBERING.DIRECTION_LABELS;
    return `${L[d.origin]}, ${L[d.side]}`;
  }

  static bathroomLabel(b: BathroomPlacement): string {
    return { none: 'sin baño', entry: 'baño en el acceso', 'entry-both': 'baño en el acceso y al fondo del piso alto', 'middle-right': 'baño en medio', 'rear-left': 'baño al fondo izquierda', 'rear-right': 'baño al fondo derecha' }[b];
  }

  static stairsLabel(st: StairsPlacement): string {
    return { none: 'sin escalera', 'front-right': 'delantera (fila 2 derecha)', 'middle-left': 'a la mitad, izquierda', 'middle-right': 'a la mitad, derecha', 'rear-left': 'al fondo, izquierda', 'rear-right': 'al fondo, derecha' }[st];
  }

  // --------------------------------------------------------------------------

  private static parseDeck(source: string, isLower: boolean, isMinibus: boolean, catalog: readonly SeatTypeItem[]): {
    deck: DeckSpec; seats: number; explicitScheme: boolean; leftover: number; soloSeats: boolean;
    unknownType: string | null; fuzzyFrom: string | null; rows: number | null;
  } | null {
    // ---- Filas explícitas y desglose por fila (piso mixto) ---------------
    // "4 filas: 1 fila salón cama y el resto semicama". Una mención "N filas"
    // sin tipo detrás es el largo; con tipo detrás es una sobrescritura.
    const rowMentions = [...source.matchAll(/(\d{1,2})\s*filas?\b(?:\s+(?:de\s+|salon\s+|tipo\s+|en\s+)?([a-z][a-z ]{2,20}?))?(?=\s*(?:$|[,.;:]|\s+y\s|\s+el\s|\s+resto|\s+\d))/g)];
    const overrides: RowOverride[] = [];
    let rows: number | null = null;
    let rowCursor = 0;
    for (const m of rowMentions) {
      const n = Number(m[1]);
      const typed = m[2] ? SeatTypeResolver.resolve(m[2], catalog) : null;
      if (typed?.code) { for (let k = 0; k < n; k++) overrides.push({ row: rowCursor++, seatType: typed.code }); }
      else if (rows === null) rows = n;
    }
    const rest = /\bresto\s+(?:de\s+|en\s+|son\s+)?([a-z][a-z ]{2,20}?)(?=\s*(?:$|[,.;:]|\s+y\s|\s+con\s|\s+sin\s))/.exec(source);
    const restType = rest ? SeatTypeResolver.resolve(rest[1], catalog) : null;

    // ---- Cantidad, leída aparte del nombre ------------------------------
    // "12 camas", "40 asientos semicama", "14 pasajeros", "12 de kama", "cama x 12"
    // Fuera del conteo todo lo que no es una plaza: "1 piso", "piso 1",
    // "4 filas…". Sin esto, "en el piso 1 pon 44 semicamas" leería 1 butaca
    // de tipo "piso".
    const cleanSource = source
      .replace(/\d{1,2}\s*filas?\b[^,.;]*/g, ' ')
      .replace(/\b\d{1,2}\s*(?:pisos?|plantas?|niveles?)\b/g, ' ')
      // Solo el ORDINAL del piso (1 a 3): "piso 44" son 44 butacas, no un piso.
      .replace(/\b(?:pisos?|plantas?|niveles?)\s*[1-3]\b/g, ' ')
      .replace(/\b(?:un|una|dos|tres)\s+(?:pisos?|plantas?)\b/g, ' ');
    const countThenType = /(\d{1,3})\s*(?:asientos|butacas|plazas|pasajeros|pax)?\s*(?:de\s+)?((?:[a-z]+\s*){1,4})?/.exec(cleanSource);
    const typeThenCount = /([a-z][a-z ]{2,30}?)\s*(?:x|por|de)?\s*(\d{1,3})\b/.exec(cleanSource);
    const rawSeats = countThenType ? Number(countThenType[1]) : typeThenCount ? Number(typeThenCount[2]) : null;
    // "12 camas" gana; si tras el número no hay tipo ("cama x 12"), se lee delante.
    const afterCount = (countThenType?.[2] ?? '').trim();
    const typePhrase = afterCount || (typeThenCount?.[1] ?? '').trim();

    // Sin cantidad pero con filas: la cantidad sale de la geometría.
    let seats = rawSeats && rawSeats > 0 ? rawSeats : null;

    // ---- Tipo: exacto → difuso → desconocido ------------------------------
    // La frase tras el número se prueba por prefijos ("semicama ventana par"
    // → "semicama"): el prefijo más largo que resuelve, gana. Si ninguno
    // resuelve, es un tipo nuevo, recortado en la primera palabra ajena.
    const scheme = /(\d)\s*\+\s*(\d)/.exec(source);
    const STOP = /^(ventana|ventanas|pasillo|par|pares|impar|impares|fila|filas|numeracion|escalera|escaleras|gradas|bano|puerta|puertas|con|sin|y|en|abajo|arriba|al|a|la|el|de|entre|corrida|secuencial)$/;
    const words = typePhrase.split(' ').filter(Boolean);
    let cut = words.findIndex(w => STOP.test(w)); if (cut < 0) cut = words.length;
    const candidate = words.slice(0, Math.min(cut, 3));
    let resolved: ReturnType<typeof SeatTypeResolver.resolve> | null = null;
    let matchedPhrase = '';
    for (let len = candidate.length; len >= 1 && !resolved; len--) {
      const attempt = SeatTypeResolver.resolve(candidate.slice(0, len).join(' '), catalog);
      if (attempt.status !== 'unknown') { resolved = attempt; matchedPhrase = candidate.slice(0, len).join(' '); }
    }
    if (!resolved && candidate.length) { resolved = SeatTypeResolver.resolve(candidate.join(' '), catalog); matchedPhrase = candidate.join(' '); }
    let seatType: SeatTypeCode = 'EST';
    let unknownType: string | null = null;
    let fuzzyFrom: string | null = null;
    if (resolved?.status === 'exact') seatType = resolved.code!;
    else if (resolved?.status === 'fuzzy') { seatType = resolved.code!; fuzzyFrom = matchedPhrase; }
    else if (resolved?.status === 'unknown' && matchedPhrase && !/^(asientos?|butacas?|plazas?|pasajeros|pax)$/.test(matchedPhrase)) {
      // Ni relleno ni palabras reservadas: "pon 2+1" no propone el tipo "Pon".
      const clean = candidate.filter(w => !SeatTypeResolver.FILLERS.includes(w) && !SeatTypeResolver.FORBIDDEN.has(w)).join(' ');
      if (clean) { unknownType = this.titleCase(clean); seatType = resolved.closest?.code ?? 'EST'; }
    }
    if (restType?.code) seatType = restType.code;
    if (!seats && rows === null && !overrides.length) return null;

    // ---- Esquema: explícito, "N filas" como columnas, o por defecto ------
    const soloSeats = /\b(individual|individuales|solitari[oa]s?|privad[oa]s?)\b/.test(source) || !!scheme;
    const defaults = SEAT_LAYOUT_RULES.PROMPT.DEFAULT_SCHEME as Record<string, Scheme>;
    const fallback: Scheme = isMinibus ? SEAT_LAYOUT_RULES.PROMPT.MINIBUS_SCHEME : (defaults[seatType] ?? { left: 2, right: 2 });
    // "de 3 filas" sin desglose ni cantidad de filas útil = columnas (uso boliviano).
    const columnsWord = rows !== null && rows >= 3 && rows <= 5 && !overrides.length && seats !== null && /\bde\s+\d\s*filas?\b/.test(source) ? rows : null;
    const base: Scheme = scheme
      ? { left: Math.min(3, Math.max(1, Number(scheme[1]))), right: Math.min(3, Math.max(0, Number(scheme[2]))) }
      : columnsWord ? { 3: { left: 2, right: 1 }, 4: { left: 2, right: 2 }, 5: { left: 3, right: 2 } }[columnsWord]!
      : soloSeats && fallback.left === fallback.right && fallback.left >= 2 ? { left: fallback.left, right: fallback.right - 1 } : fallback;
    if (columnsWord) rows = null;

    const perRow = base.left + base.right;
    const { MIN_LENGTH, MAX_LENGTH } = SEAT_LAYOUT_RULES.GRID;
    const salonRows = rows ?? (overrides.length && !seats ? overrides.length : null);
    if (!seats) seats = (salonRows ?? 0) * perRow;
    const length = Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, (salonRows ?? Math.ceil(seats / perRow)) + (isLower ? 1 : 0)));

    return {
      deck: { length, left: base.left, right: base.right, seatType, seats, ...(overrides.length ? { rowOverrides: overrides } : {}) },
      seats,
      explicitScheme: !!scheme || !!columnsWord,
      leftover: seats % perRow,
      soloSeats,
      unknownType, fuzzyFrom, rows: salonRows
    };
  }

  private static titleCase(text: string): string {
    return text.split(' ').map(w => w.length <= 3 && w === w.toLowerCase() && /^(vip|ceo)$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  /** Tramo del texto que describe un piso. */
  private static segment(raw: string, which: 'lower' | 'upper'): string {
    const lowerKeys = '(?:abajo|planta baja|piso 1|primer piso|1er piso)';
    const upperKeys = '(?:arriba|planta alta|piso 2|segundo piso|2do piso)';
    const start = which === 'lower' ? lowerKeys : upperKeys;
    const stop = which === 'lower' ? upperKeys : lowerKeys;
    const m = new RegExp(`${start}\\s*[:,]?\\s*(.*?)(?=\\s*(?:,|;|\\.|y\\s+)?\\s*${stop}|$)`).exec(raw);
    return m ? m[1].trim() : '';
  }

  private static seatLabel(code: SeatTypeCode): string {
    const table = SEAT_LAYOUT_RULES.SEAT_APPEARANCE as Record<string, { label: string }>;
    return (table[code]?.label ?? code).toLowerCase();
  }

  /** Minúsculas, sin acentos ni signos raros, espacios normalizados. */
  static normalize(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9+,.;:\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
