import { Icon } from './ui.jsx';
import { timeAgo } from './BackupPanel.jsx';

export default function BackupReminder({ backup, invoiceCount, onBackup }) {
  if (!backup.needsBackup) return null;
  const n = backup.changedSince;
  return (
    <div className="install-banner backup-banner no-print" role="status">
      <span className="device-icon">
        <Icon name="shield" size={20} />
      </span>
      <div>
        <strong>Back up your invoices</strong>
        <span>
          {backup.lastBackupAt
            ? `${n} invoice${n === 1 ? '' : 's'} changed since your last backup ${timeAgo(backup.lastBackupAt)}.`
            : `You have ${invoiceCount} invoices and no backup yet.`}
        </span>
      </div>
      <button type="button" className="btn btn-sm" onClick={onBackup}>
        Back up
      </button>
      <button type="button" className="icon-btn sm" onClick={() => backup.snooze(3)} aria-label="Remind me in 3 days">
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
