import { TableRowBase } from '@models';

/** Estado común a todo registro paramétrico del sistema. */
export type CatalogStatus = 'ACTIVO' | 'INACTIVO';

/** Severidad de una incidencia operativa, de menor a mayor. */
export type IncidentSeverity = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICA';

/** Base compartida por los catálogos: identificador, nombre y estado. */
export interface CatalogEntry extends TableRowBase {
  readonly name: string;
  readonly status: CatalogStatus;
}

// ---------------------------------------------------------------------------
// GEOGRAFÍA
// ---------------------------------------------------------------------------

/** Ciudad del sistema. */
export interface City extends CatalogEntry {
  readonly department: string;
  readonly postalCode: string;
  /** `true` si la ciudad es capital de su departamento. */
  readonly isCapital: boolean;
}

/** Departamento y su ubicación dentro del país. */
export interface Department extends CatalogEntry {
  readonly code: string;
  readonly country: string;
  readonly capital: string;
}

// ---------------------------------------------------------------------------
// PERSONAS
// ---------------------------------------------------------------------------

/** Persona natural: base de conductores, pasajeros y contactos. */
export interface Person extends CatalogEntry {
  readonly documentType: string;
  readonly documentNumber: string;
  readonly phone: string;
  readonly email: string;
}

// ---------------------------------------------------------------------------
// CLASIFICADORES OPERATIVOS
// ---------------------------------------------------------------------------

/** Clasificación y requerimientos técnicos de mercancías. */
export interface CargoType extends CatalogEntry {
  readonly description: string;
  /** Requiere cadena de frío. */
  readonly requiresCold: boolean;
  /** Requiere seguro de transporte. */
  readonly requiresInsurance: boolean;
  /** Requiere documentación especial. */
  readonly requiresDocumentation: boolean;
}

/** Clasificación de la flota por capacidad y categoría. */
export interface VehicleTypeEntry extends CatalogEntry {
  readonly description: string;
  /** Capacidad máxima de carga en kilogramos. `null` si no aplica. */
  readonly maxWeightKg: number | null;
  /** Volumen máximo en metros cúbicos. `null` si no aplica. */
  readonly maxVolumeM3: number | null;
  /** Categoría de licencia exigida al conductor. */
  readonly requiredLicense: string | null;
}

/** Clasificación de documentos requeridos por el sistema. */
export interface DocumentTypeEntry extends CatalogEntry {
  readonly code: string;
  readonly description: string;
}

/** Clasificación de eventos y situaciones operativas. */
export interface IncidentType extends CatalogEntry {
  readonly description: string;
  readonly severity: IncidentSeverity;
  /** La incidencia altera la programación de despacho. */
  readonly impactsDispatch: boolean;
  /** La incidencia debe escalarse a un responsable. */
  readonly requiresEscalation: boolean;
}

/** Categoría de licencia de conducción habilitada. */
export interface LicenseTypeEntry extends CatalogEntry {
  readonly description: string;
  /** Vigencia de la habilitación en meses. `null` si no está definida. */
  readonly validityMonths: number | null;
}

// ---------------------------------------------------------------------------
// COMERCIAL Y TARIFARIO
// ---------------------------------------------------------------------------

/** Método con el que se calcula el importe de un recargo. */
export type SurchargeMethod = 'PERCENT' | 'FIXED' | 'PER_KM';

/** Cargo adicional aplicable a servicios y tarifas. */
export interface SurchargeType extends CatalogEntry {
  readonly description: string;
  readonly method: SurchargeMethod;
  /** Magnitud del recargo; su unidad depende de `method`. */
  readonly value: number;
}

/** Medio de cobro aceptado por el sistema. */
export interface PaymentMethod extends CatalogEntry {
  readonly description: string;
  /** Habilitado para el cobro de carga. */
  readonly appliesToCargo: boolean;
  /** Habilitado para la venta de boletos. */
  readonly appliesToTicket: boolean;
}

/** Moneda utilizada para tarifas y pagos. */
export interface Currency extends CatalogEntry {
  /** Código ISO 4217. */
  readonly code: string;
  readonly symbol: string;
  /** Decimales admitidos en los importes. */
  readonly decimals: number;
  /** Divisa base del sistema. Solo una debería tenerlo. */
  readonly isPrimary: boolean;
}

/** Clasificación del uso asignado a una ruta maestra. */
export interface RouteUsageType extends CatalogEntry {
  readonly description: string;
  /** Uso asignado por defecto a las rutas nuevas. */
  readonly isDefault: boolean;
  /** Arrastra configuración operativa propia. */
  readonly appliesConfiguration: boolean;
  /** Admite tarjeta de transporte. */
  readonly appliesCard: boolean;
}

/** Clasificación de las categorías de tarifa disponibles. */
export interface FareCategoryType extends CatalogEntry {
  readonly description: string;
  readonly isDefault: boolean;
  /** Disponible para agencias en línea (OTA). */
  readonly appliesOta: boolean;
  /** Disponible para agentes de venta. */
  readonly appliesAgent: boolean;
  /** Visible en el portal público. */
  readonly visibleInPortal: boolean;
}

/** Clasificación de los tipos de asiento de los vehículos. */
export interface SeatType extends CatalogEntry {
  readonly code: string;
  readonly description: string;
  /** Acento visual elegido al crearlo desde el diseñador. */
  readonly accent?: string;
  /** Ángulo de reclinación en grados (120 a 180). */
  readonly reclineDegrees?: number;
}

/** Canal de venta y su comisión aplicable. */
export interface SalesChannel extends CatalogEntry {
  readonly code: string;
  /** Comisión en porcentaje. `null` cuando el canal no la declara. */
  readonly commissionPercent: number | null;
  /** Opera mediante agente humano. */
  readonly isAgent: boolean;
  /** Opera mediante integración automática. */
  readonly isApi: boolean;
}
