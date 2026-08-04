import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { test, expect } from './fixtures';

// Distinct hostnames (not just distinct ports) are required here: cookies
// aren't port-scoped, so testing with two ports on the same host wouldn't
// actually exercise cross-domain copying.
const SOURCE_HOST = '127.0.0.1';
const TARGET_HOST = 'localhost';

function startServer(host: string): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = http.createServer((_req, res) => res.end('ok'));
    server.listen(0, host, () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, port });
    });
  });
}

test('clicking the action copies whitelisted cookies to the target domain and navigates there', async ({
  context,
  extensionId,
}) => {
  const [{ server: sourceServer, port: sourcePort }, { server: targetServer, port: targetPort }] = await Promise.all([
    startServer(SOURCE_HOST),
    startServer(TARGET_HOST),
  ]);

  try {
    const sourceUrl = `http://${SOURCE_HOST}:${sourcePort}/`;
    const targetOrigin = `http://${TARGET_HOST}:${targetPort}`;

    const optionsPage = await context.newPage();
    await optionsPage.goto(`chrome-extension://${extensionId}/src/options.html`);
    await optionsPage.waitForSelector('#settings-form');
    await optionsPage.check('input[name="cookieMode"][value="whitelist"]');
    await optionsPage.fill('#cookie-names', 'session_id');
    await optionsPage.fill('#target-url', targetOrigin);
    await optionsPage.uncheck('#open-new-tab');
    await optionsPage.click('#save-button');
    await expect(optionsPage.locator('#status')).toContainText('Saved');

    const sourcePage = await context.newPage();
    await sourcePage.goto(sourceUrl);
    await context.addCookies([
      { name: 'session_id', value: 'e2e-test-value', domain: SOURCE_HOST, path: '/', httpOnly: false, secure: false, sameSite: 'Lax' },
      { name: 'other_cookie', value: 'should-not-copy', domain: SOURCE_HOST, path: '/', httpOnly: false, secure: false, sameSite: 'Lax' },
    ]);
    await sourcePage.reload();

    let [sw] = context.serviceWorkers();
    if (!sw) sw = await context.waitForEvent('serviceworker');

    const result = await sw.evaluate(
      async ({ sourceUrlPattern, targetOrigin }) => {
        const tabs = await chrome.tabs.query({ url: sourceUrlPattern });
        const tab = tabs[0];
        if (!tab) throw new Error(`source tab not found: ${JSON.stringify(tabs)}`);
        if (typeof self.__cookieLinkHandleClick !== 'function') {
          throw new Error('self.__cookieLinkHandleClick is not exposed by background.ts');
        }
        await self.__cookieLinkHandleClick(tab);

        let updatedTab = await chrome.tabs.get(tab.id!);
        for (let i = 0; i < 20 && !updatedTab.url?.startsWith(targetOrigin); i++) {
          await new Promise((r) => setTimeout(r, 150));
          updatedTab = await chrome.tabs.get(tab.id!);
        }

        const targetCookies = await chrome.cookies.getAll({ url: `${targetOrigin}/` });
        return { finalUrl: updatedTab.url ?? '', targetCookies };
      },
      { sourceUrlPattern: `${sourceUrl}*`, targetOrigin }
    );

    expect(result.finalUrl.startsWith(targetOrigin)).toBe(true);
    const names = result.targetCookies.map((c) => c.name);
    expect(names).toContain('session_id');
    expect(names).not.toContain('other_cookie');
    expect(result.targetCookies.find((c) => c.name === 'session_id')?.value).toBe('e2e-test-value');
  } finally {
    sourceServer.close();
    targetServer.close();
  }
});
