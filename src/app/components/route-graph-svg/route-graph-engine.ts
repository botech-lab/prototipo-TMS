import { ROUTE_GRAPH_RULES } from '../../core/constants/route-graph-rules';
import { StopNode } from '../../models/route.model';

export type DeviceBreakpoint = 'mobile' | 'desktop';

export interface CalculatedNode extends StopNode {
  x: number;
  y: number;
  r: number;
  isOrigin: boolean;
  isDestination: boolean;
}

export interface GraphEngineConfig {
  stopsPerRow: number;
  nodeRadius: number;
  rowHeight: number;
}

export interface GraphEngineOutput {
  viewBox: string;
  pathD: string;
  nodes: CalculatedNode[];
  fontSizeCity: number;
  fontSizeNode: number;
  strokeWidth: number;
  maxCurveExtentX: number;
  minCurveExtentX: number;
  maxCurveExtentRight: number;
  minCurveExtentLeft: number;
  config: GraphEngineConfig;
  /** Ancho del lienzo usado (460 por defecto, o el ancho adaptado al contenedor). */
  canvasWidth: number;
  /** Alto del lienzo usado (200, o más si el contenido necesita más filas). */
  canvasHeight: number;
}

/** Ancho aproximado de una etiqueta de ciudad (regla AVG_CHAR_WIDTH_RATIO). */
function labelWidth(name: string, fontSizeCity: number): number {
  return name.length * fontSizeCity * ROUTE_GRAPH_RULES.LABELS.AVG_CHAR_WIDTH_RATIO;
}

export class RouteGraphEngine {
  /**
   * @param stops       Paradas en orden.
   * @param breakpoint  'mobile' limita a GRID.MAX_COLUMNS_MOBILE paradas por fila.
   * @param canvasWidth Ancho del lienzo en unidades del viewBox. Por defecto CANVAS.WIDTH (460):
   *                    sin este argumento el resultado es idéntico al de siempre. El componente
   *                    lo calcula a partir del tamaño real de su caja para que el grafo ocupe
   *                    todo el ancho disponible sin deformar textos.
   */
  static calculate(
    stops: StopNode[] = [],
    breakpoint: DeviceBreakpoint = 'desktop',
    canvasWidth: number = ROUTE_GRAPH_RULES.CANVAS.WIDTH
  ): GraphEngineOutput {
    const total = stops ? stops.length : 0;
    const { CANVAS, NODES, LABELS, GRID } = ROUTE_GRAPH_RULES;
    const W = Math.max(CANVAS.MIN_WIDTH, Math.round(canvasWidth));

    // 1. Densidad adaptativa:
    // - <= 5 paradas (ej. Copacabana): 1 sola fila continua de 5 paradas en Desktop (sin giros)
    // - 6 a 8 paradas (ej. Rurrenabaque, Yacuiba): 2 filas equilibradas de 4 columnas
    // - >= 9 paradas (ej. Santa Cruz, Tarija): 3 filas equilibradas de 5 columnas
    const isShort = total <= 5;
    const isMedium = total > 5 && total <= 8;

    let stopsPerRow: number = isShort ? 5 : (isMedium ? GRID.MAX_COLUMNS_NORMAL : GRID.MAX_COLUMNS_DENSE);
    if (breakpoint === 'mobile') {
      stopsPerRow = Math.min(stopsPerRow, GRID.MAX_COLUMNS_MOBILE);
    }
    const nodeRadius = isShort ? NODES.RADIUS_LARGE : (isMedium ? NODES.RADIUS_MEDIUM : NODES.RADIUS_DENSE);
    const fontSizeNode = isShort ? NODES.FONT_SIZE_LARGE : (isMedium ? NODES.FONT_SIZE_MEDIUM : NODES.FONT_SIZE_DENSE);
    const fontSizeCity = isShort ? LABELS.FONT_SIZE_LARGE : (isMedium ? LABELS.FONT_SIZE_MEDIUM : LABELS.FONT_SIZE_DENSE);
    const rowHeight = isShort ? GRID.ROW_HEIGHT_LARGE : (isMedium ? GRID.ROW_HEIGHT_MEDIUM : GRID.ROW_HEIGHT_DENSE);

    if (total === 0) {
      return {
        viewBox: `0 0 ${W} ${CANVAS.HEIGHT}`,
        pathD: '',
        nodes: [],
        fontSizeCity,
        fontSizeNode,
        strokeWidth: ROUTE_GRAPH_RULES.LINE.STROKE_WIDTH,
        maxCurveExtentX: 0,
        minCurveExtentX: 0,
        maxCurveExtentRight: 0,
        minCurveExtentLeft: 0,
        config: { stopsPerRow, nodeRadius, rowHeight },
        canvasWidth: W,
        canvasHeight: CANVAS.HEIGHT
      };
    }

    // 2. Lienzo estrecho (W < 460): si dos etiquetas vecinas de una fila se tocarían,
    // se quita una columna (mínimo GRID.MIN_COLUMNS). Con W >= 460 nunca se reduce,
    // así el comportamiento por defecto no cambia.
    let layout = RouteGraphEngine.layoutRows(stops, stopsPerRow, W, rowHeight, fontSizeCity);
    while (W < CANVAS.WIDTH && stopsPerRow > GRID.MIN_COLUMNS && layout.labelsCollide) {
      stopsPerRow--;
      layout = RouteGraphEngine.layoutRows(stops, stopsPerRow, W, rowHeight, fontSizeCity);
    }

    const config: GraphEngineConfig = { stopsPerRow, nodeRadius, rowHeight };
    const { nodes: positions, clearanceRight, clearanceLeft, totalRows } = layout;

    const nodes: CalculatedNode[] = stops.map((stop, i) => ({
      ...stop,
      x: positions[i].x,
      y: positions[i].y,
      r: nodeRadius,
      isOrigin: i === 0 || !!stop.isOrigin,
      isDestination: i === total - 1 || !!stop.isDestination
    }));

    // 4. Generación del Path continuo con curvas que rodean holgadamente los textos centrados
    let pathD = '';
    let maxCurveExtentX: number = 0;
    let minCurveExtentX: number = W;

    for (let r = 0; r < totalRows; r++) {
      const rowNodes = nodes.filter((_, idx) => Math.floor(idx / stopsPerRow) === r);
      if (!rowNodes.length) continue;

      if (r === 0) {
        pathD += `M ${rowNodes[0].x} ${rowNodes[0].y}`;
      }

      // Línea horizontal continua
      for (let j = 1; j < rowNodes.length; j++) {
        pathD += ` L ${rowNodes[j].x} ${rowNodes[j].y}`;
      }

      // Curva de retorno hacia la siguiente fila
      if (r < totalRows - 1) {
        const lastNode = rowNodes[rowNodes.length - 1];
        const nextFirstNode = nodes[(r + 1) * stopsPerRow];
        if (nextFirstNode) {
          const isRightTurn = r % 2 === 0;
          const textHalfWidth = labelWidth(lastNode.name, fontSizeCity) / 2;
          const requiredClearance = Math.max(
            isRightTurn ? clearanceRight : clearanceLeft,
            Math.round((textHalfWidth + 14) / 0.68)
          );
          const curveOffset = isRightTurn ? requiredClearance : -requiredClearance;

          const cp1x = Math.round((lastNode.x + curveOffset) * 10) / 10;
          const cp1y = Math.round((lastNode.y + 4) * 10) / 10;
          const cp2x = Math.round((nextFirstNode.x + curveOffset) * 10) / 10;
          const cp2y = Math.round((nextFirstNode.y - 4) * 10) / 10;

          if (isRightTurn) {
            maxCurveExtentX = Math.max(maxCurveExtentX, cp1x, cp2x);
          } else {
            minCurveExtentX = Math.min(minCurveExtentX, cp1x, cp2x);
          }

          pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${nextFirstNode.x} ${nextFirstNode.y}`;
        }
      }
    }

    const finalMaxX = maxCurveExtentX === 0 ? Math.max(...nodes.map(n => n.x)) : maxCurveExtentX;
    const finalMinX = minCurveExtentX === W ? Math.min(...nodes.map(n => n.x)) : minCurveExtentX;

    // 5. Alto: 200 por defecto; crece solo si al reducir columnas hay más filas de las que caben.
    const lastLabelBottom = Math.max(...nodes.map(n => n.y + n.r + 13)) + CANVAS.BOTTOM_PADDING;
    const H = Math.max(CANVAS.HEIGHT, Math.ceil(lastLabelBottom));

    return {
      viewBox: `0 0 ${W} ${H}`,
      pathD,
      nodes,
      fontSizeCity,
      fontSizeNode,
      strokeWidth: ROUTE_GRAPH_RULES.LINE.STROKE_WIDTH,
      maxCurveExtentX: finalMaxX,
      minCurveExtentX: finalMinX,
      maxCurveExtentRight: finalMaxX,
      minCurveExtentLeft: finalMinX,
      config,
      canvasWidth: W,
      canvasHeight: H
    };
  }

  /** Posiciones de la matriz serpentina para un número de columnas dado (reglas 1, 2 y 5). */
  private static layoutRows(stops: StopNode[], stopsPerRow: number, W: number, rowHeight: number, fontSizeCity: number) {
    const { CANVAS, GRID } = ROUTE_GRAPH_RULES;
    const total = stops.length;
    const totalRows = Math.ceil(total / stopsPerRow);
    const totalContentHeight = (totalRows - 1) * rowHeight + 35;
    const offsetY = Math.max(CANVAS.MIN_OFFSET_Y, (CANVAS.HEIGHT - totalContentHeight) / 2);

    // Despeje Bézier compensado para rodear el texto centrado.
    // En una curva Bézier cúbica a la altura del texto (t ≈ 0.35), la curva solo alcanza el 69% del offset:
    // X(0.35) = X_nodo + 0.69 * offset. Para X(0.35) >= X_nodo + textHalfWidth + 14px: offset = (textHalfWidth + 14) / 0.68.
    const rightTurnNodes = stops.filter((_, i) => {
      const r = Math.floor(i / stopsPerRow);
      const c = i % stopsPerRow;
      return r % 2 === 0 && c === stopsPerRow - 1 && r < totalRows - 1;
    });
    const leftTurnNodes = stops.filter((_, i) => {
      const r = Math.floor(i / stopsPerRow);
      const c = i % stopsPerRow;
      return r % 2 === 1 && c === stopsPerRow - 1 && r < totalRows - 1;
    });

    const maxRightTextHalf = rightTurnNodes.length > 0
      ? Math.max(...rightTurnNodes.map(n => labelWidth(n.name, fontSizeCity) / 2))
      : 20;
    const maxLeftTextHalf = leftTurnNodes.length > 0
      ? Math.max(...leftTurnNodes.map(n => labelWidth(n.name, fontSizeCity) / 2))
      : 20;

    const clearanceRight = Math.max(34, Math.round((maxRightTextHalf + 14) / 0.68));
    const clearanceLeft = Math.max(34, Math.round((maxLeftTextHalf + 14) / 0.68));

    // Márgenes que absorben la curva alargada dentro del ancho del lienzo
    const marginXRight = totalRows === 1 ? CANVAS.MARGIN_X_DEFAULT : Math.min(W * 0.28, clearanceRight + 12);
    const marginXLeft = totalRows === 1 ? CANVAS.MARGIN_X_DEFAULT : (leftTurnNodes.length > 0 ? Math.min(W * 0.28, clearanceLeft + 12) : CANVAS.MARGIN_X_DENSE);

    // REGLA 1: Paso horizontal rígido para toda la matriz
    const usableWidth = W - marginXLeft - marginXRight;
    const fixedStepX = stopsPerRow > 1 ? usableWidth / (stopsPerRow - 1) : 0;

    const nodes = stops.map((_, i) => {
      const rowIndex = Math.floor(i / stopsPerRow);
      const colIndex = i % stopsPerRow;
      const x = rowIndex % 2 === 0
        ? marginXLeft + (colIndex * fixedStepX)
        : (W - marginXRight) - (colIndex * fixedStepX);
      const y = offsetY + (rowIndex * rowHeight);
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    });

    // ¿Se tocan dos etiquetas vecinas de la misma fila?
    let labelsCollide = false;
    for (let i = 1; i < total && !labelsCollide; i++) {
      if (Math.floor(i / stopsPerRow) !== Math.floor((i - 1) / stopsPerRow)) continue;
      const needed = (labelWidth(stops[i - 1].name, fontSizeCity) + labelWidth(stops[i].name, fontSizeCity)) / 2 + GRID.LABEL_GAP;
      labelsCollide = fixedStepX < needed;
    }

    return { nodes, clearanceRight, clearanceLeft, totalRows, labelsCollide };
  }
}
