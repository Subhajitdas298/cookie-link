import http from 'node:http';
import { test, expect } from './fixtures';

// Verifies the actual ask: with zero configuration (never opening the
// options page), clicking the toolbar icon while sitting on the source
// page copies its cookies and navigates that same tab to the real default
// target (http://localhost:5173) — not a stand-in port, the literal
// documented default. Distinct hostnames because cookies aren't
// port-scoped, same as the other cookie-copy test.
const SOURCE_HOST = '127.0.0.1';
const TARGET_HOST = 'localhost';
const TARGET_PORT = 5173;
const TARGET_ORIGIN = `http://${TARGET_HOST}:${TARGET_PORT}`;

function startServer(host: string, port = 0): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((_req, res) => res.end('ok'));
    server.on('error', reject);
    server.listen(port, host, () => {
      const address = server.address();
      const boundPort = typeof address === 'object' && address ? address.port : port;
      resolve({ server, port: boundPort });
    });
  });
}

test('clicking the icon with no settings ever configured copies all cookies to the default target and navigates in place', async ({
  context,
  extensionId,
}) => {
  const [{ server: sourceServer, port: sourcePort }, { server: targetServer }] = await Promise.all([
    startServer(SOURCE_HOST),
    startServer(TARGET_HOST, TARGET_PORT),
  ]);

  try {
    const sourceUrl = `http://${SOURCE_HOST}:${sourcePort}/`;

    // Deliberately never opens chrome-extension://<id>/src/options.html —
    // this is the fresh-install path, exercising getSettings()'s defaults
    // (cookieMode: 'all', targetUrl: 'http://localhost:5173',
    // openInNewTab: false) rather than anything explicitly saved.
    const sourcePage = await context.newPage();
    await sourcePage.goto(sourceUrl);
    const originalTabCount = context.pages().length;

    await context.addCookies([
      { name: 'session_id', value: 'default-flow-value', domain: SOURCE_HOST, path: '/', httpOnly: false, secure: false, sameSite: 'Lax' },
      { name: 'another_cookie', value: 'also-copied-under-default-all-mode', domain: SOURCE_HOST, path: '/', httpOnly: false, secure: false, sameSite: 'Lax' },
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

        // This is the actual user action: click the toolbar icon while
        // sitting on the source tab. No prior setup beyond that.
        await self.__cookieLinkHandleClick(tab);

        let updatedTab = await chrome.tabs.get(tab.id!);
        for (let i = 0; i < 20 && !updatedTab.url?.startsWith(targetOrigin); i++) {
          await new Promise((r) => setTimeout(r, 150));
          updatedTab = await chrome.tabs.get(tab.id!);
        }

        const targetCookies = await chrome.cookies.getAll({ url: `${targetOrigin}/` });
        return { finalTabId: updatedTab.id, finalUrl: updatedTab.url ?? '', targetCookies, sourceTabId: tab.id };
      },
      { sourceUrlPattern: `${sourceUrl}*`, targetOrigin: TARGET_ORIGIN }
    );

    // Same tab navigated (default openInNewTab: false) — not a new one.
    expect(result.finalTabId).toBe(result.sourceTabId);
    expect(result.finalUrl.startsWith(TARGET_ORIGIN)).toBe(true);
    expect(context.pages().length).toBe(originalTabCount);

    // Default mode is "all": both cookies land on the target, no filtering.
    const names = result.targetCookies.map((c) => c.name).sort();
    expect(names).toEqual(['another_cookie', 'session_id']);
    expect(result.targetCookies.find((c) => c.name === 'session_id')?.value).toBe('default-flow-value');
  } finally {
    sourceServer.close();
    targetServer.close();
  }
});
