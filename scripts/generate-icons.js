#!/usr/bin/env node
// Generates the extension's toolbar icons at every size Chrome needs, using
// the shared cookie glyph (see scripts/lib/cookie-glyph.js) on a transparent
// canvas.
'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { Canvas } = require('./lib/raster');
const { drawCookieGlyph } = require('./lib/cookie-glyph');

const SIZES = [16, 32, 48, 128];
const OUT_DIR = path.join(__dirname, '..', 'icons');

function drawIcon(size) {
  const canvas = new Canvas(size);
  drawCookieGlyph(canvas, { cx: size / 2, cy: size / 2, size });
  return canvas.toPNG();
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const png = drawIcon(size);
  const outPath = path.join(OUT_DIR, `icon${size}.png`);
  fs.writeFileSync(outPath, PNG.sync.write(png));
  console.log(`wrote ${outPath}`);
}
