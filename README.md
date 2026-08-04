# cookie-link

A Chrome extension that copies cookies from the active tab onto a target URL's
domain, then opens that URL — handy for pulling an auth session from a
deployed environment into a local dev server (or vice versa).

Written entirely in TypeScript (extension code, build tooling, and tests).

## What it does

Click the toolbar icon and the extension:

1. Reads the cookies visible to the current active tab.
2. Filters them according to your settings (all / whitelist / blacklist).
3. Sets each filtered cookie on the configured target URL's domain.
4. Opens the target URL — either in the current tab or a new one.

The toolbar icon shows a badge with the number of cookies copied (or `!` on
failure — check the service worker console via `chrome://extensions` for
details).

## Settings

Right-click the icon → **Options** (or open it from `chrome://extensions`):

| Setting | Default | Notes |
| --- | --- | --- |
| Cookie filter | All | All cookies, a whitelist, or a blacklist of names |
| Cookie names | _(empty)_ | One per line or comma-separated; used by whitelist/blacklist |
| Target URL | `http://localhost:5173` | Protocol is optional; `http://` is assumed |
| Open in new tab | Off | Off reuses/navigates the current tab |

Settings are stored with `chrome.storage.sync` (synced across the user's
signed-in Chrome instances).

## Installing (unpacked)

1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select this repository's root folder (the one with
   `manifest.json`).

No build step needed to do this — see below.

## Project layout

```
extension/            TypeScript source — this is what you actually edit
  background.ts        service worker: the click → copy-cookies → navigate logic
  common/settings.ts    shared settings schema + chrome.storage helpers
  options/              the options page (React + MUI)
    App.tsx, main.tsx, theme.ts, options.html

src/                  BUILD OUTPUT — committed, like icons/*.png, generated
                       by `npm run build:options`. Never hand-edit this;
                       manifest.json points here because it's what actually
                       ships, but the source of truth is extension/.
  background.js
  options.html
  options-assets/

scripts/              Build/tooling scripts (TypeScript, run via `tsx`)
e2e/                   Playwright E2E tests (TypeScript)
icons/                 Generated toolbar icons (npm run generate-icons)
store/                 Chrome Web Store listing copy, privacy policy, promo images
```

## Development

```sh
npm install
npm run typecheck        # tsc --noEmit across extension/, scripts/, e2e/
npm run generate-icons    # regenerate icons/*.png from scripts/generate-icons.ts
npm run build              # typecheck, build the options UI, produce dist/cookie-link-v<version>.zip
```

`package.json`'s `version` is the single source of truth; `npm run
sync-version` (run automatically by `build` and by `npm version`) copies it
into `manifest.json`.

### Options page (React + MUI)

The settings UI is written in React + TypeScript with [MUI](https://mui.com/)
— source lives in `extension/options/` (`App.tsx`, `theme.ts` for the custom
brand-colored theme). `npm run build:options` (part of `npm run build`)
compiles **both** `extension/options/options.html` and
`extension/background.ts` with Vite in one pass into `src/` — a single
`vite.config.ts` handles the HTML entry (options page) and the plain-script
entry (service worker) together, since a service worker can't execute raw
TypeScript.

The compiled `src/` output is committed, the same way `icons/*.png` are —
loading this repo unpacked works without a build step. If you edit anything
under `extension/`, run `npm run build:options` and commit the regenerated
`src/` alongside it. `npm run dev:options` starts a Vite dev server for
iterating on layout, but note `chrome.*` APIs (settings load/save) only
exist inside an actual loaded extension, so functional testing still means
reloading the unpacked extension in `chrome://extensions` — or running the
E2E suite (below).

The bundle deliberately avoids MUI's `TextField` in favor of
`OutlinedInput` + `InputLabel` — `TextField` statically imports `Select`
(and everything `Select` needs: `Popover`, `MenuList`, `Modal`,
`FocusTrap`), so using it at all pulls in a dropdown menu's worth of code
none of these fields need, even though nothing here renders a dropdown.
That swap alone cut the compiled bundle by about 12% (~380KB / ~120KB
gzipped, down from ~433KB / ~135KB). Compare
`src/options-assets/options.js`'s size before reintroducing `TextField`
anywhere in `extension/`.

## Testing (Playwright E2E)

```sh
npm run build:options          # e2e loads the built extension, so build first
npx playwright install --with-deps chromium   # one-time, fetches a matching browser
npm run test:e2e
```

Chrome extensions currently need headed Chromium even under Playwright's
"new" headless mode, so on a machine without a display run it under `xvfb`:

```sh
xvfb-run -a npm run test:e2e
```

`e2e/fixtures.ts` launches a real, fresh Chromium profile per test with this
repo loaded as an unpacked extension (`--load-extension`) and resolves the
extension's runtime ID from its service worker — the same approach
[Playwright's own docs](https://playwright.dev/docs/chrome-extensions)
recommend. `e2e/options.spec.ts` covers the settings page (defaults, the
whitelist field's enable/disable behavior, save/persist across reload, no
console errors); `e2e/cookie-copy.spec.ts` drives the actual background
click → copy → navigate flow end-to-end across two real local HTTP servers
on different hostnames (cookies aren't port-scoped, so same-host-different-port
wouldn't actually test cross-domain copying) — since a service worker can't
be clicked via the UI in automation, it calls the click handler through
`self.__cookieLinkHandleClick`, a hook `background.ts` exposes solely for
this test suite.

The E2E suite runs in CI on every push to `main` (`.github/workflows/release.yml`'s
`test` job) and gates the release job — a failing test blocks the version
bump, GitHub release, and Chrome Web Store publish.

## Releases

`.github/workflows/release.yml` runs on every push to `main`. First the
`test` job type-checks, builds the options page, and runs the full
Playwright E2E suite; only if that passes does the `release` job bump the
patch version, push the version commit + tag, build the zip, and publish a
GitHub release with it attached. The version bump commit is tagged
`[skip ci]` so it doesn't retrigger itself. If the resulting version's git
tag already exists (e.g. it was created manually, or a previous run got
that far before failing), it keeps bumping the patch number until it finds
one that isn't taken, then builds and releases that version instead.

If the required secrets are configured, the same run also uploads and
publishes that build to the Chrome Web Store — see **[DEPLOY.md](DEPLOY.md)**
for the one-time setup (developer account, OAuth credentials, first manual
listing) and **[store/LISTING.md](store/LISTING.md)** /
**[store/PRIVACY.md](store/PRIVACY.md)** for the listing copy and privacy
policy used to fill out the Web Store dashboard.
