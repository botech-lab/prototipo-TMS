import { RecordField, RecordFieldOption } from '@models';
import { CatalogEntry } from '../../models/parametric.model';

/**
 * Campos de formulario compartidos por los catálogos paramétricos.
 * Igual que `catalog-cells.ts` para la tabla: centralizarlos evita que cada
 * pantalla decida por su cuenta cómo se llama o se valida un nombre.
 * El estado (ACTIVO / INACTIVO) lo añade `CatalogShellComponent`.
 */

export function nameField(label = 'Nombre', placeholder?: string): RecordField {
  return { key: 'name', label, kind: 'text', required: true, placeholder };
}

export function codeField(label = 'Código', placeholder?: string): RecordField {
  return { key: 'code', label, kind: 'text', required: true, uppercase: true, half: true, placeholder };
}

export const DESCRIPTION_FIELD: RecordField = {
  key: 'description',
  label: 'Descripción',
  kind: 'text',
  placeholder: 'Opcional'
};

export function flagField(key: string, label: string): RecordField {
  return { key, label, kind: 'switch' };
}

/** Opciones de un `select` a partir de otro catálogo (solo registros activos). */
export function catalogOptions<T extends CatalogEntry>(
  rows: readonly T[],
  value: (row: T) => string = row => row.name,
  label: (row: T) => string = row => row.name
): readonly RecordFieldOption[] {
  return rows
    .filter(row => row.status === 'ACTIVO')
    .map(row => ({ value: value(row), label: label(row) }));
}
