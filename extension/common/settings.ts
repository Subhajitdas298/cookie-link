// Shared settings schema/helpers used by both the background service worker
// and the options page.

export const COOKIE_MODES = {
  ALL: 'all',
  WHITELIST: 'whitelist',
  BLACKLIST: 'blacklist',
} as const;

export type CookieMode = (typeof COOKIE_MODES)[keyof typeof COOKIE_MODES];

export interface Settings {
  cookieMode: CookieMode;
  cookieNames: string[];
  targetUrl: string;
  openInNewTab: boolean;
}

export const DEFAULT_SETTINGS: Settings = Object.freeze({
  cookieMode: COOKIE_MODES.ALL,
  cookieNames: [],
  targetUrl: 'http://localhost:5173',
  openInNewTab: false,
});

const STORAGE_KEY = 'cookieLinkSettings';

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  return { ...DEFAULT_SETTINGS, ...((stored[STORAGE_KEY] as Partial<Settings>) || {}) };
}

export async function saveSettings(settings: Partial<Settings>): Promise<Settings> {
  const merged: Settings = { ...DEFAULT_SETTINGS, ...settings };
  await chrome.storage.sync.set({ [STORAGE_KEY]: merged });
  return merged;
}

export function parseCookieNames(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((name) => name.trim())
    .filter(Boolean);
}
