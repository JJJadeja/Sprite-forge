export interface SnappedShapeResult {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  width: number;
  height: number;
  cellsWide?: number;
  cellsHigh?: number;
  radius?: number;
  diameter?: number;
}

/**
 * Returns the effective grid spacing for snapping.
 * Defaults to gridSpacing if > 1, otherwise tileGridSize if > 1, or fallback to 8.
 */
export function getEffectiveGridSpacing(
  gridSpacing?: number,
  tileGridVisible?: boolean,
  tileGridSize?: number
): number {
  if (gridSpacing && gridSpacing > 1) return gridSpacing;
  if (tileGridVisible && tileGridSize && tileGridSize > 1) return tileGridSize;
  return 8;
}

/**
 * Computes snapped coordinates for tools like Rectangle, Circle, Line, and Select.
 * Ensures shapes align strictly with the grid spacing rather than freehand placement.
 */
export function getSnappedShapeCoords(
  tool: 'rect' | 'circle' | 'line' | 'select',
  start: { x: number; y: number },
  current: { x: number; y: number },
  spacing: number,
  canvasWidth: number,
  canvasHeight: number,
  enabled: boolean
): SnappedShapeResult {
  const s = Math.max(1, Math.round(spacing));

  // If snapping is disabled or spacing is 1, return freehand coordinates
  if (!enabled || s <= 1) {
    const minX = Math.min(start.x, current.x);
    const maxX = Math.max(start.x, current.x);
    const minY = Math.min(start.y, current.y);
    const maxY = Math.max(start.y, current.y);
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const radius = Math.round(Math.hypot(current.x - start.x, current.y - start.y));

    return {
      x0: start.x,
      y0: start.y,
      x1: current.x,
      y1: current.y,
      width: w,
      height: h,
      radius,
      diameter: radius * 2
    };
  }

  // 1. Rectangle and Select: Align boundaries to full grid cell blocks [c*s .. (c+1)*s - 1]
  if (tool === 'rect' || tool === 'select') {
    const cell0X = Math.floor(start.x / s);
    const cell0Y = Math.floor(start.y / s);
    const cell1X = Math.floor(current.x / s);
    const cell1Y = Math.floor(current.y / s);

    const minCellX = Math.min(cell0X, cell1X);
    const maxCellX = Math.max(cell0X, cell1X);
    const minCellY = Math.min(cell0Y, cell1Y);
    const maxCellY = Math.max(cell0Y, cell1Y);

    const minPixelX = Math.max(0, minCellX * s);
    const maxPixelX = Math.min(canvasWidth - 1, (maxCellX + 1) * s - 1);
    const minPixelY = Math.max(0, minCellY * s);
    const maxPixelY = Math.min(canvasHeight - 1, (maxCellY + 1) * s - 1);

    const snappedX0 = cell1X >= cell0X ? minPixelX : maxPixelX;
    const snappedX1 = cell1X >= cell0X ? maxPixelX : minPixelX;
    const snappedY0 = cell1Y >= cell0Y ? minPixelY : maxPixelY;
    const snappedY1 = cell1Y >= cell0Y ? maxPixelY : minPixelY;

    const w = maxPixelX - minPixelX + 1;
    const h = maxPixelY - minPixelY + 1;
    const cellsWide = maxCellX - minCellX + 1;
    const cellsHigh = maxCellY - minCellY + 1;

    return {
      x0: snappedX0,
      y0: snappedY0,
      x1: snappedX1,
      y1: snappedY1,
      width: w,
      height: h,
      cellsWide,
      cellsHigh
    };
  }

  // 2. Line: Snap endpoints to the nearest grid line intersections (vertices)
  if (tool === 'line') {
    const x0 = Math.max(0, Math.min(canvasWidth - 1, Math.round(start.x / s) * s));
    const y0 = Math.max(0, Math.min(canvasHeight - 1, Math.round(start.y / s) * s));
    const x1 = Math.max(0, Math.min(canvasWidth - 1, Math.round(current.x / s) * s));
    const y1 = Math.max(0, Math.min(canvasHeight - 1, Math.round(current.y / s) * s));

    return {
      x0,
      y0,
      x1,
      y1,
      width: Math.abs(x1 - x0) + 1,
      height: Math.abs(y1 - y0) + 1
    };
  }

  // 3. Circle: Snap center to tile center or node, and snap radius to multiples of s/2
  if (tool === 'circle') {
    // Determine closest anchor: grid node vs cell center
    const nodeX = Math.round(start.x / s) * s;
    const nodeY = Math.round(start.y / s) * s;
    const distToNode = Math.hypot(start.x - nodeX, start.y - nodeY);

    const cellCenterX = Math.floor(start.x / s) * s + Math.floor(s / 2);
    const cellCenterY = Math.floor(start.y / s) * s + Math.floor(s / 2);
    const distToCenter = Math.hypot(start.x - cellCenterX, start.y - cellCenterY);

    const cx = distToCenter < distToNode ? cellCenterX : nodeX;
    const cy = distToCenter < distToNode ? cellCenterY : nodeY;

    // Radius step: snap to increments of s/2 so diameter is an exact multiple of grid cells
    const rStep = Math.max(1, s >= 4 ? Math.round(s / 2) : s);
    const rawRadius = Math.hypot(current.x - cx, current.y - cy);
    const snappedRadius = Math.max(rStep, Math.round(rawRadius / rStep) * rStep);

    return {
      x0: cx,
      y0: cy,
      x1: cx + snappedRadius,
      y1: cy,
      width: snappedRadius * 2,
      height: snappedRadius * 2,
      radius: snappedRadius,
      diameter: snappedRadius * 2,
      cellsWide: Math.max(1, Math.round((snappedRadius * 2) / s))
    };
  }

  return {
    x0: start.x,
    y0: start.y,
    x1: current.x,
    y1: current.y,
    width: Math.abs(current.x - start.x) + 1,
    height: Math.abs(current.y - start.y) + 1
  };
}
