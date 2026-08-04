#!/usr/bin/env -S npx tsx
// Packages the unpacked extension (manifest.json + icons/ + src/) into a
// versioned zip under dist/, ready to upload to the Chrome Web Store or
// attach to a GitHub release.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')) as { version: string };

const zipName = `cookie-link-v${manifest.version}.zip`;
const zipPath = path.join(DIST_DIR, zipName);

fs.rmSync(DIST_DIR, { recursive: true, force: true });
fs.mkdirSync(DIST_DIR, { recursive: true });

execFileSync('zip', ['-r', zipPath, 'manifest.json', 'icons', 'src'], {
  cwd: ROOT,
  stdio: 'inherit',
});

console.log(`Built ${path.relative(ROOT, zipPath)}`);
