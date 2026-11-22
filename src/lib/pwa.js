// Install-to-home-screen support.
// Chromium browsers fire `beforeinstallprompt`; we keep it so the app can
// offer its own "Install" button. iOS has no prompt, so we show instructions.
import { useEffect, useReducer } from 'react';

let deferred = null;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function useInstall() {
  const [, rerender] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    listeners.add(rerender);
    return () => listeners.delete(rerender);
  }, []);

  return {
    installed: isStandalone(),
    canPrompt: Boolean(deferred),
    ios: isIOS(),
    async prompt() {
      if (!deferred) return false;
      const e = deferred;
      deferred = null;
      e.prompt();
      const { outcome } = await e.userChoice;
      emit();
      return outcome === 'accepted';
    },
  };
}
