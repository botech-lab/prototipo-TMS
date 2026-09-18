/**
 * Reglas de oro de la tarjeta de ruta maestra: alturas estructurales en PÍXELES.
 * `RouteCardComponent` las publica como propiedades CSS personalizadas
 * (`--route-card-*`) en su host y su SCSS las consume con `var(...)`, de modo
 * que estas constantes son la única fuente de la verdad de las medidas.
 */
export const ROUTE_CARD_DIMENSIONS = Object.freeze({
  CARD_EXPANDED_HEIGHT: 520,
  CARD_COLLAPSED_HEIGHT: 160,
  HEADER_HEIGHT: 76,
  SVG_CONTAINER_HEIGHT: 210,
  SERVICES_CONTAINER_HEIGHT: 110,
  FOOTER_HEIGHT: 48,
} as const);

export type RouteCardDimensions = typeof ROUTE_CARD_DIMENSIONS;
