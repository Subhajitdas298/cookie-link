import { getSettings, saveSettings, parseCookieNames, COOKIE_MODES, DEFAULT_SETTINGS } from './common/settings.js';

const form = document.getElementById('settings-form');
const cookieNamesField = document.getElementById('cookie-names-field');
const cookieNamesInput = document.getElementById('cookie-names');
const targetUrlInput = document.getElementById('target-url');
const openNewTabInput = document.getElementById('open-new-tab');
const statusEl = document.getElementById('status');

function radioFor(mode) {
  return form.querySelector(`input[name="cookieMode"][value="${mode}"]`);
}

function updateCookieNamesVisibility() {
  const mode = form.querySelector('input[name="cookieMode"]:checked')?.value;
  const needsList = mode === COOKIE_MODES.WHITELIST || mode === COOKIE_MODES.BLACKLIST;
  cookieNamesField.classList.toggle('disabled', !needsList);
}

async function load() {
  const settings = await getSettings();
  radioFor(settings.cookieMode).checked = true;
  cookieNamesInput.value = settings.cookieNames.join('\n');
  targetUrlInput.value = settings.targetUrl;
  openNewTabInput.checked = settings.openInNewTab;
  updateCookieNamesVisibility();
}

form.addEventListener('change', (event) => {
  if (event.target.name === 'cookieMode') {
    updateCookieNamesVisibility();
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const cookieMode = form.querySelector('input[name="cookieMode"]:checked').value;
  const settings = await saveSettings({
    cookieMode,
    cookieNames: parseCookieNames(cookieNamesInput.value),
    targetUrl: targetUrlInput.value.trim() || DEFAULT_SETTINGS.targetUrl,
    openInNewTab: openNewTabInput.checked,
  });

  targetUrlInput.value = settings.targetUrl;
  statusEl.textContent = 'Saved.';
  statusEl.classList.add('success');
  setTimeout(() => {
    statusEl.textContent = '';
    statusEl.classList.remove('success');
  }, 2000);
});

load();
