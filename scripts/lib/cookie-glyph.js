// Draws the Cookie Link glyph (flat cookie + jagged chip blobs + chain-link)
// onto an existing canvas, centered at (cx, cy) and scaled to `size`. Shared
// between the toolbar icon generator and the store promo image generator so
// both stay visually identical.
'use strict';

const { hex, sdCircle, sdBlob, sdRing, coverage, soft } = require('./raster');

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

/**
 * @param {import('./raster').Canvas} canvas
 * @param {{cx: number, cy: number, size: number, shadow?: boolean}} opts
 *   `size` is the glyph's full width/height (matches the icon generator's
 *   `size` parameter — the cookie radius is 0.44 * size, as before).
 */
function drawCookieGlyph(canvas, { cx, cy, size, shadow = true }) {
  const r = size * 0.44;

  if (shadow) {
    canvas.paint(SHADOW, (x, y) => soft(sdBlob(x, y, cx, cy + size * 0.02, r, COOKIE_HARMONICS), size * 0.045) * 0.22);
  }

  canvas.paint(COOKIE, (x, y) => coverage(sdBlob(x, y, cx, cy, r, COOKIE_HARMONICS)));

  for (const chip of CHIPS) {
    const chipCx = cx + chip.dx * size;
    const chipCy = cy + chip.dy * size;
    const chipR = chip.r * size;
    canvas.paint(CHIP, (x, y) => coverage(sdBlob(x, y, chipCx, chipCy, chipR, chip.harmonics)));
  }

  const linkCx = cx + size * 0.29;
  const linkCy = cy + size * 0.29;
  const ringHalfW = size * 0.135;
  const ringHalfH = size * 0.086;
  const ringRadius = ringHalfH;
  const ringThickness = size * 0.044;
  const offset = size * 0.066;

  const ring = (ox, oy, angle) => (x, y) =>
    coverage(sdRing(x, y, linkCx + ox, linkCy + oy, ringHalfW, ringHalfH, ringRadius, ringThickness, angle));

  canvas.paint(CHAIN_SHADOW_TONE, ring(-offset, -offset * 0.4, Math.PI / 4));
  canvas.paint(CHAIN, ring(offset, offset * 0.4, Math.PI / 4));
}

module.exports = { drawCookieGlyph };
