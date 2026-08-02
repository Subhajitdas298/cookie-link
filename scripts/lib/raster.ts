// Minimal signed-distance-field raster toolkit shared by the icon and promo
// image generators. Pure TS (no native canvas dependency) so it runs
// anywhere Node runs, including CI.

import { PNG } from 'pngjs';

export type RGB = [number, number, number];
export type ColorFn = (x: number, y: number) => RGB;
export type AlphaFn = (x: number, y: number) => number;

export function hex(str: string): RGB {
  const n = parseInt(str.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

// --- signed distance fields -------------------------------------------------

export function sdCircle(px: number, py: number, cx: number, cy: number, r: number): number {
  return Math.hypot(px - cx, py - cy) - r;
}

export interface Harmonic {
  amp: number;
  freq: number;
  phase: number;
}

// A soft blob: radius wobbles gently with angle via sine harmonics, instead
// of a perfect (or spiky) circle — smooth lumps, Material-style rounding.
function jaggedRadius(theta: number, baseR: number, harmonics: Harmonic[]): number {
  let r = baseR;
  for (const { amp, freq, phase } of harmonics) {
    r += amp * baseR * Math.sin(freq * theta + phase);
  }
  return r;
}

export function sdBlob(px: number, py: number, cx: number, cy: number, baseR: number, harmonics: Harmonic[]): number {
  const dx = px - cx;
  const dy = py - cy;
  const dist = Math.hypot(dx, dy);
  const theta = Math.atan2(dy, dx);
  return dist - jaggedRadius(theta, baseR, harmonics);
}

export function sdRoundedRect(
  px: number,
  py: number,
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  radius: number
): number {
  const dx = Math.abs(px - cx) - halfW + radius;
  const dy = Math.abs(py - cy) - halfH + radius;
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - radius;
}

function sdRoundedRectRot(
  px: number,
  py: number,
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  radius: number,
  angle: number
): number {
  const s = Math.sin(-angle);
  const c = Math.cos(-angle);
  const dx = px - cx;
  const dy = py - cy;
  const rx = dx * c - dy * s;
  const ry = dx * s + dy * c;
  return sdRoundedRect(rx, ry, 0, 0, halfW, halfH, radius);
}

export function sdRing(
  px: number,
  py: number,
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  radius: number,
  thickness: number,
  angle: number
): number {
  const outer = sdRoundedRectRot(px, py, cx, cy, halfW, halfH, radius, angle);
  const inner = sdRoundedRectRot(px, py, cx, cy, halfW - thickness, halfH - thickness, Math.max(radius - thickness, 0), angle);
  return Math.max(outer, -inner);
}

export function coverage(sd: number): number {
  return clamp(0.5 - sd, 0, 1);
}

export function soft(sd: number, band: number): number {
  return clamp(0.5 - sd / band, 0, 1);
}

export function linearGradient(colorA: RGB, colorB: RGB, x0: number, y0: number, x1: number, y1: number): ColorFn {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lenSq = dx * dx + dy * dy;
  return (x, y) => {
    const t = clamp(((x - x0) * dx + (y - y0) * dy) / lenSq, 0, 1);
    return lerpColor(colorA, colorB, t);
  };
}

// --- canvas --------------------------------------------------------------

export class Canvas {
  readonly width: number;
  readonly height: number;
  readonly data: Float64Array;

  constructor(width: number, height: number = width) {
    this.width = width;
    this.height = height;
    this.data = new Float64Array(width * height * 4);
  }

  // Fill fully opaque — use for canvases that must have no transparency
  // (Chrome Web Store promo tiles reject alpha).
  fillOpaque(color: RGB | ColorFn): void {
    this.paint(color, () => 1);
  }

  paint(color: RGB | ColorFn, alphaAt: AlphaFn): void {
    const { width, height, data } = this;
    const colorFn: ColorFn = typeof color === 'function' ? color : () => color;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const a = alphaAt(x + 0.5, y + 0.5);
        if (a <= 0) continue;
        const [r, g, b] = colorFn(x + 0.5, y + 0.5);
        const i = (y * width + x) * 4;
        const srcA = a;
        const dstA = data[i + 3]!;
        const outA = srcA + dstA * (1 - srcA);
        if (outA <= 0) continue;
        data[i] = (r * srcA + data[i]! * dstA * (1 - srcA)) / outA;
        data[i + 1] = (g * srcA + data[i + 1]! * dstA * (1 - srcA)) / outA;
        data[i + 2] = (b * srcA + data[i + 2]! * dstA * (1 - srcA)) / outA;
        data[i + 3] = outA;
      }
    }
  }

  toPNG(): PNG {
    const png = new PNG({ width: this.width, height: this.height });
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const i = (y * this.width + x) * 4;
        png.data[i] = Math.round(this.data[i]!);
        png.data[i + 1] = Math.round(this.data[i + 1]!);
        png.data[i + 2] = Math.round(this.data[i + 2]!);
        png.data[i + 3] = Math.round(this.data[i + 3]! * 255);
      }
    }
    return png;
  }
}
