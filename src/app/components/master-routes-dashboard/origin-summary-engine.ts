import { MasterRoute } from '../../models/route.model';

/** Resumen agregado de todo lo que sale de un origen. */
export interface OriginSummary {
  readonly routesCount: number;
  readonly activeCount: number;
  readonly draftCount: number;
  readonly archivedCount: number;
  /** Paradas únicas de todas las rutas del origen, sin contar duplicados. */
  readonly uniqueStops: number;
  readonly servicesCount: number;
  /** Destinos finales, ordenados por frecuencia y sin repetir. */
  readonly destinations: readonly string[];
}

/**
 * ============================================================================
 * MOTOR DE RESUMEN DE ORIGEN (`OriginSummaryEngine`)
 * ============================================================================
 * Función pura que agrega, para un departamento de origen, lo que de verdad
 * interesa saber sin desplegar el acordeón: a dónde llega, con cuántas
 * paradas y cuántos servicios genera.
 *
 * LAS 3 REGLAS DE AGREGACIÓN:
 *
 * 1. PARADAS ÚNICAS, NO SUMA DE PARADAS
 *    La Paz aparece como parada en las 4 rutas del origen; sumarlas daría
 *    "4 paradas La Paz" y una cifra inflada. Se cuentan nodos DISTINTOS por
 *    nombre, que es lo que responde "cuánta red cubre este origen".
 *
 * 2. DESTINO = ÚLTIMA PARADA DE LA RUTA
 *    Se usa el nodo marcado como destino y, en su defecto, la última parada
 *    del recorrido. Así el resumen no depende de que el catálogo tenga
 *    relleno el campo `destinationDepartment`.
 *
 * 3. DESTINOS ORDENADOS POR FRECUENCIA
 *    Los destinos más servidos van primero: en una barra de ancho limitado,
 *    lo que se corta debe ser lo menos relevante.
 * ============================================================================
 */
export class OriginSummaryEngine {
  static calculate(routes: readonly MasterRoute[]): OriginSummary {
    const stopNames = new Set<string>();
    const destinationFrequency = new Map<string, number>();

    let servicesCount = 0;
    let activeCount = 0;
    let draftCount = 0;
    let archivedCount = 0;

    for (const route of routes) {
      // ---- Regla 1: paradas únicas -------------------------------------
      for (const stop of route.stops ?? []) {
        if (stop?.name) {
          stopNames.add(stop.name.trim().toLowerCase());
        }
      }

      servicesCount += (route.derivedServices ?? route.avoidedDuplicates ?? []).length;

      switch (route.status) {
        case 'ACTIVO':
          activeCount++;
          break;
        case 'BORRADOR':
          draftCount++;
          break;
        default:
          archivedCount++;
      }

      // ---- Regla 2: destino = última parada ----------------------------
      const destination = this.resolveDestination(route);
      if (destination) {
        destinationFrequency.set(destination, (destinationFrequency.get(destination) ?? 0) + 1);
      }
    }

    // ---- Regla 3: destinos ordenados por frecuencia ---------------------
    const destinations = [...destinationFrequency.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);

    return {
      routesCount: routes.length,
      activeCount,
      draftCount,
      archivedCount,
      uniqueStops: stopNames.size,
      servicesCount,
      destinations
    };
  }

  /** Nodo marcado como destino; si no lo hay, la última parada del recorrido. */
  private static resolveDestination(route: MasterRoute): string | null {
    const stops = route.stops ?? [];
    const flagged = stops.find(stop => stop.isDestination);
    if (flagged?.name) {
      return flagged.name.trim();
    }
    const last = stops[stops.length - 1];
    if (last?.name) {
      return last.name.trim();
    }
    return route.destinationDepartment?.trim() || null;
  }
}
