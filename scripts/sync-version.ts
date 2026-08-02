#!/usr/bin/env -S npx tsx
// Keeps manifest.json's "version" in sync with package.json, which is the
// single source of truth for the extension's version number.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pkgPath = path.join(__dirname, '..', 'package.json');
const manifestPath = path.join(__dirname, '..', 'manifest.json');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version: string };
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { version: string; [key: string]: unknown };

if (manifest.version !== pkg.version) {
  manifest.version = pkg.version;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`manifest.json version synced to ${pkg.version}`);
} else {
  console.log(`manifest.json already at version ${pkg.version}`);
}
