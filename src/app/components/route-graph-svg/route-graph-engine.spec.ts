import { RouteGraphEngine } from './route-graph-engine';
import { ROUTE_GRAPH_RULES } from './route-graph-rules';
import { StopNode } from '../../models/route.model';

describe('RouteGraphEngine - Validación de las 5 Reglas de Oro Matemáticas', () => {

  const mockRM01_13Stops: StopNode[] = [
    { id: '1', order: 1, name: 'La Paz' },
    { id: '2', order: 2, name: 'El Alto' },
    { id: '3', order: 3, name: 'Calamarca' },
    { id: '4', order: 4, name: 'Caracollo' },
    { id: '5', order: 5, name: 'Cochabamba' },
    { id: '6', order: 6, name: 'Sacaba' },
    { id: '7', order: 7, name: 'Colomi' },
    { id: '8', order: 8, name: 'Villa Tunari' },
    { id: '9', order: 9, name: 'Shinahota' },
    { id: '10', order: 10, name: 'Chimoré' },
    { id: '11', order: 11, name: 'Yapacaní' },
    { id: '12', order: 12, name: 'Montero' },
    { id: '13', order: 13, name: 'Santa Cruz' },
  ];

  const mockRM09_5Stops: StopNode[] = [
    { id: '1', order: 1, name: 'La Paz' },
    { id: '2', order: 2, name: 'El Alto' },
    { id: '3', order: 3, name: 'Huarina' },
    { id: '4', order: 4, name: 'San Pedro de Tiquina' },
    { id: '5', order: 5, name: 'Copacabana' },
  ];

  it('REGLA 1: Todas las filas deben compartir el mismo paso horizontal (stepX) garantizando columnas alineadas', () => {
    const result = RouteGraphEngine.calculate(mockRM01_13Stops);
    
    // Distancia entre paradas de la Fila 1 (La Paz -> El Alto)
    const stepRow1 = Math.abs(result.nodes[1].x - result.nodes[0].x);
    // Distancia entre paradas de la Fila 2 (Sacaba -> Colomi)
    const stepRow2 = Math.abs(result.nodes[6].x - result.nodes[5].x);
    // Distancia entre paradas de la Fila 2 (Shinahota -> Chimoré)
    const stepRow3 = Math.abs(result.nodes[9].x - result.nodes[8].x);

    expect(Math.round(stepRow1)).toBe(Math.round(stepRow2));
    expect(Math.round(stepRow2)).toBe(Math.round(stepRow3));
  });

  it('REGLA 2: La curva de retorno nunca debe chocar ni cruzar textos largos ("Cochabamba" y "San Pedro de Tiquina")', () => {
    // Caso RM-01: Cochabamba
    const resultRM01 = RouteGraphEngine.calculate(mockRM01_13Stops);
    const nodeCochabamba = resultRM01.nodes.find(n => n.name === 'Cochabamba')!;
    const textHalfWidth1 = (nodeCochabamba.name.length * resultRM01.fontSizeCity * ROUTE_GRAPH_RULES.LABELS.AVG_CHAR_WIDTH_RATIO) / 2;
    const textRightBoundary1 = nodeCochabamba.x + textHalfWidth1;
    expect(resultRM01.maxCurveExtentX).toBeGreaterThanOrEqual(textRightBoundary1 + ROUTE_GRAPH_RULES.LABELS.MIN_COLLISION_CLEARANCE);

    // Caso RM-09: San Pedro de Tiquina
    const resultRM09 = RouteGraphEngine.calculate(mockRM09_5Stops);
    const nodeTiquina = resultRM09.nodes.find(n => n.name === 'San Pedro de Tiquina')!;
    const textHalfWidth2 = (nodeTiquina.name.length * resultRM09.fontSizeCity * ROUTE_GRAPH_RULES.LABELS.AVG_CHAR_WIDTH_RATIO) / 2;
    const textRightBoundary2 = nodeTiquina.x + textHalfWidth2;
    expect(resultRM09.maxCurveExtentX).toBeGreaterThanOrEqual(textRightBoundary2 + ROUTE_GRAPH_RULES.LABELS.MIN_COLLISION_CLEARANCE);
  });

  it('REGLA 3: Para rutas de 13 paradas, deben generarse exactamente 3 filas (5-5-3) y no 4 filas con nodos huérfanos', () => {
    const result = RouteGraphEngine.calculate(mockRM01_13Stops);
    const distinctYCoords = new Set(result.nodes.map(n => Math.round(n.y)));
    expect(distinctYCoords.size).toBe(3);
  });

  it('REGLA 4: Las curvas Bézier y los textos calculados jamás deben desbordar el ancho del canvas', () => {
    const result = RouteGraphEngine.calculate(mockRM01_13Stops);
    expect(result.maxCurveExtentX).toBeLessThanOrEqual(ROUTE_GRAPH_RULES.CANVAS.WIDTH);
    expect(result.minCurveExtentX).toBeGreaterThanOrEqual(0);
  });

  it('REGLA 5: Rutas cortas de 5 paradas deben centrarse verticalmente manteniendo el tamaño del viewBox', () => {
    const result = RouteGraphEngine.calculate(mockRM09_5Stops);
    const minY = Math.min(...result.nodes.map(n => n.y));
    const maxY = Math.max(...result.nodes.map(n => n.y));
    const totalHeight = maxY - minY;
    
    // El offset superior debe centrar el dibujo en los 200px
    expect(minY).toBeGreaterThanOrEqual(ROUTE_GRAPH_RULES.CANVAS.MIN_OFFSET_Y);
    expect(result.viewBox).toBe(`0 0 ${ROUTE_GRAPH_RULES.CANVAS.WIDTH} ${ROUTE_GRAPH_RULES.CANVAS.HEIGHT}`);
  });

  describe('Lienzo adaptable al ancho de la caja', () => {
    const labelW = (name: string, font: number) => name.length * font * ROUTE_GRAPH_RULES.LABELS.AVG_CHAR_WIDTH_RATIO;

    it('sin ancho explícito el resultado es idéntico al de 460px (compatibilidad total)', () => {
      const byDefault = RouteGraphEngine.calculate(mockRM01_13Stops);
      const explicit = RouteGraphEngine.calculate(mockRM01_13Stops, 'desktop', ROUTE_GRAPH_RULES.CANVAS.WIDTH);
      expect(explicit).toEqual(byDefault);
      expect(byDefault.canvasWidth).toBe(ROUTE_GRAPH_RULES.CANVAS.WIDTH);
      expect(byDefault.canvasHeight).toBe(ROUTE_GRAPH_RULES.CANVAS.HEIGHT);
    });

    it('en una caja ancha usa todo el ancho y mantiene las 5 reglas (5-5-3, sin desbordes)', () => {
      const wide = RouteGraphEngine.calculate(mockRM01_13Stops, 'desktop', 660);
      expect(wide.viewBox).toBe('0 0 660 200');
      expect(new Set(wide.nodes.map(n => Math.round(n.y))).size).toBe(3);
      expect(wide.maxCurveExtentX).toBeLessThanOrEqual(660);
      expect(wide.minCurveExtentX).toBeGreaterThanOrEqual(0);
      const step460 = Math.abs(RouteGraphEngine.calculate(mockRM01_13Stops).nodes[1].x - RouteGraphEngine.calculate(mockRM01_13Stops).nodes[0].x);
      expect(Math.abs(wide.nodes[1].x - wide.nodes[0].x)).toBeGreaterThan(step460);
    });

    it('en una caja estrecha reduce columnas hasta que las etiquetas vecinas no se tocan', () => {
      const narrow = RouteGraphEngine.calculate(mockRM01_13Stops, 'desktop', 320);
      const perRow = narrow.config.stopsPerRow;
      expect(perRow).toBeLessThan(ROUTE_GRAPH_RULES.GRID.MAX_COLUMNS_DENSE);
      expect(perRow).toBeGreaterThanOrEqual(ROUTE_GRAPH_RULES.GRID.MIN_COLUMNS);
      for (let i = 1; i < narrow.nodes.length; i++) {
        if (Math.floor(i / perRow) !== Math.floor((i - 1) / perRow)) continue;
        const gap = Math.abs(narrow.nodes[i].x - narrow.nodes[i - 1].x);
        const needed = (labelW(narrow.nodes[i].name, narrow.fontSizeCity) + labelW(narrow.nodes[i - 1].name, narrow.fontSizeCity)) / 2;
        expect(gap).toBeGreaterThanOrEqual(needed);
      }
      expect(narrow.maxCurveExtentX).toBeLessThanOrEqual(narrow.canvasWidth);
      const bottom = Math.max(...narrow.nodes.map(n => n.y + n.r + 13));
      expect(bottom).toBeLessThanOrEqual(narrow.canvasHeight);
    });

    it('en móvil nunca pone más de 4 paradas por fila (ARCHITECTURE_RULES §4)', () => {
      const mobile = RouteGraphEngine.calculate(mockRM01_13Stops, 'mobile');
      expect(mobile.config.stopsPerRow).toBeLessThanOrEqual(ROUTE_GRAPH_RULES.GRID.MAX_COLUMNS_MOBILE);
    });
  });
});
