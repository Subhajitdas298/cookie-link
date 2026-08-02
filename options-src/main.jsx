import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Set at runtime (rather than a static <link> Vite would try to bundle as
// an asset) since the extension's real base URL isn't known until it's
// actually installed.
if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = chrome.runtime.getURL('icons/icon32.png');
  document.head.appendChild(link);
}

createRoot(document.getElementById('root')).render(<App />);
