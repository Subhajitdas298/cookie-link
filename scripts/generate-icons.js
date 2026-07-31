#!/usr/bin/env node
// Generates the extension's flat 2D cookie icon (with a chain-link badge in the
// bottom-right corner) at every size Chrome needs. Pure JS raster (no native
// canvas dependency) so it can run anywhere Node runs, including CI.
'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SIZES = [16, 32, 48, 128];
const OUT_DIR = path.join(__dirname, '..', 'icons');

const COOKIE_BASE = hex('#E3A857');
const COOKIE_RIM = hex('#C98A44');
const COOKIE_OUTLINE = hex('#8A5A2B');
const CHIP_COLOR = hex('#5C3A21');
const CHIP_HIGHLIGHT = hex('#7A4B2A');
const BADGE_COLOR = hex('#FFF6E5');
const CHAIN_COLOR = hex('#6B7280');
const CHAIN_OUTLINE = hex('#374151');

function hex(str) {
  const n = parseInt(str.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// Signed distance for a circle: negative inside, 0 at edge, positive outside.
function sdCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r;
}

// Signed distance for an axis-aligned rounded rectangle.
function sdRoundedRect(px, py, cx, cy, halfW, halfH, radius) {
  const dx = Math.abs(px - cx) - halfW + radius;
  const dy = Math.abs(py - cy) - halfH + radius;
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - radius;
}

// Signed distance for a rounded rect rotated by `angle` radians around its center.
function sdRoundedRectRot(px, py, cx, cy, halfW, halfH, radius, angle) {
  const s = Math.sin(-angle);
  const c = Math.cos(-angle);
  const dx = px - cx;
  const dy = py - cy;
  const rx = dx * c - dy * s;
  const ry = dx * s + dy * c;
  return sdRoundedRect(rx, ry, 0, 0, halfW, halfH, radius);
}

// Ring (annulus) built from a rotated rounded rect minus a smaller one inside it.
function sdRing(px, py, cx, cy, halfW, halfH, radius, thickness, angle) {
  const outer = sdRoundedRectRot(px, py, cx, cy, halfW, halfH, radius, angle);
  const inner = sdRoundedRectRot(px, py, cx, cy, halfW - thickness, halfH - thickness, Math.max(radius - thickness, 0), angle);
  return Math.max(outer, -inner);
}

function coverage(sd) {
  return clamp(0.5 - sd, 0, 1);
}

class Canvas {
  constructor(size) {
    this.size = size;
    this.data = new Float64Array(size * size * 4);
  }

  // Alpha-composite a shape (defined by its coverage at each pixel) over the canvas.
  paint(colorFn, alphaAt) {
    const { size, data } = this;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const a = alphaAt(x + 0.5, y + 0.5);
        if (a <= 0) continue;
        const [r, g, b] = colorFn(x + 0.5, y + 0.5);
        const i = (y * size + x) * 4;
        const srcA = a;
        const dstA = data[i + 3];
        const outA = srcA + dstA * (1 - srcA);
        if (outA <= 0) continue;
        for (let c = 0; c < 3; c++) {
          const srcC = [r, g, b][c];
          const dstC = data[i + c];
          data[i + c] = (srcC * srcA + dstC * dstA * (1 - srcA)) / outA;
        }
        data[i + 3] = outA;
      }
    }
  }

  toPNG() {
    const png = new PNG({ width: this.size, height: this.size });
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const i = (y * this.size + x) * 4;
        const o = (y * this.size + x) * 4;
        png.data[o] = Math.round(this.data[i]);
        png.data[o + 1] = Math.round(this.data[i + 1]);
        png.data[o + 2] = Math.round(this.data[i + 2]);
        png.data[o + 3] = Math.round(this.data[i + 3] * 255);
      }
    }
    return png;
  }
}

const CHIPS = [
  { dx: -0.20, dy: -0.22, r: 0.085 },
  { dx: 0.14, dy: -0.28, r: 0.07 },
  { dx: 0.30, dy: -0.02, r: 0.075 },
  { dx: -0.32, dy: 0.06, r: 0.065 },
  { dx: -0.06, dy: 0.02, r: 0.08 },
  { dx: 0.02, dy: 0.30, r: 0.07 },
  { dx: -0.24, dy: 0.28, r: 0.06 },
];

function drawIcon(size) {
  const canvas = new Canvas(size);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.44;

  // Cookie base with a slightly darker rim for a flat, two-tone look.
  canvas.paint(() => COOKIE_RIM, (x, y) => coverage(sdCircle(x, y, cx, cy, r)));
  canvas.paint(() => COOKIE_BASE, (x, y) => coverage(sdCircle(x, y, cx, cy, r * 0.93)));

  // Thin flat outline to keep the shape crisp at small sizes.
  canvas.paint(() => COOKIE_OUTLINE, (x, y) => {
    const d = sdCircle(x, y, cx, cy, r);
    return coverage(Math.abs(d) - size * 0.02);
  });

  // Chocolate chips.
  for (const chip of CHIPS) {
    const chipCx = cx + chip.dx * size;
    const chipCy = cy + chip.dy * size;
    const chipR = chip.r * size;
    canvas.paint(() => CHIP_COLOR, (x, y) => coverage(sdCircle(x, y, chipCx, chipCy, chipR)));
    canvas.paint(() => CHIP_HIGHLIGHT, (x, y) =>
      coverage(sdCircle(x, y, chipCx - chipR * 0.3, chipCy - chipR * 0.3, chipR * 0.35)) * 0.6
    );
  }

  // Chain-link badge, bottom-right corner.
  const badgeR = size * 0.36;
  const badgeCx = cx + size * 0.30;
  const badgeCy = cy + size * 0.30;
  canvas.paint(() => BADGE_COLOR, (x, y) => coverage(sdCircle(x, y, badgeCx, badgeCy, badgeR)));

  const ringHalfW = size * 0.15;
  const ringHalfH = size * 0.095;
  const ringRadius = ringHalfH;
  const ringThickness = size * 0.05;
  const offset = size * 0.075;

  const ring = (ox, oy, angle) => (x, y) =>
    coverage(sdRing(x, y, badgeCx + ox, badgeCy + oy, ringHalfW, ringHalfH, ringRadius, ringThickness, angle));
  const ringOutline = (ox, oy, angle) => (x, y) =>
    coverage(Math.abs(sdRing(x, y, badgeCx + ox, badgeCy + oy, ringHalfW, ringHalfH, ringRadius, ringThickness, angle)) - size * 0.012);

  canvas.paint(() => CHAIN_COLOR, ring(-offset, -offset * 0.4, Math.PI / 4));
  canvas.paint(() => CHAIN_COLOR, ring(offset, offset * 0.4, Math.PI / 4));
  canvas.paint(() => CHAIN_OUTLINE, ringOutline(-offset, -offset * 0.4, Math.PI / 4));
  canvas.paint(() => CHAIN_OUTLINE, ringOutline(offset, offset * 0.4, Math.PI / 4));

  return canvas.toPNG();
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const png = drawIcon(size);
  const outPath = path.join(OUT_DIR, `icon${size}.png`);
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(outPath, buffer);
  console.log(`wrote ${outPath}`);
}
