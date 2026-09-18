import { TableRowBase } from '@models';

/** Situación del conductor frente a la operación. */
export type DriverStatus = 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';

/** Tipo de documento de identidad admitido. */
export type DocumentType = 'CI' | 'PAS' | 'NIT';

/**
 * Categoría de licencia habilitante.
 * `id` se usa como identificador de pestaña de filtrado.
 */
export interface LicenseCategory {
  readonly id: string;
  readonly label: string;
}

/** Personal habilitado para conducir los servicios. */
export interface Driver extends TableRowBase {
  readonly fullName: string;
  readonly documentType: DocumentType;
  readonly documentNumber: string;
  /** Identificador de la categoría de licencia (referencia a `LicenseCategory.id`). */
  readonly licenseCategoryId: string;
  readonly licenseCategoryLabel: string;
  readonly licenseNumber: string;
  /** Fecha de vencimiento en formato ISO `AAAA-MM-DD`. */
  readonly licenseExpiry: string;
  /**
   * Fecha de emisión en formato ISO `AAAA-MM-DD`.
   * Opcional: si el registro no la trae, el motor la deriva restando
   * `DEFAULT_TERM_YEARS` al vencimiento.
   */
  readonly licenseIssued?: string;
  readonly status: DriverStatus;
}
