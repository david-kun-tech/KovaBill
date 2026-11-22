import { useRef, useState } from 'react';
import { Icon } from './ui.jsx';
import RestoreDialog from './RestoreDialog.jsx';
import { readBackupText } from '../lib/backup.js';

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
export function timeAgo(ts) {
  const s = (ts - Date.now()) / 1000;
  const units = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [u, n] of units) if (Math.abs(s) >= n) return rtf.format(Math.round(s / n), u);
  return 'just now';
}

const METHOD = { download: 'downloaded', share: 'shared', auto: 'auto-saved to a file' };

export default function BackupPanel({ backup, invoices, onBackup, onRestore, onLoadSample, onErase, notify }) {
  const fileRef = useRef(null);
  const [restoring, setRestoring] = useState(null); // { parsed, fileName }
  const { auto } = backup;

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setRestoring({ parsed: readBackupText(await file.text()), fileName: file.name });
    } catch (err) {
      notify(err.message);
    }
  };

  const fresh = backup.lastBackupAt && backup.changedSince === 0;

  return (
    <section className="panel backups">
      <h2>Backups</h2>
      <p className="muted">Your invoices live only on this device. A backup file lets you move them or get them back.</p>

      <ul className="device-rows">
        <li className={backup.lastBackupAt ? (fresh ? 'ok' : '') : 'warn'}>
          <span className="device-icon">
            <Icon name="shield" size={20} />
          </span>
          <div>
            <strong>
              {backup.lastBackupAt ? `Last backup ${timeAgo(backup.lastBackupAt)}` : 'No backup yet'}
            </strong>
            <span>
              {backup.lastBackupAt
                ? fresh
                  ? `Up to date (${METHOD[backup.lastMethod] || 'saved'}).`
                  : `${backup.changedSince} invoice${backup.changedSince === 1 ? '' : 's'} changed since (${METHOD[backup.lastMethod] || 'saved'}).`
                : invoices.length
                  ? 'If this browser’s data is cleared, your invoices are gone. Make a backup.'
                  : 'Create some invoices, then back them up here.'}
            </span>
          </div>
        </li>

        {auto.status !== 'unsupported' && (
          <li className={auto.status === 'on' ? 'ok' : auto.status === 'paused' ? 'warn' : ''}>
            <span className="device-icon">
              <Icon name="refresh" size={20} />
            </span>
            <div>
              <strong>
                {auto.status === 'on' ? 'Automatic backup is on' : auto.status === 'paused' ? 'Automatic backup paused' : 'Automatic backup'}
              </strong>
              <span>
                {auto.status === 'on'
                  ? `Saving every change to “${auto.name}” on this computer.`
                  : auto.status === 'paused'
                    ? `The browser needs your OK again to keep saving to “${auto.name}”.`
                    : 'Pick a file on this computer and KovaBill keeps it updated after every change.'}
              </span>
            </div>
            {auto.status === 'off' && (
              <button
                type="button"
                className="btn btn-soft btn-sm"
                onClick={async () => {
                  if (await backup.chooseAuto().catch(() => false)) notify('Automatic backup is on');
                }}
              >
                Choose file
              </button>
            )}
            {auto.status === 'paused' && (
              <button
                type="button"
                className="btn btn-ink btn-sm"
                onClick={async () => notify((await backup.reconnectAuto()) ? 'Automatic backup resumed' : 'Permission not given')}
              >
                Resume
              </button>
            )}
            {auto.status === 'on' && (
              <button type="button" className="btn btn-sm link-danger" onClick={() => (backup.stopAuto(), notify('Automatic backup stopped'))}>
                Stop
              </button>
            )}
          </li>
        )}
      </ul>

      <div className="row-btns">
        <button type="button" className="btn btn-ink" onClick={onBackup} disabled={!invoices.length}>
          <Icon name="download" size={18} /> Back up now
        </button>
        <button type="button" className="btn btn-soft" onClick={() => fileRef.current.click()}>
          <Icon name="upload" size={18} /> Restore from backup
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json,text/plain,.txt" hidden onChange={pickFile} />
      </div>

      <div className="danger">
        <div className="row-btns">
          <button type="button" className="btn btn-soft btn-sm" onClick={onLoadSample}>
            <Icon name="sparkle" size={16} /> Load sample data
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => {
              if (confirm('Erase all invoices and settings from this browser? This can’t be undone. Back up first if unsure.')) {
                onErase();
                notify('Everything erased');
              }
            }}
          >
            <Icon name="trash" size={16} /> Erase everything
          </button>
        </div>
      </div>

      {restoring && (
        <RestoreDialog
          parsed={restoring.parsed}
          fileName={restoring.fileName}
          invoices={invoices}
          onRestore={(b, mode) => {
            const r = onRestore(b, mode);
            const plural = (n) => `${n} invoice${n === 1 ? '' : 's'}`;
            notify(
              mode === 'replace'
                ? `Restored ${plural(r.total)}`
                : r.added || r.updated
                  ? `Added ${r.added} new, updated ${r.updated}`
                  : 'Already up to date, nothing to add'
            );
          }}
          onClose={() => setRestoring(null)}
        />
      )}
    </section>
  );
}
