import { BrushShape, ToolPreset, ToolSettings, ToolType, CustomBrushPattern, CustomBrushOffset, SelectionArea } from '../types/sprite';

export interface BrushShapeDef {
  id: BrushShape;
  label: string;
  shortLabel: string;
  description: string;
  category: 'basic' | 'calligraphy' | 'special';
}

export const BRUSH_SHAPES: BrushShapeDef[] = [
  { id: 'square', label: 'Square Block', shortLabel: 'Square', description: 'Standard solid pixel rectangle', category: 'basic' },
  { id: 'circle', label: 'Smooth Circle', shortLabel: 'Circle', description: 'Rounded circular disk', category: 'basic' },
  { id: 'diamond', label: 'Rhombic Diamond', shortLabel: 'Diamond', description: 'Isometric angle diamond', category: 'basic' },
  { id: 'cross', label: 'Plus Cross (+)', shortLabel: 'Cross', description: 'Plus cross for sparkles & highlights', category: 'special' },
  { id: 'x', label: 'Diagonal Cross (✕)', shortLabel: 'X-Cross', description: 'Diagonal saltire cross', category: 'special' },
  { id: 'slash', label: 'Forward Slash (/)', shortLabel: 'Slash', description: '45° Chisel calligraphy blade', category: 'calligraphy' },
  { id: 'backslash', label: 'Backslash (\\)', shortLabel: 'Backslash', description: '135° Inverse chisel blade', category: 'calligraphy' },
  { id: 'horizontal', label: 'Horizontal Chisel (—)', shortLabel: 'Horiz', description: 'Flat horizontal line brush', category: 'calligraphy' },
  { id: 'vertical', label: 'Vertical Chisel (|)', shortLabel: 'Vert', description: 'Flat vertical line brush', category: 'calligraphy' },
  { id: 'star', label: 'Pixel Star (★)', shortLabel: 'Star', description: '4-point celestial star', category: 'special' },
  { id: 'heart', label: 'Pixel Heart (♥)', shortLabel: 'Heart', description: 'Decorative retro heart shape', category: 'special' },
  { id: 'custom', label: 'Custom Pattern Brush', shortLabel: 'Custom', description: 'User-designed pixel pattern or stamp', category: 'special' },
];

/**
 * Calculates pixel cell coordinate offsets for any custom brush shape, pattern, and size
 */
export function getBrushOffsets(
  size: number,
  shape: BrushShape = 'square',
  customPattern?: CustomBrushPattern | null
): { dx: number; dy: number; color?: string }[] {
  if (shape === 'custom') {
    if (customPattern && customPattern.offsets && customPattern.offsets.length > 0) {
      if (size <= 1) {
        return customPattern.offsets;
      }
      // Scale custom pattern
      const scaled: { dx: number; dy: number; color?: string }[] = [];
      const halfSize = Math.floor(size / 2);
      for (const off of customPattern.offsets) {
        const cx = off.dx * size;
        const cy = off.dy * size;
        for (let sy = 0; sy < size; sy++) {
          for (let sx = 0; sx < size; sx++) {
            scaled.push({
              dx: cx + (sx - halfSize),
              dy: cy + (sy - halfSize),
              color: off.color
            });
          }
        }
      }
      return scaled.length > 0 ? scaled : customPattern.offsets;
    }
    return [{ dx: 0, dy: 0 }];
  }

  if (size <= 1) return [{ dx: 0, dy: 0 }];

  const offsets: { dx: number; dy: number }[] = [];
  const half = Math.floor(size / 2);
  const isEven = size % 2 === 0;
  const start = isEven ? -(half - 1) : -half;
  const end = half;

  switch (shape) {
    case 'square': {
      for (let dy = start; dy <= end; dy++) {
        for (let dx = start; dx <= end; dx++) {
          offsets.push({ dx, dy });
        }
      }
      return offsets;
    }

    case 'circle': {
      if (isEven) {
        const center = 0.5;
        const radiusSq = Math.pow(size / 2 + 0.15, 2);
        for (let dy = start; dy <= end; dy++) {
          for (let dx = start; dx <= end; dx++) {
            const distX = dx - center + 0.5;
            const distY = dy - center + 0.5;
            if (distX * distX + distY * distY <= radiusSq) {
              offsets.push({ dx, dy });
            }
          }
        }
      } else {
        const radiusSq = Math.pow(half + 0.35, 2);
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            if (dx * dx + dy * dy <= radiusSq) {
              offsets.push({ dx, dy });
            }
          }
        }
      }
      return offsets.length > 0 ? offsets : [{ dx: 0, dy: 0 }];
    }

    case 'diamond': {
      if (isEven) {
        const center = 0.5;
        const maxDist = size / 2;
        for (let dy = start; dy <= end; dy++) {
          for (let dx = start; dx <= end; dx++) {
            const dist = Math.abs(dx - center + 0.5) + Math.abs(dy - center + 0.5);
            if (dist <= maxDist) {
              offsets.push({ dx, dy });
            }
          }
        }
      } else {
        const maxDist = half;
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            if (Math.abs(dx) + Math.abs(dy) <= maxDist) {
              offsets.push({ dx, dy });
            }
          }
        }
      }
      return offsets.length > 0 ? offsets : [{ dx: 0, dy: 0 }];
    }

    case 'cross': {
      // Plus cross: horizontal and vertical stems
      const thickness = size >= 5 ? 1 : 0;
      for (let dy = start; dy <= end; dy++) {
        for (let dx = start; dx <= end; dx++) {
          if (Math.abs(dx) <= thickness || Math.abs(dy) <= thickness) {
            offsets.push({ dx, dy });
          }
        }
      }
      return offsets.length > 0 ? offsets : [{ dx: 0, dy: 0 }];
    }

    case 'x': {
      // Diagonal cross
      const thickness = size >= 6 ? 1 : 0;
      for (let dy = start; dy <= end; dy++) {
        for (let dx = start; dx <= end; dx++) {
          if (Math.abs(Math.abs(dx) - Math.abs(dy)) <= thickness) {
            offsets.push({ dx, dy });
          }
        }
      }
      return offsets.length > 0 ? offsets : [{ dx: 0, dy: 0 }];
    }

    case 'slash': {
      // 45 degree forward slash: dx + dy == 0
      const thickness = size >= 4 ? (size >= 7 ? 1 : 0.5) : 0;
      for (let dy = start; dy <= end; dy++) {
        for (let dx = start; dx <= end; dx++) {
          if (Math.abs(dx + dy) <= thickness) {
            offsets.push({ dx, dy });
          }
        }
      }
      return offsets.length > 0 ? offsets : [{ dx: 0, dy: 0 }];
    }

    case 'backslash': {
      // Backslash: dx == dy
      const thickness = size >= 4 ? (size >= 7 ? 1 : 0.5) : 0;
      for (let dy = start; dy <= end; dy++) {
        for (let dx = start; dx <= end; dx++) {
          if (Math.abs(dx - dy) <= thickness) {
            offsets.push({ dx, dy });
          }
        }
      }
      return offsets.length > 0 ? offsets : [{ dx: 0, dy: 0 }];
    }

    case 'horizontal': {
      // Flat horizontal chisel
      const thickness = size >= 6 ? 1 : 0;
      for (let dy = -thickness; dy <= thickness; dy++) {
        for (let dx = start; dx <= end; dx++) {
          offsets.push({ dx, dy });
        }
      }
      return offsets.length > 0 ? offsets : [{ dx: 0, dy: 0 }];
    }

    case 'vertical': {
      // Flat vertical chisel
      const thickness = size >= 6 ? 1 : 0;
      for (let dy = start; dy <= end; dy++) {
        for (let dx = -thickness; dx <= thickness; dx++) {
          offsets.push({ dx, dy });
        }
      }
      return offsets.length > 0 ? offsets : [{ dx: 0, dy: 0 }];
    }

    case 'star': {
      // 4-point star: plus cross with diamond center
      for (let dy = start; dy <= end; dy++) {
        for (let dx = start; dx <= end; dx++) {
          const isAxis = (dx === 0 && Math.abs(dy) <= half) || (dy === 0 && Math.abs(dx) <= half);
          const isInner = Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
          if (isAxis || (isInner && Math.abs(dx) + Math.abs(dy) <= 2)) {
            offsets.push({ dx, dy });
          }
        }
      }
      return offsets.length > 0 ? offsets : [{ dx: 0, dy: 0 }];
    }

    case 'heart': {
      // Pixel heart
      for (let dy = start; dy <= end; dy++) {
        for (let dx = start; dx <= end; dx++) {
          const normX = dx / Math.max(1, half);
          const normY = -dy / Math.max(1, half); // invert Y so top is positive
          // Equation: (x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0
          const a = normX * normX + normY * normY - 0.75;
          if (a * a * a - normX * normX * normY * normY * normY <= 0.05) {
            offsets.push({ dx, dy });
          }
        }
      }
      return offsets.length > 0 ? offsets : [{ dx: 0, dy: 0 }];
    }

    default:
      return [{ dx: 0, dy: 0 }];
  }
}

const PRESETS_STORAGE_KEY = 'pixel_studio_tool_presets_v1';

export const DEFAULT_TOOL_PRESETS: ToolPreset[] = [
  {
    id: 'fine-pen',
    name: '1px Fine Pen',
    tool: 'pencil',
    brushSize: 1,
    brushShape: 'square',
    opacity: 1,
    symmetry: 'none',
    createdAt: 1,
    isBuiltIn: true
  },
  {
    id: 'calligraphy-chisel',
    name: 'Calligraphy Chisel',
    tool: 'pencil',
    brushSize: 3,
    brushShape: 'slash',
    opacity: 1,
    symmetry: 'none',
    createdAt: 2,
    isBuiltIn: true
  },
  {
    id: 'soft-round-brush',
    name: 'Soft Round 4px',
    tool: 'pencil',
    brushSize: 4,
    brushShape: 'circle',
    opacity: 1,
    symmetry: 'none',
    createdAt: 3,
    isBuiltIn: true
  },
  {
    id: 'bayer-shader',
    name: 'Bayer Dither Shader',
    tool: 'dither',
    brushSize: 2,
    brushShape: 'circle',
    opacity: 0.8,
    symmetry: 'none',
    ditherPattern: 'bayer',
    createdAt: 4,
    isBuiltIn: true
  },
  {
    id: 'iso-diamond',
    name: 'Isometric Diamond',
    tool: 'pencil',
    brushSize: 2,
    brushShape: 'diamond',
    opacity: 1,
    symmetry: 'none',
    createdAt: 5,
    isBuiltIn: true
  },
  {
    id: 'sparkle-star',
    name: 'Sparkle Star',
    tool: 'pencil',
    brushSize: 3,
    brushShape: 'star',
    opacity: 1,
    symmetry: 'none',
    createdAt: 6,
    isBuiltIn: true
  },
  {
    id: 'radial-mandala-8r',
    name: 'Radial Mandala 8-Ray',
    tool: 'pencil',
    brushSize: 2,
    brushShape: 'circle',
    opacity: 1,
    symmetry: 'radial',
    symmetryAngle: 0,
    symmetryRays: 8,
    createdAt: 7,
    isBuiltIn: true
  },
  {
    id: 'dual-mirror',
    name: 'Dual Mirror Symmetry',
    tool: 'mirror',
    brushSize: 2,
    brushShape: 'square',
    opacity: 1,
    symmetry: 'quad',
    mirrorAxis: 'both',
    createdAt: 8,
    isBuiltIn: true
  }
];

export function loadSavedToolPresets(): ToolPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return DEFAULT_TOOL_PRESETS;
    const userPresets = JSON.parse(raw);
    if (Array.isArray(userPresets)) {
      // Merge built-in presets with user presets (avoiding duplicate IDs)
      const userIds = new Set(userPresets.map(p => p.id));
      const remainingBuiltIns = DEFAULT_TOOL_PRESETS.filter(p => !userIds.has(p.id));
      return [...userPresets, ...remainingBuiltIns];
    }
    return DEFAULT_TOOL_PRESETS;
  } catch (err) {
    console.error('Failed to load tool presets from localStorage:', err);
    return DEFAULT_TOOL_PRESETS;
  }
}

export function saveUserToolPresets(presets: ToolPreset[]): void {
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch (err) {
    console.error('Failed to save tool presets to localStorage:', err);
  }
}

const CUSTOM_BRUSHES_STORAGE_KEY = 'pixel_studio_custom_brush_patterns_v1';

export const DEFAULT_CUSTOM_BRUSHES: CustomBrushPattern[] = [
  {
    id: 'foliage-cluster',
    name: 'Foliage Cluster (5×5)',
    width: 5,
    height: 5,
    category: 'texture',
    createdAt: 1,
    isBuiltIn: true,
    offsets: [
      { dx: 0, dy: -2 },
      { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
      { dx: -2, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 },
      { dx: -1, dy: 1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 },
      { dx: 0, dy: 2 }
    ]
  },
  {
    id: 'stipple-spray-3x3',
    name: 'Stipple Texture (3×3)',
    width: 3,
    height: 3,
    category: 'texture',
    createdAt: 2,
    isBuiltIn: true,
    offsets: [
      { dx: -1, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: 0, dy: 0 },
      { dx: -1, dy: 1 },
      { dx: 1, dy: 1 }
    ]
  },
  {
    id: 'grass-tuft-5x5',
    name: 'Grass Blades (5×5)',
    width: 5,
    height: 5,
    category: 'stamp',
    createdAt: 3,
    isBuiltIn: true,
    offsets: [
      { dx: -2, dy: -2 }, { dx: 0, dy: -2 }, { dx: 2, dy: -2 },
      { dx: -2, dy: -1 }, { dx: 0, dy: -1 }, { dx: 2, dy: -1 },
      { dx: -1, dy: 0 }, { dx: 0, dy: 0 }, { dx: 1, dy: 0 },
      { dx: -1, dy: 1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 },
      { dx: 0, dy: 2 }
    ]
  },
  {
    id: 'brick-pattern-4x4',
    name: 'Brick Weave (4×4)',
    width: 4,
    height: 4,
    category: 'pattern',
    createdAt: 4,
    isBuiltIn: true,
    offsets: [
      { dx: -1, dy: -1 }, { dx: 0, dy: -1 },
      { dx: 1, dy: -1 }, { dx: 2, dy: -1 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 }, { dx: 1, dy: 1 },
      { dx: -1, dy: 2 }, { dx: 2, dy: 2 }
    ]
  },
  {
    id: 'celestial-sparkle-5x5',
    name: 'Glint Sparkle (5×5)',
    width: 5,
    height: 5,
    category: 'stamp',
    createdAt: 5,
    isBuiltIn: true,
    offsets: [
      { dx: 0, dy: -2 },
      { dx: 0, dy: -1 },
      { dx: -2, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: 2 }
    ]
  },
  {
    id: 'halftone-dots-4x4',
    name: 'Halftone Dot Matrix',
    width: 4,
    height: 4,
    category: 'texture',
    createdAt: 6,
    isBuiltIn: true,
    offsets: [
      { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
      { dx: 0, dy: 0 },
      { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
    ]
  }
];

export function loadSavedCustomBrushes(): CustomBrushPattern[] {
  try {
    const raw = localStorage.getItem(CUSTOM_BRUSHES_STORAGE_KEY);
    if (!raw) return DEFAULT_CUSTOM_BRUSHES;
    const userBrushes = JSON.parse(raw);
    if (Array.isArray(userBrushes)) {
      const userIds = new Set(userBrushes.map(b => b.id));
      const remainingBuiltIns = DEFAULT_CUSTOM_BRUSHES.filter(b => !userIds.has(b.id));
      return [...userBrushes, ...remainingBuiltIns];
    }
    return DEFAULT_CUSTOM_BRUSHES;
  } catch (err) {
    console.error('Failed to load custom brushes from localStorage:', err);
    return DEFAULT_CUSTOM_BRUSHES;
  }
}

export function saveUserCustomBrushes(brushes: CustomBrushPattern[]): void {
  try {
    localStorage.setItem(CUSTOM_BRUSHES_STORAGE_KEY, JSON.stringify(brushes));
  } catch (err) {
    console.error('Failed to save custom brushes to localStorage:', err);
  }
}

/**
 * Creates a custom brush pattern from a canvas selection area
 */
export function createBrushPatternFromSelection(
  selection: SelectionArea,
  layerPixels: string[],
  canvasWidth: number,
  name?: string
): CustomBrushPattern | null {
  const minX = Math.min(selection.startX, selection.endX);
  const maxX = Math.max(selection.startX, selection.endX);
  const minY = Math.min(selection.startY, selection.endY);
  const maxY = Math.max(selection.startY, selection.endY);

  const selWidth = maxX - minX + 1;
  const selHeight = maxY - minY + 1;

  if (selWidth <= 0 || selHeight <= 0) return null;

  const centerX = Math.floor(selWidth / 2);
  const centerY = Math.floor(selHeight / 2);

  const offsets: CustomBrushOffset[] = [];
  const previewPixels: string[] = new Array(selWidth * selHeight).fill('');
  let nonTransparentCount = 0;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * canvasWidth + x;
      const color = layerPixels[idx] || '';
      const localX = x - minX;
      const localY = y - minY;
      previewPixels[localY * selWidth + localX] = color;

      if (color !== '') {
        nonTransparentCount++;
        offsets.push({
          dx: localX - centerX,
          dy: localY - centerY,
          color
        });
      }
    }
  }

  // If selection is totally transparent, create a solid box of that dimension
  if (nonTransparentCount === 0) {
    for (let localY = 0; localY < selHeight; localY++) {
      for (let localX = 0; localX < selWidth; localX++) {
        offsets.push({
          dx: localX - centerX,
          dy: localY - centerY
        });
        previewPixels[localY * selWidth + localX] = '#ffffff';
      }
    }
  }

  const stampName = name?.trim() || `Custom ${selWidth}×${selHeight}`;

  return {
    id: `custom-brush-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: stampName,
    width: selWidth,
    height: selHeight,
    offsets,
    pixels: previewPixels,
    category: 'user',
    useOriginalColors: nonTransparentCount > 0,
    createdAt: Date.now(),
    isBuiltIn: false
  };
}
