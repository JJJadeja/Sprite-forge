export interface PalettePreset {
  name: string;
  id: string;
  description: string;
  colors: string[];
}

export const PRESET_PALETTES: PalettePreset[] = [
  {
    name: 'PICO-8 Classic',
    id: 'pico-8',
    description: 'Iconic 16-color fantasy console palette',
    colors: [
      '#000000', '#1D2B53', '#7E2553', '#008751', 
      '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8', 
      '#FF004D', '#FFA300', '#FFEC27', '#00E436', 
      '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'
    ]
  },
  {
    name: 'Endesga 32',
    id: 'endesga-32',
    description: 'Rich versatile palette for indie games & characters',
    colors: [
      '#be4a2f', '#d77643', '#ead4aa', '#e4a672', '#b86f56', '#733e39', '#3e2731', '#a22633',
      '#e43b44', '#f77622', '#feae34', '#fee761', '#63c74d', '#3e8948', '#265c42', '#193c3e',
      '#124e89', '#0099db', '#2ce8f5', '#ffffff', '#c0cbdc', '#8b9bb4', '#5a6988', '#3a4466',
      '#262b44', '#181425', '#ff0044', '#68386c', '#b55088', '#f6757a', '#e8b796', '#c28569'
    ]
  },
  {
    name: 'Cyberpunk Neon',
    id: 'cyberpunk',
    description: 'Vibrant neon synthwave & sci-fi tones',
    colors: [
      '#050505', '#0f172a', '#1e1b4b', '#312e81',
      '#06b6d4', '#0891b2', '#0284c7', '#38bdf8',
      '#10b981', '#4ade80', '#22c55e', '#a3e635',
      '#facc15', '#f97316', '#ef4444', '#f43f5e',
      '#d946ef', '#ec4899', '#a855f7', '#ffffff'
    ]
  },
  {
    name: 'GameBoy Retro',
    id: 'gameboy',
    description: 'Original 4-shade phosphor display',
    colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f']
  },
  {
    name: 'Voxel Craftsman',
    id: 'voxel-earth',
    description: 'Natural stone, wood, metals & foliage for 3D worlds',
    colors: [
      '#2c1810', '#4a2e18', '#6d4c2e', '#9b7653',
      '#2d5a27', '#46833b', '#73b054', '#a8d672',
      '#374151', '#6b7280', '#9ca3af', '#e5e7eb',
      '#854d0e', '#ca8a04', '#eab308', '#fef08a',
      '#1e3a8a', '#2563eb', '#60a5fa', '#bfdbfe'
    ]
  },
  {
    name: 'Sweetie 16',
    id: 'sweetie-16',
    description: 'Soft pleasant pastel hues with great contrast',
    colors: [
      '#1a1c2c', '#5d275d', '#b13e53', '#ef7d57', 
      '#ffcd75', '#a7f070', '#38b764', '#257179', 
      '#29366f', '#3b5dc9', '#41a6f6', '#73eff7', 
      '#f4f4f4', '#94b0c2', '#566c86', '#333c57'
    ]
  }
];

export const DEFAULT_PALETTE = PRESET_PALETTES[0].colors;
