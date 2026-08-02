import { test, expect } from './fixtures';

test.describe('options page', () => {
  test('shows the documented defaults', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/options.html`);
    await page.waitForSelector('#settings-form');

    await expect(page.locator('input[name="cookieMode"][value="all"]')).toBeChecked();
    await expect(page.locator('#target-url')).toHaveValue('http://localhost:5173');
    await expect(page.locator('#open-new-tab')).not.toBeChecked();
    await expect(page.locator('#cookie-names')).toBeDisabled();
  });

  test('enables the cookie-names field only in whitelist/blacklist mode', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/options.html`);
    await page.waitForSelector('#settings-form');

    await expect(page.locator('#cookie-names')).toBeDisabled();

    await page.check('input[name="cookieMode"][value="whitelist"]');
    await expect(page.locator('#cookie-names')).toBeEnabled();

    await page.check('input[name="cookieMode"][value="blacklist"]');
    await expect(page.locator('#cookie-names')).toBeEnabled();

    await page.check('input[name="cookieMode"][value="all"]');
    await expect(page.locator('#cookie-names')).toBeDisabled();
  });

  test('saves settings and persists them across a reload', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/options.html`);
    await page.waitForSelector('#settings-form');

    await page.check('input[name="cookieMode"][value="whitelist"]');
    await page.fill('#cookie-names', 'session_id\nauth_token');
    await page.fill('#target-url', 'http://127.0.0.1:6100');
    await page.check('#open-new-tab');
    await page.click('#save-button');

    await expect(page.locator('#status')).toContainText('Saved');

    await page.reload();
    await page.waitForSelector('#settings-form');

    await expect(page.locator('input[name="cookieMode"][value="whitelist"]')).toBeChecked();
    await expect(page.locator('#cookie-names')).toHaveValue('session_id\nauth_token');
    await expect(page.locator('#target-url')).toHaveValue('http://127.0.0.1:6100');
    await expect(page.locator('#open-new-tab')).toBeChecked();
  });

  test('loads with no console errors', async ({ context, extensionId }) => {
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));

    await page.goto(`chrome-extension://${extensionId}/src/options.html`);
    await page.waitForSelector('#settings-form');
    await page.waitForTimeout(300);

    expect(errors).toEqual([]);
  });
});
