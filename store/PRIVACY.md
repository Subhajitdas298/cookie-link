# Cookie Link — Privacy Policy

_Last updated: 2026-08-02_

Cookie Link is a developer tool. It does not collect, transmit, or sell any
data to the developer, to Google, or to any third party. Everything it does
happens locally inside your browser.

## What the extension can access

Cookie Link requests the `cookies`, `storage`, `activeTab`, and broad host
(`<all_urls>`) permissions. Here's exactly what each is used for:

- **`cookies`** — to read the cookies of the tab you're currently on and to
  write them onto the domain you've configured as your target, when you
  click the toolbar icon.
- **`activeTab`** — to know which tab's cookies to copy, and to navigate
  that tab to the target URL, on the click that triggers the extension.
- **`storage`** (`chrome.storage.sync`) — to save your settings (cookie
  filter mode, cookie name list, target URL, open-in-new-tab preference) so
  they persist across browser sessions and, if you're signed into Chrome,
  sync across your devices via Google's own sync infrastructure. This data
  never passes through any server operated by the extension's developer.
- **`<all_urls>` host permission** — cookies are domain-specific, and the
  whole point of this extension is copying a cookie from whatever site
  you're on to whatever target URL you've configured (commonly a local dev
  server, but it's your choice). That only works if the extension is
  allowed to read/write cookies on arbitrary domains; there's no way to
  scope it down without breaking the feature.

## What it does NOT do

- It does not send cookies, URLs, or settings to any remote server. There
  is no backend — the entire extension runs client-side.
- It does not include analytics, telemetry, or crash reporting.
- It does not inject scripts into web pages or read page content.
- It does not sell or share data with third parties, because it doesn't
  collect any data to begin with.

## Data retention

Cookie values are copied directly from Chrome's cookie store to Chrome's
cookie store via the `chrome.cookies` API — the extension's own code never
persists a copy of a cookie's value anywhere. Settings saved via
`chrome.storage.sync` remain until you change them or remove the extension.

## Contact

Questions about this policy can be filed as an issue on the project's
GitHub repository: <https://github.com/Subhajitdas298/cookie-link/issues>.
