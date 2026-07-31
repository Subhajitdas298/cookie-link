// Shared settings schema/helpers used by both the background service worker
// and the options page.

export const COOKIE_MODES = Object.freeze({
  ALL: 'all',
  WHITELIST: 'whitelist',
  BLACKLIST: 'blacklist',
});

export const DEFAULT_SETTINGS = Object.freeze({
  cookieMode: COOKIE_MODES.ALL,
  cookieNames: [],
  targetUrl: 'http://localhost:5173',
  openInNewTab: false,
});

const STORAGE_KEY = 'cookieLinkSettings';

export async function getSettings() {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  return { ...DEFAULT_SETTINGS, ...(stored[STORAGE_KEY] || {}) };
}

export async function saveSettings(settings) {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  await chrome.storage.sync.set({ [STORAGE_KEY]: merged });
  return merged;
}

export function parseCookieNames(raw) {
  return raw
    .split(/[\n,]/)
    .map((name) => name.trim())
    .filter(Boolean);
}
