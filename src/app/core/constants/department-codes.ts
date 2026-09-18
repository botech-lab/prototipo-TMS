/**
 * Código corto de cada departamento de origen para la cabecera tipo boleto de
 * Rutas maestras. Es el código de su capital (Chuquisaca → Sucre, Beni →
 * Trinidad, Pando → Cobija), el mismo que usa el boleto de Servicios programados.
 */
export const DEPARTMENT_CODES: Readonly<Record<string, string>> = Object.freeze({
  'LA PAZ': 'LPZ',
  'COCHABAMBA': 'CBB',
  'SANTA CRUZ': 'SCZ',
  'ORURO': 'ORU',
  'POTOSÍ': 'PSI',
  'CHUQUISACA': 'SRE',
  'TARIJA': 'TJA',
  'BENI': 'TDD',
  'PANDO': 'CIJ',
});

/** Código del departamento; si no está en la tabla, sus tres primeras letras. */
export function departmentCode(department: string): string {
  const key = department.trim().toUpperCase();
  return DEPARTMENT_CODES[key]
    ?? key.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z]/g, '').slice(0, 3);
}
