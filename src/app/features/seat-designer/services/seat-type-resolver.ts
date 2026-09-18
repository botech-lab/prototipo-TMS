import { SEAT_LAYOUT_RULES } from '@core';
import { SeatResolutionResult, SeatTypeCode, SeatTypeItem } from '../models/seat-layout.model';

/**
 * ============================================================================
 * RESOLVEDOR DE TIPOS DE BUTACA (`SeatTypeResolver`)
 * ============================================================================
 * Convierte lo que escribió el operador ("semikma", "kama", "Ultra VIP") en un
 * código del catálogo, o declara que no existe. Tres salidas, en este orden:
 *
 * 1. EXACTO   la palabra (sin tildes ni mayúsculas) es un sinónimo conocido
 *             (`PROMPT.SEAT_WORDS`) o el nombre/código de un tipo del catálogo.
 * 2. DIFUSO   distancia de Levenshtein pequeña respecto a lo anterior. El
 *             umbral depende del largo: palabras de 4-5 letras toleran 1 error,
 *             de 6 o más toleran 2 ("semikma" → semicama); las de 3 o menos
 *             ("vip") exigen coincidencia exacta, porque "vic" no es nada.
 * 3. DESCONOCIDO no casa: se devuelve el más parecido como alternativa y el
 *             asistente pregunta si crearlo o usar el cercano. Nunca falla.
 *
 * Palabras de relleno ("individuales", "salón", "tipo") se descartan antes de
 * comparar: "camas individuales" es cama.
 *
 * LISTA NEGRA: los sustantivos del chasis y los adjetivos de numeración
 * ("piso", "ventana", "impares", "puerta"…) nunca son un tipo de butaca. Se
 * rechazan antes de medir distancias, así que ni se resuelven por parecido ni
 * se ofrecen para crear. Sin esto, "en el piso 1 pon 44 semicamas" acabaría
 * proponiendo el tipo "Piso".
 * ============================================================================
 */
export class SeatTypeResolver {
  /** Palabras estructurales que nunca nombran una butaca (regla de lista negra). */
  static readonly FORBIDDEN: ReadonlySet<string> = new Set(SEAT_LAYOUT_RULES.PROMPT.FORBIDDEN_SEAT_NAMES);

  static readonly FILLERS = ['para', 'individual', 'individuales', 'compartida', 'compartidas', 'dobles', 'doble', 'salon', 'tipo', 'clase', 'butaca', 'butacas', 'asiento', 'asientos', 'plaza', 'plazas', 'de', 'y'];

  static resolve(rawWord: string, catalog: readonly SeatTypeItem[] = []): SeatResolutionResult {
    const raw = rawWord.trim();
    const parts = this.normalize(raw).split(' ').filter(w => w && !this.FILLERS.includes(w));
    const cleaned = parts.join(' ');
    const base: SeatResolutionResult = { status: 'unknown', raw, code: null, matched: null, distance: Infinity, closest: null };
    // Una sola palabra reservada ya descarta la frase entera: "piso 1" o
    // "ventana impar" no describen una butaca por mucho que se parezcan.
    if (!cleaned || parts.some(w => this.FORBIDDEN.has(w))) return base;

    const entries = this.entries(catalog);
    const phrase = this.best(cleaned, entries);
    if (phrase && phrase.distance === 0) return { ...base, status: 'exact', code: phrase.code, matched: phrase.name, distance: 0 };
    if (phrase && phrase.distance <= this.tolerance(cleaned)) return { ...base, status: 'fuzzy', code: phrase.code, matched: phrase.name, distance: phrase.distance, closest: phrase };

    // Frase de varias palabras: si TODAS son conocidas es el mismo tipo dicho
    // largo ("cama suite"); si alguna no lo es, es un tipo nuevo ("cama premium").
    const words = cleaned.split(' ');
    if (words.length > 1) {
      const hits = words.map(w => this.best(w, entries)).map((h, i) => h && h.distance <= this.tolerance(words[i]) ? h : null);
      if (hits.every(Boolean)) return { ...base, status: hits.every(h => h!.distance === 0) ? 'exact' : 'fuzzy', code: hits[0]!.code, matched: hits[0]!.name, distance: Math.max(...hits.map(h => h!.distance)), closest: hits[0] };
      const known = hits.find(Boolean) ?? null;
      return { ...base, closest: known ?? phrase ?? null };
    }
    return { ...base, closest: phrase ?? null };
  }

  /** Distancia de edición clásica (inserción, borrado, sustitución). */
  static levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }

  static tolerance(word: string): number { return word.length >= 6 ? 2 : word.length >= 4 ? 1 : 0; }

  static normalize(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // --------------------------------------------------------------------------
  private static entries(catalog: readonly SeatTypeItem[]): { key: string; code: SeatTypeCode; name: string }[] {
    const words = SEAT_LAYOUT_RULES.PROMPT.SEAT_WORDS as Record<string, SeatTypeCode>;
    const appearance = SEAT_LAYOUT_RULES.SEAT_APPEARANCE as Record<string, { label: string }>;
    // Las claves se limpian igual que la frase del usuario: así "chofer de
    // relevo" del catálogo casa con "para chofer de relevo" que él escribió.
    const clean = (text: string) => this.normalize(text).split(' ').filter(w => w && !this.FILLERS.includes(w)).join(' ');
    const out = Object.keys(words).map(key => ({ key: clean(key), code: words[key], name: appearance[words[key]]?.label ?? words[key] }));
    for (const item of catalog) {
      out.push({ key: clean(item.name), code: item.code, name: item.name });
      out.push({ key: clean(item.code), code: item.code, name: item.name });
    }
    return out;
  }

  private static best(word: string, entries: { key: string; code: SeatTypeCode; name: string }[]): { code: SeatTypeCode; name: string; distance: number } | null {
    let winner: { code: SeatTypeCode; name: string; distance: number } | null = null;
    for (const e of entries) {
      const d = this.levenshtein(word, e.key);
      if (!winner || d < winner.distance) winner = { code: e.code, name: e.name, distance: d };
    }
    return winner;
  }
}
