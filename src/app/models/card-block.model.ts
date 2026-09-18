import { ChipTone, TableCell } from './data-table.model';

/**
 * ============================================================================
 * VOCABULARIO DE BLOQUES DE TARJETA
 * ============================================================================
 * El cuerpo de una tarjeta deja de ser monolítico -o lista genérica, o motor
 * propio- y pasa a componerse de BLOQUES.
 *
 * Cada bloque conoce cuánto espacio pide y cómo repartirse el sobrante, así
 * que una tarjeta se declara en tres líneas sin escribir geometría. Los
 * motores de dominio siguen existiendo, pero ahora calculan SIGNIFICADO
 * (cuántas butacas, qué meses consumidos, qué peso de rol) y no coordenadas:
 * la retícula la resuelve CSS, que es donde el alineado sale gratis y el
 * texto no se deforma al escalar.
 * ============================================================================
 */

/** Escalón de ancho de la tarjeta, medido en tiempo real. */
export type CardWidthTier = 'narrow' | 'medium' | 'wide';

/** Cifra grande con su rótulo. Es el ancla tipográfica de la tarjeta. */
export interface StatBlock {
  readonly kind: 'stat';
  readonly value: string;
  readonly caption: string;
  readonly tone?: ChipTone;
  /** `hero` reserva el tamaño mayor; solo debería haber uno por tarjeta. */
  readonly emphasis?: 'hero' | 'normal';
}

/** Línea de apoyo, opcionalmente con un valor alineado a la derecha. */
export interface CaptionBlock {
  readonly kind: 'caption';
  readonly text: string;
  readonly endText?: string;
}

/** Pares etiqueta/valor. Es el bloque por defecto de los catálogos. */
export interface KeyValueBlock {
  readonly kind: 'keyvalue';
  readonly rows: readonly { readonly label: string; readonly cell: TableCell }[];
}

/** Colección de marcas. */
export interface TagsBlock {
  readonly kind: 'tags';
  readonly label?: string;
  readonly items: readonly string[];
}

/** Barra de progreso o cobertura, con proporción acotada a [0, 1]. */
export interface MeterBlock {
  readonly kind: 'meter';
  readonly label?: string;
  readonly ratio: number;
  readonly caption?: string;
  readonly endCaption?: string;
  readonly tone?: ChipTone;
}

/** Estado de una celda de matriz. */
export type MatrixCellState = 'on' | 'warn' | 'off';

/** Una celda concreta: una butaca, un mes, un rol del sistema. */
export interface MatrixCell {
  readonly state: MatrixCellState;
  /** Rótulo interior. Solo lo usa la variante `tile`. */
  readonly label?: string;
  /** Texto accesible / tooltip. */
  readonly title?: string;
}

/**
 * Retícula de celdas. Es el bloque que materializa el principio heredado del
 * grafo de rutas: el dato ES la geometría.
 */
export interface MatrixBlock {
  readonly kind: 'matrix';
  readonly label?: string;
  readonly endLabel?: string;
  readonly cells: readonly MatrixCell[];
  /** Columnas fijas. Si se omite, el renderizador las deduce del ancho real. */
  readonly columns?: number;
  /** `dot` para celdas mudas y densas; `tile` para celdas con rótulo. */
  readonly variant?: 'dot' | 'tile';
  readonly tone?: ChipTone;
  /** Alto mínimo de celda en píxeles reales. */
  readonly minCellHeight?: number;
}

/** Agrupación de bloques en fila o columna. */
export interface GroupBlock {
  readonly kind: 'group';
  readonly direction: 'row' | 'column';
  readonly blocks: readonly CardBlock[];
  readonly label?: string;
  /** En tarjetas estrechas, una fila puede apilarse para no comprimirse. */
  readonly stackOnNarrow?: boolean;
  /** Reparto de espacio entre hijos. Por defecto, partes iguales. */
  readonly weights?: readonly number[];
}

/** Separador fino entre secciones. */
export interface DividerBlock {
  readonly kind: 'divider';
}

export type CardBlock =
  | StatBlock
  | CaptionBlock
  | KeyValueBlock
  | TagsBlock
  | MeterBlock
  | MatrixBlock
  | GroupBlock
  | DividerBlock;

/**
 * Bloques que deben ABSORBER el espacio sobrante del cuerpo.
 * Los demás ocupan su alto natural.
 */
export const GROWING_BLOCKS: readonly CardBlock['kind'][] = ['matrix', 'keyvalue', 'group'];
