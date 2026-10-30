/**
 * Register the web PWA worker only in production browsers.
 * Capacitor's bundled native WebView uses its own lifecycle and does not
 * need a browser service worker.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  const isNativeWebView =
    window.location.protocol === 'capacitor:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (isNativeWebView) return;

  window.addEventListener(
    'load',
    () => {
      void navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((error: unknown) => {
          console.warn('NEXORA: service worker registration failed.', error);
        });
    },
    { once: true },
  );
}
