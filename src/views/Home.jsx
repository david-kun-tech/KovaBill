import { useMemo } from 'react';
import { Avatar, Icon, Logo, Ring, StatusPill } from '../components/ui.jsx';
import Pulse from '../components/Pulse.jsx';
import InstallBanner from '../components/InstallBanner.jsx';
import BackupReminder from '../components/BackupReminder.jsx';
import {
  byNewest,
  calcTotals,
  daysBetween,
  formatDate,
  formatMoney,
  getStatus,
  groupClients,
  overview,
  todayISO,
  weeklyPulse,
} from '../utils/invoice.js';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Home({ invoices, profile, onCreate, onLoadSample, notify, backup, onBackup }) {
  const cur = profile.currency;
  const s = useMemo(() => overview(invoices, cur), [invoices, cur]);
  const pulse = useMemo(() => weeklyPulse(invoices, cur), [invoices, cur]);
  const clients = useMemo(() => groupClients(invoices), [invoices]);
  const recent = invoices.slice().sort(byNewest).slice(0, 5);
  const thisMonth = pulse.slice(-4).reduce((sum, w) => sum + w.paid, 0);
  const name = profile.firstName || profile.business.split(' ')[0];

  return (
    <div className="screen home">
      <header className="home-top">
        <a href="#/" className="home-logo" aria-label="KovaBill home">
          <Logo size={40} />
        </a>
        <a href="#/settings" className="me" aria-label="Your profile">
          <Avatar name={name || 'K B'} size="lg" />
        </a>
        <a href="#/invoices?focus=search" className="icon-btn" aria-label="Search invoices">
          <Icon name="search" size={22} />
        </a>
      </header>

      <div className="hello rise">
        <h1>
          <span className="hello-small">{greeting()},</span> <strong>{name || 'there'}</strong>
        </h1>
        <p className="hello-sub">
          {s.unpaid ? (
            <>
              <b>{formatMoney(s.outstanding, cur)}</b> is waiting on {s.unpaid} invoice{s.unpaid === 1 ? '' : 's'}
              {s.dueSoon > 0 && <> · {formatMoney(s.dueSoon, cur, { compact: true })} due this week</>}.
            </>
          ) : invoices.length ? (
            'Everything you’ve sent is paid. Nice.'
          ) : (
            'Let’s get you paid. Create your first invoice in under a minute.'
          )}
        </p>
      </div>

      {backup.needsBackup ? (
        <BackupReminder backup={backup} invoiceCount={invoices.length} onBackup={onBackup} />
      ) : (
        invoices.length > 0 && <InstallBanner notify={notify} />
      )}

      <h2 className="section-title">Overview</h2>
      <div className="bento">
        <a href="#/invoices?status=unpaid" className="tile tile-lime t-unpaid rise">
          <span className="tile-icon dark">
            <Icon name="invoice" size={18} />
          </span>
          <span className="tile-name">Invoices</span>
          <span className="tile-num">{s.unpaid}</span>
          <span className="tile-cap">Unpaid</span>
          {s.overdue > 0 && (
            <span className="tile-warn">
              <Icon name="alert" size={14} /> {s.overdue} overdue
            </span>
          )}
          <span className="tile-cta">
            View all <Icon name="arrow" size={16} />
          </span>
        </a>

        <a href="#/clients" className="tile t-clients rise">
          <span className="tile-icon">
            <Icon name="layers" size={18} />
          </span>
          <span className="tile-name">Clients</span>
          <span className="tile-num">{clients.length}</span>
          <span className="tile-cap">{s.drafts ? `${s.drafts} draft${s.drafts === 1 ? '' : 's'} open` : 'Active'}</span>
        </a>

        <div className="tile t-ring rise">
          <span className="tile-icon">
            <Icon name="ring" size={18} />
          </span>
          <span className="tile-name">Collected</span>
          <Ring value={s.rate} label="of billed revenue collected" />
          <span className="tile-cap center">
            {formatMoney(s.paid, cur, { compact: true })} of {formatMoney(s.billed, cur, { compact: true })}
          </span>
        </div>

        <div className="tile t-pulse rise">
          <span className="tile-icon">
            <Icon name="coins" size={18} />
          </span>
          <span className="tile-name">Revenue</span>
          <span className="tile-money">{formatMoney(thisMonth, cur)}</span>
          <span className="tile-cap">Collected, last 4 weeks</span>
          <Pulse data={pulse} currency={cur} />
        </div>
      </div>
      {s.otherCurrencies && <p className="fineprint">Overview shows {cur} invoices. Change your main currency in Settings.</p>}

      <section className="recent rise">
        <div className="section-head">
          <h2 className="section-title">Recent invoices</h2>
          {invoices.length > 0 && (
            <a href="#/invoices" className="link-btn">
              See all
            </a>
          )}
        </div>
        {invoices.length === 0 ? (
          <div className="empty">
            <div className="empty-art" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <h3>No invoices yet</h3>
            <p>Create one from scratch, or load a sample workspace to explore KovaBill.</p>
            <div className="row-btns">
              <button className="btn btn-ink" onClick={onCreate}>
                <Icon name="plus" size={18} /> New invoice
              </button>
              <button className="btn btn-soft" onClick={onLoadSample}>
                <Icon name="sparkle" size={18} /> Load sample data
              </button>
            </div>
          </div>
        ) : (
          <ul className="inv-list">
            {recent.map((inv) => (
              <InvoiceRow key={inv.id} inv={inv} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function InvoiceRow({ inv }) {
  const status = getStatus(inv);
  const late = status === 'overdue' ? daysBetween(inv.dueDate, todayISO()) : 0;
  const short = { day: 'numeric', month: 'short' };
  return (
    <li>
      <a href={`#/invoice/${inv.id}`} className={`inv-row is-${status}`}>
        {late ? (
          <span className="late-av">
            <Avatar name={inv.toName || '?'} />
            <span className="late-badge" aria-hidden="true">{late}d</span>
          </span>
        ) : (
          <Avatar name={inv.toName || '?'} />
        )}
        <span className="inv-main">
          <strong>{inv.toName || 'Untitled client'}</strong>
          <span className="inv-sub">
            <span className="mono">{inv.number}</span> ·{' '}
            {status === 'paid' ? (
              `Paid ${formatDate(inv.paidAt, short)}`
            ) : late ? (
              <span className="late-text">
                {late} day{late === 1 ? '' : 's'} late
              </span>
            ) : (
              `Due ${formatDate(inv.dueDate, short)}`
            )}
          </span>
        </span>
        <span className="inv-end">
          <strong>{formatMoney(calcTotals(inv).total, inv.currency)}</strong>
          <StatusPill status={status} />
        </span>
      </a>
    </li>
  );
}
