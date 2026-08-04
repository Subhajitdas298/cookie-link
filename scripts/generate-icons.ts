#!/usr/bin/env -S npx tsx
// Generates the extension's toolbar icons at every size Chrome needs, using
// the shared cookie glyph (see scripts/lib/cookie-glyph.ts) on a transparent
// canvas.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { Canvas } from './lib/raster';
import { drawCookieGlyph } from './lib/cookie-glyph';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SIZES = [16, 32, 48, 128];
const OUT_DIR = path.join(__dirname, '..', 'icons');

function drawIcon(size: number): PNG {
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
