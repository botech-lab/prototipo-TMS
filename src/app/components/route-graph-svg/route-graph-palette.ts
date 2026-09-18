import { StopNode } from '../../models/route.model';
import { ROUTE_GRAPH_RULES } from './route-graph-rules';

const { PALETTE } = ROUTE_GRAPH_RULES;

/** Departamento presente en una ruta, con su color de categoría. */
export interface GraphDepartment {
  readonly key: string;
  readonly label: string;
  readonly color: string;
}

/** Departamento (mayúsculas) de una parada, o null si no está en la tabla. */
export function stopDepartment(stopName: string): string | null {
  return (PALETTE.CITY_DEPARTMENT as Record<string, string>)[stopName.trim()] ?? null;
}

/** Color (variable CSS) de la categoría del departamento. */
export function departmentColor(department: string | null): string {
  const category = department
    ? (PALETTE.DEPARTMENT_CATEGORY as Record<string, number>)[department]
    : undefined;
  return category ? `var(--cat-${category}-fg)` : PALETTE.FALLBACK_COLOR;
}

export function stopColor(stopName: string): string {
  return departmentColor(stopDepartment(stopName));
}

/** Departamentos presentes en las paradas, en orden de aparición (para la leyenda). */
export function departmentsOf(stops: readonly StopNode[]): GraphDepartment[] {
  const seen = new Map<string, GraphDepartment>();
  for (const stop of stops) {
    const key = stopDepartment(stop.name);
    if (key && !seen.has(key)) {
      const label = key.toLowerCase().replace(/(^|\s)\p{L}/gu, char => char.toUpperCase());
      seen.set(key, { key, label, color: departmentColor(key) });
    }
  }
  return [...seen.values()];
}
