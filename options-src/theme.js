import { createTheme } from '@mui/material/styles';

// Customized MUI theme matching the extension's existing brand palette
// (the same amber/cookie + slate-blue link tones used by the icon), rather
// than MUI's default indigo/pink.
export function createAppTheme(mode) {
  return createTheme({
    palette: {
      mode,
      primary: { main: '#C98A44', dark: '#8A5A2B', light: '#E8A94E', contrastText: '#fff' },
      secondary: { main: '#3454D1' },
      background:
        mode === 'dark'
          ? { default: '#1c1712', paper: '#26201a' }
          : { default: '#f7f4ee', paper: '#ffffff' },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiTextField: {
        defaultProps: { size: 'small' },
      },
    },
  });
}
