// Keyframe morphing and pixel-based interpolation utilities
import { Frame, Layer } from '../types/sprite';
import { hexToRgb, rgbToHex } from './colorUtils';

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

/**
 * Perform pixel-by-pixel interpolation between two layer pixel buffers.
 * Handles RGB cross-fade for overlapping pixels and either smooth threshold or
 * ordered 4x4 Bayer dithering for appearing/disappearing pixels.
 */
export function interpolateLayerPixels(
  pixelsA: string[],
  pixelsB: string[],
  t: number,
  width: number,
  height: number,
  style: 'blend' | 'dither' = 'blend'
): string[] {
  const result: string[] = new Array(width * height).fill('');
  const total = width * height;

  for (let i = 0; i < total; i++) {
    const colorA = pixelsA[i] || '';
    const colorB = pixelsB[i] || '';

    // Both transparent
    if (!colorA && !colorB) {
      continue;
    }

    // Both pixels have colors: interpolate RGB smoothly
    if (colorA && colorB) {
      if (colorA === colorB) {
        result[i] = colorA;
      } else {
        const rgbA = hexToRgb(colorA);
        const rgbB = hexToRgb(colorB);
        const r = Math.round(rgbA.r + (rgbB.r - rgbA.r) * t);
        const g = Math.round(rgbA.g + (rgbB.g - rgbA.g) * t);
        const b = Math.round(rgbA.b + (rgbB.b - rgbA.b) * t);
        result[i] = rgbToHex(r, g, b);
      }
      continue;
    }

    // Bayer threshold for dither morph
    const x = i % width;
    const y = Math.floor(i / width);
    const threshold = (BAYER_4X4[y % 4][x % 4] + 0.5) / 16;

    // Disappearing pixel (Color A present, Color B empty)
    if (colorA && !colorB) {
      if (style === 'dither') {
        if (1 - t > threshold) {
          result[i] = colorA;
        }
      } else {
        // Blend mode: cutoff at 50%
        if (t < 0.5) {
          result[i] = colorA;
        }
      }
      continue;
    }

    // Appearing pixel (Color A empty, Color B present)
    if (!colorA && colorB) {
      if (style === 'dither') {
        if (t > threshold) {
          result[i] = colorB;
        }
      } else {
        // Blend mode: cutoff at 50%
        if (t >= 0.5) {
          result[i] = colorB;
        }
      }
      continue;
    }
  }

  return result;
}

/**
 * Generate in-between morph frames between two keyframes.
 */
export function generateMorphFrames(
  frameA: Frame,
  frameB: Frame,
  steps: number,
  style: 'blend' | 'dither',
  width: number,
  height: number,
  frameAIndex: number,
  frameBIndex: number
): Frame[] {
  const newFrames: Frame[] = [];
  const duration = Math.round(((frameA.durationMs || 150) + (frameB.durationMs || 150)) / 2);

  for (let step = 1; step <= steps; step++) {
    const t = step / (steps + 1);
    const pct = Math.round(t * 100);
    const frameId = `morph-${Date.now()}-${step}-${Math.random().toString(36).substring(2, 6)}`;

    // Interpolate each layer correspondingly
    const newLayers: Layer[] = frameA.layers.map((layerA, lIdx) => {
      const layerB = frameB.layers.find(l => l.id === layerA.id) || frameB.layers[lIdx] || frameB.layers[0];
      const morphedPixels = interpolateLayerPixels(
        layerA.pixels,
        layerB ? layerB.pixels : new Array(width * height).fill(''),
        t,
        width,
        height,
        style
      );

      return {
        ...layerA,
        id: `layer-${frameId}-${lIdx}`,
        pixels: morphedPixels
      };
    });

    newFrames.push({
      id: frameId,
      name: `Morph ${frameAIndex + 1}→${frameBIndex + 1} (${pct}%)`,
      durationMs: duration,
      layers: newLayers
    });
  }

  return newFrames;
}

/**
 * Flatten all visible layers in a frame to a composite pixel array
 */
export function getFrameCompositePixels(frame: Frame, width: number, height: number): string[] {
  const composite = new Array(width * height).fill('');
  for (const layer of frame.layers) {
    if (!layer.visible || layer.opacity <= 0) continue;
    for (let i = 0; i < width * height; i++) {
      if (layer.pixels[i]) {
        composite[i] = layer.pixels[i];
      }
    }
  }
  return composite;
}
