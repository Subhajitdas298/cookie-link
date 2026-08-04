import { createRoot } from 'react-dom/client';
import App from './App';

// Set at runtime (rather than a static <link> Vite would try to bundle as
// an asset) since the extension's real base URL isn't known until it's
// actually installed.
if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = chrome.runtime.getURL('icons/icon32.png');
  document.head.appendChild(link);
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('#root element not found');
}
createRoot(container).render(<App />);
