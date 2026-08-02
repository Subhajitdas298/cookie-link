// Shared fixture for testing the unpacked extension: launches a persistent
// Chromium context with it loaded, and resolves the extension's runtime ID
// from its service worker. Extensions currently require headed Chromium
// (`headless: false`) even under Playwright's "new" headless mode — run
// this under `xvfb-run` in CI/headless environments.
import { test as base, chromium, type BrowserContext } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '..');

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-cookie-link-'));
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      // Only set when developing in an environment with a pre-cached browser
      // that doesn't match this Playwright version's expected revision; CI
      // always installs the matching browser via `playwright install`, so
      // this stays unset there and Playwright resolves it automatically.
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
      ],
    });
    await use(context);
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  },

  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker', { timeout: 15_000 });
    }
    const extensionId = background.url().split('/')[2]!;
    await use(extensionId);
  },
});

export const expect = test.expect;
