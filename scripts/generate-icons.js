#!/usr/bin/env node
// Generates the extension's icon: a flat, single-tone Material-Design-style
// cookie with soft rounded chocolate-chip blobs and a flat chain-link glyph
// in the bottom-right corner. No background/container shapes — everything
// sits directly on a transparent canvas. Pure JS raster (no native canvas
// dependency) so it runs anywhere Node runs, including CI.
'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SIZES = [16, 32, 48, 128];
const OUT_DIR = path.join(__dirname, '..', 'icons');

function hex(str) {
  const n = parseInt(str.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// --- signed distance fields -------------------------------------------------

function sdCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r;
}

// A soft blob: radius wobbles gently with angle via sine harmonics, instead
// of a perfect (or spiky) circle — smooth lumps, Material-style rounding.
function jaggedRadius(theta, baseR, harmonics) {
  let r = baseR;
  for (const { amp, freq, phase } of harmonics) {
    r += amp * baseR * Math.sin(freq * theta + phase);
  }
  return r;
}

function sdBlob(px, py, cx, cy, baseR, harmonics) {
  const dx = px - cx;
  const dy = py - cy;
  const dist = Math.hypot(dx, dy);
  const theta = Math.atan2(dy, dx);
  return dist - jaggedRadius(theta, baseR, harmonics);
}

function sdRoundedRect(px, py, cx, cy, halfW, halfH, radius) {
  const dx = Math.abs(px - cx) - halfW + radius;
  const dy = Math.abs(py - cy) - halfH + radius;
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - radius;
}

function sdRoundedRectRot(px, py, cx, cy, halfW, halfH, radius, angle) {
  const s = Math.sin(-angle);
  const c = Math.cos(-angle);
  const dx = px - cx;
  const dy = py - cy;
  const rx = dx * c - dy * s;
  const ry = dx * s + dy * c;
  return sdRoundedRect(rx, ry, 0, 0, halfW, halfH, radius);
}

function sdRing(px, py, cx, cy, halfW, halfH, radius, thickness, angle) {
  const outer = sdRoundedRectRot(px, py, cx, cy, halfW, halfH, radius, angle);
  const inner = sdRoundedRectRot(px, py, cx, cy, halfW - thickness, halfH - thickness, Math.max(radius - thickness, 0), angle);
  return Math.max(outer, -inner);
}

function coverage(sd) {
  return clamp(0.5 - sd, 0, 1);
}

function soft(sd, band) {
  return clamp(0.5 - sd / band, 0, 1);
}

// --- canvas --------------------------------------------------------------

class Canvas {
  constructor(size) {
    this.size = size;
    this.data = new Float64Array(size * size * 4);
  }

  paint(color, alphaAt) {
    const { size, data } = this;
    const [r, g, b] = color;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const a = alphaAt(x + 0.5, y + 0.5);
        if (a <= 0) continue;
        const i = (y * size + x) * 4;
        const srcA = a;
        const dstA = data[i + 3];
        const outA = srcA + dstA * (1 - srcA);
        if (outA <= 0) continue;
        data[i] = (r * srcA + data[i] * dstA * (1 - srcA)) / outA;
        data[i + 1] = (g * srcA + data[i + 1] * dstA * (1 - srcA)) / outA;
        data[i + 2] = (b * srcA + data[i + 2] * dstA * (1 - srcA)) / outA;
        data[i + 3] = outA;
      }
    }
  }

  toPNG() {
    const png = new PNG({ width: this.size, height: this.size });
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const i = (y * this.size + x) * 4;
        png.data[i] = Math.round(this.data[i]);
        png.data[i + 1] = Math.round(this.data[i + 1]);
        png.data[i + 2] = Math.round(this.data[i + 2]);
        png.data[i + 3] = Math.round(this.data[i + 3] * 255);
      }
    }
    return png;
  }
}

// --- palette (flat Material-style tones, no gradients) --------------------

const COOKIE = hex('#E8A94E');
const CHIP = hex('#5A3722');
const SHADOW = [17, 12, 8];

const CHAIN = hex('#3454D1');
const CHAIN_SHADOW_TONE = hex('#26399A');

// Very subtle wobble on the cookie's outer edge — just enough to read as
// hand-made rather than a perfect circle.
const COOKIE_HARMONICS = [
  { amp: 0.008, freq: 7, phase: 0.4 },
  { amp: 0.004, freq: 11, phase: 2.1 },
];

// Gentle wobble per chip so they read as soft rounded lumps, not perfect
// circles and not spiky stars.
const CHIPS = [
  { dx: -0.20, dy: -0.22, r: 0.085, harmonics: [{ amp: 0.12, freq: 4, phase: 0.3 }, { amp: 0.07, freq: 3, phase: 1.1 }] },
  { dx: 0.14, dy: -0.28, r: 0.07, harmonics: [{ amp: 0.11, freq: 3, phase: 2.0 }, { amp: 0.06, freq: 5, phase: 0.5 }] },
  { dx: 0.30, dy: -0.02, r: 0.075, harmonics: [{ amp: 0.13, freq: 4, phase: 1.4 }, { amp: 0.06, freq: 3, phase: 2.6 }] },
  { dx: -0.32, dy: 0.06, r: 0.065, harmonics: [{ amp: 0.11, freq: 3, phase: 3.0 }, { amp: 0.07, freq: 4, phase: 0.9 }] },
  { dx: -0.06, dy: 0.02, r: 0.08, harmonics: [{ amp: 0.12, freq: 4, phase: 0.8 }, { amp: 0.07, freq: 5, phase: 2.2 }] },
  { dx: 0.02, dy: 0.30, r: 0.07, harmonics: [{ amp: 0.11, freq: 3, phase: 1.8 }, { amp: 0.06, freq: 4, phase: 3.4 }] },
  { dx: -0.24, dy: 0.28, r: 0.06, harmonics: [{ amp: 0.12, freq: 4, phase: 0.2 }, { amp: 0.07, freq: 3, phase: 2.9 }] },
];

function drawIcon(size) {
  const canvas = new Canvas(size);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.44;

  // Soft elevation shadow (not a container — just a Material-style drop
  // shadow so the flat shapes don't look pasted onto the toolbar).
  canvas.paint(SHADOW, (x, y) => soft(sdBlob(x, y, cx, cy + size * 0.02, r, COOKIE_HARMONICS), size * 0.045) * 0.22);

  // Flat, single-tone cookie fill, with a very slightly jagged edge.
  canvas.paint(COOKIE, (x, y) => coverage(sdBlob(x, y, cx, cy, r, COOKIE_HARMONICS)));

  // Soft rounded chocolate-chip blobs, flat fill.
  for (const chip of CHIPS) {
    const chipCx = cx + chip.dx * size;
    const chipCy = cy + chip.dy * size;
    const chipR = chip.r * size;
    canvas.paint(CHIP, (x, y) => coverage(sdBlob(x, y, chipCx, chipCy, chipR, chip.harmonics)));
  }

  // --- chain-link glyph, bottom-right, no backing shape ---
  const linkCx = cx + size * 0.29;
  const linkCy = cy + size * 0.29;
  const ringHalfW = size * 0.135;
  const ringHalfH = size * 0.086;
  const ringRadius = ringHalfH;
  const ringThickness = size * 0.044;
  const offset = size * 0.066;

  const ring = (ox, oy, angle) => (x, y) =>
    coverage(sdRing(x, y, linkCx + ox, linkCy + oy, ringHalfW, ringHalfH, ringRadius, ringThickness, angle));

  // Back ring gets the darker flat tone so the two loops read as distinct,
  // interlocking pieces even without an outline.
  canvas.paint(CHAIN_SHADOW_TONE, ring(-offset, -offset * 0.4, Math.PI / 4));
  canvas.paint(CHAIN, ring(offset, offset * 0.4, Math.PI / 4));

  return canvas.toPNG();
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const png = drawIcon(size);
  const outPath = path.join(OUT_DIR, `icon${size}.png`);
  fs.writeFileSync(outPath, PNG.sync.write(png));
  console.log(`wrote ${outPath}`);
}
