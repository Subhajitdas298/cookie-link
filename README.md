# cookie-link

A Chrome extension that copies cookies from the active tab onto a target URL's
domain, then opens that URL — handy for pulling an auth session from a
deployed environment into a local dev server (or vice versa).

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

## Development

```sh
npm install
npm run generate-icons   # regenerate icons/*.png from scripts/generate-icons.js
npm run build             # builds the options UI, then produces dist/cookie-link-v<version>.zip
```

`package.json`'s `version` is the single source of truth; `npm run
sync-version` (run automatically by `build` and by `npm version`) copies it
into `manifest.json`.

### Options page (React + MUI)

The settings UI is written in React with [MUI](https://mui.com/) — source
lives in `options-src/` (`App.jsx`, `theme.js` for the custom brand-colored
theme). `npm run build:options` (part of `npm run build`) compiles it with
Vite into `src/options.html` + `src/options-assets/options.js`, which is
what `manifest.json`'s `options_ui.page` actually points at and what ships
in the extension.

Those compiled files are committed, the same way `icons/*.png` are —
loading this repo unpacked works without a build step. If you edit anything
under `options-src/`, run `npm run build:options` and commit the
regenerated `src/options.html` and `src/options-assets/` alongside it.
`npm run dev:options` starts a Vite dev server for iterating on layout, but
note `chrome.*` APIs (settings load/save) only exist inside an actual
loaded extension, so functional testing still means reloading the unpacked
extension in `chrome://extensions`.

## Releases

`.github/workflows/release.yml` runs on every push to `main`: it bumps the
patch version, pushes the version commit + tag, builds the zip, and
publishes a GitHub release with the zip attached. The version bump commit is
tagged `[skip ci]` so it doesn't retrigger itself. If the resulting version's
git tag already exists (e.g. it was created manually, or a previous run got
that far before failing), it keeps bumping the patch number until it finds
one that isn't taken, then builds and releases that version instead.

If the required secrets are configured, the same run also uploads and
publishes that build to the Chrome Web Store — see **[DEPLOY.md](DEPLOY.md)**
for the one-time setup (developer account, OAuth credentials, first manual
listing) and **[store/LISTING.md](store/LISTING.md)** /
**[store/PRIVACY.md](store/PRIVACY.md)** for the listing copy and privacy
policy used to fill out the Web Store dashboard.
