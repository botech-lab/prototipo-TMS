import { ROUTE_GRAPH_RULES } from './route-graph-rules';
import { ROUTE_CARD_DIMENSIONS } from './route-card-rules';

describe('INTEGRITY GUARDIAN: Auditoría Inviolable de Reglas de Oro', () => {

  // 1. Auditoría de Inmutabilidad en Tiempo de Ejecución
  it('las reglas de diseño deben ser completamente inmutables (Object.isFrozen)', () => {
    expect(Object.isFrozen(ROUTE_GRAPH_RULES)).toBeTrue();
    expect(Object.isFrozen(ROUTE_CARD_DIMENSIONS)).toBeTrue();
  });

  // 2. Auditoría Estricta de Parámetros Matemáticos del Gráfico SVG
  it('los valores geométricos del canvas y nodos no deben haber sido alterados', () => {
    // Dimensiones del Canvas
    expect(ROUTE_GRAPH_RULES.CANVAS.WIDTH).toBe(460);
    expect(ROUTE_GRAPH_RULES.CANVAS.HEIGHT).toBe(200);
    expect(ROUTE_GRAPH_RULES.CANVAS.MARGIN_X_DEFAULT).toBe(52);
    expect(ROUTE_GRAPH_RULES.CANVAS.MARGIN_X_DENSE).toBe(42);

    // Radios de Nodos
    expect(ROUTE_GRAPH_RULES.NODES.RADIUS_LARGE).toBe(18);
    expect(ROUTE_GRAPH_RULES.NODES.RADIUS_MEDIUM).toBe(16);
    expect(ROUTE_GRAPH_RULES.NODES.RADIUS_DENSE).toBe(13.5);

    // Despeje de Colisión de Curvas
    expect(ROUTE_GRAPH_RULES.LABELS.MIN_COLLISION_CLEARANCE).toBe(12);
    expect(ROUTE_GRAPH_RULES.LABELS.BASE_CURVE_OFFSET).toBe(28);

    // Límite de Columnas
    expect(ROUTE_GRAPH_RULES.GRID.MAX_COLUMNS_NORMAL).toBe(4);
    expect(ROUTE_GRAPH_RULES.GRID.MAX_COLUMNS_DENSE).toBe(5);
  });

  // 3. Auditoría de Alturas Normalizadas de las Cards
  it('las alturas estructurales de las tarjetas deben ser exactamente las definidas (px)', () => {
    expect(ROUTE_CARD_DIMENSIONS.CARD_EXPANDED_HEIGHT).toBe(520);
    expect(ROUTE_CARD_DIMENSIONS.CARD_COLLAPSED_HEIGHT).toBe(160);
    expect(ROUTE_CARD_DIMENSIONS.SVG_CONTAINER_HEIGHT).toBe(210);
    expect(ROUTE_CARD_DIMENSIONS.SERVICES_CONTAINER_HEIGHT).toBe(110);
    expect(ROUTE_CARD_DIMENSIONS.HEADER_HEIGHT).toBe(76);
    expect(ROUTE_CARD_DIMENSIONS.FOOTER_HEIGHT).toBe(48);
  });

  // 4. Intento de mutación intencional (Debe lanzar error)
  it('debe impedir cualquier intento de sobrescritura de propiedades', () => {
    expect(() => {
      (ROUTE_GRAPH_RULES.CANVAS as any).WIDTH = 500;
    }).toThrow();
  });

});
