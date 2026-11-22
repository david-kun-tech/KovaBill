import { useState } from 'react';
import { Icon } from './ui.jsx';
import { useInstall } from '../lib/pwa.js';

const KEY = 'kova.hideInstall';

export default function InstallBanner({ notify }) {
  const install = useInstall();
  const [hidden, setHidden] = useState(() => localStorage.getItem(KEY) === '1');

  if (hidden || install.installed || !(install.canPrompt || install.ios)) return null;

  const dismiss = () => {
    localStorage.setItem(KEY, '1');
    setHidden(true);
  };

  return (
    <div className="install-banner no-print">
      <span className="device-icon">
        <Icon name="phone" size={20} />
      </span>
      <div>
        <strong>Install KovaBill</strong>
        <span>
          {install.canPrompt
            ? 'Works offline and keeps your invoices safe on this device.'
            : 'Tap Share, then “Add to Home Screen”.'}
        </span>
      </div>
      {install.canPrompt ? (
        <button
          type="button"
          className="btn btn-sm"
          onClick={async () => {
            if (await install.prompt()) notify('KovaBill installed');
          }}
        >
          Install
        </button>
      ) : (
        <span />
      )}
      <button type="button" className="icon-btn sm" onClick={dismiss} aria-label="Dismiss install suggestion">
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
