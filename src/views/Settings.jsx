import BackupPanel from '../components/BackupPanel.jsx';
import DeviceStatus from '../components/DeviceStatus.jsx';
import LogoPicker from '../components/LogoPicker.jsx';
import { CURRENCIES } from '../utils/invoice.js';

function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export default function Settings({ profile, setProfile, invoices, backup, onBackup, onRestore, onLoadSample, onErase, notify }) {
  const bind = (key) => ({
    value: profile[key] ?? '',
    onChange: (e) => setProfile((p) => ({ ...p, [key]: e.target.value })),
  });

  return (
    <div className="screen settings">
      <header className="screen-head">
        <div>
          <h1>Settings</h1>
          <p className="muted">Changes save automatically on this device.</p>
        </div>
        <a href="#/welcome" className="btn btn-soft btn-sm">
          Replay welcome
        </a>
      </header>

      <div className="settings-grid">
        <section className="panel">
          <h2>You & your business</h2>
          <p className="muted">Shown at the top of every invoice.</p>
          <LogoPicker
            logo={profile.logo}
            business={profile.business}
            onChange={(logo) => setProfile((p) => ({ ...p, logo }))}
            notify={notify}
          />
          <div className="fields-2">
            <Field label="First name">
              <input {...bind('firstName')} autoComplete="given-name" placeholder="Jany" />
            </Field>
            <Field label="Business name">
              <input {...bind('business')} autoComplete="organization" placeholder="Jany Studio" />
            </Field>
            <Field label="Email">
              <input {...bind('email')} type="email" autoComplete="email" />
            </Field>
            <Field label="Phone">
              <input {...bind('phone')} type="tel" autoComplete="tel" />
            </Field>
          </div>
          <Field label="Address">
            <textarea rows="2" {...bind('address')} autoComplete="street-address" />
          </Field>
        </section>

        <section className="panel">
          <h2>Getting paid</h2>
          <p className="muted">Printed in the “Pay to” block and included in emails.</p>
          <div className="fields-2">
            <Field label="Bank">
              <input {...bind('bankName')} placeholder="e.g. GTBank" />
            </Field>
            <Field label="Account name">
              <input {...bind('accountName')} />
            </Field>
          </div>
          <Field label="Account number">
            <input {...bind('accountNumber')} inputMode="numeric" autoComplete="off" />
          </Field>
        </section>

        <section className="panel">
          <h2>Defaults for new invoices</h2>
          <div className="fields-3">
            <Field label="Currency">
              <select {...bind('currency')}>
                {Object.entries(CURRENCIES).map(([code, c]) => (
                  <option key={code} value={code}>
                    {code} · {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="VAT %">
              <input type="number" min="0" step="0.1" {...bind('vatRate')} />
            </Field>
            <Field label="Payment terms (days)">
              <input type="number" min="0" step="1" {...bind('terms')} />
            </Field>
          </div>
          <Field label="Default note">
            <textarea rows="2" {...bind('notes')} />
          </Field>
        </section>

        <DeviceStatus invoices={invoices} profile={profile} notify={notify} />

        <BackupPanel
          backup={backup}
          invoices={invoices}
          onBackup={onBackup}
          onRestore={onRestore}
          onLoadSample={onLoadSample}
          onErase={onErase}
          notify={notify}
        />
      </div>
    </div>
  );
}
