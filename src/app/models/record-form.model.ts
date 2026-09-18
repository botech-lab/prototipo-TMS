/**
 * ============================================================================
 * PAZAVI TMS - MODELO GENÉRICO DE FORMULARIO DE REGISTRO
 * ============================================================================
 * Contrato del drawer de alta/edición (`RecordDrawerComponent`). Igual que
 * `TableColumn<T>` para la tabla, la pantalla NO dibuja el formulario: solo
 * DECLARA sus campos. El drawer se encarga de pintar, validar y devolver los
 * valores ya tipados (texto, número, booleano o `null`).
 * ============================================================================
 */

/**
 * Tipos de campo soportados.
 * - `text`   Texto libre (nombre, código, descripción).
 * - `number` Cifra; admite `nullable` para "no aplica".
 * - `select` Opción cerrada (enumeración o registro de otro catálogo).
 * - `date`   Fecha ISO `AAAA-MM-DD` (selector nativo).
 * - `switch` Bandera booleana (propiedades, estado).
 */
export type RecordFieldKind = 'text' | 'number' | 'date' | 'select' | 'switch';

/** Opción de un campo `select`. */
export interface RecordFieldOption {
  readonly value: string;
  readonly label: string;
}

/** Valor de un campo ya normalizado. */
export type RecordValue = string | number | boolean | null;

/** Mapa clave de campo → valor. */
export type RecordValues = Readonly<Record<string, RecordValue>>;

/**
 * Validación cruzada del formulario (reglas entre campos o contra otros
 * registros). Recibe los valores ya normalizados y devuelve, por clave de
 * campo, el mensaje a mostrar en línea. Objeto vacío si todo es válido.
 */
export type RecordValidator = (values: RecordValues) => Readonly<Record<string, string>>;

/** Definición declarativa de un campo del formulario. */
export interface RecordField {
  /** Propiedad del modelo que edita el campo. */
  readonly key: string;
  readonly label: string;
  readonly kind: RecordFieldKind;
  /** Obligatorio: muestra error en línea si queda vacío. */
  readonly required?: boolean;
  readonly placeholder?: string;
  /** Texto de apoyo bajo el campo (solo si no hay error). */
  readonly hint?: string;
  /** Opciones de un `select`. */
  readonly options?: readonly RecordFieldOption[];
  /**
   * `text` / `number`: el vacío se guarda como `null` ("no aplica").
   * `select`: añade la opción vacía con `emptyLabel`, que se guarda como `null`.
   */
  readonly nullable?: boolean;
  /** Rótulo de la opción vacía de un `select` anulable. */
  readonly emptyLabel?: string;
  /** Límites de un campo `number`. */
  readonly min?: number;
  readonly max?: number;
  /** Paso de un campo `number` (1 para enteros, 0.01 para importes). */
  readonly step?: number;
  /** Patrón (expresión regular) que debe cumplir un `text` no vacío. */
  readonly pattern?: string;
  /** Mensaje en línea cuando no se cumple `pattern`. */
  readonly patternMessage?: string;
  /** Normaliza el texto a mayúsculas (códigos, placas). */
  readonly uppercase?: boolean;
  /** Desde `sm`, ocupa media fila (dos campos cortos lado a lado). */
  readonly half?: boolean;
  /** Rótulos del switch encendido/apagado. Por defecto Sí / No. */
  readonly onLabel?: string;
  readonly offLabel?: string;
}
