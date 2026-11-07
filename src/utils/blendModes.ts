import { BlendMode } from '../types/sprite';
import { parseColor, formatRgba, blendPixelColor } from './colorUtils';

export interface BlendModeInfo {
  id: BlendMode;
  label: string;
  badge: string;
  category: 'basic' | 'darken' | 'lighten' | 'contrast' | 'inversion';
  description: string;
  colorClass: string;
}

export const BLEND_MODES: BlendModeInfo[] = [
  // Basic
  {
    id: 'normal',
    label: 'Normal',
    badge: 'NORM',
    category: 'basic',
    description: 'Standard source-over opacity rendering with no color transformation.',
    colorClass: 'text-slate-300 bg-slate-800 border-slate-700'
  },

  // Darken Group
  {
    id: 'multiply',
    label: 'Multiply',
    badge: 'MULT',
    category: 'darken',
    description: 'Multiplies layer color with underlying pixels. Ideal for shadows and ambient occlusion.',
    colorClass: 'text-amber-400 bg-amber-500/15 border-amber-500/30'
  },
  {
    id: 'darken',
    label: 'Darken',
    badge: 'DARK',
    category: 'darken',
    description: 'Selects the darker of the base or blend color channel values.',
    colorClass: 'text-orange-400 bg-orange-500/15 border-orange-500/30'
  },
  {
    id: 'color-burn',
    label: 'Color Burn',
    badge: 'BURN',
    category: 'darken',
    description: 'Darkens base color to reflect blend color by increasing contrast.',
    colorClass: 'text-red-400 bg-red-500/15 border-red-500/30'
  },

  // Lighten Group
  {
    id: 'screen',
    label: 'Screen',
    badge: 'SCRN',
    category: 'lighten',
    description: 'Inverts, multiplies, and inverts colors. Ideal for glows, magic effects, and highlights.',
    colorClass: 'text-sky-400 bg-sky-500/15 border-sky-500/30'
  },
  {
    id: 'lighten',
    label: 'Lighten',
    badge: 'LGHT',
    category: 'lighten',
    description: 'Selects the lighter of the base or blend color channel values.',
    colorClass: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30'
  },
  {
    id: 'color-dodge',
    label: 'Color Dodge',
    badge: 'DODG',
    category: 'lighten',
    description: 'Brightens base color to reflect blend color by decreasing contrast.',
    colorClass: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
  },

  // Contrast Group
  {
    id: 'overlay',
    label: 'Overlay',
    badge: 'OVRL',
    category: 'contrast',
    description: 'Multiplies or screens colors based on base layer. Boosts overall contrast.',
    colorClass: 'text-purple-400 bg-purple-500/15 border-purple-500/30'
  },
  {
    id: 'soft-light',
    label: 'Soft Light',
    badge: 'SOFT',
    category: 'contrast',
    description: 'Darkens or lightens colors depending on blend color, similar to a diffused spotlight.',
    colorClass: 'text-fuchsia-400 bg-fuchsia-500/15 border-fuchsia-500/30'
  },
  {
    id: 'hard-light',
    label: 'Hard Light',
    badge: 'HARD',
    category: 'contrast',
    description: 'Multiplies or screens colors based on blend layer, similar to a harsh spotlight.',
    colorClass: 'text-pink-400 bg-pink-500/15 border-pink-500/30'
  },

  // Inversion & Utility Group
  {
    id: 'difference',
    label: 'Difference',
    badge: 'DIFF',
    category: 'inversion',
    description: 'Subtracts the darker color from the lighter color. Great for glitch or psychedelic effects.',
    colorClass: 'text-rose-400 bg-rose-500/15 border-rose-500/30'
  },
  {
    id: 'exclusion',
    label: 'Exclusion',
    badge: 'EXCL',
    category: 'inversion',
    description: 'Produces an effect similar to Difference but with lower contrast and softer tones.',
    colorClass: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30'
  }
];

// Map application BlendMode to HTML5 Canvas globalCompositeOperation
export function mapBlendModeToCompositeOperation(mode: BlendMode | undefined): GlobalCompositeOperation {
  if (!mode || mode === 'normal') return 'source-over';
  return mode as GlobalCompositeOperation;
}

// Channel calculation (0-255 values) for mathematical pixel blending
export function calculateBlendChannel(b: number, s: number, mode: BlendMode): number {
  switch (mode) {
    case 'multiply':
      return (b * s) / 255;

    case 'screen':
      return 255 - ((255 - b) * (255 - s)) / 255;

    case 'overlay':
      return b < 128
        ? (2 * b * s) / 255
        : 255 - (2 * (255 - b) * (255 - s)) / 255;

    case 'darken':
      return Math.min(b, s);

    case 'lighten':
      return Math.max(b, s);

    case 'color-dodge':
      if (s === 255) return 255;
      return Math.min(255, (b * 255) / (255 - s));

    case 'color-burn':
      if (s === 0) return 0;
      return Math.max(0, 255 - ((255 - b) * 255) / s);

    case 'hard-light':
      return s < 128
        ? (2 * b * s) / 255
        : 255 - (2 * (255 - b) * (255 - s)) / 255;

    case 'soft-light': {
      const bN = b / 255;
      const sN = s / 255;
      const d = bN <= 0.25 
        ? ((16 * bN - 12) * bN + 4) * bN 
        : Math.sqrt(bN);
      const res = sN <= 0.5 
        ? bN - (1 - 2 * sN) * bN * (1 - bN) 
        : bN + (2 * sN - 1) * (d - bN);
      return res * 255;
    }

    case 'difference':
      return Math.abs(b - s);

    case 'exclusion':
      return b + s - (2 * b * s) / 255;

    case 'normal':
    default:
      return s;
  }
}

// Full pixel color blending with alpha and opacity calculations
export function blendPixelColors(
  destColor: string | undefined,
  srcColor: string | undefined,
  mode: BlendMode = 'normal',
  srcOpacity: number = 1.0
): string {
  if (!srcColor || srcColor === '') {
    return destColor || '';
  }

  const src = parseColor(srcColor);
  const effectiveSrcAlpha = Math.max(0, Math.min(1, src.a * srcOpacity));
  if (effectiveSrcAlpha <= 0.01) {
    return destColor || '';
  }

  if (!destColor || destColor === '') {
    return formatRgba(src.r, src.g, src.b, effectiveSrcAlpha);
  }

  const dest = parseColor(destColor);
  if (dest.a <= 0.01) {
    return formatRgba(src.r, src.g, src.b, effectiveSrcAlpha);
  }

  if (mode === 'normal') {
    return blendPixelColor(destColor, srcColor, srcOpacity);
  }

  // Calculate blended color channels
  const blendedR = calculateBlendChannel(dest.r, src.r, mode);
  const blendedG = calculateBlendChannel(dest.g, src.g, mode);
  const blendedB = calculateBlendChannel(dest.b, src.b, mode);

  // W3C Compositing & Blending formula with Alpha and Layer Opacity:
  // α_out = α_src + α_dst * (1 - α_src)
  // C_out = (1 - α_dst) * α_src * C_src + (1 - α_src) * α_dst * C_dst + α_src * α_dst * C_blended
  const outA = effectiveSrcAlpha + dest.a * (1 - effectiveSrcAlpha);
  if (outA <= 0.01) return '';

  const outR = (
    (1 - dest.a) * effectiveSrcAlpha * src.r +
    (1 - effectiveSrcAlpha) * dest.a * dest.r +
    effectiveSrcAlpha * dest.a * blendedR
  ) / outA;

  const outG = (
    (1 - dest.a) * effectiveSrcAlpha * src.g +
    (1 - effectiveSrcAlpha) * dest.a * dest.g +
    effectiveSrcAlpha * dest.a * blendedG
  ) / outA;

  const outB = (
    (1 - dest.a) * effectiveSrcAlpha * src.b +
    (1 - effectiveSrcAlpha) * dest.a * dest.b +
    effectiveSrcAlpha * dest.a * blendedB
  ) / outA;

  return formatRgba(outR, outG, outB, outA);
}
