import { Driver, LicenseCategory } from '../models/driver.model';

/** Identificador de la pestaña que no aplica ningún filtro. */
export const ALL_CATEGORIES_ID = 'all';

/** Catálogo de categorías habilitantes que alimenta las pestañas de filtrado. */
export const LICENSE_CATEGORIES: readonly LicenseCategory[] = [
  { id: 'bob-esponja', label: 'Bob Esponja' },
  { id: 'cat-a', label: 'Categoría A' },
  { id: 'cat-b', label: 'Categoría B' },
  { id: 'cat-c', label: 'Categoría C' },
  { id: 'cat-d', label: 'Categoría D' },
  { id: 'cat-e', label: 'Categoría E' }
];

/**
 * Datos de demostración del personal de conducción.
 * Reemplazar por `GET /api/v1/conductores` cuando el backend esté listo.
 */
export const DRIVERS_MOCK: readonly Driver[] = [
  {
    id: 'drv-1598378',
    fullName: 'Artur dragon',
    documentType: 'CI',
    documentNumber: '1598378',
    licenseCategoryId: 'bob-esponja',
    licenseCategoryLabel: 'Bob Esponja',
    licenseNumber: '9189189181',
    licenseIssued: '2022-06-19',
    licenseExpiry: '2027-06-19',
    status: 'ACTIVO'
  }
];
