import { getSettings, COOKIE_MODES } from './common/settings.js';

const BADGE_OK_COLOR = '#16A34A';
const BADGE_ERROR_COLOR = '#DC2626';
const BADGE_CLEAR_DELAY_MS = 2500;

chrome.action.onClicked.addListener((tab) => {
  handleClick(tab).catch((err) => {
    console.error('Cookie Link: failed to link cookies', err);
    flashBadge('!', BADGE_ERROR_COLOR);
  });
});

async function handleClick(tab) {
  if (!tab || !tab.url || !/^https?:\/\//.test(tab.url)) {
    throw new Error('The active tab has no readable http(s) URL to copy cookies from.');
  }

  const settings = await getSettings();
  const targetUrl = normalizeTargetUrl(settings.targetUrl);

  const sourceCookies = await chrome.cookies.getAll({ url: tab.url });
  const filtered = filterCookies(sourceCookies, settings);

  await Promise.all(filtered.map((cookie) => copyCookieToTarget(cookie, targetUrl)));
  await openTarget(targetUrl, settings.openInNewTab, tab);

  flashBadge(String(filtered.length), BADGE_OK_COLOR);
}

function filterCookies(cookies, settings) {
  const names = new Set((settings.cookieNames || []).map((n) => n.trim()).filter(Boolean));
  if (settings.cookieMode === COOKIE_MODES.WHITELIST) {
    return cookies.filter((cookie) => names.has(cookie.name));
  }
  if (settings.cookieMode === COOKIE_MODES.BLACKLIST) {
    return cookies.filter((cookie) => !names.has(cookie.name));
  }
  return cookies;
}

function normalizeTargetUrl(raw) {
  const trimmed = (raw || '').trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  return new URL(withProtocol);
}

async function copyCookieToTarget(cookie, targetUrl) {
  const secure = cookie.secure && targetUrl.protocol === 'https:';
  let sameSite = cookie.sameSite;
  if (sameSite === 'no_restriction' && !secure) {
    // A cookie can't be SameSite=None without Secure; downgrade rather than fail.
    sameSite = 'lax';
  }

  const details = {
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
  } catch (err) {
    console.warn(`Cookie Link: could not set cookie "${cookie.name}" on ${targetUrl.hostname}`, err);
  }
}

async function openTarget(targetUrl, openInNewTab, currentTab) {
  const href = targetUrl.toString();
  if (openInNewTab) {
    await chrome.tabs.create({ url: href });
  } else {
    await chrome.tabs.update(currentTab.id, { url: href });
  }
}

async function flashBadge(text, color) {
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, BADGE_CLEAR_DELAY_MS);
}
