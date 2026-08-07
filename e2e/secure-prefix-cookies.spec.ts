import http from 'node:http';
import { test, expect } from './fixtures';

// Regression test: cookies named with the __Secure-/__Host- prefix are
// required BY THE BROWSER to always carry the Secure attribute, which is
// impossible on a plain http:// target (chrome.cookies.set() rejects
// Secure on non-https URLs). Many real auth libraries default to prefixed
// session cookies, and the default/typical target for this extension is a
// plain http://localhost dev server — so this combination is common, not
// an edge case. Before this test existed, a cookie like this failed
// completely silently: chrome.action.onClicked still fired, the tab still
// navigated, a badge still appeared, and nothing said why the cookie never
// showed up on the target.
const SOURCE_HOST = '127.0.0.1';
const TARGET_HOST = 'localhost';

function startServer(host: string): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = http.createServer((_req, res) => res.end('ok'));
    server.listen(0, host, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({ server, port });
    });
  });
}

test('a __Secure- cookie is skipped (not silently dropped) when the target is http, while a plain cookie still copies', async ({
  context,
  extensionId,
}) => {
  const [{ server: sourceServer, port: sourcePort }, { server: targetServer, port: targetPort }] = await Promise.all([
    startServer(SOURCE_HOST),
    startServer(TARGET_HOST),
  ]);

  try {
    const sourceUrl = `http://${SOURCE_HOST}:${sourcePort}/`;
    const targetOrigin = `http://${TARGET_HOST}:${targetPort}`; // deliberately http, not https

    const optionsPage = await context.newPage();
    await optionsPage.goto(`chrome-extension://${extensionId}/src/options.html`);
    await optionsPage.waitForSelector('#settings-form');
    await optionsPage.fill('#target-url', targetOrigin);
    await optionsPage.click('#save-button');
    await expect(optionsPage.locator('#status')).toContainText('Saved');

    const sourcePage = await context.newPage();
    await sourcePage.goto(sourceUrl);
    await context.addCookies([
      { name: '__Secure-session', value: 'should-not-copy-to-http-target', domain: SOURCE_HOST, path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
      { name: 'plain_session', value: 'copies-fine', domain: SOURCE_HOST, path: '/', httpOnly: false, secure: false, sameSite: 'Lax' },
    ]);
    await sourcePage.reload();

    let [sw] = context.serviceWorkers();
    if (!sw) sw = await context.waitForEvent('serviceworker');

    const result = await sw.evaluate(
      async ({ sourceUrlPattern, targetOrigin }) => {
        const tabs = await chrome.tabs.query({ url: sourceUrlPattern });
        const tab = tabs[0];
        if (!tab) throw new Error(`source tab not found: ${JSON.stringify(tabs)}`);

        const warnings: string[] = [];
        const originalWarn = console.warn;
        console.warn = (...args: unknown[]) => {
          warnings.push(args.map(String).join(' '));
          originalWarn(...args);
        };

        if (typeof self.__cookieLinkHandleClick !== 'function') {
          throw new Error('self.__cookieLinkHandleClick is not exposed by background.ts');
        }
        await self.__cookieLinkHandleClick(tab);
        console.warn = originalWarn;

        let updatedTab = await chrome.tabs.get(tab.id!);
        for (let i = 0; i < 20 && !updatedTab.url?.startsWith(targetOrigin); i++) {
          await new Promise((r) => setTimeout(r, 150));
          updatedTab = await chrome.tabs.get(tab.id!);
        }

        const targetCookies = await chrome.cookies.getAll({ url: `${targetOrigin}/` });
        return { finalUrl: updatedTab.url ?? '', targetCookies, warnings };
      },
      { sourceUrlPattern: `${sourceUrl}*`, targetOrigin }
    );

    // The click still completes and still navigates — a __Secure- cookie
    // isn't allowed to abort the whole operation, it's just one skipped item.
    expect(result.finalUrl.startsWith(targetOrigin)).toBe(true);

    const names = result.targetCookies.map((c) => c.name);
    expect(names).toContain('plain_session');
    expect(names).not.toContain('__Secure-session');

    // The important part: it's not silent. A specific, actionable warning
    // must be logged — not just Chrome's generic "failed to parse" error.
    expect(result.warnings.some((w) => w.includes('__Secure-session') && w.includes('require') && w.includes('Secure'))).toBe(
      true
    );
  } finally {
    sourceServer.close();
    targetServer.close();
  }
});
