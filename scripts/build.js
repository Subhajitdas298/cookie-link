#!/usr/bin/env node
// Packages the unpacked extension (manifest.json + icons/ + src/) into a
// versioned zip under dist/, ready to upload to the Chrome Web Store or
// attach to a GitHub release.
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

const zipName = `cookie-link-v${manifest.version}.zip`;
const zipPath = path.join(DIST_DIR, zipName);

fs.rmSync(DIST_DIR, { recursive: true, force: true });
fs.mkdirSync(DIST_DIR, { recursive: true });

execFileSync('zip', ['-r', zipPath, 'manifest.json', 'icons', 'src'], {
  cwd: ROOT,
  stdio: 'inherit',
});

console.log(`Built ${path.relative(ROOT, zipPath)}`);
