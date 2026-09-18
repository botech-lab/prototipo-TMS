import { SEAT_LAYOUT_RULES } from '@core';
import {
  BathroomPlacement,
  BuildSpec,
  ChatAnswers,
  ChatQuestion,
  ChatResponse,
  ChatSummary,
  DeckSpec,
  NumberingByDeck,
  NumberingStrategy,
  PromptResult,
  SeatTypeCode,
  SeatTypeItem,
  StairsPlacement
} from '../models/seat-layout.model';
import { SeatCodeEngine } from './seat-code-engine';
import { SeatPromptEngine } from './seat-prompt-engine';

/**
 * ============================================================================
 * ASISTENTE CONVERSACIONAL DETERMINISTA (`SeatChatEngine`)
 * ============================================================================
 * Convierte una descripción en una `BuildSpec` PREGUNTANDO lo que no puede
 * asumir. Produce exactamente el contrato JSON del prompt de sistema
 * (`needs_clarification` / `ready` / `unclear`), así que un LLM puede
 * sustituir a esta clase sin tocar la interfaz.
 *
 * REGLAS DE RAZONAMIENTO:
 *
 * 1. UNA SOLA PREGUNTA POR TURNO (zero overwhelm)
 *    Las dudas se evalúan por prioridad y se devuelve solo la primera sin
 *    responder, con botones de un clic. Al responder, aparece la siguiente.
 *
 * 2. PRIORIDADES
 *    0) Choque geométrico: "2+1 con filas de 4 asientos" son 3 y 4 plazas por
 *       fila a la vez. No se elige por el operador; se pregunta y punto.
 *    a) Tramo ilegible (no sé cuántas butacas).
 *    a') Tipo de butaca que no existe en el catálogo ("Ultra VIP"): ¿lo creo
 *       o uso el más parecido? El resolvedor difuso ya corrigió los typos.
 *    b) Salón mixto: ¿de qué lado van las individuales? (1+2 / 2+1). Nunca
 *       se asume; salvo que el texto dijera "2+1" literal.
 *    c) Plazas que no cuadran (33 en 2+2): banqueta de 5 o butaca suelta.
 *       Nunca se redondea.
 *    d) Desembocadura de la escalera en la planta alta. Abajo no se
 *       pregunta: nace siempre en el vestíbulo de acceso.
 *    e) Baño, si no se mencionó.
 *
 * 3. NUMERACIÓN reconocida en el texto; la serpiente es un gesto, no una
 *    regla: se indica cómo usarla.
 *
 * Es una función pura de (texto, respuestas) → respuesta. Cada clic vuelve
 * a evaluar desde cero: no hay estado escondido que pueda quedar incoherente.
 * ============================================================================
 */
export class SeatChatEngine {
  static respond(text: string, answers: ChatAnswers = {}, catalog: readonly SeatTypeItem[] = []): ChatResponse {
    const parsed = SeatPromptEngine.parse(text, catalog);
    if (!parsed.spec) {
      return {
        status: 'unclear',
        message: 'Cuéntame cómo es el bus: pisos, cuántas butacas y de qué tipo en cada uno. Por ejemplo: "2 pisos, abajo 9 camas individuales y compartidas, arriba 36 semicama".',
        questions: [], summary: null, outline: null, spec: null, numbering: null, newSeatTypes: []
      };
    }

    const floors = parsed.spec.decks.length;
    // Las respuestas de tramo se inyectan y se vuelve a leer el texto.
    const injected = this.injectDeckAnswers(text, answers, floors);
    const reparsed = injected === text ? parsed : SeatPromptEngine.parse(injected, catalog);
    const spec = reparsed.spec ?? parsed.spec;
    const numbering = this.numberingOf(reparsed, floors);
    const { spec: finalSpec, newSeatTypes } = this.applyAnswers(spec, reparsed, answers, catalog);
    const outline = this.summarize(finalSpec, reparsed, numbering.deck_1);
    const summary = this.summaryLine(finalSpec, reparsed, floors);

    const pending = this.nextQuestion(finalSpec, reparsed, answers, floors, text);
    if (pending) {
      return {
        status: 'needs_clarification',
        message: `${this.recap(finalSpec, reparsed, answers, floors)} ${pending.intro}`,
        questions: [pending.question], summary, outline, spec: null, numbering, newSeatTypes
      };
    }

    return {
      status: 'ready',
      message: `${this.readyMessage(finalSpec, reparsed, floors)} ${this.numberingSentence(numbering, floors)} ${this.snakeHint(text)}`.trim(),
      questions: [], summary, outline, spec: finalSpec, numbering, newSeatTypes
    };
  }

  // --------------------------------------------------------------------------
  // PREGUNTAS, EN ORDEN DE PRIORIDAD
  // --------------------------------------------------------------------------

  private static nextQuestion(spec: BuildSpec, parsed: PromptResult, answers: ChatAnswers, floors: number, text: string): { intro: string; question: ChatQuestion } | null {
    // 0) Choque geométrico: dos esquemas incompatibles en la misma frase.
    const clash = parsed.conflict;
    if (clash && !answers['scheme_conflict']) {
      return {
        intro: `Detecté dos esquemas incompatibles: ${clash.said} (${clash.perRowSaid} asientos por fila) y filas de ${clash.perRowImplied} asientos (${clash.implied}).`,
        question: {
          id: 'scheme_conflict',
          text: '¿Cuál es el correcto para esta unidad?',
          options: [
            { label: `${clash.said} · ${clash.perRowSaid} por fila`, value: clash.said },
            { label: `${clash.implied} · ${clash.perRowImplied} por fila`, value: clash.implied }
          ]
        }
      };
    }

    // a) Tramo ilegible.
    for (let index = 0; index < floors; index++) {
      const detail = parsed.decks[index];
      if (detail?.seats === null && !answers[`deck_${index}`]) {
        return {
          intro: `No entendí las plazas de la ${this.deckName(index, floors)}.`,
          question: {
            id: `deck_${index}`,
            text: `¿Cuántas butacas y de qué tipo van en la ${this.deckName(index, floors)}?`,
            options: [
              { label: '40 Semicama', value: '40 semicama' }, { label: '12 Cama', value: '12 camas' },
              { label: '44 Estándar', value: '44 estandar' }, { label: '16 VIP', value: '16 vip' }
            ]
          }
        };
      }
    }

    // a') Tipo de butaca inexistente: crear o sustituir. Nunca se falla.
    for (let index = 0; index < floors; index++) {
      const detail = parsed.decks[index];
      if (!detail?.unknownType || answers[`seat_type_p${index + 1}`]) continue;
      const closest = detail.seatType;
      const closestName = (SEAT_LAYOUT_RULES.SEAT_APPEARANCE as Record<string, { label: string }>)[closest]?.label ?? closest;
      return {
        intro: `"${detail.unknownType}" no está en el catálogo de tipos de asiento.`,
        question: {
          id: `seat_type_p${index + 1}`,
          text: '¿Qué hago con ese tipo?',
          options: [
            { label: `✨ Crear tipo '${detail.unknownType}' y agregarlo al catálogo`, value: `create:${detail.unknownType}` },
            { label: `Usar el tipo más cercano existente: ${closestName}`, value: `use:${closest}` }
          ]
        }
      };
    }

    // b) Salón mixto: lado de las individuales.
    for (let index = 0; index < floors; index++) {
      const deck = spec.decks[index], detail = parsed.decks[index];
      if (!deck || !detail || deck.left === deck.right || detail.explicitScheme || answers[`p${index + 1}_orientation`]) continue;
      const a = Math.min(deck.left, deck.right), b = Math.max(deck.left, deck.right);
      return {
        intro: `Para la ${this.deckName(index, floors, true)} (${deck.seats ?? '?'} ${this.typeWord(deck, detail.unknownType)} en formato ${a + b} columnas):`,
        question: {
          id: `p${index + 1}_orientation`,
          text: '¿De qué lado van las butacas individuales?',
          options: [
            { label: `(A) Individuales a la Izquierda (${a}+${b})`, value: `${a}+${b}` },
            { label: `(B) Individuales a la Derecha (${b}+${a})`, value: `${b}+${a}` }
          ]
        }
      };
    }

    // c) Plazas que no cuadran.
    for (let index = 0; index < floors; index++) {
      const deck = spec.decks[index], detail = parsed.decks[index];
      if (!deck || !detail || detail.seats === null || answers[`leftover_p${index + 1}`]) continue;
      // Las plazas y el sobrante se miden sobre la geometría YA resuelta: si
      // el esquema cambió al deshacer un choque, el sobrante cambia con él.
      const perRow = deck.left + deck.right;
      const seats = deck.seats ?? detail.seats;
      const leftover = seats % perRow;
      if (leftover === 0) continue;
      if (leftover === 1 && deck.right > 0) {
        return {
          intro: `${seats} butacas en ${deck.left}+${deck.right} dejan 1 suelta en la ${this.deckName(index, floors)}.`,
          question: {
            id: `leftover_p${index + 1}`, text: '¿Cómo la coloco?',
            options: [{ label: `Fila trasera de ${perRow + 1} (banqueta)`, value: 'bench' }, { label: 'Butaca individual al fondo', value: 'single' }]
          }
        };
      }
      return {
        intro: `${seats} butacas en ${deck.left}+${deck.right} dejan ${leftover} sueltas al fondo de la ${this.deckName(index, floors)}.`,
        question: {
          id: `leftover_p${index + 1}`, text: '¿Las dejo así?',
          options: [{ label: `Sí, última fila con ${leftover}`, value: 'single' }, { label: `Redondear a ${seats - leftover}`, value: 'trim' }]
        }
      };
    }

    // d) Desembocadura de la escalera en la planta alta.
    if (floors === 2 && !parsed.mentioned.stairs && !answers['p2_stairs_arrival']) {
      return {
        intro: 'En la Planta Alta (Piso 2), ¿dónde desemboca la escalera?',
        question: {
          id: 'p2_stairs_arrival',
          text: 'Ubicación del hueco de escalera (Piso 2):',
          options: [
            { label: 'Delantera: tras el parabrisas (entre asientos 3 y 4)', value: 'front-right' },
            { label: 'Media: hacia el centro del bus', value: 'middle-right' },
            { label: 'Al fondo', value: 'rear-right' }
          ]
        }
      };
    }

    // e) Baño.
    const minibus = /\b(minibus|transfer|express|van|combi)\b/.test(SeatPromptEngine.normalize(text));
    if (!parsed.mentioned.bathroom && !answers['bathroom_setup'] && !minibus) {
      return {
        intro: '¿La unidad tiene baño?',
        question: {
          id: 'bathroom_setup', text: 'Configuración de baño:',
          options: floors === 2
            ? [{ label: 'Planta baja, en el acceso', value: 'entry' }, { label: 'Planta baja + fondo piso 2', value: 'entry-both' }, { label: 'Sin baño', value: 'none' }]
            : [{ label: 'Al fondo', value: 'rear-right' }, { label: 'En medio', value: 'middle-right' }, { label: 'Sin baño', value: 'none' }]
        }
      };
    }
    return null;
  }

  // --------------------------------------------------------------------------

  private static applyAnswers(spec: BuildSpec, parsed: PromptResult, answers: ChatAnswers, catalog: readonly SeatTypeItem[]): { spec: BuildSpec; newSeatTypes: SeatTypeItem[] } {
    const newSeatTypes: SeatTypeItem[] = [];
    const taken = catalog.map(t => t.code);
    const decks = spec.decks.map((deck, index): DeckSpec => {
      let d: DeckSpec = { ...deck };
      const detail = parsed.decks[index];

      // Tipo nuevo: el código sale de las iniciales, sin chocar con el catálogo.
      const typeAnswer = answers[`seat_type_p${index + 1}`];
      if (typeAnswer?.startsWith('create:')) {
        const name = typeAnswer.slice('create:'.length);
        const existing = newSeatTypes.find(t => t.name === name);
        const code = (existing?.code ?? SeatCodeEngine.suggest(name, [...taken, ...newSeatTypes.map(t => t.code)])) as SeatTypeCode;
        if (!existing) newSeatTypes.push({ code, name });
        d = { ...d, seatType: code };
      } else if (typeAnswer?.startsWith('use:')) {
        d = { ...d, seatType: typeAnswer.slice('use:'.length) as SeatTypeCode };
      }

      // El esquema elegido en un choque geométrico manda sobre lo interpretado.
      const chosen = parsed.conflict?.deck === index ? answers['scheme_conflict'] : undefined;
      if (chosen) {
        const [l, r] = chosen.split('+').map(Number);
        // Si las plazas venían de "N filas", cambian con el esquema elegido.
        const rows = parsed.decks[index]?.rows ?? parsed.conflict?.rows ?? null;
        d = { ...d, left: l, right: r, ...(rows ? { seats: rows * (l + r) } : {}) };
      }

      const orientation = answers[`p${index + 1}_orientation`];
      if (orientation) {
        const [l, r] = orientation.split('+').map(Number);
        d = { ...d, left: l, right: r };
      }
      const leftover = answers[`leftover_p${index + 1}`];
      if (leftover === 'bench' && detail?.seats) {
        // Con banqueta, la última fila cabe en una fila menos.
        const perRow = d.left + d.right;
        const rows = Math.ceil((detail.seats - 1) / perRow) + (index === 0 ? 1 : 0);
        d = { ...d, rearBench: true, length: Math.max(SEAT_LAYOUT_RULES.GRID.MIN_LENGTH, rows) };
      } else if (leftover === 'trim' && detail?.seats) {
        d = { ...d, seats: detail.seats - detail.leftover };
      }
      return d;
    });

    return {
      spec: {
        ...spec,
        decks,
        stairs: (answers['p2_stairs_arrival'] as StairsPlacement) ?? spec.stairs,
        bathroom: (answers['bathroom_setup'] as BathroomPlacement) ?? spec.bathroom
      },
      newSeatTypes
    };
  }

  /** Regla por piso: la dicha en su tramo, si no la global, si no la de fábrica. */
  private static numberingOf(parsed: PromptResult, floors: number): NumberingByDeck {
    const fallback: NumberingStrategy = parsed.numbering ?? SEAT_LAYOUT_RULES.NUMBERING.DEFAULT_STRATEGY;
    const deck_1 = parsed.numberingByDeck[0] ?? fallback;
    return floors === 2 ? { deck_1, deck_2: parsed.numberingByDeck[1] ?? fallback } : { deck_1 };
  }

  private static numberingSentence(n: NumberingByDeck, floors: number): string {
    const L = SEAT_LAYOUT_RULES.NUMBERING.LABELS;
    if (floors === 2 && n.deck_2 && n.deck_2 !== n.deck_1) return `Numeración: P1 ${L[n.deck_1]} · P2 ${L[n.deck_2]}.`;
    return `Numeración: ${L[n.deck_1]}.`;
  }

  /**
   * Las respuestas de tramo se convierten en texto y se vuelven a
   * interpretar. Van DELANTE: el intérprete toma el primer "abajo…" o
   * "arriba…" que encuentra, así que la respuesta gana al tramo ilegible.
   */
  private static injectDeckAnswers(text: string, answers: ChatAnswers, floors: number): string {
    let out = text;
    for (let index = 0; index < floors; index++) {
      const answer = answers[`deck_${index}`];
      if (!answer) continue;
      const prefix = floors === 2 ? (index === 0 ? 'abajo' : 'arriba') : '';
      out = `${prefix} ${answer}, ${out}`;
    }
    return out;
  }

  /** Una frase con lo entendido hasta ahora (contrato `summary`). */
  private static summaryLine(spec: BuildSpec, parsed: PromptResult, floors: number): string {
    const decks = spec.decks.map((d, i) => `${d.seats ?? parsed.decks[i]?.seats ?? '?'} ${this.typeWord(d, parsed.decks[i]?.unknownType)} ${d.left}+${d.right}${d.rearBench ? '+banqueta' : ''}`);
    return `${floors === 2 ? 'Doble piso' : 'Un piso'}: ${decks.join(' / ')} · ${SeatPromptEngine.bathroomLabel(spec.bathroom)}${floors === 2 ? ` · escalera ${SeatPromptEngine.stairsLabel(spec.stairs)}` : ''}`;
  }

  private static summarize(spec: BuildSpec, parsed: PromptResult, numbering: NumberingStrategy): ChatSummary {
    return {
      floors: spec.decks.length,
      decks: spec.decks.map((d, i) => ({
        floor: i + 1,
        seats: d.seats ?? parsed.decks[i]?.seats ?? 0,
        seatType: d.seatType,
        layout: `${d.left}+${d.right}${d.rearBench ? ' + banqueta' : ''}`
      })),
      bathroom: spec.bathroom, doors: spec.doors, stairs: spec.stairs, numbering
    };
  }

  // --------------------------------------------------------------------------
  // REDACCIÓN
  // --------------------------------------------------------------------------

  /** Primer turno: "Anotado: …". Turnos siguientes: lo que ya quedó fijado. */
  private static recap(spec: BuildSpec, parsed: PromptResult, answers: ChatAnswers, floors: number): string {
    if (!Object.keys(answers).length) {
      // Un tipo aún no decidido se nombra como lo dijo el operador, no por su vecino más cercano.
      const decks = spec.decks.map((d, i) => `${d.seats ?? parsed.decks[i]?.seats ?? '?'} ${parsed.decks[i]?.unknownType ?? this.typeWord(d)} ${floors === 2 ? (i === 0 ? 'abajo' : 'arriba') : ''}`.trim());
      return `Anotado: bus ${floors === 2 ? 'doble piso' : 'de un piso'} con ${decks.join(' y ')}${parsed.chassis ? ` (carrocería ${this.cap(parsed.chassis)})` : ''}.`;
    }
    const parts: string[] = [];
    spec.decks.forEach((d, i) => {
      if (answers[`p${i + 1}_orientation`] || answers[`leftover_p${i + 1}`]) parts.push(`${this.deckName(i, floors, true)} configurada en ${d.left}+${d.right}${d.rearBench ? ' con banqueta trasera' : ''}`);
    });
    if (floors === 2 && (parsed.mentioned.stairs || answers['p2_stairs_arrival'])) parts.push('subida de escalera en el acceso delantero');
    if (answers['bathroom_setup'] || parsed.mentioned.bathroom) parts.push(SeatPromptEngine.bathroomLabel(spec.bathroom));
    return parts.length ? `${this.cap(parts.join(', '))}.` : '';
  }

  private static readyMessage(spec: BuildSpec, parsed: PromptResult, floors: number): string {
    const entryBath = spec.bathroom === 'entry' || spec.bathroom === 'entry-both';
    const total = spec.decks.reduce((n, d, i) => n + (d.seats ?? parsed.decks[i]?.seats ?? 0), 0);
    const lines = spec.decks.map((d, i) => {
      const seats = d.seats ?? parsed.decks[i]?.seats ?? 0;
      if (i === 0) {
        const vest = floors === 2 ? ['Mampara frontal', spec.stairs !== 'none' ? 'subida de escalera' : '', entryBath ? 'Baño de acceso' : ''] : [entryBath ? 'Baño de acceso' : ''];
        const salon = spec.bathroom === 'none' || entryBath ? '' : ` y ${SeatPromptEngine.bathroomLabel(spec.bathroom)}`;
        const mixed = d.rowOverrides?.length ? ` · ${d.rowOverrides.length} fila${d.rowOverrides.length === 1 ? '' : 's'} ${this.typeWord({ ...d, seatType: d.rowOverrides[0].seatType })}` : '';
        return `P1: ${[...vest.filter(Boolean), `${seats} ${this.typeWord(d, parsed.decks[i]?.unknownType)} (${d.left}+${d.right}${d.rearBench ? ' + banqueta' : ''})${mixed}`].join(' + ')}${salon}.`;
      }
      const hole = spec.stairs === 'none' ? '' : ` con hueco de escalera ${this.arrivalLabel(spec)}`;
      const bath = spec.bathroom === 'entry-both' ? ' y baño al fondo' : '';
      return `P2: ${seats} ${this.typeWord(d, parsed.decks[i]?.unknownType)} (${d.left}+${d.right}${d.rearBench ? ' + banqueta' : ''})${hole}${bath}.`;
    });
    return `¡Estructura lista! ${lines.join(' ')} Total: ${total} plazas exactas sin huecos.`;
  }

  private static arrivalLabel(spec: BuildSpec): string {
    if (spec.stairsRow !== undefined) return `en la fila ${spec.stairsRow + 1}`;
    return { 'front-right': 'tras asientos 3 y 4', 'middle-left': 'a la mitad del bus', 'middle-right': 'a la mitad del bus', 'rear-left': 'al fondo', 'rear-right': 'al fondo', none: '' }[spec.stairs];
  }

  private static typeWord(d: DeckSpec, unknownType: string | null = null): string {
    const table = SEAT_LAYOUT_RULES.SEAT_APPEARANCE as Record<string, { label: string }>;
    const known = table[d.seatType]?.label;
    if (!known) return unknownType ?? d.seatType;
    const label = known.toLowerCase();
    return label === 'cama' ? 'camas' : label === 'semicama' ? 'semicamas' : label;
  }

  private static snakeHint(text: string): string {
    return /\bserpiente\b/i.test(text) ? 'La serpiente es un gesto: tras armar, elige ⚡ Serpiente y dibuja el recorrido sobre las butacas.' : '';
  }

  private static deckName(index: number, floors: number, capital = false): string {
    const n = floors === 1 ? 'planta' : index === 0 ? 'planta baja' : 'planta alta';
    return capital ? this.cap(n) : n;
  }

  private static cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }
}
