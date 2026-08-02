#!/usr/bin/env node
// Generates opaque Chrome Web Store promotional images (small tile and
// marquee) — the cookie glyph centered on a warm gradient background. CWS
// rejects transparency in these, unlike the toolbar icons, so the canvas is
// filled fully opaque before anything else is painted.
'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { Canvas, hex, linearGradient, coverage, sdRoundedRect } = require('./lib/raster');
const { drawCookieGlyph } = require('./lib/cookie-glyph');

const OUT_DIR = path.join(__dirname, '..', 'store', 'promo');

const BG_START = hex('#FFE1A8');
const BG_END = hex('#F4A94A');

const SIZES = [
  { name: 'small-tile-440x280.png', width: 440, height: 280 },
  { name: 'marquee-1400x560.png', width: 1400, height: 560 },
];

function drawPromo(width, height) {
  const canvas = new Canvas(width, height);

  const bgGradient = linearGradient(BG_START, BG_END, 0, 0, width, height);
  canvas.fillOpaque(bgGradient);

  // Faint rounded-square watermark behind the glyph for a bit of depth,
  // without introducing any transparency.
  const glyphSize = Math.min(width, height) * 0.72;
  const cx = width / 2;
  const cy = height / 2;
  const cardHalf = glyphSize * 0.62;
  const cardColor = hex('#FFFFFF');
  canvas.paint(cardColor, (x, y) => coverage(sdRoundedRect(x, y, cx, cy, cardHalf, cardHalf, cardHalf * 0.28)) * 0.14);

  drawCookieGlyph(canvas, { cx, cy, size: glyphSize });

  return canvas.toPNG();
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const { name, width, height } of SIZES) {
  const png = drawPromo(width, height);
  const outPath = path.join(OUT_DIR, name);
  fs.writeFileSync(outPath, PNG.sync.write(png));
  console.log(`wrote ${outPath}`);
}
