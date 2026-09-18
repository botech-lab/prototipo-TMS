import { ChipTone, TableCell } from '@models';
import { CatalogEntry, IncidentSeverity } from '../../models/parametric.model';

/**
 * Proyecciones de celda compartidas por los catálogos paramétricos.
 * Centralizarlas evita que cada pantalla decida por su cuenta de qué color
 * es un ACTIVO o cómo se lee un campo vacío.
 */

/** Tono del estado del registro. */
export function statusTone(row: CatalogEntry): ChipTone {
  return row.status === 'ACTIVO' ? 'success' : 'neutral';
}

/** Chip de estado, idéntico en los 16 catálogos. */
export function statusCell(row: CatalogEntry): TableCell {
  return { kind: 'chip', value: row.status, tone: statusTone(row) };
}

/** Texto opcional: los vacíos se muestran como guion, nunca en blanco. */
export function optionalText(value: string | null | undefined): TableCell {
  return { kind: 'text', value: value?.trim() ? value : '' };
}

/** Tono por severidad de incidencia; CRÍTICA usa relleno sólido. */
export function severityTone(severity: IncidentSeverity): ChipTone {
  switch (severity) {
    case 'BAJO':
      return 'info';
    case 'MEDIO':
      return 'warning';
    case 'ALTO':
      return 'danger';
    default:
      return 'critical';
  }
}

/**
 * Bandera booleana destacada: chip cuando está activa, guion cuando no.
 * Se usa en columnas de una sola marca, como PRINCIPAL en Monedas.
 */
export function flagChip(on: boolean, label: string, tone: ChipTone = 'info'): TableCell {
  return on ? { kind: 'chip', value: label, tone } : { kind: 'text', value: '' };
}

/** Construye la lista de propiedades activas de un registro. */
export function propertyTags(flags: readonly { readonly label: string; readonly on: boolean }[]): TableCell {
  return { kind: 'tags', items: flags.filter(flag => flag.on).map(flag => flag.label) };
}
