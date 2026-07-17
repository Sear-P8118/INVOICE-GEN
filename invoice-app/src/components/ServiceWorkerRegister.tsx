'use client';

import { useEffect } from 'react';

// Registers the service worker AND keeps the installed app up to date.
// iOS PWAs keep running old code for days unless told otherwise, so:
//  - every time the app is opened / brought to the foreground we check the
//    server for a new version (registration.update()),
//  - when a new service worker takes over, the page reloads once so the
//    fresh code is what you're actually looking at.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Only auto-reload on a controller *change* (i.e. an update), not on the
    // very first install — that would reload every new visitor pointlessly.
    let wasControlled = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => {
      if (!wasControlled) {
        wasControlled = true;
        return;
      }
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    let reg: ServiceWorkerRegistration | undefined;
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((r) => {
        reg = r;
        r.update().catch(() => {});
      })
      .catch(() => {
        // Service worker is a nice-to-have; the app works without it.
      });

    // Re-check whenever the app comes back to the foreground.
    const checkForUpdate = () => {
      if (document.visibilityState === 'visible') reg?.update().catch(() => {});
    };
    document.addEventListener('visibilitychange', checkForUpdate);
    window.addEventListener('focus', checkForUpdate);
    // And periodically while it stays open.
    const interval = setInterval(checkForUpdate, 30 * 60 * 1000);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', checkForUpdate);
      window.removeEventListener('focus', checkForUpdate);
      clearInterval(interval);
    };
  }, []);
  return null;
}
