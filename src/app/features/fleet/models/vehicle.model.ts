import { TableRowBase } from '@models';

/** Estado operativo de una unidad de la flota. */
export type VehicleStatus = 'ACTIVO' | 'INACTIVO';

/**
 * Clasificación comercial del servicio que presta la unidad.
 * Es el NOMBRE de un registro de `tipo-vehiculos`: el catálogo es editable,
 * así que aquí no puede vivir una unión cerrada.
 */
export type VehicleType = string;

/**
 * Unidad de transporte registrada en el sistema.
 * `id` proviene de `TableRowBase` y es el identificador estable de la fila.
 */
export interface Vehicle extends TableRowBase {
  /** Matrícula o placa de circulación. */
  readonly plate: string;
  readonly type: VehicleType;
  readonly brand: string;
  readonly model: string;
  /** Cantidad de niveles o plantas de la unidad. */
  readonly floors: number;
  /** Capacidad de pasajeros. */
  readonly passengerCapacity: number;
  /** Capacidad de carga en kilogramos. `null` cuando la unidad no transporta carga. */
  readonly cargoCapacityKg: number | null;
  readonly status: VehicleStatus;
  /** Número interno de móvil (código operativo de la empresa). */
  readonly internalNumber?: string;
  /** Preset industrial con el que se creó, si aplica. */
  readonly presetId?: string;
}
