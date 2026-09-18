import { Injectable } from '@angular/core';

export type SidebarDensityMode = 'comfortable' | 'compact';

@Injectable({
  providedIn: 'root'
})
export class SidebarDensityService {
  /**
   * Determina la densidad visual del sidebar según la cantidad de orígenes disponibles:
   * - <= 4 orígenes: Modo 'comfortable' (más espaciado, paddings generosos)
   * - > 4 orígenes: Modo 'compact' (paddings reducidos, tarjetas esbeltas, optimización de espacio)
   */
  getDensity(totalOrigins: number): SidebarDensityMode {
    return totalOrigins <= 4 ? 'comfortable' : 'compact';
  }
}
