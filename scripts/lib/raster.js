// Minimal signed-distance-field raster toolkit shared by the icon and promo
// image generators. Pure JS (no native canvas dependency) so it runs
// anywhere Node runs, including CI.
'use strict';

const { PNG } = require('pngjs');

function hex(str) {
  const n = parseInt(str.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
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

function linearGradient(colorA, colorB, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lenSq = dx * dx + dy * dy;
  return (x, y) => {
    const t = clamp(((x - x0) * dx + (y - y0) * dy) / lenSq, 0, 1);
    return lerpColor(colorA, colorB, t);
  };
}

// --- canvas --------------------------------------------------------------

class Canvas {
  constructor(width, height = width) {
    this.width = width;
    this.height = height;
    this.data = new Float64Array(width * height * 4);
  }

  // Fill fully opaque — use for canvases that must have no transparency
  // (Chrome Web Store promo tiles reject alpha).
  fillOpaque(color) {
    this.paint(typeof color === 'function' ? color : () => color, () => 1);
  }

  paint(color, alphaAt) {
    const { width, height, data } = this;
    const colorFn = typeof color === 'function' ? color : () => color;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const a = alphaAt(x + 0.5, y + 0.5);
        if (a <= 0) continue;
        const [r, g, b] = colorFn(x + 0.5, y + 0.5);
        const i = (y * width + x) * 4;
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
    const png = new PNG({ width: this.width, height: this.height });
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const i = (y * this.width + x) * 4;
        png.data[i] = Math.round(this.data[i]);
        png.data[i + 1] = Math.round(this.data[i + 1]);
        png.data[i + 2] = Math.round(this.data[i + 2]);
        png.data[i + 3] = Math.round(this.data[i + 3] * 255);
      }
    }
    return png;
  }
}

module.exports = {
  hex,
  clamp,
  lerp,
  lerpColor,
  sdCircle,
  sdBlob,
  sdRoundedRect,
  sdRoundedRectRot,
  sdRing,
  coverage,
  soft,
  linearGradient,
  Canvas,
};
