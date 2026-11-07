export type ToolType = 
  | 'pencil' 
  | 'eraser' 
  | 'bucket' 
  | 'picker' 
  | 'line' 
  | 'rect' 
  | 'circle' 
  | 'select' 
  | 'dither'
  | 'mirror';

export type VoxelToolType = 
  | 'add' 
  | 'erase' 
  | 'paint' 
  | 'picker' 
  | 'box'
  | 'camera';

export type BlendMode = 
  | 'normal' 
  | 'multiply' 
  | 'screen' 
  | 'overlay' 
  | 'darken' 
  | 'lighten' 
  | 'color-dodge' 
  | 'color-burn' 
  | 'hard-light' 
  | 'soft-light' 
  | 'difference' 
  | 'exclusion';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  alphaLocked?: boolean;
  opacity: number;
  blendMode: BlendMode;
  pixels: string[]; // empty string "" indicates transparent
}

export interface Frame {
  id: string;
  name: string;
  durationMs: number;
  layers: Layer[];
}

export interface Voxel {
  x: number;
  y: number;
  z: number;
  color: string;
}

export type GameEngine = 'unity' | 'unreal' | 'godot' | 'gamemaker' | 'pico8' | 'custom';

export interface ProjectSettings {
  engine: GameEngine;
  ppu: number; // Pixels per unit (e.g. 16, 32, 64)
  filterMode: 'point' | 'bilinear';
  exportScale: number;
}

export interface Project {
  id: string;
  name: string;
  width: number;
  height: number;
  createdAt: number;
  updatedAt: number;
  frames: Frame[];
  currentFrameIndex: number;
  activeLayerId: string;
  voxels: Voxel[];
  voxelGridSize: number;
  palette: string[];
  settings: ProjectSettings;
}

export type SymmetryMode = 'none' | 'horizontal' | 'vertical' | 'quad' | 'radial';
export type MirrorAxis = 'horizontal' | 'vertical' | 'both';
export type DitherType = 'checker' | 'light' | 'dense' | 'bayer';
export type BrushShape = 
  | 'square' 
  | 'circle' 
  | 'diamond' 
  | 'cross' 
  | 'x' 
  | 'slash' 
  | 'backslash' 
  | 'horizontal' 
  | 'vertical' 
  | 'star' 
  | 'heart'
  | 'custom';

export interface CustomBrushOffset {
  dx: number;
  dy: number;
  color?: string; // Optional multi-color pixel value
}

export interface CustomBrushPattern {
  id: string;
  name: string;
  width: number;
  height: number;
  offsets: CustomBrushOffset[];
  pixels?: string[]; // 1D array of width * height colors
  category?: 'pattern' | 'texture' | 'user' | 'stamp' | 'custom';
  useOriginalColors?: boolean; // If true, stamps original multi-color pixels; if false, tints with activeColor
  createdAt: number;
  isBuiltIn?: boolean;
}

export interface ToolPreset {
  id: string;
  name: string;
  tool: ToolType;
  brushSize: number;
  brushShape: BrushShape;
  customBrushPattern?: CustomBrushPattern | null;
  opacity: number;
  symmetry: SymmetryMode;
  symmetryAngle?: number;
  symmetryRays?: number;
  ditherPattern?: DitherType;
  mirrorAxis?: MirrorAxis;
  stabilization?: boolean;
  stabilizationWeight?: number;
  pressureSensitivity?: boolean;
  pressureAffectsSize?: boolean;
  pressureAffectsOpacity?: boolean;
  snapToGrid?: boolean;
  createdAt: number;
  isBuiltIn?: boolean;
}

export interface ToolSettings {
  brushSize: number;
  brushShape: BrushShape;
  customBrushPattern?: CustomBrushPattern | null;
  opacity: number;
  symmetry: SymmetryMode;
  symmetryAngle?: number; // Rotation angle in degrees (0 - 360)
  symmetryRays?: number; // Radial rays count (4, 6, 8, 12, etc.)
  symmetryGuideVisible?: boolean; // Toggle visual guide overlay
  symmetryGuideRings?: boolean; // Toggle concentric guide rings
  mirrorAxis: MirrorAxis;
  ditherPattern: DitherType;
  stabilization: boolean; // Stroke stabilization / line smoothing toggle
  stabilizationWeight: number; // Smoothing weight (e.g. 1 - 20, default 6)
  pressureSensitivity: boolean; // Dynamic stylus/touch pressure sensitivity for size and opacity
  pressureAffectsSize?: boolean; // Default true: pressure scales brush size
  pressureAffectsOpacity?: boolean; // Default true: pressure scales stroke opacity
  gridVisible: boolean;
  gridColor: string;
  gridOpacity: number;
  gridSpacing: number;
  snapToGrid?: boolean; // Align shapes (rect, circle, line, select) to grid spacing
  tileGridVisible: boolean;
  tileGridSize: number;
  onionSkin: boolean;
  onionSkinOpacity: number;
  activeColor: string;
  secondaryColor: string;
  touchSensitivity: number;
  haptics: boolean;
  voxelSymmetryX: boolean;
  voxelSymmetryY: boolean;
  voxelSymmetryZ: boolean;
}

export interface LayoutSettings {
  toolbarPosition: 'left' | 'right' | 'bottom';
  compactMode: boolean;
  zenMode: boolean;
  theme: 'dark' | 'oled';
  showTouchGesturesGuide: boolean;
  activeTab: '2d' | '3d';
}

export interface SelectionArea {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  floatingPixels?: { [key: string]: string };
  isFloating?: boolean;
}

export interface SpriteClipboard {
  width: number;
  height: number;
  pixels: string[];
}

