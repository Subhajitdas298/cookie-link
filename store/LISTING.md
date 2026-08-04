# Chrome Web Store listing content

Copy-paste source for the Developer Dashboard's "Store listing" and
"Privacy practices" tabs. Character limits noted are the Web Store's.

## Product details

**Extension name** (≤ 45 chars)
```
Cookie Link
```

**Summary** (≤ 132 chars, shown in search results)
```
Copy cookies from the current tab to a target URL's domain, then open it. Great for pulling a session into local dev.
```

**Category**
```
Developer Tools
```

**Language**
```
English (United States)
```

## Description (long form)

```
Cookie Link copies cookies from whatever tab you're on onto a target URL's
domain, then opens that URL — a one-click way to carry an authenticated
session from a deployed environment into a local dev server (or between any
two domains you choose).

HOW IT WORKS
Click the toolbar icon and Cookie Link:
1. Reads the cookies visible to your current tab.
2. Filters them per your settings — all cookies, only a whitelist of names,
   or everything except a blacklist of names.
3. Sets each filtered cookie on your configured target domain.
4. Opens the target URL, either in the current tab or a new one.

SETTINGS
- Cookie filter: all / whitelist / blacklist, with a name list for the
  latter two.
- Target URL (defaults to http://localhost:5173, but it's whatever you set).
- Open in a new tab, or reuse the current tab (your choice).

PRIVACY
Cookie Link runs entirely inside your browser. It has no backend, sends
nothing to any server, and includes no analytics or tracking. Cookies are
copied directly through Chrome's own cookie APIs — the extension's code
never stores a copy of a cookie's value anywhere beyond that. Full privacy
policy: https://github.com/Subhajitdas298/cookie-link/blob/main/store/PRIVACY.md

OPEN SOURCE
https://github.com/Subhajitdas298/cookie-link
```

## Single purpose statement

(CWS review asks for this — one or two sentences describing the extension's
one purpose, used to check the requested permissions aren't overreaching.)

```
Cookie Link's single purpose is to copy cookies from the user's active tab
onto a user-configured target URL's domain and then open that URL, so a
developer can carry a browser session between two domains (e.g. production
and a local dev server) with one click.
```

## Permission justifications

Paste these into the corresponding fields on the "Permissions" step of the
CWS review/publish flow.

**`cookies`**
```
Required to read the cookies present on the user's active tab and to write
the filtered subset onto the user-configured target domain — this is the
extension's core (and only) function.
```

**`activeTab`**
```
Used to identify which tab's cookies to read when the user clicks the
toolbar icon, and to navigate that same tab to the target URL afterward
(when "open in a new tab" is left unchecked).
```

**`storage`**
```
Used to persist the user's settings (cookie filter mode, cookie name list,
target URL, open-in-new-tab preference) via chrome.storage.sync, so they
don't have to be re-entered every session.
```

**Host permission (`<all_urls>`)**
```
Cookie Link's purpose is copying cookies between two arbitrary domains
chosen by the user (the active tab's domain and a configurable target
domain). Since either can be any site, the extension needs host access to
all URLs — there's no fixed, smaller set of domains that would work,
because the whole point is letting the user pick both endpoints themselves.
```

**Remote code**
```
This extension does not execute any remote code. All logic ships in the
extension package; there are no eval(), remotely fetched scripts, or WASM
blobs pulled from a server.
```

## Data usage (Privacy practices tab)

- **Does your extension collect or use user data?** — cookies (classified
  as "Website content" / "Authentication information" depending on the
  form's exact wording).
- **Is it sold to third parties?** — No.
- **Is it used for purposes unrelated to the extension's core
  functionality?** — No.
- **Is it used to determine creditworthiness or for lending purposes?** —
  No.
- **Privacy policy URL** —
  `https://github.com/Subhajitdas298/cookie-link/blob/main/store/PRIVACY.md`
  (repo must be public for this link to be reachable by reviewers; the
  policy text can also be pasted directly into the dashboard if you'd
  rather not rely on that).

## Screenshots

`store/screenshots/screenshot-1-settings-light.png` and
`screenshot-2-settings-dark.png` (1280×800, generated from the real options
page). Regenerate any time the UI changes with a Playwright script driving
the unpacked extension — see `DEPLOY.md`.

## Promotional images (optional — only needed for featured placement)

`store/promo/small-tile-440x280.png` and `store/promo/marquee-1400x560.png`,
both opaque (Chrome Web Store rejects transparency in these). Regenerate
with `npm run generate-promo-images` any time the icon/brand look changes —
see `scripts/generate-promo-images.ts`.
