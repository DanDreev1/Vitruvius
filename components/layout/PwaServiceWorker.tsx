'use client';

import { useEffect } from 'react';

export default function PwaServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister()))
        )
        .catch(() => undefined);
      return;
    }

    void navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Failed to register Vitruvius service worker:', error);
    });
  }, []);

  return null;
}
