# Deploying to the Chrome Web Store

The release pipeline (`.github/workflows/release.yml`) already bumps the
patch version, builds `dist/cookie-link-v<version>.zip`, and creates a
GitHub release on every push to `main`. It will also upload and publish
that same zip to the Chrome Web Store automatically — but only once you've
done the one-time manual setup below, none of which can be automated
(it requires your Google account, a payment, and Google's own consent
flows).

## 1. Register a Chrome Web Store developer account

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Accept the developer agreement and pay the one-time $5 registration fee.
3. Note your **Publisher ID** — visible in the dashboard URL once you're in
   (`.../devconsole/<publisherId>/...`) or under the account's group
   settings. This is `CHROME_PUBLISHER_ID` below.

## 2. Create the store listing (first submission is manual)

The Chrome Web Store API can update an *existing* listing, but the first
version of a new extension has to be created through the dashboard UI:

1. `npm run build` locally to produce `dist/cookie-link-v<version>.zip`.
2. In the dashboard, **New item** → upload that zip.
3. Fill in the store listing using `store/LISTING.md` (summary, description,
   category, single-purpose statement, permission justifications) and
   `store/PRIVACY.md` (paste the text or link to it, if this repo is
   public, at
   `https://github.com/Subhajitdas298/cookie-link/blob/main/store/PRIVACY.md`).
4. Upload the screenshots in `store/screenshots/`.
5. Submit for review. First-time review can take anywhere from a few hours
   to a few days — extensions requesting `cookies` and broad host
   permissions get closer scrutiny, which is why `store/LISTING.md` spells
   out the justification for each one.
6. Once it's approved, note the **Extension ID** shown in the dashboard —
   that's `CHROME_EXTENSION_ID` below.

From here on, CI can push updates to this same listing.

## 3. Create OAuth credentials for the Chrome Web Store API

You need a Google Cloud OAuth `clientId`, `clientSecret`, and a
`refreshToken` authorized against your developer account. Follow
[fregante's chrome-webstore-upload-keys guide](https://github.com/fregante/chrome-webstore-upload-keys)
— it walks through enabling the Chrome Web Store API on a Google Cloud
project, creating an OAuth client, and minting the refresh token. That
guide is kept up to date with Google Cloud Console's UI, so it's linked
here rather than duplicated.

## 4. Add GitHub repository secrets

**Settings → Secrets and variables → Actions → New repository secret** —
add all five:

| Secret | Value |
| --- | --- |
| `CHROME_EXTENSION_ID` | from step 2 |
| `CHROME_PUBLISHER_ID` | from step 1 |
| `CHROME_CLIENT_ID` | from step 3 |
| `CHROME_CLIENT_SECRET` | from step 3 |
| `CHROME_REFRESH_TOKEN` | from step 3 |

## 5. Done — pushes to `main` now publish

The release job checks whether all five secrets are set. If any are
missing it logs a notice and skips the Chrome Web Store step without
failing the build (so the GitHub release side keeps working while you're
still setting this up). Once all five are present, every push to `main`
will:

1. Bump the patch version and tag it.
2. Build the zip.
3. Create a GitHub release with the zip attached.
4. Upload that zip to the Chrome Web Store and publish it
   (`DEFAULT_PUBLISH`, i.e. to all users).

Published updates still go through Google's review, but it's typically
much faster than the first submission once an extension is established.

## Manually running the publish step

```sh
npm run build
CHROME_EXTENSION_ID=... CHROME_PUBLISHER_ID=... CHROME_CLIENT_ID=... \
CHROME_CLIENT_SECRET=... CHROME_REFRESH_TOKEN=... \
npm run publish:chrome
```

## Regenerating store assets

- Icons: `npm run generate-icons` (edits `icons/*.png`, see
  `scripts/generate-icons.js`).
- Screenshots: there's no committed script for these (they're driven
  through a real, unpacked-extension Chromium session via
  `playwright-core`, which isn't a project dependency) — take fresh
  1280×800 screenshots of `src/options.html` any time the UI changes
  and replace the files in `store/screenshots/`.
