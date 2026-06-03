import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global fetch interceptor to support VITE_API_URL environment variable in production
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  if (apiBase) {
    if (typeof input === 'string' && input.startsWith('/api')) {
      input = `${apiBase}${input}`;
    } else if (input instanceof URL && input.pathname.startsWith('/api')) {
      input = new URL(`${apiBase}${input.pathname}${input.search}`);
    } else if (input && typeof input === 'object' && typeof input.url === 'string' && input.url.startsWith('/api')) {
      const url = `${apiBase}${input.url}`;
      input = new Request(url, input);
    }
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
