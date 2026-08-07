import { getSettings, COOKIE_MODES, type Settings } from './common/settings';

const BADGE_OK_COLOR = '#16A34A';
const BADGE_WARN_COLOR = '#D97706';
const BADGE_ERROR_COLOR = '#DC2626';
const BADGE_CLEAR_DELAY_MS = 2500;

chrome.action.onClicked.addListener((tab) => {
  handleClick(tab).catch((err) => {
    console.error('Cookie Link: failed to link cookies', err);
    flashBadge('!', BADGE_ERROR_COLOR);
  });
});

async function handleClick(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.url || !/^https?:\/\//.test(tab.url) || tab.id === undefined) {
    throw new Error('The active tab has no readable http(s) URL to copy cookies from.');
  }

  const settings = await getSettings();
  const targetUrl = normalizeTargetUrl(settings.targetUrl);

  const sourceCookies = await chrome.cookies.getAll({ url: tab.url });
  const filtered = filterCookies(sourceCookies, settings);

  const results = await Promise.all(filtered.map((cookie) => copyCookieToTarget(cookie, targetUrl)));
  await openTarget(targetUrl, settings.openInNewTab, tab.id);

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.length - succeeded;
  if (failed > 0) {
    console.warn(
      `Cookie Link: ${failed} of ${results.length} cookie(s) could not be copied — see warnings above for why each one failed.`
    );
    await flashBadge(String(succeeded), BADGE_WARN_COLOR);
  } else {
    await flashBadge(String(succeeded), BADGE_OK_COLOR);
  }
}

function filterCookies(cookies: chrome.cookies.Cookie[], settings: Settings): chrome.cookies.Cookie[] {
  const names = new Set(settings.cookieNames.map((n) => n.trim()).filter(Boolean));
  if (settings.cookieMode === COOKIE_MODES.WHITELIST) {
    return cookies.filter((cookie) => names.has(cookie.name));
  }
  if (settings.cookieMode === COOKIE_MODES.BLACKLIST) {
    return cookies.filter((cookie) => !names.has(cookie.name));
  }
  return cookies;
}

function normalizeTargetUrl(raw: string): URL {
  const trimmed = raw.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  return new URL(withProtocol);
}

interface CopyResult {
  ok: boolean;
}

// Cookies named with the __Secure- or __Host- prefix are required by the
// browser (not by us) to always carry Secure — and __Host- additionally
// requires Path=/ and no Domain. There's no way to copy such a cookie onto
// an http:// target; downgrading `secure` for it just makes chrome.cookies.set
// reject it outright. Recognizing this upfront turns a silent per-cookie
// failure into one clear, specific warning instead of a generic Chrome error.
function securePrefixBlocker(cookie: chrome.cookies.Cookie, secure: boolean): string | null {
  if (cookie.name.startsWith('__Host-')) {
    if (!secure) return '"__Host-" cookies require Secure, but the target is not HTTPS';
    if (cookie.path !== '/') return `"__Host-" cookies require Path=/, but this cookie's path is "${cookie.path}"`;
    return null;
  }
  if (cookie.name.startsWith('__Secure-') && !secure) {
    return '"__Secure-" cookies require Secure, but the target is not HTTPS';
  }
  return null;
}

async function copyCookieToTarget(cookie: chrome.cookies.Cookie, targetUrl: URL): Promise<CopyResult> {
  const secure = cookie.secure && targetUrl.protocol === 'https:';

  const blocker = securePrefixBlocker(cookie, secure);
  if (blocker) {
    console.warn(`Cookie Link: could not copy cookie "${cookie.name}" — ${blocker}. Use an HTTPS target to receive it.`);
    return { ok: false };
  }

  let sameSite = cookie.sameSite;
  if (sameSite === 'no_restriction' && !secure) {
    // A cookie can't be SameSite=None without Secure; downgrade rather than fail.
    sameSite = 'lax';
  }

  const details: chrome.cookies.SetDetails = {
    url: `${targetUrl.protocol}//${targetUrl.hostname}${cookie.path}`,
    name: cookie.name,
    value: cookie.value,
    path: cookie.path,
    secure,
    httpOnly: cookie.httpOnly,
    sameSite,
    storeId: cookie.storeId,
  };
  if (!cookie.session && cookie.expirationDate) {
    details.expirationDate = cookie.expirationDate;
  }

  try {
    await chrome.cookies.set(details);
    return { ok: true };
  } catch (err) {
    console.warn(`Cookie Link: could not set cookie "${cookie.name}" on ${targetUrl.hostname}`, err);
    return { ok: false };
  }
}

async function openTarget(targetUrl: URL, openInNewTab: boolean, currentTabId: number): Promise<void> {
  const href = targetUrl.toString();
  if (openInNewTab) {
    await chrome.tabs.create({ url: href });
  } else {
    await chrome.tabs.update(currentTabId, { url: href });
  }
}

async function flashBadge(text: string, color: string): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, BADGE_CLEAR_DELAY_MS);
}

// Exposed for the Playwright E2E suite only (dynamic import() is disallowed
// inside a service worker, so tests drive the click handler through this
// global instead of re-importing the module). Nothing else reads this.
declare global {
  // eslint-disable-next-line no-var
  var __cookieLinkHandleClick: ((tab: chrome.tabs.Tab) => Promise<void>) | undefined;
}
self.__cookieLinkHandleClick = handleClick;
