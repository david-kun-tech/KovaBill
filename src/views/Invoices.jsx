import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/ui.jsx';
import { InvoiceRow } from './Home.jsx';
import PrintDialog from '../components/PrintDialog.jsx';
import { byNewest, calcTotals, formatMoney, getStatus } from '../utils/invoice.js';

const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'draft', label: 'Draft', test: (s) => s === 'draft' },
  { id: 'unpaid', label: 'Unpaid', test: (s) => s === 'sent' || s === 'overdue' },
  { id: 'overdue', label: 'Overdue', test: (s) => s === 'overdue' },
  { id: 'paid', label: 'Paid', test: (s) => s === 'paid' },
];

export default function Invoices({ invoices, query, onCreate, onPrint, notify, profileName = '' }) {
  const [printing, setPrinting] = useState(false);
  const initial = FILTERS.some((f) => f.id === query.get('status')) ? query.get('status') : 'all';
  const [filter, setFilter] = useState(initial);
  const [q, setQ] = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    if (query.get('focus') === 'search') searchRef.current?.focus();
  }, [query]);

  const withStatus = useMemo(() => invoices.map((inv) => ({ inv, status: getStatus(inv) })), [invoices]);
  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, withStatus.filter((x) => f.test(x.status)).length])),
    [withStatus]
  );

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const test = FILTERS.find((f) => f.id === filter).test;
    return withStatus
      .filter((x) => test(x.status))
      .filter(
        ({ inv }) =>
          !needle ||
          [inv.number, inv.toName, inv.toEmail, ...inv.items.map((i) => i.description)].some((v) =>
            String(v || '').toLowerCase().includes(needle)
          )
      )
      .sort((a, b) => byNewest(a.inv, b.inv));
  }, [withStatus, filter, q]);

  // total per currency of what's visible
  const sums = shown.reduce((acc, { inv }) => {
    acc[inv.currency] = (acc[inv.currency] || 0) + calcTotals(inv).total;
    return acc;
  }, {});

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <h1>Invoices</h1>
          <p className="muted">
            {shown.length} shown
            {Object.entries(sums).map(([c, v]) => ` · ${formatMoney(v, c)}`)}
          </p>
        </div>
        <div className="head-actions">
          <button
            className="btn btn-soft"
            onClick={() => setPrinting(true)}
            disabled={!invoices.length}
            aria-label="Print and export invoices"
          >
            <Icon name="print" size={18} /> <span className="hide-sm">Print & export</span>
          </button>
          <button className="btn btn-ink hide-sm" onClick={() => onCreate()}>
            <Icon name="plus" size={18} /> New invoice
          </button>
        </div>
      </header>

      {printing && (
        <PrintDialog
          invoices={invoices}
          initialStatus={filter}
          notify={notify}
          onClose={() => setPrinting(false)}
          onPrint={(job) =>
            onPrint({ ...job, title: `${profileName ? profileName + ' ' : ''}invoices ${job.filters.period}`.trim() })
          }
        />
      )}

      <div className="toolbar">
        <label className="search">
          <Icon name="search" size={18} />
          <span className="sr-only">Search invoices</span>
          <input
            ref={searchRef}
            type="search"
            placeholder="Search client, number or item"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div className="chips" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`chip chip-${f.id}`}
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              <span className="chip-count">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {shown.length ? (
        <ul className="inv-list">
          {shown.map(({ inv }) => (
            <InvoiceRow key={inv.id} inv={inv} />
          ))}
        </ul>
      ) : (
        <div className="empty">
          <h3>{invoices.length ? 'Nothing matches' : 'No invoices yet'}</h3>
          <p>{invoices.length ? 'Try another filter or search term.' : 'Your invoices will line up here.'}</p>
          {!invoices.length && (
            <button className="btn btn-ink" onClick={() => onCreate()}>
              <Icon name="plus" size={18} /> New invoice
            </button>
          )}
        </div>
      )}
    </div>
  );
}
