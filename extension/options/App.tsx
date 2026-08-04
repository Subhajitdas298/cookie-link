import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  CssBaseline,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  OutlinedInput,
  Paper,
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
  ThemeProvider,
  Typography,
  useMediaQuery,
} from '@mui/material';
import {
  COOKIE_MODES,
  DEFAULT_SETTINGS,
  getSettings,
  parseCookieNames,
  saveSettings,
  type CookieMode,
} from '../common/settings';
import { createAppTheme } from './theme';

export default function App() {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = useMemo(() => createAppTheme(prefersDark ? 'dark' : 'light'), [prefersDark]);

  const [cookieMode, setCookieMode] = useState<CookieMode>(DEFAULT_SETTINGS.cookieMode);
  const [cookieNamesText, setCookieNamesText] = useState('');
  const [targetUrl, setTargetUrl] = useState(DEFAULT_SETTINGS.targetUrl);
  const [openInNewTab, setOpenInNewTab] = useState(DEFAULT_SETTINGS.openInNewTab);
  const [loaded, setLoaded] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [iconUrl, setIconUrl] = useState('');

  useEffect(() => {
    getSettings().then((settings) => {
      setCookieMode(settings.cookieMode);
      setCookieNamesText(settings.cookieNames.join('\n'));
      setTargetUrl(settings.targetUrl);
      setOpenInNewTab(settings.openInNewTab);
      setLoaded(true);
    });
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      setIconUrl(chrome.runtime.getURL('icons/icon48.png'));
    }
  }, []);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const settings = await saveSettings({
      cookieMode,
      cookieNames: parseCookieNames(cookieNamesText),
      targetUrl: targetUrl.trim() || DEFAULT_SETTINGS.targetUrl,
      openInNewTab,
    });
    setTargetUrl(settings.targetUrl);
    setSavedOpen(true);
  }

  const needsCookieList = cookieMode === COOKIE_MODES.WHITELIST || cookieMode === COOKIE_MODES.BLACKLIST;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          py: 6,
          px: 3,
          display: 'flex',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Paper
          component="form"
          id="settings-form"
          onSubmit={handleSave}
          elevation={0}
          variant="outlined"
          sx={{
            width: '100%',
            maxWidth: 480,
            p: 3.5,
            borderRadius: 3,
            visibility: loaded ? 'visible' : 'hidden',
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 3 }}>
            <Avatar src={iconUrl} alt="" variant="rounded" sx={{ width: 40, height: 40 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Cookie Link
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Copy cookies to a target URL and open it
              </Typography>
            </Box>
          </Stack>

          <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2.5 }}>
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend" sx={{ fontSize: '0.8rem', fontWeight: 600, mb: 0.5 }}>
                Which cookies to copy
              </FormLabel>
              <RadioGroup
                name="cookieMode"
                value={cookieMode}
                onChange={(e) => setCookieMode(e.target.value as CookieMode)}
              >
                <FormControlLabel
                  value={COOKIE_MODES.ALL}
                  control={<Radio size="small" />}
                  label="All cookies from the active tab's site"
                />
                <FormControlLabel
                  value={COOKIE_MODES.WHITELIST}
                  control={<Radio size="small" />}
                  label="Only cookies named below (whitelist)"
                />
                <FormControlLabel
                  value={COOKIE_MODES.BLACKLIST}
                  control={<Radio size="small" />}
                  label="All cookies except those named below (blacklist)"
                />
              </RadioGroup>
              <FormControl fullWidth sx={{ mt: 1.5 }} disabled={!needsCookieList}>
                <InputLabel htmlFor="cookie-names">Cookie names</InputLabel>
                <OutlinedInput
                  id="cookie-names"
                  label="Cookie names"
                  multiline
                  minRows={4}
                  placeholder={'one per line, or comma-separated\ne.g. session_id, auth_token'}
                  value={cookieNamesText}
                  onChange={(e) => setCookieNamesText(e.target.value)}
                />
              </FormControl>
            </FormControl>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2.5 }}>
            <FormLabel component="legend" sx={{ fontSize: '0.8rem', fontWeight: 600, mb: 1.25, display: 'block' }}>
              Destination
            </FormLabel>
            <FormControl fullWidth>
              <InputLabel htmlFor="target-url">Target URL</InputLabel>
              <OutlinedInput
                id="target-url"
                label="Target URL"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="http://localhost:5173"
              />
            </FormControl>
            <FormControlLabel
              sx={{ mt: 1 }}
              control={
                <Checkbox
                  id="open-new-tab"
                  size="small"
                  checked={openInNewTab}
                  onChange={(e) => setOpenInNewTab(e.target.checked)}
                />
              }
              label="Open target URL in a new tab (otherwise reuses the current tab)"
            />
          </Paper>

          <Button id="save-button" type="submit" variant="contained" disableElevation>
            Save settings
          </Button>
        </Paper>
      </Box>

      <Snackbar
        open={savedOpen}
        autoHideDuration={2000}
        onClose={() => setSavedOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert id="status" onClose={() => setSavedOpen(false)} severity="success" variant="filled" sx={{ width: '100%' }}>
          Saved.
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
