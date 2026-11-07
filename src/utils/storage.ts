import { Project, Frame, Layer, Voxel, GameEngine } from '../types/sprite';
import { DEFAULT_PALETTE, PRESET_PALETTES } from './palettes';

const STORAGE_KEY_CURRENT = 'spriteforge_current_project';
const STORAGE_KEY_LIST = 'spriteforge_projects_index';
const STORAGE_KEY_PROJECT_PREFIX = 'spriteforge_proj_';

// 1. Hero Knight Project (2D Animated + 3D)
export function createSampleProject(): Project {
  const width = 16;
  const height = 16;

  const outlinePixels = new Array(width * height).fill('');
  const basePixels = new Array(width * height).fill('');
  const shadowPixels = new Array(width * height).fill('');

  // Head / Helmet (rows 2-5)
  for (let y = 2; y <= 5; y++) {
    for (let x = 5; x <= 10; x++) {
      basePixels[y * width + x] = '#c0cbdc';
    }
  }
  for (let x = 6; x <= 9; x++) {
    basePixels[4 * width + x] = '#181425';
  }
  basePixels[1 * width + 7] = '#e43b44';
  basePixels[1 * width + 8] = '#ff0044';
  basePixels[2 * width + 7] = '#e43b44';

  // Body / Armor (rows 6-10)
  for (let y = 6; y <= 10; y++) {
    for (let x = 5; x <= 10; x++) {
      basePixels[y * width + x] = '#8b9bb4';
    }
  }
  for (let x = 5; x <= 10; x++) {
    basePixels[9 * width + x] = '#b86f56';
  }
  basePixels[9 * width + 7] = '#fee761';
  basePixels[9 * width + 8] = '#fee761';

  // Shield on left
  for (let y = 6; y <= 9; y++) {
    for (let x = 3; x <= 4; x++) {
      basePixels[y * width + x] = '#124e89';
    }
  }
  basePixels[7 * width + 3] = '#fee761';
  basePixels[8 * width + 4] = '#fee761';

  // Sword on right
  basePixels[5 * width + 12] = '#2ce8f5';
  basePixels[6 * width + 12] = '#c0cbdc';
  basePixels[7 * width + 12] = '#ffffff';
  basePixels[8 * width + 12] = '#ffffff';
  basePixels[9 * width + 11] = '#fee761';
  basePixels[9 * width + 12] = '#fee761';
  basePixels[9 * width + 13] = '#fee761';
  basePixels[10 * width + 12] = '#733e39';

  // Legs / Boots
  for (let y = 11; y <= 13; y++) {
    basePixels[y * width + 6] = '#5a6988';
    basePixels[y * width + 7] = '#3a4466';
    basePixels[y * width + 8] = '#3a4466';
    basePixels[y * width + 9] = '#5a6988';
  }
  basePixels[13 * width + 5] = '#3a4466';
  basePixels[13 * width + 6] = '#262b44';
  basePixels[13 * width + 9] = '#262b44';
  basePixels[13 * width + 10] = '#3a4466';

  for (let y = 2; y <= 5; y++) {
    shadowPixels[y * width + 10] = '#5a6988';
  }
  for (let y = 6; y <= 10; y++) {
    shadowPixels[y * width + 10] = '#3a4466';
  }

  const frame1Layers: Layer[] = [
    {
      id: 'layer-shadow',
      name: 'Shading',
      visible: true,
      locked: false,
      opacity: 0.8,
      blendMode: 'multiply',
      pixels: shadowPixels
    },
    {
      id: 'layer-base',
      name: 'Character Base',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      pixels: basePixels
    },
    {
      id: 'layer-outline',
      name: 'Outline / Accents',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      pixels: outlinePixels
    }
  ];

  const frame2Base = [...basePixels];
  const frame2Layers: Layer[] = [
    { ...frame1Layers[0], id: 'layer-shadow-f2', pixels: [...shadowPixels] },
    { ...frame1Layers[1], id: 'layer-base-f2', pixels: frame2Base },
    { ...frame1Layers[2], id: 'layer-outline-f2', pixels: [...outlinePixels] }
  ];

  // 3D Voxels for Knight
  const sampleVoxels: Voxel[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = basePixels[y * width + x];
      if (color) {
        const vy = height - 1 - y;
        let depth = 2;
        let zOffset = 0;

        if (x >= 11) {
          depth = 1;
          zOffset = 1;
        } else if (x <= 4) {
          depth = 2;
          zOffset = 1;
        } else if (y >= 6 && y <= 10) {
          depth = 3;
          zOffset = 0;
        }

        for (let z = 0; z < depth; z++) {
          sampleVoxels.push({
            x,
            y: vy,
            z: z + zOffset,
            color
          });
        }
      }
    }
  }

  return {
    id: 'proj-hero-knight',
    name: 'Hero Knight',
    width: 16,
    height: 16,
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 60000,
    frames: [
      { id: 'frame-1', name: 'Idle 1', durationMs: 150, layers: frame1Layers },
      { id: 'frame-2', name: 'Idle 2', durationMs: 150, layers: frame2Layers }
    ],
    currentFrameIndex: 0,
    activeLayerId: 'layer-base',
    voxels: sampleVoxels,
    voxelGridSize: 24,
    palette: [...DEFAULT_PALETTE],
    settings: {
      engine: 'unity',
      ppu: 16,
      filterMode: 'point',
      exportScale: 4
    }
  };
}

// 2. Cyber Mech Walker Project (Unreal Engine Preset)
export function createCyberMechProject(): Project {
  const width = 16;
  const height = 16;
  const pixels = new Array(width * height).fill('');

  // Cyber Mech (Cyan, Dark Blue, Neon Yellow)
  // Head & Visor
  pixels[2 * width + 7] = '#06b6d4';
  pixels[2 * width + 8] = '#06b6d4';
  pixels[3 * width + 6] = '#0891b2';
  pixels[3 * width + 7] = '#facc15'; // Glowing eye
  pixels[3 * width + 8] = '#facc15';
  pixels[3 * width + 9] = '#0891b2';

  // Torso / Jet Core
  for (let y = 4; y <= 7; y++) {
    for (let x = 5; x <= 10; x++) {
      pixels[y * width + x] = (x === 7 || x === 8) && y === 5 ? '#f43f5e' : '#1e1b4b';
    }
  }

  // Laser Cannon Arm (left)
  pixels[4 * width + 3] = '#38bdf8';
  pixels[4 * width + 4] = '#0891b2';
  pixels[5 * width + 2] = '#22c55e';
  pixels[5 * width + 3] = '#38bdf8';

  // Energy Blade (right)
  pixels[4 * width + 11] = '#0891b2';
  pixels[5 * width + 12] = '#facc15';
  pixels[6 * width + 13] = '#facc15';
  pixels[7 * width + 13] = '#ffffff';

  // Hydraulic Legs
  for (let y = 8; y <= 12; y++) {
    pixels[y * width + 6] = '#312e81';
    pixels[y * width + 9] = '#312e81';
  }
  pixels[12 * width + 5] = '#06b6d4';
  pixels[12 * width + 6] = '#06b6d4';
  pixels[12 * width + 9] = '#06b6d4';
  pixels[12 * width + 10] = '#06b6d4';

  const layers: Layer[] = [
    {
      id: 'layer-mech-base',
      name: 'Mech Chassis',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      pixels
    }
  ];

  // 3D Voxels for Mech
  const voxels: Voxel[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const c = pixels[y * width + x];
      if (c) {
        const vy = height - 1 - y;
        voxels.push({ x, y: vy, z: 0, color: c });
        voxels.push({ x, y: vy, z: 1, color: c });
        if (x >= 6 && x <= 9 && y >= 4 && y <= 7) {
          voxels.push({ x, y: vy, z: 2, color: c }); // Bulky chest
        }
      }
    }
  }

  return {
    id: 'proj-cyber-mech',
    name: 'Cyber Mech Walker',
    width: 16,
    height: 16,
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 120000,
    frames: [{ id: 'frame-1', name: 'Default', durationMs: 150, layers }],
    currentFrameIndex: 0,
    activeLayerId: 'layer-mech-base',
    voxels,
    voxelGridSize: 24,
    palette: [...PRESET_PALETTES[2].colors], // Cyberpunk
    settings: {
      engine: 'unreal',
      ppu: 32,
      filterMode: 'point',
      exportScale: 4
    }
  };
}

// 3. Golden Treasure Chest Project (3D Voxel Hero, Godot Preset)
export function createChestProject(): Project {
  const width = 16;
  const height = 16;
  const pixels = new Array(width * height).fill('');

  // 2D Representation of chest
  for (let y = 5; y <= 11; y++) {
    for (let x = 3; x <= 12; x++) {
      const isRim = x === 3 || x === 12 || y === 5 || y === 8 || y === 11;
      const isLock = (x === 7 || x === 8) && (y === 7 || y === 8);
      if (isLock) {
        pixels[y * width + x] = '#fee761';
      } else if (isRim) {
        pixels[y * width + x] = '#ca8a04';
      } else {
        pixels[y * width + x] = '#6d4c2e'; // Wood
      }
    }
  }

  // 3D Voxels for Chest
  const voxels: Voxel[] = [];
  const minX = 4, maxX = 11;
  const minY = 0, maxY = 6;
  const minZ = 4, maxZ = 11;

  for (let y = minY; y <= maxY; y++) {
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        const isBorder = x === minX || x === maxX || z === minZ || z === maxZ || y === minY || y === maxY || y === 3;
        const isLock = (x === 7 || x === 8) && y === 3 && z === maxZ;

        if (isLock) {
          voxels.push({ x, y, z: z + 1, color: '#facc15' }); // Lock sticks out
        } else if (isBorder) {
          voxels.push({ x, y, z, color: '#ca8a04' }); // Gold bracket trim
        } else if (y <= 3) {
          voxels.push({ x, y, z, color: '#6d4c2e' }); // Wood base
        } else {
          voxels.push({ x, y, z, color: '#4a2e18' }); // Wood lid
        }
      }
    }
  }

  return {
    id: 'proj-treasure-chest',
    name: 'Golden Treasure Chest',
    width: 16,
    height: 16,
    createdAt: Date.now() - 10800000,
    updatedAt: Date.now() - 300000,
    frames: [
      {
        id: 'frame-1',
        name: 'Closed',
        durationMs: 200,
        layers: [
          {
            id: 'layer-chest',
            name: 'Chest Base',
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'normal',
            pixels
          }
        ]
      }
    ],
    currentFrameIndex: 0,
    activeLayerId: 'layer-chest',
    voxels,
    voxelGridSize: 24,
    palette: [...PRESET_PALETTES[4].colors], // Voxel Craftsman
    settings: {
      engine: 'godot',
      ppu: 16,
      filterMode: 'point',
      exportScale: 4
    }
  };
}

// 4. Dungeon Stone Tileset (GameMaker Preset)
export function createDungeonTileProject(): Project {
  const width = 16;
  const height = 16;
  const pixels = new Array(width * height).fill('');

  // 16x16 Dungeon Stone Wall & Floor Brick pattern
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isHLine = y === 0 || y === 5 || y === 10 || y === 15;
      const isVLine1 = (y < 5 || y > 10) && (x === 0 || x === 8);
      const isVLine2 = (y >= 5 && y <= 10) && (x === 4 || x === 12);

      if (isHLine || isVLine1 || isVLine2) {
        pixels[y * width + x] = '#181425'; // Mortar dark line
      } else if ((x + y) % 3 === 0) {
        pixels[y * width + x] = '#5a6988'; // Stone highlight
      } else {
        pixels[y * width + x] = '#3a4466'; // Slate stone
      }
    }
  }

  // Small torch on wall
  pixels[6 * width + 7] = '#ff0044';
  pixels[6 * width + 8] = '#fee761';
  pixels[7 * width + 7] = '#b86f56';
  pixels[7 * width + 8] = '#b86f56';

  const voxels = extrude2DTo3DVoxels(
    {
      id: 'f1',
      name: 'f1',
      durationMs: 150,
      layers: [{ id: 'l1', name: 'l1', visible: true, locked: false, opacity: 1, blendMode: 'normal', pixels }]
    },
    16,
    16,
    2
  );

  return {
    id: 'proj-dungeon-tile',
    name: 'Dungeon Stone Tileset',
    width: 16,
    height: 16,
    createdAt: Date.now() - 14400000,
    updatedAt: Date.now() - 600000,
    frames: [
      {
        id: 'frame-1',
        name: 'Tile 1',
        durationMs: 200,
        layers: [
          {
            id: 'layer-tile',
            name: 'Stone Texture',
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'normal',
            pixels
          }
        ]
      }
    ],
    currentFrameIndex: 0,
    activeLayerId: 'layer-tile',
    voxels,
    voxelGridSize: 24,
    palette: [...PRESET_PALETTES[1].colors], // Endesga 32
    settings: {
      engine: 'gamemaker',
      ppu: 16,
      filterMode: 'point',
      exportScale: 4
    }
  };
}

// Create new blank asset from wizard
export function createNewProjectFromWizard(options: {
  name: string;
  width: number;
  height: number;
  engine: GameEngine;
  palette: string[];
  mode: '2d' | '3d';
  starterTemplate?: string;
}): Project {
  if (options.starterTemplate === 'knight') return { ...createSampleProject(), id: 'proj-' + Date.now(), name: options.name || 'Hero Knight' };
  if (options.starterTemplate === 'mech') return { ...createCyberMechProject(), id: 'proj-' + Date.now(), name: options.name || 'Cyber Mech' };
  if (options.starterTemplate === 'chest') return { ...createChestProject(), id: 'proj-' + Date.now(), name: options.name || 'Treasure Chest' };
  if (options.starterTemplate === 'tile') return { ...createDungeonTileProject(), id: 'proj-' + Date.now(), name: options.name || 'Dungeon Tile' };

  const w = options.width || 16;
  const h = options.height || 16;
  const blankPixels = new Array(w * h).fill('');

  const initialLayer: Layer = {
    id: 'layer-base-' + Date.now(),
    name: 'Base Layer',
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    pixels: blankPixels
  };

  const initialFrame: Frame = {
    id: 'frame-1',
    name: 'Frame 1',
    durationMs: 150,
    layers: [initialLayer]
  };

  return {
    id: 'proj-' + Date.now(),
    name: options.name || 'New Game Asset',
    width: w,
    height: h,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    frames: [initialFrame],
    currentFrameIndex: 0,
    activeLayerId: initialLayer.id,
    voxels: [],
    voxelGridSize: Math.max(16, Math.min(48, Math.max(w, h))),
    palette: options.palette || [...DEFAULT_PALETTE],
    settings: {
      engine: options.engine || 'unity',
      ppu: w <= 16 ? 16 : 32,
      filterMode: 'point',
      exportScale: 4
    }
  };
}

// Convert 2D sprite composite directly into 3D extruded voxels
export function extrude2DTo3DVoxels(
  frame: Frame,
  width: number,
  height: number,
  depth: number = 2
): Voxel[] {
  const voxels: Voxel[] = [];
  const compositePixels = new Array(width * height).fill('');

  for (const layer of frame.layers) {
    if (!layer.visible) continue;
    for (let i = 0; i < layer.pixels.length; i++) {
      if (layer.pixels[i]) {
        compositePixels[i] = layer.pixels[i];
      }
    }
  }

  const zStart = -Math.floor(depth / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = compositePixels[y * width + x];
      if (color && color.trim() !== '') {
        const vy = height - 1 - y;
        for (let z = 0; z < depth; z++) {
          voxels.push({
            x,
            y: vy,
            z: zStart + z,
            color
          });
        }
      }
    }
  }

  return voxels;
}

// Save project to LocalStorage
export function saveCurrentProject(project: Project): void {
  try {
    const updated = { ...project, updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(updated));
    localStorage.setItem(STORAGE_KEY_PROJECT_PREFIX + project.id, JSON.stringify(updated));

    const listRaw = localStorage.getItem(STORAGE_KEY_LIST);
    let list: { id: string; name: string; updatedAt: number; engine: GameEngine; width: number; height: number; voxelsCount: number }[] = listRaw ? JSON.parse(listRaw) : [];
    
    const existingIdx = list.findIndex(p => p.id === project.id);
    const summary = {
      id: project.id,
      name: project.name,
      updatedAt: updated.updatedAt,
      engine: project.settings?.engine || 'unity',
      width: project.width,
      height: project.height,
      voxelsCount: project.voxels.length
    };

    if (existingIdx >= 0) {
      list[existingIdx] = summary;
    } else {
      list.unshift(summary);
    }
    localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(list));
  } catch (err) {
    console.warn('LocalStorage save failed:', err);
  }
}

// Get all projects for Dashboard Gallery
export function getAllProjectsList(): Project[] {
  try {
    const listRaw = localStorage.getItem(STORAGE_KEY_LIST);
    if (listRaw) {
      const list: { id: string }[] = JSON.parse(listRaw);
      const projects: Project[] = [];
      for (const item of list) {
        const raw = localStorage.getItem(STORAGE_KEY_PROJECT_PREFIX + item.id);
        if (raw) {
          try {
            projects.push(JSON.parse(raw));
          } catch {}
        }
      }
      if (projects.length > 0) return projects;
    }
  } catch (e) {
    console.error('Failed reading projects list', e);
  }

  // Pre-seed initial library with 4 rich starter assets
  const defaults = [
    createSampleProject(),
    createCyberMechProject(),
    createChestProject(),
    createDungeonTileProject()
  ];
  for (const p of defaults) {
    saveCurrentProject(p);
  }
  return defaults;
}

// Load current active project
export function loadCurrentProject(): Project {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.frames && parsed.frames.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load project from local storage', e);
  }
  const sample = createSampleProject();
  saveCurrentProject(sample);
  return sample;
}

// Delete project
export function deleteProjectFromStorage(id: string): void {
  try {
    localStorage.removeItem(STORAGE_KEY_PROJECT_PREFIX + id);
    const listRaw = localStorage.getItem(STORAGE_KEY_LIST);
    if (listRaw) {
      const list = JSON.parse(listRaw).filter((p: { id: string }) => p.id !== id);
      localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(list));
    }
  } catch {}
}
