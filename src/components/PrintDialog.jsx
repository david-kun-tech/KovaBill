import { useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { Icon } from './ui.jsx';
import { STATUS_FILTERS, datePresets, filterInvoices, invoicesToCSV, periodLabel, totalsByCurrency } from '../utils/printing.js';
import { formatMoney, groupClients, todayISO } from '../utils/invoice.js';

export default function PrintDialog({ invoices, initialStatus = 'all', onPrint, onClose, notify }) {
  const presets = useMemo(datePresets, []);
  const clients = useMemo(() => groupClients(invoices), [invoices]);
  const [status, setStatus] = useState(STATUS_FILTERS.some((f) => f.id === initialStatus) ? initialStatus : 'all');
  const [preset, setPreset] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [client, setClient] = useState('');
  const [summary, setSummary] = useState(true);
  const [each, setEach] = useState(true);

  const pickPreset = (id) => {
    setPreset(id);
    if (id === 'custom') return;
    const p = presets.find((x) => x.id === id);
    setFrom(p.from);
    setTo(p.to);
  };

  const list = useMemo(() => filterInvoices(invoices, { status, from, to, client }), [invoices, status, from, to, client]);
  const totals = useMemo(() => totalsByCurrency(list), [list]);
  const sum = Object.entries(totals)
    .map(([c, t]) => formatMoney(t.billed + t.drafts, c))
    .join(' · ');
  const filters = { status, from, to, client, period: periodLabel(from, to) };
  const nothing = list.length === 0;
  const pages = (summary ? 1 : 0) + (each ? list.length : 0);

  const exportCSV = () => {
    const blob = new Blob([invoicesToCSV(list)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kovabill-invoices-${todayISO()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    notify(`Exported ${list.length} invoice${list.length === 1 ? '' : 's'} to CSV`);
  };

  return (
    <Modal title="Print & export" subtitle="Choose which invoices, then print them or save as PDF." onClose={onClose}>
      {(close) => (
        <form
          className="sheet-body"
          onSubmit={(e) => {
            e.preventDefault();
            close();
            onPrint({ kind: 'invoices', invoices: list, filters, summary, each });
          }}
        >
          <fieldset className="filter-group">
            <legend className="field-label">Status</legend>
            <div className="chips wrap">
              {STATUS_FILTERS.map((f) => (
                <button key={f.id} type="button" className="chip" aria-pressed={status === f.id} onClick={() => setStatus(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="filter-group">
            <legend className="field-label">Issued</legend>
            <div className="chips wrap">
              {[...presets, { id: 'custom', label: 'Custom…' }].map((p) => (
                <button key={p.id} type="button" className="chip" aria-pressed={preset === p.id} onClick={() => pickPreset(p.id)}>
                  {p.label}
                </button>
              ))}
            </div>
            {preset === 'custom' && (
              <div className="fields-2 range">
                <label className="field">
                  <span className="field-label">From</span>
                  <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
                </label>
                <label className="field">
                  <span className="field-label">To</span>
                  <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
                </label>
              </div>
            )}
          </fieldset>

          <label className="field">
            <span className="field-label">Client</span>
            <select value={client} onChange={(e) => setClient(e.target.value)}>
              <option value="">All clients</option>
              {clients.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <div className="print-options">
            <label className="check">
              <input type="checkbox" checked={summary} onChange={(e) => setSummary(e.target.checked)} />
              <span>
                <strong>Summary page</strong>
                <small>A list of the invoices with totals paid and owed</small>
              </span>
            </label>
            <label className="check">
              <input type="checkbox" checked={each} onChange={(e) => setEach(e.target.checked)} />
              <span>
                <strong>Each invoice</strong>
                <small>Every invoice in full, one per page</small>
              </span>
            </label>
          </div>

          <div className={`print-count ${nothing ? 'empty' : ''}`} aria-live="polite">
            {nothing ? (
              'No invoices match these filters'
            ) : (
              <>
                <strong>
                  {list.length} invoice{list.length === 1 ? '' : 's'}
                </strong>
                <span>{sum}</span>
                <span className="muted">
                  {pages} page{pages === 1 ? '' : 's'}
                </span>
              </>
            )}
          </div>

          <div className="sheet-actions">
            <button type="button" className="btn btn-soft" disabled={nothing} onClick={exportCSV}>
              <Icon name="sheet" size={18} /> Export CSV
            </button>
            <button type="submit" className="btn btn-ink" disabled={nothing || pages === 0} data-autofocus>
              <Icon name="print" size={18} /> Print / Save PDF
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
