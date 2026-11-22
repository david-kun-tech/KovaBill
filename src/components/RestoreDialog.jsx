import { useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { Icon } from './ui.jsx';
import { summarize, unlock } from '../lib/backup.js';
import { formatDate, formatMoney } from '../utils/invoice.js';

/** parsed = result of readBackupText(): { encrypted, envelope } or { backup } */
export default function RestoreDialog({ parsed, fileName, invoices, onRestore, onClose }) {
  const [backup, setBackup] = useState(parsed.encrypted ? null : parsed.backup);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('merge');

  const s = useMemo(() => (backup ? summarize(backup) : null), [backup]);
  const diff = useMemo(() => {
    if (!backup) return null;
    const mine = new Set(invoices.map((i) => i.id));
    const theirs = (backup.invoices || []).filter((i) => i && i.id);
    const matching = theirs.filter((i) => mine.has(i.id)).length;
    return { added: theirs.length - matching, matching, keptOnly: invoices.length - matching };
  }, [backup, invoices]);

  const doUnlock = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setBackup(await unlock(parsed.envelope, pw));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Restore from backup" subtitle={fileName} onClose={onClose}>
      {(close) =>
        !backup ? (
          <form className="sheet-body" onSubmit={doUnlock}>
            <p className="lock-note">
              <span className="device-icon">
                <Icon name="shield" size={20} />
              </span>
              This backup is locked with a password.
            </p>
            <label className="field">
              <span className="field-label">Password</span>
              <input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus data-autofocus />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="sheet-actions">
              <button type="button" className="btn btn-soft" onClick={close}>
                Cancel
              </button>
              <button type="submit" className="btn btn-ink" disabled={busy || !pw}>
                {busy ? 'Unlocking…' : 'Unlock'}
              </button>
            </div>
          </form>
        ) : (
          <form
            className="sheet-body"
            onSubmit={(e) => {
              e.preventDefault();
              onRestore(backup, mode);
              close();
            }}
          >
            <div className="restore-card">
              <div className="restore-head">
                <strong>{s.business || 'KovaBill backup'}</strong>
                <span>{s.exportedAt ? `Made ${formatDate(s.exportedAt.slice(0, 10))}` : 'Older backup'}</span>
              </div>
              <ul className="backup-stats">
                <li>
                  <strong>{s.invoices}</strong> invoice{s.invoices === 1 ? '' : 's'}
                </li>
                <li>
                  <strong>{s.clients}</strong> client{s.clients === 1 ? '' : 's'}
                </li>
                {s.first && (
                  <li>
                    {formatDate(s.first, { month: 'short', year: 'numeric' })} – {formatDate(s.last, { month: 'short', year: 'numeric' })}
                  </li>
                )}
              </ul>
              {Object.keys(s.totals).length > 0 && (
                <p className="muted small">
                  Billed: {Object.entries(s.totals).map(([c, v]) => formatMoney(v, c)).join(' · ')}
                </p>
              )}
            </div>

            <fieldset className="choice">
              <legend className="field-label">How should it be restored?</legend>
              <label className={mode === 'merge' ? 'on' : ''}>
                <input type="radio" name="mode" value="merge" checked={mode === 'merge'} onChange={() => setMode('merge')} />
                <span>
                  <strong>Add to what’s here</strong>
                  <small>
                    {diff.added} new · {diff.matching} already here (the newer copy is kept) · your other {diff.keptOnly} stay
                  </small>
                </span>
              </label>
              <label className={mode === 'replace' ? 'on danger' : ''}>
                <input type="radio" name="mode" value="replace" checked={mode === 'replace'} onChange={() => setMode('replace')} />
                <span>
                  <strong>Replace everything</strong>
                  <small>
                    Your current {invoices.length} invoice{invoices.length === 1 ? '' : 's'} and settings on this device are removed
                    first.
                  </small>
                </span>
              </label>
            </fieldset>

            <div className="sheet-actions">
              <button type="button" className="btn btn-soft" onClick={close} autoFocus data-autofocus>
                Cancel
              </button>
              <button type="submit" className={`btn ${mode === 'replace' ? 'btn-danger-solid' : 'btn-ink'}`}>
                {mode === 'replace' ? 'Replace everything' : 'Restore'}
              </button>
            </div>
          </form>
        )
      }
    </Modal>
  );
}
