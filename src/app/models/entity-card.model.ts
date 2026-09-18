import { CardBlock } from './card-block.model';
import { TableCell, TableRowBase } from './data-table.model';

/** Modo de visualización de un catálogo. */
export type ViewMode = 'table' | 'cards';

/** Par etiqueta/valor del bloque expandible de la tarjeta. */
export interface CardDetail<T extends TableRowBase> {
  readonly label: string;
  readonly cell: (row: T) => TableCell;
}

/** Métrica agregada que ocupa la esquina inferior izquierda del pie. */
export interface CardMetric {
  /** Glifo corto que precede a la cifra (mismo criterio que 🔗 en ruta maestra). */
  readonly icon: string;
  readonly value: string;
}

/**
 * ============================================================================
 * DEFINICIÓN DECLARATIVA DE TARJETA
 * ============================================================================
 * Equivalente a `TableColumn<T>` pero para la vista de tarjetas: describe qué
 * dato ocupa cada una de las 7 ranuras fijas del contrato visual heredado de
 * la tarjeta de ruta maestra.
 *
 *   badge   → ranura 1: identificador corto e inmutable (RM-01, DFE-658, @admin)
 *   status  → ranura 2: chip de estado semántico
 *   toggle  → ranura 3: mutación booleana rápida (switch); opcional
 *   title   → ranura 4: nombre legible, truncado a una línea
 *   details → ranura 5: datos "caros", visibles solo bajo demanda
 *   metric  → ranura 6: una sola cifra agregada en el pie
 *   (acciones de edición/borrado las aporta el propio componente)
 * ============================================================================
 */
export interface CardDefinition<T extends TableRowBase> {
  readonly badge: (row: T) => string;
  readonly status: (row: T) => TableCell;
  readonly title: (row: T) => string;
  /** Segunda línea opcional bajo el título. */
  readonly subtitle?: (row: T) => string;
  readonly details: readonly CardDetail<T>[];
  /**
   * RANURA 5 declarativa: composición de bloques del cuerpo.
   * Si se define, sustituye a `details` (que se conserva como forma corta
   * para los catálogos que solo necesitan pares etiqueta/valor).
   */
  readonly body?: (row: T) => readonly CardBlock[];
  /**
   * Filas equivalentes que necesita la ranura 5 cuando se enchufa un motor
   * propio. Si se omite, se usa `details.length`. Es la entrada de la
   * Ecuación 1 de `EntityCardEngine`, de modo que un cuerpo a medida pasa por
   * el MISMO cálculo de escalón que un listado genérico.
   */
  readonly bodyRows?: number;
  readonly metric: (row: T) => CardMetric;
  /**
   * Estado del switch de la ranura 3. Si se omite, el switch no se renderiza
   * (catálogos sin activación rápida).
   */
  readonly isEnabled?: (row: T) => boolean;
}
