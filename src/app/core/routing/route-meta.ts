import { Data, Route } from '@angular/router';

/** Nombre de producto usado en el título del documento. */
export const APP_NAME = 'Aleta TMS';

/** Clave de `Route.data` que guarda la miga de pan de la pantalla. */
export const BREADCRUMB_DATA_KEY = 'breadcrumb';

/** Un tramo de la miga de pan. `link` solo en ancestros navegables. */
export interface BreadcrumbItem {
  readonly label: string;
  readonly link?: string;
}

/**
 * Metadatos de pantalla para una ruta: título del documento (último tramo)
 * y miga de pan completa. Los tramos pueden ser texto o { label, link }.
 *
 *   { path: 'vehiculos', component: X, ...pageMeta('Administración', 'Vehículos') }
 */
export function pageMeta(...trail: ReadonlyArray<string | BreadcrumbItem>): Pick<Route, 'title' | 'data'> {
  const breadcrumb: BreadcrumbItem[] = trail.map(t => (typeof t === 'string' ? { label: t } : t));
  const current = breadcrumb[breadcrumb.length - 1];
  return {
    title: current?.label,
    data: { [BREADCRUMB_DATA_KEY]: breadcrumb }
  };
}

/** Lee la miga de pan guardada en `Route.data` (vacía si no hay). */
export function readBreadcrumb(data: Data | undefined): readonly BreadcrumbItem[] {
  const value = data?.[BREADCRUMB_DATA_KEY];
  return Array.isArray(value) ? (value as BreadcrumbItem[]) : [];
}
