import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Receipt from './Receipt.jsx';
import { Logo, initials } from './ui.jsx';
import { APP_HOST } from '../config.js';
import { STATUS_LABEL, calcTotals, formatDate, formatMoney, getStatus } from '../utils/invoice.js';
import { STATUS_FILTERS } from '../utils/printing.js';

/**
 * Renders a print job outside the app, prints it, then cleans up.
 * job.kind: 'invoices' -> { invoices, filters, summary, each }
 *           'statement' -> { statement }
 */
export default function PrintHost({ job, profile, onDone }) {
  const root = useRef(null);
  const prevTitle = useRef(null);
  const started = useRef(false);

  // show only the print pages while printing; tidy up after the print dialog closes
  useEffect(() => {
    prevTitle.current ??= document.title;
    document.body.classList.add('printing-batch');
    document.title = job.title;
    const finish = () => {
      document.body.classList.remove('printing-batch');
      document.title = prevTitle.current;
      onDone();
    };
    window.addEventListener('afterprint', finish, { once: true });
    return () => {
      window.removeEventListener('afterprint', finish);
      document.body.classList.remove('printing-batch');
      document.title = prevTitle.current;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // open the print dialog once (StrictMode runs effects twice in development)
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      // make sure fonts and logos are ready, or the PDF can come out blank in places
      await document.fonts?.ready;
      const imgs = [...(root.current?.querySelectorAll('img') || [])];
      await Promise.all(imgs.map((img) => img.decode?.().catch(() => {})));
      requestAnimationFrame(() => window.print());
    })();
  }, []);

  return createPortal(
    <div className="print-root" ref={root} aria-hidden="true">
      {job.kind === 'statement' ? (
        <Statement statement={job.statement} profile={profile} />
      ) : (
        <>
          {job.summary && <Summary invoices={job.invoices} filters={job.filters} profile={profile} />}
          {job.each &&
            job.invoices.map((inv) => (
              <section className="print-page" key={inv.id}>
                <Receipt invoice={inv} profile={profile} />
              </section>
            ))}
        </>
      )}
    </div>,
    document.body
  );
}

function DocHead({ profile, title, children }) {
  return (
    <header className="doc-head">
      <div className="r-brand">
        {profile.logo ? (
          <img className="r-logo" src={profile.logo} alt="" />
        ) : (
          <span className="r-monogram">{initials(profile.business || profile.firstName || 'Your business')}</span>
        )}
        <div>
          <strong>{profile.business || profile.firstName || 'Your business'}</strong>
          {profile.email && <span>{profile.email}</span>}
          {profile.phone && <span>{profile.phone}</span>}
        </div>
      </div>
      <div className="doc-title">
        <span className="eyebrow">{title}</span>
        {children}
      </div>
    </header>
  );
}

function DocFoot() {
  return (
    <footer className="doc-foot">
      <Logo tile={false} size={12} />
      <span>
        Made with <b>Kova</b>Bill · {APP_HOST}
      </span>
    </footer>
  );
}

function TotalsTable({ totals }) {
  return (
    <table className="doc-totals">
      <thead>
        <tr>
          <th>Currency</th>
          <th className="num">Billed</th>
          <th className="num">Paid</th>
          <th className="num">Outstanding</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(totals).map(([c, t]) => (
          <tr key={c}>
            <td>{c}</td>
            <td className="num">{formatMoney(t.billed, c)}</td>
            <td className="num">{formatMoney(t.paid, c)}</td>
            <td className="num strong">{formatMoney(t.outstanding, c)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Summary({ invoices, filters, profile }) {
  const totals = {};
  for (const inv of invoices) {
    const c = inv.currency;
    totals[c] ??= { billed: 0, paid: 0, outstanding: 0 };
    const s = getStatus(inv);
    if (s === 'draft') continue;
    const t = calcTotals(inv).total;
    totals[c].billed += t;
    totals[c][s === 'paid' ? 'paid' : 'outstanding'] += t;
  }
  const statusLabel = STATUS_FILTERS.find((f) => f.id === filters.status)?.label || 'All';

  return (
    <section className="print-page doc">
      <DocHead profile={profile} title="Invoice summary">
        <span className="doc-sub">{filters.period}</span>
      </DocHead>

      <dl className="doc-meta">
        <div>
          <dt>Status</dt>
          <dd>{statusLabel}</dd>
        </div>
        <div>
          <dt>Client</dt>
          <dd>{filters.client || 'All clients'}</dd>
        </div>
        <div>
          <dt>Invoices</dt>
          <dd>{invoices.length}</dd>
        </div>
        <div>
          <dt>Printed</dt>
          <dd>{formatDate(new Date().toISOString().slice(0, 10))}</dd>
        </div>
      </dl>

      <table className="doc-table">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Client</th>
            <th>Issued</th>
            <th>Due</th>
            <th>Status</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => {
            const s = getStatus(inv);
            return (
              <tr key={inv.id}>
                <td className="mono">{inv.number}</td>
                <td>{inv.toName || '—'}</td>
                <td>{formatDate(inv.date)}</td>
                <td>{formatDate(inv.dueDate)}</td>
                <td>
                  <span className={`doc-status s-${s}`}>{STATUS_LABEL[s]}</span>
                </td>
                <td className="num">{formatMoney(calcTotals(inv).total, inv.currency)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {Object.keys(totals).length > 0 && <TotalsTable totals={totals} />}
      <DocFoot />
    </section>
  );
}

function Statement({ statement, profile }) {
  const { client, invoices } = statement;
  const byCurrency = {};
  for (const inv of invoices) (byCurrency[inv.currency] ??= []).push(inv);

  return (
    <section className="print-page doc">
      <DocHead profile={profile} title="Statement of account">
        <span className="doc-sub">As of {formatDate(new Date().toISOString().slice(0, 10))}</span>
      </DocHead>

      <div className="r-to">
        <span className="eyebrow">Prepared for</span>
        <strong>{client.name}</strong>
        {client.email && <span>{client.email}</span>}
        {client.address && <span className="pre">{client.address}</span>}
      </div>

      {Object.entries(byCurrency).map(([c, list]) => {
        let running = 0;
        let due = 0;
        return (
          <div key={c} className="statement-block">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Issued</th>
                  <th>Invoice</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th className="num">Amount</th>
                  <th className="num">Paid</th>
                  <th className="num">Balance</th>
                </tr>
              </thead>
              <tbody>
                {list.map((inv) => {
                  const s = getStatus(inv);
                  const total = calcTotals(inv).total;
                  const paid = s === 'paid' ? total : 0;
                  running += total - paid;
                  if (s !== 'paid') due += total;
                  return (
                    <tr key={inv.id}>
                      <td>{formatDate(inv.date)}</td>
                      <td className="mono">{inv.number}</td>
                      <td>{formatDate(inv.dueDate)}</td>
                      <td>
                        <span className={`doc-status s-${s}`}>{STATUS_LABEL[s]}</span>
                      </td>
                      <td className="num">{formatMoney(total, c)}</td>
                      <td className="num">{paid ? formatMoney(paid, c) : '—'}</td>
                      <td className="num">{formatMoney(running, c)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="statement-due">
              <span>Amount due ({c})</span>
              <strong>{formatMoney(due, c)}</strong>
            </div>
          </div>
        );
      })}

      {(profile.bankName || profile.accountNumber) && (
        <div className="r-foot">
          <div>
            <span className="eyebrow">Pay to</span>
            {profile.bankName && <span>{profile.bankName}</span>}
            {profile.accountName && <span>{profile.accountName}</span>}
            {profile.accountNumber && <span className="mono">{profile.accountNumber}</span>}
          </div>
        </div>
      )}
      <DocFoot />
    </section>
  );
}
