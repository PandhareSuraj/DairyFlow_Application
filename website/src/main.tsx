import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'
import { trackError } from './lib/error-tracking'

// Global unhandled error handlers
window.addEventListener('error', (event) => {
  trackError({
    type: 'runtime',
    message: event.message,
    stack: event.error?.stack,
    context: { filename: event.filename, lineno: event.lineno }
  });
});

window.addEventListener('unhandledrejection', (event) => {
  trackError({
    type: 'unhandled',
    message: String(event.reason),
    stack: event.reason?.stack
  });
});

// One-time cleanup of stale service workers and caches (v1)
const SW_CLEANUP_VERSION = 'sw-cleanup-v1';
if (!localStorage.getItem(SW_CLEANUP_VERSION)) {
  // Unregister any old service workers registered at /sw.js
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        // Only unregister if it's the old /sw.js (not push-sw.js or PWA sw)
        if (registration.active?.scriptURL?.endsWith('/sw.js')) {
          registration.unregister().then(() => {
            console.log('[Cleanup] Unregistered old /sw.js service worker');
          });
        }
      });
    });
  }

  // Clear old Workbox caches
  if ('caches' in window) {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        if (cacheName.startsWith('workbox-') || cacheName === 'dairyflow-v1') {
          caches.delete(cacheName).then(() => {
            console.log('[Cleanup] Deleted cache:', cacheName);
          });
        }
      });
    });
  }

  localStorage.setItem(SW_CLEANUP_VERSION, 'done');
}

createRoot(document.getElementById("root")!).render(<App />);
