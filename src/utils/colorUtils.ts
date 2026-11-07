// Color utilities for palette sorting and complementary harmony generation

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
  v: number;
}

export function hexToRgb(hex: string): RGB {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 0, g: 0, b: 0 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  const normR = r / 255;
  const normG = g / 255;
  const normB = b / 255;
  const max = Math.max(normR, normG, normB);
  const min = Math.min(normR, normG, normB);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const v = max; // Brightness / Value

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case normR:
        h = (normG - normB) / d + (normG < normB ? 6 : 0);
        break;
      case normG:
        h = (normB - normR) / d + 2;
        break;
      case normB:
        h = (normR - normG) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: h * 360, s, l, v };
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

// Compute perceived relative luminance
export function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
}

// Sort colors by Hue
export function sortColorsByHue(colors: string[]): string[] {
  return [...colors].sort((a, b) => {
    const rgbA = hexToRgb(a);
    const rgbB = hexToRgb(b);
    const hslA = rgbToHsl(rgbA.r, rgbA.g, rgbA.b);
    const hslB = rgbToHsl(rgbB.r, rgbB.g, rgbB.b);

    // Keep almost desaturated colors (neutrals: black, gray, white) at start sorted by brightness
    const isNeutralA = hslA.s < 0.08;
    const isNeutralB = hslB.s < 0.08;
    if (isNeutralA && !isNeutralB) return -1;
    if (!isNeutralA && isNeutralB) return 1;
    if (isNeutralA && isNeutralB) return hslA.l - hslB.l;

    return hslA.h - hslB.h;
  });
}

// Sort colors by Saturation
export function sortColorsBySaturation(colors: string[]): string[] {
  return [...colors].sort((a, b) => {
    const rgbA = hexToRgb(a);
    const rgbB = hexToRgb(b);
    const hslA = rgbToHsl(rgbA.r, rgbA.g, rgbA.b);
    const hslB = rgbToHsl(rgbB.r, rgbB.g, rgbB.b);
    return hslA.s - hslB.s;
  });
}

// Sort colors by Brightness / Luminance
export function sortColorsByBrightness(colors: string[]): string[] {
  return [...colors].sort((a, b) => getLuminance(a) - getLuminance(b));
}

// Get the direct complementary color hex for a given color
export function getComplementaryColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const effectiveHue = s < 0.1 ? 205 : h;
  const complementHue = (effectiveHue + 180) % 360;
  const effectiveSat = Math.max(0.4, Math.min(1, s < 0.1 ? 0.8 : s));
  return hslToHex(complementHue, effectiveSat, Math.max(0.35, Math.min(0.65, l)));
}

// Auto-generate a harmonious complementary color palette based on primary color
export function generateComplementaryPalette(primaryColor: string): string[] {
  const { r, g, b } = hexToRgb(primaryColor);
  const { h, s, l } = rgbToHsl(r, g, b);

  // If primary is practically gray/white/black, pick a default vibrant base hue (e.g. sky blue 205°)
  const effectiveHue = s < 0.1 ? 205 : h;
  const effectiveSat = Math.max(0.45, Math.min(0.95, s < 0.1 ? 0.75 : s));
  const complementHue = (effectiveHue + 180) % 360;
  const split1 = (effectiveHue + 150) % 360;
  const split2 = (effectiveHue + 210) % 360;

  const result: string[] = [
    // 1-2. Deep Neutrals
    '#0d0f14',
    '#1e222e',
    // 3-7. Primary Color Ramp (Shadow -> Core -> Highlight)
    hslToHex(effectiveHue, Math.min(1, effectiveSat * 1.15), 0.15), // Deep shadow
    hslToHex(effectiveHue, effectiveSat, 0.32),                    // Shade
    primaryColor.startsWith('#') ? primaryColor : hslToHex(effectiveHue, effectiveSat, l), // Core
    hslToHex(effectiveHue, Math.max(0.2, effectiveSat * 0.9), 0.65), // Light
    hslToHex(effectiveHue, Math.max(0.15, effectiveSat * 0.7), 0.85), // Highlight
    // 8-12. Complementary Color Ramp (Opposite wheel)
    hslToHex(complementHue, Math.min(1, effectiveSat * 1.15), 0.15), // Complement shadow
    hslToHex(complementHue, effectiveSat, 0.32),                    // Complement shade
    hslToHex(complementHue, effectiveSat, Math.max(0.35, Math.min(0.65, l))), // Complement core
    hslToHex(complementHue, Math.max(0.2, effectiveSat * 0.9), 0.65), // Complement light
    hslToHex(complementHue, Math.max(0.15, effectiveSat * 0.7), 0.85), // Complement highlight
    // 13-14. Split-Complementary Accents
    hslToHex(split1, Math.min(1, effectiveSat * 1.05), 0.52),
    hslToHex(split2, Math.min(1, effectiveSat * 1.05), 0.52),
    // 15-16. Highlights / Paper Whites
    '#e2e8f0',
    '#ffffff'
  ];

  return result;
}

// Color parsing and Porter-Duff alpha blending for pressure-sensitive drawing & opacity
export interface ParsedColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseColor(color: string): ParsedColor {
  if (!color) return { r: 0, g: 0, b: 0, a: 0 };
  const trimmed = color.trim().toLowerCase();
  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    if (hex.length === 6) {
      const num = parseInt(hex, 16);
      return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255, a: 1 };
    }
    if (hex.length === 8) {
      const num = parseInt(hex, 16);
      return {
        r: (num >> 24) & 255,
        g: (num >> 16) & 255,
        b: (num >> 8) & 255,
        a: Math.round(((num & 255) / 255) * 100) / 100
      };
    }
  }

  const rgbaMatch = trimmed.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgbaMatch) {
    return {
      r: Math.max(0, Math.min(255, parseInt(rgbaMatch[1], 10))),
      g: Math.max(0, Math.min(255, parseInt(rgbaMatch[2], 10))),
      b: Math.max(0, Math.min(255, parseInt(rgbaMatch[3], 10))),
      a: rgbaMatch[4] !== undefined ? Math.max(0, Math.min(1, parseFloat(rgbaMatch[4]))) : 1
    };
  }

  return { r: 0, g: 0, b: 0, a: 1 };
}

export function formatRgba(r: number, g: number, b: number, a: number): string {
  const clampR = Math.max(0, Math.min(255, Math.round(r)));
  const clampG = Math.max(0, Math.min(255, Math.round(g)));
  const clampB = Math.max(0, Math.min(255, Math.round(b)));
  const clampA = Math.max(0, Math.min(1, Math.round(a * 100) / 100));

  if (clampA >= 0.99) {
    return rgbToHex(clampR, clampG, clampB);
  }
  if (clampA <= 0.01) {
    return '';
  }
  return `rgba(${clampR}, ${clampG}, ${clampB}, ${clampA})`;
}

// Alpha-blends incoming color with an opacity factor over an existing pixel
export function blendPixelColor(existingColor: string | undefined, incomingColor: string, incomingAlpha: number): string {
  const inc = parseColor(incomingColor);
  const srcA = Math.max(0, Math.min(1, incomingAlpha * inc.a));

  if (srcA <= 0.01) return existingColor || '';
  if (!existingColor || existingColor === '') {
    return formatRgba(inc.r, inc.g, inc.b, srcA);
  }

  const dst = parseColor(existingColor);
  const dstA = dst.a;

  // Standard "Over" Porter-Duff alpha compositing
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0.01) return '';

  const outR = (inc.r * srcA + dst.r * dstA * (1 - srcA)) / outA;
  const outG = (inc.g * srcA + dst.g * dstA * (1 - srcA)) / outA;
  const outB = (inc.b * srcA + dst.b * dstA * (1 - srcA)) / outA;

  return formatRgba(outR, outG, outB, outA);
}

// Gradually reduces pixel alpha for soft eraser pressure
export function fadePixelColor(existingColor: string | undefined, remainingFactor: number): string {
  if (!existingColor || existingColor === '') return '';
  const dst = parseColor(existingColor);
  const newA = dst.a * remainingFactor;
  if (newA <= 0.04) return '';
  return formatRgba(dst.r, dst.g, dst.b, newA);
}
