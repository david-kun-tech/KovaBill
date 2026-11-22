import { useEffect, useMemo, useState } from 'react';
import { Icon } from './ui.jsx';
import { requestPersistence, storageStatus } from '../lib/storage.js';
import { useInstall } from '../lib/pwa.js';

const formatBytes = (n) =>
  n == null ? '—' : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`;

// "On this device" panel: where data lives, whether it's protected, and app install.
export default function DeviceStatus({ invoices, profile, notify }) {
  const [status, setStatus] = useState(null);
  const install = useInstall();
  const dataSize = useMemo(() => new Blob([JSON.stringify({ invoices, profile })]).size, [invoices, profile]);

  useEffect(() => {
    let alive = true;
    // small delay so the latest write has landed before we measure
    const t = setTimeout(() => storageStatus().then((s) => alive && setStatus(s)), 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [invoices]);

  const protect = async () => {
    const ok = await requestPersistence();
    setStatus(await storageStatus());
    notify(ok ? 'Your data is now protected on this device' : 'Your browser declined. Installing the app usually fixes this.');
  };

  const doInstall = async () => {
    if (await install.prompt()) notify('KovaBill installed');
  };

  return (
    <section className="panel device">
      <h2>On this device</h2>
      <p className="muted">KovaBill keeps everything on this device. Nothing is uploaded anywhere.</p>

      <ul className="device-rows">
        <li className={status?.persisted ? 'ok' : 'warn'}>
          <span className="device-icon">
            <Icon name="shield" size={20} />
          </span>
          <div>
            <strong>{status?.persisted ? 'Protected storage' : 'Standard storage'}</strong>
            <span>
              {status?.backend === 'localstorage'
                ? 'Using basic browser storage (private browsing?). Export a backup before you close this window.'
                : status?.persisted
                  ? 'Your browser won’t clear this data to free up space.'
                  : 'The browser may clear this data if the device runs low on space.'}
            </span>
          </div>
          {status && !status.persisted && status.supported && (
            <button type="button" className="btn btn-ink btn-sm" onClick={protect}>
              Protect
            </button>
          )}
        </li>

        <li>
          <span className="device-icon">
            <Icon name="drive" size={20} />
          </span>
          <div>
            <strong>
              {invoices.length} invoice{invoices.length === 1 ? '' : 's'} · {formatBytes(dataSize)}
            </strong>
            <span>{formatBytes(status?.usage)} in total, including the offline copy of the app</span>
          </div>
        </li>

        <li className={install.installed ? 'ok' : ''}>
          <span className="device-icon">
            <Icon name="phone" size={20} />
          </span>
          <div>
            <strong>{install.installed ? 'Installed as an app' : 'Install KovaBill'}</strong>
            <span>
              {install.installed
                ? 'Opens from your home screen and works offline.'
                : install.canPrompt
                  ? 'Add it to your home screen or desktop. It works offline and keeps your data safer.'
                  : install.ios
                    ? 'In Safari, tap Share, then “Add to Home Screen”.'
                    : 'Use your browser menu’s “Install app” or “Add to Home Screen” option.'}
            </span>
          </div>
          {install.canPrompt && (
            <button type="button" className="btn btn-ink btn-sm" onClick={doInstall}>
              Install
            </button>
          )}
        </li>
      </ul>

      {install.ios && !install.installed && (
        <p className="device-note">
          <Icon name="alert" size={16} /> On iPhone and iPad, the home-screen app keeps its own separate data. Install
          first, then create your invoices there. To bring existing invoices across, export a backup here and import
          it in the app.
        </p>
      )}
    </section>
  );
}
