#!/usr/bin/env -S npx tsx
// Uploads the built zip to the Chrome Web Store and publishes it. Meant to
// run in CI after `npm run build`. Requires CHROME_EXTENSION_ID,
// CHROME_PUBLISHER_ID, CHROME_CLIENT_ID, CHROME_CLIENT_SECRET, and
// CHROME_REFRESH_TOKEN in the environment — see DEPLOY.md for how to get
// them. Exits non-zero (without publishing anything) if any are missing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chromeWebstoreUpload from 'chrome-webstore-upload';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REQUIRED_ENV = [
  'CHROME_EXTENSION_ID',
  'CHROME_PUBLISHER_ID',
  'CHROME_CLIENT_ID',
  'CHROME_CLIENT_SECRET',
  'CHROME_REFRESH_TOKEN',
] as const;

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(', ')}. See DEPLOY.md.`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')) as { version: string };
const zipPath = path.join(__dirname, '..', 'dist', `cookie-link-v${pkg.version}.zip`);

if (!fs.existsSync(zipPath)) {
  console.error(`Build zip not found at ${zipPath}. Run "npm run build" first.`);
  process.exit(1);
}

const store = chromeWebstoreUpload({
  extensionId: process.env.CHROME_EXTENSION_ID!,
  publisherId: process.env.CHROME_PUBLISHER_ID!,
  clientId: process.env.CHROME_CLIENT_ID!,
  clientSecret: process.env.CHROME_CLIENT_SECRET!,
  refreshToken: process.env.CHROME_REFRESH_TOKEN!,
});

(async () => {
  const token = await store.fetchToken();

  console.log(`Uploading ${path.basename(zipPath)}...`);
  const uploadResult = await store.uploadExisting(fs.createReadStream(zipPath), token);
  if (uploadResult.uploadState === 'FAILED' || uploadResult.uploadState === 'NOT_FOUND') {
    throw new Error(`Upload failed: ${JSON.stringify(uploadResult)}`);
  }

  console.log('Publishing...');
  await store.publish('DEFAULT_PUBLISH', token);

  console.log(`Published v${pkg.version} to the Chrome Web Store.`);
})().catch((err: unknown) => {
  console.error('Chrome Web Store publish failed:', err);
  process.exit(1);
});
