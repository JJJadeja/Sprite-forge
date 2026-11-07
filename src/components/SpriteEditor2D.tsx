import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Frame, ToolType, ToolSettings, SelectionArea, BrushShape, SpriteClipboard } from '../types/sprite';
import { useTouchGestures } from '../hooks/useTouchGestures';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  HelpCircle,
  Scissors,
  Copy,
  ClipboardPaste,
  Trash2,
  Check,
  X,
  Lock,
  GitFork,
  Compass,
  RotateCw,
  RotateCcw,
  Eye,
  EyeOff,
  Disc,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { KeyframeMorphModal } from './KeyframeMorphModal';
import { CanvasNavigator2D } from './CanvasNavigator2D';
import { getSnappedShapeCoords, getEffectiveGridSpacing } from '../utils/gridSnapping';

interface SpriteEditor2DProps {
  currentFrame: Frame;
  previousFrame?: Frame;
  nextFrame?: Frame;
  width: number;
  height: number;
  activeLayerId: string;
  activeTool: ToolType;
  toolSettings: ToolSettings;
  onUpdateLayerPixels?: (layerId: string, newPixels: string[]) => void;
  onLiveLayerPixels?: (layerId: string, newPixels: string[]) => void;
  onCommitLayerPixels?: (layerId: string, newPixels: string[]) => void;
  onColorPick: (color: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onShowGestureGuide: () => void;
  selection?: SelectionArea | null;
  onSetSelection?: (sel: SelectionArea | null) => void;
  clipboard?: SpriteClipboard | null;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onDeselect?: () => void;
  floatingPaste?: {
    x: number;
    y: number;
    width: number;
    height: number;
    pixels: string[];
  } | null;
  onSetFloatingPaste?: (paste: { x: number; y: number; width: number; height: number; pixels: string[] } | null) => void;
  onCommitFloatingPaste?: () => void;
  onUnlockActiveLayer?: () => void;
  frames?: Frame[];
  currentFrameIndex?: number;
  onAddMorphFrames?: (newFrames: Frame[], insertAfterIndex?: number) => void;
  onDuplicateFrame?: (index: number) => void;
  onUpdateToolSettings?: (settings: Partial<ToolSettings>) => void;
}


import { getBrushOffsets } from '../utils/brushShapes';
import { blendPixelColor, fadePixelColor } from '../utils/colorUtils';
import { mapBlendModeToCompositeOperation } from '../utils/blendModes';

export const SpriteEditor2D: React.FC<SpriteEditor2DProps> = ({
  currentFrame,
  previousFrame,
  width,
  height,
  activeLayerId,
  activeTool,
  toolSettings,
  onUpdateLayerPixels,
  onLiveLayerPixels,
  onCommitLayerPixels,
  onColorPick,
  onUndo,
  onRedo,
  onShowGestureGuide,
  selection,
  onSetSelection,
  clipboard,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onSelectAll,
  onDeselect,
  floatingPaste,
  onSetFloatingPaste,
  onCommitFloatingPaste,
  onUnlockActiveLayer,
  frames,
  currentFrameIndex,
  onAddMorphFrames,
  onDuplicateFrame,
  onUpdateToolSettings
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Keyframe Morph Modal state
  const [isMorphModalOpen, setIsMorphModalOpen] = useState<boolean>(false);

  // Symmetry Guide HUD expanded state & rotation dragging ref
  const [isSymmetryHudExpanded, setIsSymmetryHudExpanded] = useState<boolean>(true);
  const isRotatingGuide = useRef<boolean>(false);

  // Pan and zoom state
  const [zoom, setZoom] = useState<number>(24);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [lastPanPos, setLastPanPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHandMode, setIsHandMode] = useState<boolean>(false);

  // Drawing state
  const isDrawing = useRef<boolean>(false);
  const drawStart = useRef<{ x: number; y: number } | null>(null);
  const lastDrawnPos = useRef<{ x: number; y: number } | null>(null);
  const currentPointer = useRef<{ x: number; y: number }>({ x: -1, y: -1 });
  const stabilizedPos = useRef<{ x: number; y: number } | null>(null);
  const currentPressure = useRef<number>(1.0);
  const lastPressure = useRef<number>(1.0);
  const tempPixels = useRef<string[] | null>(null);

  // Selection state
  const [internalSelection, setInternalSelection] = useState<SelectionArea | null>(null);
  const activeSelection = selection !== undefined ? selection : internalSelection;
  const updateSelection = useCallback((sel: SelectionArea | null) => {
    if (onSetSelection) onSetSelection(sel);
    setInternalSelection(sel);
  }, [onSetSelection]);

  // Marching ants animation offset
  const [dashOffset, setDashOffset] = useState<number>(0);

  useEffect(() => {
    if (!activeSelection && !floatingPaste) return;
    const interval = setInterval(() => {
      setDashOffset(prev => (prev + 1) % 16);
    }, 70);
    return () => clearInterval(interval);
  }, [activeSelection, floatingPaste]);

  // Floating paste dragging state
  const isDraggingPaste = useRef<boolean>(false);
  const pasteDragStart = useRef<{ startX: number; startY: number; pasteX: number; pasteY: number } | null>(null);

  const activeLayer = currentFrame.layers.find(l => l.id === activeLayerId) || currentFrame.layers[0];
  const isLayerLocked = Boolean(activeLayer?.locked);

  const isMirrorTool = activeTool === 'mirror';
  const effectiveSymmetry = isMirrorTool
    ? (toolSettings.mirrorAxis === 'both' ? 'quad' : toolSettings.mirrorAxis || 'horizontal')
    : toolSettings.symmetry;

  // Locked layer warning feedback toast
  const [showLockedToast, setShowLockedToast] = useState<boolean>(false);
  const lockedToastTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (lockedToastTimer.current) clearTimeout(lockedToastTimer.current);
    };
  }, []);


  // Center canvas on container mount and on explicit fit request
  const centerCanvas = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    
    // Calculate optimal zoom so sprite occupies ~70% of container on mobile/desktop
    const zoomX = (rect.width * 0.7) / width;
    const zoomY = (rect.height * 0.7) / height;
    const optimalZoom = Math.max(4, Math.min(48, Math.floor(Math.min(zoomX, zoomY))));
    
    setZoom(optimalZoom);
    setPan({
      x: Math.round((rect.width - width * optimalZoom) / 2),
      y: Math.round((rect.height - height * optimalZoom) / 2)
    });
  }, [width, height]);

  // Nudge pan by delta for on-screen D-Pad
  const handleNudgePan = useCallback((dx: number, dy: number) => {
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  // Direct zoom setter centering zoom transformation
  const handleDirectSetZoom = useCallback((newZoom: number) => {
    if (!containerRef.current) {
      setZoom(newZoom);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setPan(prevPan => ({
      x: Math.round(centerX - (centerX - prevPan.x) * (newZoom / zoom)),
      y: Math.round(centerY - (centerY - prevPan.y) * (newZoom / zoom))
    }));
    setZoom(newZoom);
  }, [zoom]);

  // Initial center on mount
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current) {
      centerCanvas();
      hasInitialized.current = true;
    }
  }, [centerCanvas]);

  // Touch gesture integration (pinch zoom, two-finger pan, 2-finger undo, 3-finger redo)
  useTouchGestures(containerRef, {
    onGestureStart: () => {
      // If user starts 2-finger gesture while drawing, immediately abort active stroke
      if (isDrawing.current) {
        isDrawing.current = false;
        drawStart.current = null;
        lastDrawnPos.current = null;
        if (tempPixels.current && activeLayer) {
          const liveFn = onLiveLayerPixels || onUpdateLayerPixels;
          if (liveFn) liveFn(activeLayer.id, activeLayer.pixels);
        }
        tempPixels.current = null;
      }
    },
    onPinchZoom: (ratio, centerX, centerY) => {
      setZoom(prevZoom => {
        const newZoom = Math.min(64, Math.max(4, prevZoom * ratio));
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const relX = centerX - rect.left;
          const relY = centerY - rect.top;
          setPan(prevPan => ({
            x: Math.round(relX - (relX - prevPan.x) * (newZoom / prevZoom)),
            y: Math.round(relY - (relY - prevPan.y) * (newZoom / prevZoom))
          }));
        }
        return newZoom;
      });
    },
    onTwoFingerPan: (dx, dy) => {
      setPan(prev => ({ x: Math.round(prev.x + dx), y: Math.round(prev.y + dy) }));
    },
    onTwoFingerTap: () => {
      onUndo();
    },
    onThreeFingerTap: () => {
      onRedo();
    }
  });

  // Convert screen coordinates to canvas pixel coordinates using exact canvas bounds
  const screenToCanvas = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const x = Math.floor((clientX - rect.left) / (rect.width / width));
        const y = Math.floor((clientY - rect.top) / (rect.height / height));
        return { x, y };
      }
    }
    if (!containerRef.current) return { x: -1, y: -1 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left - pan.x) / zoom);
    const y = Math.floor((clientY - rect.top - pan.y) / zoom);
    return { x, y };
  }, [width, height, pan.x, pan.y, zoom]);

  // Sample composite color at (x, y)
  const sampleColorAt = (x: number, y: number) => {
    for (let i = currentFrame.layers.length - 1; i >= 0; i--) {
      const layer = currentFrame.layers[i];
      if (layer.visible && layer.pixels[y * width + x]) {
        onColorPick(layer.pixels[y * width + x]);
        return;
      }
    }
  };

  // Dither matrix check
  const shouldDither = (x: number, y: number, pattern: string): boolean => {
    switch (pattern) {
      case 'checker':
        return (x + y) % 2 === 0;
      case 'light':
        return x % 2 === 0 && y % 2 === 0;
      case 'dense':
        return !((x + y) % 2 === 0 && x % 2 === 0);
      case 'bayer':
        const bayer4x4 = [
          [ 0,  8,  2, 10],
          [12,  4, 14,  6],
          [ 3, 11,  1,  9],
          [15,  7, 13,  5]
        ];
        return bayer4x4[y % 4][x % 4] < 8;
      default:
        return true;
    }
  };

  // Calculate mirrored / radial coordinates based on symmetry or Mirror Tool
  const getSymmetricPoints = useCallback((x: number, y: number): { x: number; y: number }[] => {
    const points: { x: number; y: number }[] = [{ x, y }];
    const isMirrorTool = activeTool === 'mirror';
    const effectiveSymmetry = isMirrorTool
      ? (toolSettings.mirrorAxis === 'both' ? 'quad' : toolSettings.mirrorAxis || 'horizontal')
      : toolSettings.symmetry;

    if (effectiveSymmetry === 'none') {
      return points;
    }

    const angleDeg = toolSettings.symmetryAngle || 0;
    const cx = (width - 1) / 2;
    const cy = (height - 1) / 2;

    const addPoint = (px: number, py: number) => {
      const rx = Math.round(px);
      const ry = Math.round(py);
      if (rx >= 0 && rx < width && ry >= 0 && ry < height) {
        if (!points.some(p => p.x === rx && p.y === ry)) {
          points.push({ x: rx, y: ry });
        }
      }
    };

    if (effectiveSymmetry === 'radial') {
      const rays = toolSettings.symmetryRays || 8;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.001) {
        const baseAngle = Math.atan2(dy, dx);
        const step = (2 * Math.PI) / rays;

        for (let i = 1; i < rays; i++) {
          const theta = baseAngle + i * step;
          addPoint(cx + dist * Math.cos(theta), cy + dist * Math.sin(theta));
        }
      }
    } else if (angleDeg === 0) {
      // Standard axis-aligned integer reflection (pixel-perfect)
      if (effectiveSymmetry === 'horizontal' || effectiveSymmetry === 'quad') {
        points.push({ x: width - 1 - x, y });
      }
      if (effectiveSymmetry === 'vertical' || effectiveSymmetry === 'quad') {
        points.push({ x, y: height - 1 - y });
      }
      if (effectiveSymmetry === 'quad') {
        points.push({ x: width - 1 - x, y: height - 1 - y });
      }
    } else {
      // Rotated geometric symmetry reflection across arbitrary axis angle
      const rad = (angleDeg * Math.PI) / 180;
      const dx = x - cx;
      const dy = y - cy;

      const reflectAcross = (axisAngle: number) => {
        const ux = Math.cos(axisAngle);
        const uy = Math.sin(axisAngle);
        const p = dx * ux + dy * uy;
        const refX = 2 * p * ux - dx;
        const refY = 2 * p * uy - dy;
        addPoint(cx + refX, cy + refY);
      };

      if (effectiveSymmetry === 'horizontal' || effectiveSymmetry === 'quad') {
        reflectAcross(rad + Math.PI / 2);
      }
      if (effectiveSymmetry === 'vertical' || effectiveSymmetry === 'quad') {
        reflectAcross(rad);
      }
      if (effectiveSymmetry === 'quad') {
        addPoint(cx - dx, cy - dy);
      }
    }

    return points.filter(p => p.x >= 0 && p.x < width && p.y >= 0 && p.y < height);
  }, [width, height, activeTool, toolSettings.symmetry, toolSettings.mirrorAxis, toolSettings.symmetryAngle, toolSettings.symmetryRays]);

  // Dynamic pressure-sensitive brush size
  const getEffectiveBrushSize = useCallback((pressureVal: number): number => {
    if (!toolSettings.pressureSensitivity || toolSettings.pressureAffectsSize === false) {
      return toolSettings.brushSize;
    }
    if (toolSettings.brushSize <= 1) return 1;
    const p = Math.max(0.05, Math.min(1.0, pressureVal));
    return Math.max(1, Math.min(toolSettings.brushSize, Math.round(1 + (toolSettings.brushSize - 1) * p)));
  }, [toolSettings.pressureSensitivity, toolSettings.pressureAffectsSize, toolSettings.brushSize]);

  // Dynamic pressure-sensitive stroke opacity
  const getEffectiveOpacity = useCallback((pressureVal: number): number => {
    const baseOpacity = toolSettings.opacity !== undefined ? toolSettings.opacity : 1.0;
    if (!toolSettings.pressureSensitivity || toolSettings.pressureAffectsOpacity === false) {
      return baseOpacity;
    }
    const p = Math.max(0.1, Math.min(1.0, pressureVal));
    return Math.max(0.08, Math.min(1.0, baseOpacity * p));
  }, [toolSettings.pressureSensitivity, toolSettings.pressureAffectsOpacity, toolSettings.opacity]);

  // Apply brush stroke with accurate pixel offsets, dynamic size, and Porter-Duff alpha blending
  const applyBrushToPixelArray = useCallback((
    pixels: string[],
    cx: number,
    cy: number,
    color: string,
    isDither: boolean = false,
    overrideSize?: number,
    overrideOpacity?: number
  ) => {
    const size = overrideSize !== undefined ? overrideSize : toolSettings.brushSize;
    const baseOpacity = toolSettings.opacity !== undefined ? toolSettings.opacity : 1.0;
    const opacity = overrideOpacity !== undefined ? overrideOpacity : baseOpacity;
    const offsets = getBrushOffsets(size, toolSettings.brushShape, toolSettings.customBrushPattern);
    const symPoints = getSymmetricPoints(cx, cy);

    for (const sp of symPoints) {
      for (const off of offsets) {
        const nx = sp.x + off.dx;
        const ny = sp.y + off.dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          if (isDither && !shouldDither(nx, ny, toolSettings.ditherPattern)) {
            continue;
          }
          // Lock Transparency: only modify existing pixels, protecting transparent areas
          if (activeLayer?.alphaLocked) {
            const originalPixel = activeLayer.pixels ? activeLayer.pixels[ny * width + nx] : pixels[ny * width + nx];
            if (!originalPixel || originalPixel === '' || !pixels[ny * width + nx] || pixels[ny * width + nx] === '') {
              continue;
            }
            // Eraser cannot punch transparent holes when transparency is locked
            if (color === '') {
              continue;
            }
          }

          if (color === '') {
            // Eraser: if opacity < 0.99, fade existing pixel based on pressure/opacity
            if (opacity < 0.99 && pixels[ny * width + nx]) {
              pixels[ny * width + nx] = fadePixelColor(pixels[ny * width + nx], 1 - opacity);
            } else {
              pixels[ny * width + nx] = '';
            }
          } else {
            // Determine color: allow multi-colored stamp if configured
            const paintColor = (toolSettings.brushShape === 'custom' && toolSettings.customBrushPattern?.useOriginalColors && off.color)
              ? off.color
              : color;

            // Normal color: if opacity < 0.99, blend with existing pixel
            if (opacity < 0.99) {
              pixels[ny * width + nx] = blendPixelColor(pixels[ny * width + nx], paintColor, opacity);
            } else {
              pixels[ny * width + nx] = paintColor;
            }
          }
        }
      }
    }
  }, [width, height, toolSettings.brushSize, toolSettings.brushShape, toolSettings.ditherPattern, toolSettings.opacity, activeLayer?.alphaLocked, getSymmetricPoints]);

  // Flood fill algorithm
  const floodFill = (startX: number, startY: number, fillColor: string) => {
    if (!activeLayer || activeLayer.locked) return;
    const pixels = [...activeLayer.pixels];
    const targetColor = pixels[startY * width + startX] || '';

    if (targetColor === fillColor) return;
    // Lock Transparency: do not fill transparent areas
    if (activeLayer.alphaLocked && (!targetColor || targetColor === '')) return;

    const queue: [number, number][] = [[startX, startY]];
    const visited = new Uint8Array(width * height);

    while (queue.length > 0) {
      const [x, y] = queue.pop()!;
      const idx = y * width + x;

      if (x < 0 || x >= width || y < 0 || y >= height || visited[idx]) continue;
      if (activeLayer.alphaLocked && (!pixels[idx] || pixels[idx] === '')) continue;
      if ((pixels[idx] || '') !== targetColor) continue;

      visited[idx] = 1;
      pixels[idx] = fillColor;

      queue.push([x + 1, y]);
      queue.push([x - 1, y]);
      queue.push([x, y + 1]);
      queue.push([x, y - 1]);
    }

    const commitFn = onCommitLayerPixels || onUpdateLayerPixels;
    if (commitFn) commitFn(activeLayer.id, pixels);
  };

  // Continuous stroke line interpolation (Bresenham) with dynamic pressure interpolation
  const drawStrokeLine = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: string,
    pixels: string[],
    isDither: boolean,
    p0: number = 1.0,
    p1: number = 1.0
  ) => {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let currX = x0;
    let currY = y0;
    const totalSteps = Math.max(dx, dy);
    let step = 0;

    while (true) {
      const p = totalSteps > 0 ? p0 + (p1 - p0) * (step / totalSteps) : p1;
      const stepSize = getEffectiveBrushSize(p);
      const stepOpacity = getEffectiveOpacity(p);
      applyBrushToPixelArray(pixels, currX, currY, color, isDither, stepSize, stepOpacity);
      if (currX === x1 && currY === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        currX += sx;
      }
      if (e2 < dx) {
        err += dx;
        currY += sy;
      }
      step++;
    }
  };

  // Bresenham's line algorithm for line tool
  const drawLine = (x0: number, y0: number, x1: number, y1: number, color: string, pixels: string[]) => {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let currX = x0;
    let currY = y0;

    while (true) {
      applyBrushToPixelArray(pixels, currX, currY, color);
      if (currX === x1 && currY === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        currX += sx;
      }
      if (e2 < dx) {
        err += dx;
        currY += sy;
      }
    }
  };

  // Draw rectangle
  const drawRect = (x0: number, y0: number, x1: number, y1: number, color: string, pixels: string[]) => {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    for (let x = minX; x <= maxX; x++) {
      applyBrushToPixelArray(pixels, x, minY, color);
      applyBrushToPixelArray(pixels, x, maxY, color);
    }
    for (let y = minY; y <= maxY; y++) {
      applyBrushToPixelArray(pixels, minX, y, color);
      applyBrushToPixelArray(pixels, maxX, y, color);
    }
  };

  // Draw circle (ellipse outline)
  const drawCircle = (x0: number, y0: number, x1: number, y1: number, color: string, pixels: string[]) => {
    const radius = Math.round(Math.hypot(x1 - x0, y1 - y0));
    let x = radius;
    let y = 0;
    let err = 0;

    while (x >= y) {
      applyBrushToPixelArray(pixels, x0 + x, y0 + y, color);
      applyBrushToPixelArray(pixels, x0 + y, y0 + x, color);
      applyBrushToPixelArray(pixels, x0 - y, y0 + x, color);
      applyBrushToPixelArray(pixels, x0 - x, y0 + y, color);
      applyBrushToPixelArray(pixels, x0 - x, y0 - y, color);
      applyBrushToPixelArray(pixels, x0 - y, y0 - x, color);
      applyBrushToPixelArray(pixels, x0 + y, y0 - x, color);
      applyBrushToPixelArray(pixels, x0 + x, y0 - y, color);

      if (err <= 0) {
        y += 1;
        err += 2 * y + 1;
      }
      if (err > 0) {
        x -= 1;
        err -= 2 * x + 1;
      }
    }
  };

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    // Middle click, alt key, or active hand mode: pan mode
    if (e.button === 1 || e.altKey || isHandMode) {
      setIsPanning(true);
      setLastPanPos({ x: e.clientX, y: e.clientY });
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      return;
    }

    if (e.button !== 0 && e.pointerType === 'mouse') return; // Left click / single touch only
    if (!activeLayer) return;

    // If layer is locked, prevent drawing/editing and show feedback (allow color picking)
    if (activeLayer.locked) {
      if (activeTool === 'picker') {
        const { x, y } = screenToCanvas(e.clientX, e.clientY);
        if (x >= 0 && x < width && y >= 0 && y < height) {
          sampleColorAt(x, y);
        }
        return;
      }

      setShowLockedToast(true);
      if (lockedToastTimer.current) clearTimeout(lockedToastTimer.current);
      lockedToastTimer.current = setTimeout(() => setShowLockedToast(false), 2500);
      return;
    }

    // Prevent default touch gestures / scrolling
    e.preventDefault();

    // Check if user clicked near the rotatable symmetry guide handle
    const isMirrorTool = activeTool === 'mirror';
    const effectiveSymmetry = isMirrorTool
      ? (toolSettings.mirrorAxis === 'both' ? 'quad' : toolSettings.mirrorAxis || 'horizontal')
      : toolSettings.symmetry;

    if ((effectiveSymmetry !== 'none' || isMirrorTool) && toolSettings.symmetryGuideVisible !== false) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const cx = pan.x + (width / 2) * zoom;
        const cy = pan.y + (height / 2) * zoom;
        const angleDeg = toolSettings.symmetryAngle || 0;
        const angleRad = (angleDeg * Math.PI) / 180;
        const handleDist = Math.min(width, height) * zoom * 0.44;
        const primaryAngle = effectiveSymmetry === 'horizontal' ? angleRad + Math.PI / 2 : angleRad;
        const hx = cx + handleDist * Math.cos(primaryAngle);
        const hy = cy + handleDist * Math.sin(primaryAngle);
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;

        if (Math.hypot(px - hx, py - hy) <= 22) {
          isRotatingGuide.current = true;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // Ignore
          }
          return;
        }
      }
    }

    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    if (x < 0 || x >= width || y < 0 || y >= height) {
      if (activeSelection) {
        updateSelection(null);
      }
      return;
    }

    // Capture pointer so fast finger/pen strokes never get lost outside the canvas
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture unsupported
    }

    // If floating paste is active, clicking on canvas repositions/drags it
    if (floatingPaste) {
      isDraggingPaste.current = true;
      pasteDragStart.current = {
        startX: x,
        startY: y,
        pasteX: floatingPaste.x,
        pasteY: floatingPaste.y
      };
      return;
    }

    isDrawing.current = true;
    drawStart.current = { x, y };
    lastDrawnPos.current = { x, y };
    currentPointer.current = { x, y };
    stabilizedPos.current = { x, y };

    // Extract PointerEvent pressure
    let p = 1.0;
    if (e.pressure !== undefined && e.pressure > 0) {
      p = e.pressure;
    } else if (e.pointerType === 'mouse') {
      p = 1.0;
    } else {
      p = 0.5;
    }
    currentPressure.current = p;
    lastPressure.current = p;

    if (activeTool === 'picker') {
      sampleColorAt(x, y);
      isDrawing.current = false;
      return;
    }

    if (activeTool === 'bucket') {
      floodFill(x, y, toolSettings.activeColor);
      isDrawing.current = false;
      return;
    }

    if (activeTool === 'select') {
      const isSnap = Boolean(toolSettings.snapToGrid);
      const effSpacing = getEffectiveGridSpacing(toolSettings.gridSpacing, toolSettings.tileGridVisible, toolSettings.tileGridSize);
      const coords = getSnappedShapeCoords(
        'select',
        { x, y },
        { x, y },
        effSpacing,
        width,
        height,
        isSnap
      );
      updateSelection({
        startX: Math.min(coords.x0, coords.x1),
        startY: Math.min(coords.y0, coords.y1),
        endX: Math.max(coords.x0, coords.x1),
        endY: Math.max(coords.y0, coords.y1)
      });
    } else if (activeTool === 'pencil' || activeTool === 'eraser' || activeTool === 'dither' || activeTool === 'mirror') {
      tempPixels.current = [...activeLayer.pixels];
      const color = activeTool === 'eraser' ? '' : toolSettings.activeColor;
      const initialSize = getEffectiveBrushSize(p);
      const initialOpacity = getEffectiveOpacity(p);
      applyBrushToPixelArray(tempPixels.current, x, y, color, activeTool === 'dither', initialSize, initialOpacity);
      const liveFn = onLiveLayerPixels || onUpdateLayerPixels;
      if (liveFn) liveFn(activeLayer.id, tempPixels.current);
    } else {
      // Line, rect, circle: initialize temp buffer
      tempPixels.current = [...activeLayer.pixels];
    }

    renderOverlay();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastPanPos.x;
      const dy = e.clientY - lastPanPos.y;
      setPan(prev => ({ x: Math.round(prev.x + dx), y: Math.round(prev.y + dy) }));
      setLastPanPos({ x: e.clientX, y: e.clientY });
      return;
    }

    // Rotating the symmetry guide
    if (isRotatingGuide.current && onUpdateToolSettings) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const cx = pan.x + (width / 2) * zoom;
        const cy = pan.y + (height / 2) * zoom;
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const isMirror = activeTool === 'mirror';
        const effSym = isMirror
          ? (toolSettings.mirrorAxis === 'both' ? 'quad' : toolSettings.mirrorAxis || 'horizontal')
          : toolSettings.symmetry;

        let rad = Math.atan2(py - cy, px - cx);
        if (effSym === 'horizontal') rad -= Math.PI / 2;
        let deg = Math.round((rad * 180) / Math.PI);
        deg = ((deg % 360) + 360) % 360;
        if (deg % 15 <= 2.5 || deg % 15 >= 12.5) {
          deg = Math.round(deg / 15) * 15;
        }
        onUpdateToolSettings({ symmetryAngle: deg % 360 });
        renderOverlay();
      }
      return;
    }

    // Safety check: if mouse button was released outside container
    if (isDrawing.current && e.buttons === 0 && e.pointerType === 'mouse') {
      handlePointerUp();
      return;
    }

    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    currentPointer.current = { x, y };

    let movePressure = currentPressure.current;
    if (e.pressure !== undefined && e.pressure > 0) {
      movePressure = e.pressure;
    } else if (e.buttons === 0) {
      movePressure = 0.5;
    }
    const prevPressure = currentPressure.current;
    currentPressure.current = movePressure;

    // Dragging floating paste buffer
    if (isDraggingPaste.current && pasteDragStart.current && floatingPaste && onSetFloatingPaste) {
      const dx = x - pasteDragStart.current.startX;
      const dy = y - pasteDragStart.current.startY;
      onSetFloatingPaste({
        ...floatingPaste,
        x: pasteDragStart.current.pasteX + dx,
        y: pasteDragStart.current.pasteY + dy
      });
      renderOverlay();
      return;
    }

    if (isDrawing.current && activeLayer && !activeLayer.locked && drawStart.current) {
      if (activeTool === 'select') {
        const clampedX = Math.max(0, Math.min(width - 1, x));
        const clampedY = Math.max(0, Math.min(height - 1, y));
        const isSnap = Boolean(toolSettings.snapToGrid);
        const effSpacing = getEffectiveGridSpacing(toolSettings.gridSpacing, toolSettings.tileGridVisible, toolSettings.tileGridSize);
        const coords = getSnappedShapeCoords(
          'select',
          drawStart.current,
          { x: clampedX, y: clampedY },
          effSpacing,
          width,
          height,
          isSnap
        );
        updateSelection({
          startX: Math.min(coords.x0, coords.x1),
          startY: Math.min(coords.y0, coords.y1),
          endX: Math.max(coords.x0, coords.x1),
          endY: Math.max(coords.y0, coords.y1)
        });
        renderOverlay();
        return;
      }

      if (activeTool === 'pencil' || activeTool === 'eraser' || activeTool === 'dither' || activeTool === 'mirror') {
        if (!tempPixels.current) tempPixels.current = [...activeLayer.pixels];
        const color = activeTool === 'eraser' ? '' : toolSettings.activeColor;

        // Clamp coordinates to sprite edges so fast strokes right to the boundary stay unbroken
        const clampedX = Math.max(0, Math.min(width - 1, x));
        const clampedY = Math.max(0, Math.min(height - 1, y));

        let drawTargetX = clampedX;
        let drawTargetY = clampedY;

        if (toolSettings.stabilization) {
          const weight = Math.max(1, Math.min(20, toolSettings.stabilizationWeight || 6));
          const factor = 1 / (1 + weight * 0.45);
          const prevStab = stabilizedPos.current || { x: clampedX, y: clampedY };
          const nextStabX = prevStab.x + (clampedX - prevStab.x) * factor;
          const nextStabY = prevStab.y + (clampedY - prevStab.y) * factor;
          stabilizedPos.current = { x: nextStabX, y: nextStabY };
          drawTargetX = Math.round(nextStabX);
          drawTargetY = Math.round(nextStabY);
        }

        if (lastDrawnPos.current) {
          if (!toolSettings.stabilization || (lastDrawnPos.current.x !== drawTargetX || lastDrawnPos.current.y !== drawTargetY)) {
            drawStrokeLine(
              lastDrawnPos.current.x,
              lastDrawnPos.current.y,
              drawTargetX,
              drawTargetY,
              color,
              tempPixels.current,
              activeTool === 'dither',
              prevPressure,
              movePressure
            );
            lastDrawnPos.current = { x: drawTargetX, y: drawTargetY };
          }
        } else {
          const effSize = getEffectiveBrushSize(movePressure);
          const effOpacity = getEffectiveOpacity(movePressure);
          applyBrushToPixelArray(tempPixels.current, drawTargetX, drawTargetY, color, activeTool === 'dither', effSize, effOpacity);
          lastDrawnPos.current = { x: drawTargetX, y: drawTargetY };
        }

        const liveFn = onLiveLayerPixels || onUpdateLayerPixels;
        if (liveFn) liveFn(activeLayer.id, tempPixels.current);
      }
    }

    renderOverlay();
  };

  const handlePointerUp = (e?: React.PointerEvent) => {
    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }

    if (isRotatingGuide.current) {
      isRotatingGuide.current = false;
      renderOverlay();
      return;
    }

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDraggingPaste.current) {
      isDraggingPaste.current = false;
      pasteDragStart.current = null;
      renderOverlay();
      return;
    }

    if (!isDrawing.current || !activeLayer || activeLayer.locked || !drawStart.current) {
      isDrawing.current = false;
      drawStart.current = null;
      lastDrawnPos.current = null;
      tempPixels.current = null;
      renderOverlay();
      return;
    }

    const commitFn = onCommitLayerPixels || onUpdateLayerPixels;

    if (activeTool === 'pencil' || activeTool === 'eraser' || activeTool === 'dither' || activeTool === 'mirror') {
      // If stabilization was active, catch up final trailing segment to the pointer position on release
      if (toolSettings.stabilization && lastDrawnPos.current && tempPixels.current) {
        const finalX = Math.max(0, Math.min(width - 1, currentPointer.current.x));
        const finalY = Math.max(0, Math.min(height - 1, currentPointer.current.y));
        if (finalX >= 0 && finalY >= 0 && (lastDrawnPos.current.x !== finalX || lastDrawnPos.current.y !== finalY)) {
          const color = activeTool === 'eraser' ? '' : toolSettings.activeColor;
          drawStrokeLine(
            lastDrawnPos.current.x,
            lastDrawnPos.current.y,
            finalX,
            finalY,
            color,
            tempPixels.current,
            activeTool === 'dither',
            currentPressure.current,
            currentPressure.current
          );
        }
      }
      stabilizedPos.current = null;

      if (tempPixels.current && commitFn) {
        commitFn(activeLayer.id, tempPixels.current);
      }
    } else {
      const isSnap = Boolean(toolSettings.snapToGrid);
      const effSpacing = getEffectiveGridSpacing(toolSettings.gridSpacing, toolSettings.tileGridVisible, toolSettings.tileGridSize);
      const coords = getSnappedShapeCoords(
        activeTool as 'line' | 'rect' | 'circle' | 'select',
        drawStart.current,
        currentPointer.current,
        effSpacing,
        width,
        height,
        isSnap
      );
      const { x0, y0, x1, y1 } = coords;

      if (activeTool === 'line') {
        const pixels = [...activeLayer.pixels];
        drawLine(x0, y0, x1, y1, toolSettings.activeColor, pixels);
        if (commitFn) commitFn(activeLayer.id, pixels);
      } else if (activeTool === 'rect') {
        const pixels = [...activeLayer.pixels];
        drawRect(x0, y0, x1, y1, toolSettings.activeColor, pixels);
        if (commitFn) commitFn(activeLayer.id, pixels);
      } else if (activeTool === 'circle') {
        const pixels = [...activeLayer.pixels];
        drawCircle(x0, y0, x1, y1, toolSettings.activeColor, pixels);
        if (commitFn) commitFn(activeLayer.id, pixels);
      } else if (activeTool === 'select') {
        updateSelection({
          startX: Math.min(x0, x1),
          startY: Math.min(y0, y1),
          endX: Math.max(x0, x1),
          endY: Math.max(y0, y1)
        });
      }
    }

    isDrawing.current = false;
    drawStart.current = null;
    lastDrawnPos.current = null;
    tempPixels.current = null;
    renderOverlay();
  };


  // Main canvas render (layers + onion skinning)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    // Helper to render a layer's pixels with blend mode calculations and opacity
    const renderLayer = (layer: typeof currentFrame.layers[0], isBase: boolean) => {
      if (!layer.visible || layer.opacity <= 0) return;

      const layerCanvas = document.createElement('canvas');
      layerCanvas.width = width;
      layerCanvas.height = height;
      const lCtx = layerCanvas.getContext('2d');
      if (!lCtx) return;
      lCtx.imageSmoothingEnabled = false;

      let hasPixels = false;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const color = layer.pixels[y * width + x];
          if (color) {
            hasPixels = true;
            lCtx.fillStyle = color;
            lCtx.fillRect(x, y, 1, 1);
          }
        }
      }

      if (!hasPixels) return;

      ctx.save();
      ctx.globalAlpha = typeof layer.opacity === 'number' ? Math.max(0, Math.min(1, layer.opacity)) : 1.0;
      
      // If this is the base layer on an empty canvas, use source-over so it remains visible
      const compositeOp = (isBase || !layer.blendMode)
        ? 'source-over'
        : mapBlendModeToCompositeOperation(layer.blendMode);

      ctx.globalCompositeOperation = compositeOp;
      ctx.drawImage(layerCanvas, 0, 0);
      ctx.restore();
    };

    // Helper to render ghosted previous frame for onion skinning
    const renderOnionSkin = (isBase: boolean) => {
      if (!toolSettings.onionSkin || !previousFrame) return;

      const baseAlpha = toolSettings.onionSkinOpacity !== undefined ? toolSettings.onionSkinOpacity : 0.5;
      for (const prevLayer of previousFrame.layers) {
        if (!prevLayer.visible || (prevLayer.opacity !== undefined && prevLayer.opacity <= 0)) continue;

        const prevCanvas = document.createElement('canvas');
        prevCanvas.width = width;
        prevCanvas.height = height;
        const pCtx = prevCanvas.getContext('2d');
        if (!pCtx) continue;
        pCtx.imageSmoothingEnabled = false;

        let hasPixels = false;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const color = prevLayer.pixels[y * width + x];
            if (color) {
              hasPixels = true;
              pCtx.fillStyle = color;
              pCtx.fillRect(x, y, 1, 1);
            }
          }
        }
        if (!hasPixels) continue;

        ctx.save();
        const layerAlpha = prevLayer.opacity !== undefined ? prevLayer.opacity : 1.0;
        ctx.globalAlpha = Math.max(0.08, Math.min(1.0, baseAlpha * layerAlpha));
        ctx.globalCompositeOperation = (isBase || !prevLayer.blendMode)
          ? 'source-over'
          : mapBlendModeToCompositeOperation(prevLayer.blendMode);
        ctx.drawImage(prevCanvas, 0, 0);
        ctx.restore();
      }
    };

    // Find the active layer index to insert onion skin beneath it
    const activeLayerIndex = currentFrame.layers.findIndex(l => l.id === activeLayerId);
    const splitIndex = activeLayerIndex >= 0 ? activeLayerIndex : 0;

    let renderedCount = 0;

    // 1. Render all frame layers beneath the active layer
    for (let i = 0; i < splitIndex; i++) {
      const lyr = currentFrame.layers[i];
      if (lyr.visible && lyr.opacity > 0) {
        renderLayer(lyr, renderedCount === 0);
        renderedCount++;
      }
    }

    // 2. Render ghosted previous frame beneath the active layer
    if (toolSettings.onionSkin && previousFrame) {
      renderOnionSkin(renderedCount === 0);
      renderedCount++;
    }

    // 3. Render active layer and all layers above it
    for (let i = splitIndex; i < currentFrame.layers.length; i++) {
      const lyr = currentFrame.layers[i];
      if (lyr.visible && lyr.opacity > 0) {
        renderLayer(lyr, renderedCount === 0);
        renderedCount++;
      }
    }
  }, [currentFrame, previousFrame, width, height, activeLayerId, toolSettings.onionSkin, toolSettings.onionSkinOpacity]);

  // Overlay canvas render (grid, cursor brush preview, shape preview, symmetry lines, selection)
  const renderOverlay = useCallback(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Grid lines (with dynamic spacing and opacity)
    if (toolSettings.gridVisible) {
      const spacing = Math.max(1, Math.round(toolSettings.gridSpacing || 1));
      const minZoom = spacing === 1 ? 4 : (spacing <= 4 ? 2 : 1);

      if (zoom >= minZoom) {
        const opacity = Math.max(0.02, Math.min(1, toolSettings.gridOpacity ?? 0.25));
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = 1;

        ctx.beginPath();
        for (let x = 0; x <= width; x += spacing) {
          const px = Math.round(pan.x + x * zoom) + 0.5;
          ctx.moveTo(px, pan.y);
          ctx.lineTo(px, pan.y + height * zoom);
        }
        for (let y = 0; y <= height; y += spacing) {
          const py = Math.round(pan.y + y * zoom) + 0.5;
          ctx.moveTo(pan.x, py);
          ctx.lineTo(pan.x + width * zoom, py);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    // Tile grid (e.g. 8x8 or 16x16 boundaries in distinct cyan color)
    if (toolSettings.tileGridVisible && toolSettings.tileGridSize > 1) {
      const tileAlpha = Math.max(0.08, Math.min(1, (toolSettings.gridOpacity ?? 0.25) * 1.8));
      ctx.save();
      ctx.strokeStyle = `rgba(56, 189, 248, ${tileAlpha})`;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      for (let x = 0; x <= width; x += toolSettings.tileGridSize) {
        const px = Math.round(pan.x + x * zoom) + 0.5;
        ctx.moveTo(px, pan.y);
        ctx.lineTo(px, pan.y + height * zoom);
      }
      for (let y = 0; y <= height; y += toolSettings.tileGridSize) {
        const py = Math.round(pan.y + y * zoom) + 0.5;
        ctx.moveTo(pan.x, py);
        ctx.lineTo(pan.x + width * zoom, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Rotatable Radial / Geometric Symmetry Guide Overlay
    const isMirrorTool = activeTool === 'mirror';
    const effectiveSymmetry = isMirrorTool
      ? (toolSettings.mirrorAxis === 'both' ? 'quad' : toolSettings.mirrorAxis || 'horizontal')
      : toolSettings.symmetry;

    const showSymmetryGuide = (effectiveSymmetry !== 'none' || isMirrorTool) && toolSettings.symmetryGuideVisible !== false;

    if (showSymmetryGuide) {
      ctx.save();
      const cx = pan.x + (width / 2) * zoom;
      const cy = pan.y + (height / 2) * zoom;
      const angleDeg = toolSettings.symmetryAngle || 0;
      const angleRad = (angleDeg * Math.PI) / 180;
      const maxDim = Math.max(width, height) * zoom;
      const radius = maxDim * 0.75;
      const guideColor = isMirrorTool ? 'rgba(245, 158, 11, 0.85)' : 'rgba(56, 189, 248, 0.85)';
      const guideFaint = isMirrorTool ? 'rgba(245, 158, 11, 0.22)' : 'rgba(56, 189, 248, 0.22)';
      const accentColor = isMirrorTool ? '#fbbf24' : '#38bdf8';

      // 1. Concentric Radial Guide Rings (geometric circles for alignment)
      if (toolSettings.symmetryGuideRings !== false) {
        ctx.strokeStyle = guideFaint;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);

        const minR = Math.min(width, height) * zoom * 0.5;
        const ringSteps = [0.25, 0.5, 0.75, 1.0];

        for (const step of ringSteps) {
          const r = minR * step;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();

          // Small degree ticks on the outer 100% ring
          if (step === 1.0) {
            ctx.save();
            ctx.setLineDash([]);
            ctx.strokeStyle = guideFaint;
            for (let deg = 0; deg < 360; deg += 30) {
              const rad = (deg * Math.PI) / 180;
              const innerTick = r - 3;
              const outerTick = r + 3;
              ctx.beginPath();
              ctx.moveTo(cx + innerTick * Math.cos(rad), cy + innerTick * Math.sin(rad));
              ctx.lineTo(cx + outerTick * Math.cos(rad), cy + outerTick * Math.sin(rad));
              ctx.stroke();
            }
            ctx.restore();
          }
        }
      }

      // 2. Rotatable Spokes & Geometric Symmetry Axes
      ctx.strokeStyle = guideColor;
      ctx.lineWidth = 1.5;

      if (effectiveSymmetry === 'radial') {
        // Radial star spokes
        const rays = toolSettings.symmetryRays || 8;
        const step = (2 * Math.PI) / rays;

        for (let i = 0; i < rays; i++) {
          const rayAngle = angleRad + i * step;
          const isPrimary = i === 0;

          ctx.beginPath();
          ctx.setLineDash(isPrimary ? [] : [4, 4]);
          ctx.lineWidth = isPrimary ? 2 : 1.25;
          ctx.strokeStyle = isPrimary ? accentColor : guideColor;

          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + radius * Math.cos(rayAngle), cy + radius * Math.sin(rayAngle));
          ctx.stroke();
        }
      } else if (effectiveSymmetry === 'horizontal') {
        // Rotated vertical divider line (perpendicular to angle)
        const axisAngle = angleRad + Math.PI / 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(cx - radius * Math.cos(axisAngle), cy - radius * Math.sin(axisAngle));
        ctx.lineTo(cx + radius * Math.cos(axisAngle), cy + radius * Math.sin(axisAngle));
        ctx.stroke();
      } else if (effectiveSymmetry === 'vertical') {
        // Rotated horizontal divider line
        const axisAngle = angleRad;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(cx - radius * Math.cos(axisAngle), cy - radius * Math.sin(axisAngle));
        ctx.lineTo(cx + radius * Math.cos(axisAngle), cy + radius * Math.sin(axisAngle));
        ctx.stroke();
      } else if (effectiveSymmetry === 'quad') {
        // Both perpendicular axes rotated by angleRad
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(cx - radius * Math.cos(angleRad), cy - radius * Math.sin(angleRad));
        ctx.lineTo(cx + radius * Math.cos(angleRad), cy + radius * Math.sin(angleRad));
        ctx.moveTo(cx - radius * Math.cos(angleRad + Math.PI / 2), cy - radius * Math.sin(angleRad + Math.PI / 2));
        ctx.lineTo(cx + radius * Math.cos(angleRad + Math.PI / 2), cy + radius * Math.sin(angleRad + Math.PI / 2));
        ctx.stroke();
      }

      // 3. Center Pivot Crosshair & Reticle
      ctx.setLineDash([]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = accentColor;
      ctx.fillStyle = '#0f172a';

      // Pivot outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pivot crosshair ticks
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy);
      ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8);
      ctx.stroke();

      // Pivot center dot
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();

      // 4. Interactive Rotation Handle along Primary Axis
      const handleDist = Math.min(width, height) * zoom * 0.44;
      const primaryAngle = effectiveSymmetry === 'horizontal' ? angleRad + Math.PI / 2 : angleRad;
      const hx = cx + handleDist * Math.cos(primaryAngle);
      const hy = cy + handleDist * Math.sin(primaryAngle);

      // Handle circle
      ctx.fillStyle = accentColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx, hy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Small angle readout badge
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1;
      const text = `${Math.round(angleDeg)}°`;
      const textWidth = ctx.measureText(text).width;
      ctx.fillRect(hx + 10, hy - 8, textWidth + 8, 16);
      ctx.strokeRect(hx + 10, hy - 8, textWidth + 8, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, hx + 14, hy + 4);

      ctx.restore();
    }

    // Cursor & brush cells preview
    const { x: cx, y: cy } = currentPointer.current;
    if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
      const symPoints = getSymmetricPoints(cx, cy);
      const effSize = (toolSettings.pressureSensitivity && isDrawing.current)
        ? getEffectiveBrushSize(currentPressure.current)
        : toolSettings.brushSize;
      const effOpacity = (toolSettings.pressureSensitivity && isDrawing.current)
        ? getEffectiveOpacity(currentPressure.current)
        : (toolSettings.opacity !== undefined ? toolSettings.opacity : 1.0);
      const offsets = getBrushOffsets(effSize, toolSettings.brushShape, toolSettings.customBrushPattern);

      for (let sIdx = 0; sIdx < symPoints.length; sIdx++) {
        const sp = symPoints[sIdx];
        if (isMirrorTool && sIdx > 0) {
          ctx.strokeStyle = `rgba(251, 191, 36, ${Math.max(0.35, effOpacity)})`;
        } else {
          ctx.strokeStyle = isMirrorTool
            ? `rgba(245, 158, 11, ${Math.max(0.4, effOpacity)})`
            : `rgba(255, 255, 255, ${Math.max(0.4, effOpacity)})`;
        }
        ctx.lineWidth = 1.5;

        for (const off of offsets) {
          const targetX = sp.x + off.dx;
          const targetY = sp.y + off.dy;
          const bx = Math.round(pan.x + targetX * zoom);
          const by = Math.round(pan.y + targetY * zoom);

          // Visual feedback when Lock Transparency is active
          if (activeLayer?.alphaLocked) {
            const isTransparent = targetX < 0 || targetX >= width || targetY < 0 || targetY >= height || !activeLayer.pixels[targetY * width + targetX];
            if (isTransparent) {
              ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
              ctx.setLineDash([2, 2]);
            } else {
              ctx.strokeStyle = 'rgba(245, 158, 11, 0.95)';
              ctx.setLineDash([]);
            }
          }

          if (toolSettings.brushShape === 'custom' && off.color && toolSettings.customBrushPattern?.useOriginalColors) {
            ctx.fillStyle = off.color;
            ctx.globalAlpha = Math.max(0.4, effOpacity);
            ctx.fillRect(bx + 1, by + 1, zoom - 2, zoom - 2);
            ctx.globalAlpha = 1.0;
          }
          ctx.strokeRect(bx + 0.5, by + 0.5, zoom - 1, zoom - 1);
          if (activeLayer?.alphaLocked) {
            ctx.setLineDash([]);
          }
        }
      }
    }

    // Stroke stabilization leash & trailing brush indicator
    if (isDrawing.current && toolSettings.stabilization && stabilizedPos.current) {
      const { x: px, y: py } = currentPointer.current;
      if (px >= 0 && px < width && py >= 0 && py < height) {
        const pScreenX = pan.x + (px + 0.5) * zoom;
        const pScreenY = pan.y + (py + 0.5) * zoom;
        const sScreenX = pan.x + (stabilizedPos.current.x + 0.5) * zoom;
        const sScreenY = pan.y + (stabilizedPos.current.y + 0.5) * zoom;

        ctx.save();
        // Leash pull-string line
        ctx.beginPath();
        ctx.setLineDash([3, 2]);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.moveTo(pScreenX, pScreenY);
        ctx.lineTo(sScreenX, sScreenY);
        ctx.stroke();

        // Lead pointer dot
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(pScreenX, pScreenY, 3, 0, Math.PI * 2);
        ctx.fill();

        // Stabilized brush position ring
        ctx.setLineDash([]);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sScreenX, sScreenY, 4.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }
    }

    // Snap to Grid cursor preview when hovering without drawing
    if (!isDrawing.current && toolSettings.snapToGrid) {
      const effSpacing = getEffectiveGridSpacing(toolSettings.gridSpacing, toolSettings.tileGridVisible, toolSettings.tileGridSize);
      const { x: px, y: py } = currentPointer.current;

      if (px >= 0 && px < width && py >= 0 && py < height) {
        if (activeTool === 'rect' || activeTool === 'select') {
          const cellX = Math.floor(px / effSpacing);
          const cellY = Math.floor(py / effSpacing);
          const rx = pan.x + cellX * effSpacing * zoom;
          const ry = pan.y + cellY * effSpacing * zoom;
          const rw = effSpacing * zoom;
          const rh = effSpacing * zoom;

          ctx.save();
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.75)';
          ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([2, 2]);
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeRect(rx, ry, rw, rh);
          ctx.restore();
        } else if (activeTool === 'circle') {
          const nodeX = Math.round(px / effSpacing) * effSpacing;
          const nodeY = Math.round(py / effSpacing) * effSpacing;
          const distToNode = Math.hypot(px - nodeX, py - nodeY);

          const cellCenterX = Math.floor(px / effSpacing) * effSpacing + Math.floor(effSpacing / 2);
          const cellCenterY = Math.floor(py / effSpacing) * effSpacing + Math.floor(effSpacing / 2);
          const distToCenter = Math.hypot(px - cellCenterX, py - cellCenterY);

          const cx = distToCenter < distToNode ? cellCenterX : nodeX;
          const cy = distToCenter < distToNode ? cellCenterY : nodeY;

          const screenCX = pan.x + (cx + 0.5) * zoom;
          const screenCY = pan.y + (cy + 0.5) * zoom;

          ctx.save();
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(screenCX, screenCY, 4.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.moveTo(screenCX - 8, screenCY); ctx.lineTo(screenCX + 8, screenCY);
          ctx.moveTo(screenCX, screenCY - 8); ctx.lineTo(screenCX, screenCY + 8);
          ctx.stroke();
          ctx.restore();
        } else if (activeTool === 'line') {
          const nodeX = Math.round(px / effSpacing) * effSpacing;
          const nodeY = Math.round(py / effSpacing) * effSpacing;
          const screenX = pan.x + (nodeX + 0.5) * zoom;
          const screenY = pan.y + (nodeY + 0.5) * zoom;

          ctx.save();
          ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
          ctx.strokeStyle = '#064e3b';
          ctx.lineWidth = 1;
          ctx.fillRect(screenX - 3.5, screenY - 3.5, 7, 7);
          ctx.strokeRect(screenX - 3.5, screenY - 3.5, 7, 7);
          ctx.restore();
        }
      }
    }

    // Live shape dragging preview (Line, Rect, Circle)
    if (isDrawing.current && drawStart.current && (activeTool === 'line' || activeTool === 'rect' || activeTool === 'circle')) {
      const isSnap = Boolean(toolSettings.snapToGrid);
      const effSpacing = getEffectiveGridSpacing(toolSettings.gridSpacing, toolSettings.tileGridVisible, toolSettings.tileGridSize);
      const coords = getSnappedShapeCoords(
        activeTool,
        drawStart.current,
        currentPointer.current,
        effSpacing,
        width,
        height,
        isSnap
      );

      ctx.save();
      const previewStrokeColor = isSnap ? '#10b981' : toolSettings.activeColor;
      ctx.strokeStyle = previewStrokeColor;
      ctx.lineWidth = Math.max(1, toolSettings.brushSize * (zoom / 4));
      ctx.setLineDash([3, 3]);

      if (activeTool === 'line') {
        const p0x = pan.x + (coords.x0 + 0.5) * zoom;
        const p0y = pan.y + (coords.y0 + 0.5) * zoom;
        const p1x = pan.x + (coords.x1 + 0.5) * zoom;
        const p1y = pan.y + (coords.y1 + 0.5) * zoom;

        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        ctx.lineTo(p1x, p1y);
        ctx.stroke();

        if (isSnap) {
          ctx.fillStyle = '#10b981';
          ctx.fillRect(p0x - 3.5, p0y - 3.5, 7, 7);
          ctx.fillRect(p1x - 3.5, p1y - 3.5, 7, 7);
        }
      } else if (activeTool === 'rect') {
        const rx = pan.x + Math.min(coords.x0, coords.x1) * zoom;
        const ry = pan.y + Math.min(coords.y0, coords.y1) * zoom;
        const rw = coords.width * zoom;
        const rh = coords.height * zoom;

        if (isSnap) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
          ctx.fillRect(rx, ry, rw, rh);
        }
        ctx.strokeRect(rx, ry, rw, rh);
      } else if (activeTool === 'circle') {
        const cx = pan.x + (coords.x0 + 0.5) * zoom;
        const cy = pan.y + (coords.y0 + 0.5) * zoom;
        const rad = (coords.radius || 1) * zoom;

        if (isSnap) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.10)';
          ctx.beginPath();
          ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy);
          ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6);
          ctx.stroke();
          ctx.setLineDash([3, 3]);
        }

        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Floating Snapped Dimension HUD Badge
      if (isSnap) {
        ctx.restore();
        ctx.save();
        ctx.setLineDash([]);

        let label = '';
        if (activeTool === 'rect') {
          label = `${coords.width}×${coords.height}px (${coords.cellsWide ?? 1}×${coords.cellsHigh ?? 1} cells @ ${effSpacing}px)`;
        } else if (activeTool === 'circle') {
          label = `R: ${coords.radius}px (Dia: ${coords.diameter}px, ${coords.cellsWide ?? 1} cells @ ${effSpacing}px)`;
        } else if (activeTool === 'line') {
          const len = Math.round(Math.hypot(coords.x1 - coords.x0, coords.y1 - coords.y0));
          label = `Line: ${len}px (ΔX: ${Math.abs(coords.x1 - coords.x0)}, ΔY: ${Math.abs(coords.y1 - coords.y0)} @ ${effSpacing}px)`;
        }

        const maxOverlayW = overlayCanvasRef.current?.width ?? 600;
        const maxOverlayH = overlayCanvasRef.current?.height ?? 600;
        const targetScreenX = pan.x + (coords.x1 + 1) * zoom + 12;
        const targetScreenY = pan.y + (coords.y1 + 1) * zoom + 12;
        const hudX = Math.min(maxOverlayW - 220, Math.max(16, targetScreenX));
        const hudY = Math.min(maxOverlayH - 30, Math.max(26, targetScreenY));

        ctx.font = 'bold 10px monospace';
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(hudX - 6, hudY - 14, textWidth + 12, 20, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#6ee7b7';
        ctx.fillText(label, hudX, hudY);
        ctx.restore();
      } else {
        ctx.restore();
      }
    }

    // Floating paste buffer preview (renders under selection marquee)
    if (floatingPaste) {
      const fx = Math.round(pan.x + floatingPaste.x * zoom);
      const fy = Math.round(pan.y + floatingPaste.y * zoom);
      const fw = floatingPaste.width * zoom;
      const fh = floatingPaste.height * zoom;

      ctx.save();
      // Draw pixel preview for floating paste
      for (let py = 0; py < floatingPaste.height; py++) {
        for (let px = 0; px < floatingPaste.width; px++) {
          const color = floatingPaste.pixels[py * floatingPaste.width + px];
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(
              Math.round(pan.x + (floatingPaste.x + px) * zoom),
              Math.round(pan.y + (floatingPaste.y + py) * zoom),
              zoom,
              zoom
            );
          }
        }
      }

      // Marching ants outline around floating paste
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -dashOffset;
      ctx.strokeRect(fx + 0.5, fy + 0.5, fw, fh);

      ctx.strokeStyle = '#ffffff';
      ctx.lineDashOffset = -(dashOffset + 4);
      ctx.strokeRect(fx + 0.5, fy + 0.5, fw, fh);

      ctx.restore();
    }

    // Selection marquee
    if (activeSelection) {
      const minX = Math.min(activeSelection.startX, activeSelection.endX);
      const maxX = Math.max(activeSelection.startX, activeSelection.endX);
      const minY = Math.min(activeSelection.startY, activeSelection.endY);
      const maxY = Math.max(activeSelection.startY, activeSelection.endY);

      const sx = Math.round(pan.x + minX * zoom);
      const sy = Math.round(pan.y + minY * zoom);
      const sw = (maxX - minX + 1) * zoom;
      const sh = (maxY - minY + 1) * zoom;

      ctx.save();
      // Soft translucent fill
      ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.fillRect(sx, sy, sw, sh);

      // High-contrast marching ants dual stroke
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -dashOffset;
      ctx.strokeRect(sx + 0.5, sy + 0.5, sw, sh);

      ctx.strokeStyle = '#ffffff';
      ctx.lineDashOffset = -(dashOffset + 4);
      ctx.strokeRect(sx + 0.5, sy + 0.5, sw, sh);

      // Corner brackets (L-shapes) for sharp professional look
      const cornerLen = Math.max(4, Math.min(8, sw / 3, sh / 3));
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      // Top-Left
      ctx.beginPath();
      ctx.moveTo(sx, sy + cornerLen);
      ctx.lineTo(sx, sy);
      ctx.lineTo(sx + cornerLen, sy);
      ctx.stroke();
      // Top-Right
      ctx.beginPath();
      ctx.moveTo(sx + sw - cornerLen, sy);
      ctx.lineTo(sx + sw, sy);
      ctx.lineTo(sx + sw, sy + cornerLen);
      ctx.stroke();
      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(sx, sy + sh - cornerLen);
      ctx.lineTo(sx, sy + sh);
      ctx.lineTo(sx + cornerLen, sy + sh);
      ctx.stroke();
      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(sx + sw - cornerLen, sy + sh);
      ctx.lineTo(sx + sw, sy + sh);
      ctx.lineTo(sx + sw, sy + sh - cornerLen);
      ctx.stroke();

      ctx.restore();
    }

    // Live Pressure Gauge Badge HUD (Bottom-left of canvas when pressure active & drawing)
    if (toolSettings.pressureSensitivity && isDrawing.current && currentPressure.current > 0) {
      ctx.save();
      const pPercent = Math.round(currentPressure.current * 100);
      const hudX = 14;
      const hudY = overlay.height - 32;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(hudX, hudY, 100, 20, 8);
      ctx.fill();
      ctx.stroke();

      // Mini pressure gauge track and fill
      ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.fillRect(hudX + 42, hudY + 5, 48, 10);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(hudX + 42, hudY + 5, Math.round(48 * Math.max(0.05, Math.min(1, currentPressure.current))), 10);

      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#bae6fd';
      ctx.fillText(`${pPercent}%`, hudX + 8, hudY + 13);
      ctx.restore();
    }
  }, [pan, zoom, width, height, toolSettings, currentPointer, isDrawing, activeTool, activeSelection, floatingPaste, dashOffset, getSymmetricPoints, getEffectiveBrushSize, getEffectiveOpacity]);


  useEffect(() => {
    renderOverlay();
  }, [renderOverlay]);

  // Resize listener for overlay canvas matching container
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current || !overlayCanvasRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        overlayCanvasRef.current.width = rect.width;
        overlayCanvasRef.current.height = rect.height;
        renderOverlay();
      }
    };

    updateSize();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      updateSize();
    });
    ro.observe(el);
    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [renderOverlay]);

  // Zoom helpers
  const handleZoomIn = () => {
    setZoom(z => Math.min(64, Math.round(z * 1.3)));
  };

  const handleZoomOut = () => {
    setZoom(z => Math.max(4, Math.round(z / 1.3)));
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-slate-950 select-none ${
        isHandMode
          ? isPanning
            ? 'cursor-grabbing'
            : 'cursor-grab'
          : isLayerLocked && activeTool !== 'picker' && !isPanning
          ? 'cursor-not-allowed'
          : ''
      }`}
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => {
        currentPointer.current = { x: -1, y: -1 };
        renderOverlay();
      }}
      onContextMenu={e => e.preventDefault()}
      onWheel={e => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 0.87;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setZoom(prevZoom => {
          const newZoom = Math.min(64, Math.max(4, prevZoom * factor));
          setPan(prevPan => ({
            x: Math.round(mouseX - (mouseX - prevPan.x) * (newZoom / prevZoom)),
            y: Math.round(mouseY - (mouseY - prevPan.y) * (newZoom / prevZoom))
          }));
          return newZoom;
        });
      }}
    >
      {/* Sprite Canvas with Pixel Grid Checkerboard - Positioned at top-0 left-0 with hardware accelerated translate */}
      <div
        className="absolute top-0 left-0 checker-bg shadow-2xl rounded-sm will-change-transform"
        style={{
          width: width * zoom,
          height: height * zoom,
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
          transformOrigin: 'top left',
          touchAction: 'none'
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full h-full pixel-canvas"
          style={{ imageRendering: 'pixelated', touchAction: 'none' }}
        />
      </div>

      {/* Interactive Overlay Canvas (Grid, Selection, Cursor preview) */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ touchAction: 'none' }}
      />

      {/* On-Screen Touch & Desktop Canvas Navigation Controls */}
      <CanvasNavigator2D
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onSetZoom={handleDirectSetZoom}
        onPan={handleNudgePan}
        onCenterCanvas={centerCanvas}
        isHandMode={isHandMode}
        onToggleHandMode={() => setIsHandMode(!isHandMode)}
        isKeyframeMorphAvailable={Boolean(frames && onAddMorphFrames)}
        onOpenMorphModal={() => setIsMorphModalOpen(true)}
        onShowGestureGuide={onShowGestureGuide}
      />

      {/* Active Layer Badge (Top-Left) */}
      <div 
        className="absolute top-3 left-4 z-10 pointer-events-none flex items-center gap-2"
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg px-2.5 py-1 text-xs text-slate-400 font-mono flex items-center gap-2 backdrop-blur-sm">
          {isLayerLocked ? (
            <span className="flex items-center gap-1 text-amber-400 font-bold bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Locked</span>
            </span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
          <span>Layer: {activeLayer?.name || 'Base'}</span>
          <span className="text-slate-600">|</span>
          <span>{width}×{height}px</span>
        </div>
      </div>

      {/* On-Canvas Locked Layer Warning Notification Banner */}
      {showLockedToast && activeLayer?.locked && (
        <div 
          className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 bg-slate-900/95 border border-amber-500/60 rounded-2xl px-3.5 py-2 shadow-2xl backdrop-blur-md animate-fade-in text-amber-200"
          onPointerDown={e => e.stopPropagation()}
        >
          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-medium">
            Layer <span className="font-bold text-white">"{activeLayer.name}"</span> is locked.
          </span>
          {onUnlockActiveLayer && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnlockActiveLayer();
                setShowLockedToast(false);
              }}
              className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
            >
              Unlock
            </button>
          )}
          <button
            onClick={() => setShowLockedToast(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Selection Action HUD (Top-Center) */}
      {activeSelection && !floatingPaste && (
        <div 
          className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-slate-900/95 border border-sky-500/40 rounded-2xl px-2.5 py-1.5 shadow-2xl backdrop-blur-md"
          onPointerDown={e => e.stopPropagation()}
        >
          <span className="text-[10px] font-mono text-sky-400 font-bold px-1.5 py-0.5 bg-sky-500/10 rounded-md border border-sky-500/20 mr-0.5">
            {Math.abs(activeSelection.endX - activeSelection.startX) + 1}×{Math.abs(activeSelection.endY - activeSelection.startY) + 1}
          </span>

          <button
            onClick={onCut}
            disabled={isLayerLocked}
            title={isLayerLocked ? "Layer is locked (Cut disabled)" : "Cut Selection (Ctrl+X)"}
            className="p-1.5 rounded-xl flex items-center gap-1 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 text-xs font-medium"
          >
            <Scissors className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline text-[11px]">Cut</span>
          </button>

          <button
            onClick={onCopy}
            title="Copy Selection (Ctrl+C)"
            className="p-1.5 rounded-xl flex items-center gap-1 text-slate-300 hover:text-white hover:bg-slate-800 transition-all active:scale-95 text-xs font-medium"
          >
            <Copy className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline text-[11px]">Copy</span>
          </button>

          {clipboard && (
            <button
              onClick={onPaste}
              disabled={isLayerLocked}
              title={isLayerLocked ? "Layer is locked (Paste disabled)" : "Paste (Ctrl+V)"}
              className="p-1.5 rounded-xl flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 text-xs font-medium"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Paste</span>
            </button>
          )}

          <button
            onClick={onDelete}
            disabled={isLayerLocked}
            title={isLayerLocked ? "Layer is locked (Delete disabled)" : "Delete Selected Pixels (Del / Backspace)"}
            className="p-1.5 rounded-xl flex items-center gap-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 text-xs font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Delete</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5" />

          <button
            onClick={onDeselect || (() => updateSelection(null))}
            title="Deselect (Esc)"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-95 text-xs font-medium"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Paste Controls HUD (Top-Center) */}
      {floatingPaste && (
        <div 
          className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-slate-900/95 border border-amber-500/60 rounded-2xl px-3 py-1.5 shadow-2xl backdrop-blur-md animate-fade-in"
          onPointerDown={e => e.stopPropagation()}
        >
          <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="hidden sm:inline">Reposition pasted pixels</span>
            <span className="sm:hidden font-mono text-[10px]">{floatingPaste.width}×{floatingPaste.height}</span>
          </span>

          <button
            onClick={onCommitFloatingPaste}
            disabled={isLayerLocked}
            title={isLayerLocked ? "Cannot apply paste to locked layer" : "Apply / Stamp to Layer (Enter)"}
            className={`px-2.5 py-1 rounded-xl font-bold text-xs flex items-center gap-1 shadow-md transition-all active:scale-95 ${
              isLayerLocked
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply</span>
          </button>

          <button
            onClick={() => onSetFloatingPaste?.(null)}
            title="Cancel Paste (Esc)"
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Rotatable Symmetry Guide HUD (when symmetry or mirror tool is active) */}
      {(effectiveSymmetry !== 'none' || isMirrorTool) && (
        <div 
          className="absolute top-3 right-3 z-30 flex flex-col items-end gap-1 select-none"
          onPointerDown={e => e.stopPropagation()}
        >
          {isSymmetryHudExpanded ? (
            <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md text-xs text-slate-200 w-64 animate-fade-in space-y-2">
              {/* Header */}
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-white text-[11px]">
                  <Compass className="w-3.5 h-3.5 text-sky-400" />
                  <span>Symmetry Guide</span>
                  <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 capitalize">
                    {effectiveSymmetry === 'radial'
                      ? `Radial (${toolSettings.symmetryRays || 8}R)`
                      : effectiveSymmetry}
                  </span>
                </div>
                <button
                  onClick={() => setIsSymmetryHudExpanded(false)}
                  title="Minimize Guide HUD"
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Rotation Angle Slider & Degrees */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-400 flex items-center gap-1">
                    <RotateCw className="w-3 h-3 text-sky-400" />
                    <span>Rotation Angle</span>
                  </span>
                  <div className="flex items-center gap-1 font-mono font-bold text-sky-400">
                    <span>{toolSettings.symmetryAngle || 0}°</span>
                    {(toolSettings.symmetryAngle || 0) !== 0 && (
                      <button
                        onClick={() => onUpdateToolSettings?.({ symmetryAngle: 0 })}
                        title="Reset Angle to 0°"
                        className="text-[9px] text-slate-400 hover:text-white px-1 py-0.2 rounded bg-slate-800"
                      >
                        0°
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={toolSettings.symmetryAngle || 0}
                    onChange={e => onUpdateToolSettings?.({ symmetryAngle: parseInt(e.target.value, 10) })}
                    className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
                  />
                </div>

                {/* Quick Angle Presets */}
                <div className="grid grid-cols-5 gap-1 mt-1.5">
                  {[0, 15, 30, 45, 90].map(deg => (
                    <button
                      key={deg}
                      onClick={() => onUpdateToolSettings?.({ symmetryAngle: deg })}
                      className={`py-0.5 rounded text-[10px] font-mono transition-all ${
                        (toolSettings.symmetryAngle || 0) === deg
                          ? 'bg-sky-500 text-white font-bold shadow-xs'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Radial Rays selector if radial */}
              {effectiveSymmetry === 'radial' && (
                <div>
                  <div className="text-[10px] text-slate-400 mb-1">Radial Rays / Spokes</div>
                  <div className="grid grid-cols-4 gap-1">
                    {[4, 6, 8, 12].map(r => (
                      <button
                        key={r}
                        onClick={() => onUpdateToolSettings?.({ symmetryRays: r })}
                        className={`py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                          (toolSettings.symmetryRays || 8) === r
                            ? 'bg-sky-500 text-white shadow-xs'
                            : 'bg-slate-800/80 text-slate-400 hover:text-white'
                        }`}
                      >
                        {r} Rays
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Toggles: Visual Guide & Radial Rings */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
                <button
                  onClick={() => onUpdateToolSettings?.({ symmetryGuideVisible: toolSettings.symmetryGuideVisible === false })}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all ${
                    toolSettings.symmetryGuideVisible !== false
                      ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400'
                  }`}
                >
                  {toolSettings.symmetryGuideVisible !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span>Guide Lines</span>
                </button>

                <button
                  onClick={() => onUpdateToolSettings?.({ symmetryGuideRings: toolSettings.symmetryGuideRings === false })}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all ${
                    toolSettings.symmetryGuideRings !== false
                      ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400'
                  }`}
                >
                  <Disc className="w-3 h-3" />
                  <span>Radial Rings</span>
                </button>
              </div>
            </div>
          ) : (
            /* Minimized Symmetry Badge Trigger */
            <button
              onClick={() => setIsSymmetryHudExpanded(true)}
              title="Expand Symmetry Guide Controls"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sky-400 shadow-xl backdrop-blur-md active:scale-95 transition-all text-xs font-mono font-bold"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{toolSettings.symmetryAngle || 0}°</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      )}

      {/* Keyframe Morph & Interpolation Modal */}
      {frames && onAddMorphFrames && (
        <KeyframeMorphModal
          isOpen={isMorphModalOpen}
          onClose={() => setIsMorphModalOpen(false)}
          frames={frames}
          currentFrameIndex={currentFrameIndex ?? 0}
          width={width}
          height={height}
          onAddMorphFrames={onAddMorphFrames}
          onDuplicateFrame={onDuplicateFrame}
        />
      )}
    </div>

  );
};
