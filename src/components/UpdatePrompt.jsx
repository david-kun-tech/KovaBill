import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Registers the service worker and offers new versions without forcing a reload.
export default function UpdatePrompt({ notify }) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // installed apps can stay open for days; check for updates hourly
      if (registration) setInterval(() => registration.update(), 60 * 60 * 1000);
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    notify('KovaBill is ready to work offline');
    setOfflineReady(false);
  }, [offlineReady, notify, setOfflineReady]);

  if (!needRefresh) return null;
  return (
    <div className="toast-region toast-update no-print" role="status">
      <div className="toast toast-action">
        A new version is ready
        <button type="button" onClick={() => updateServiceWorker(true)}>
          Update
        </button>
        <button type="button" className="ghost" onClick={() => setNeedRefresh(false)}>
          Later
        </button>
      </div>
    </div>
  );
}
