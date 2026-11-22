import { useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { Icon } from './ui.jsx';
import { canShareFiles, downloadFile, makeBackupFile, shareFile, summarize } from '../lib/backup.js';

const MIN_PASSWORD = 6;

export default function BackupDialog({ invoices, profile, onDone, onClose, notify }) {
  const [lockOn, setLockOn] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sharing = useMemo(canShareFiles, []);
  const s = useMemo(() => summarize({ invoices, profile }), [invoices, profile]);

  const pwProblem = !lockOn
    ? ''
    : pw.length < MIN_PASSWORD
      ? `Use at least ${MIN_PASSWORD} characters`
      : pw !== pw2
        ? 'The passwords don’t match'
        : '';

  const run = async (how, close) => {
    if (pwProblem) {
      setError(pwProblem);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const file = await makeBackupFile({ invoices, profile }, lockOn ? pw : null);
      if (how === 'share') {
        if (!(await shareFile(file))) return; // cancelled
        notify('Backup shared');
      } else {
        downloadFile(file);
        notify('Backup saved to your downloads');
      }
      onDone(how);
      close();
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Back up your data" subtitle="One file with all your invoices, clients and settings." onClose={onClose}>
      {(close) => (
        <form className="sheet-body" onSubmit={(e) => (e.preventDefault(), run('download', close))}>
          <ul className="backup-stats">
            <li>
              <strong>{s.invoices}</strong> invoice{s.invoices === 1 ? '' : 's'}
            </li>
            <li>
              <strong>{s.clients}</strong> client{s.clients === 1 ? '' : 's'}
            </li>
            <li>Your profile{s.hasLogo ? ', logo' : ''} & bank details</li>
          </ul>

          <label className="switch-row">
            <input type="checkbox" checked={lockOn} onChange={(e) => setLockOn(e.target.checked)} />
            <span className="switch" aria-hidden="true" />
            <span>
              <strong>Lock with a password</strong>
              <small>Recommended if you’ll email it or keep it in the cloud. It contains your bank details.</small>
            </span>
          </label>

          {lockOn && (
            <div className="pw-fields">
              <label className="field">
                <span className="field-label">Password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  autoFocus
                />
              </label>
              <label className="field">
                <span className="field-label">Type it again</span>
                <input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
              </label>
              <p className="device-note">
                <Icon name="alert" size={16} /> Write it down. Without it the backup can’t be opened, and nobody, including
                KovaBill, can recover it.
              </p>
            </div>
          )}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="sheet-actions">
            {sharing && (
              <button type="button" className="btn btn-soft" disabled={busy} onClick={() => run('share', close)}>
                <Icon name="share" size={18} /> Share…
              </button>
            )}
            <button type="submit" className="btn btn-ink" disabled={busy} data-autofocus>
              <Icon name="download" size={18} /> {busy ? 'Preparing…' : 'Download backup'}
            </button>
          </div>
          <p className="sheet-foot">
            {sharing
              ? 'Share sends it to Google Drive, iCloud, WhatsApp or email. Download keeps it on this device.'
              : 'Then keep the file somewhere safe, like Google Drive, iCloud, a USB stick, or an email to yourself.'}
          </p>
        </form>
      )}
    </Modal>
  );
}
