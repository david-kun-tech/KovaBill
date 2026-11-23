import { useEffect, useRef, useState } from 'react';
import { Avatar, Icon } from '../components/ui.jsx';
import Receipt from '../components/Receipt.jsx';
import NumberInput from '../components/NumberInput.jsx';
import { navigate } from '../hooks/useHashRoute.js';
import SendSheet from '../components/SendSheet.jsx';
import {
  CURRENCIES,
  currencySymbol,
  calcTotals,
  formatMoney,
  getStatus,
  isBlank,
  lineTotal,
  newItem,
} from '../utils/invoice.js';

const STEPS = [
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
  { id: 'paid', label: 'Paid' },
];

export default function Editor({ invoice, profile, clients, onChange, onStatus, onDelete, onDuplicate, notify }) {
  const [tab, setTab] = useState('edit');
  const [sending, setSending] = useState(false);
  const pickerRef = useRef(null);
  const emailRef = useRef(null);

  // Name the PDF after the invoice when printing
  useEffect(() => {
    if (!invoice) return;
    const prev = document.title;
    const before = () => (document.title = `${invoice.number} ${invoice.toName}`.trim());
    const after = () => (document.title = prev);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, [invoice?.number, invoice?.toName]);

  if (!invoice) {
    return (
      <div className="screen">
        <div className="empty">
          <h3>Invoice not found</h3>
          <p>It may have been deleted.</p>
          <a className="btn btn-ink" href="#/invoices">
            Back to invoices
          </a>
        </div>
      </div>
    );
  }

  const status = getStatus(invoice);
  const { total } = calcTotals(invoice);
  const m = (v) => formatMoney(v, invoice.currency);
  const symbol = currencySymbol(invoice.currency);
  const set = (field) => (e) => onChange({ ...invoice, [field]: e.target.value });
  const setItem = (id, field, value) =>
    onChange({ ...invoice, items: invoice.items.map((it) => (it.id === id ? { ...it, [field]: value } : it)) });
  const addItem = () => onChange({ ...invoice, items: [...invoice.items, newItem()] });
  const removeItem = (id) =>
    onChange({
      ...invoice,
      items: invoice.items.length > 1 ? invoice.items.filter((it) => it.id !== id) : [newItem()],
    });

  const pickClient = (c) => {
    onChange({ ...invoice, toName: c.name, toEmail: c.email, toAddress: c.address, toPhone: c.phone || '' });
    pickerRef.current?.removeAttribute('open');
  };

  const onClientName = (e) => {
    const name = e.target.value;
    const match = clients.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    onChange(
      match && !invoice.toEmail && !invoice.toAddress
        ? { ...invoice, toName: name, toEmail: match.email, toAddress: match.address, toPhone: match.phone || '' }
        : { ...invoice, toName: name }
    );
  };

  const sent = (kind, how) => {
    const where = { whatsapp: 'WhatsApp', gmail: 'Gmail', email: 'your email app', share: 'the share menu' }[how];
    if (kind === 'invoice' && invoice.status === 'draft') {
      onStatus(invoice, 'sent');
      notify(how === 'copy' ? 'Copied · marked as sent' : `Opened ${where} · marked as sent`);
    } else if (how !== 'copy') notify(`Opened ${where}`);
  };

  const markPaid = () => {
    onStatus(invoice, 'paid');
    notify(`${invoice.number} marked as paid`);
  };

  const actions =
    status === 'draft'
      ? { primary: { label: 'Send invoice', icon: 'send', run: () => setSending(true) } }
      : status === 'paid'
        ? { primary: { label: 'Send thank-you', icon: 'send', run: () => setSending(true) } }
        : {
            primary: { label: 'Mark as paid', icon: 'check', run: markPaid },
            secondary: { label: 'Send reminder', icon: 'send', run: () => setSending(true) },
          };

  const del = () => {
    if (isBlank(invoice) || confirm(`Delete ${invoice.number}? This can’t be undone.`)) {
      onDelete(invoice.id);
      navigate('/invoices');
      notify(`${invoice.number} deleted`);
    }
  };

  return (
    <div className="screen editor">
      <header className="editor-head no-print">
        <a href="#/invoices" className="icon-btn" aria-label="Back to invoices">
          <Icon name="back" size={22} />
        </a>
        <h1>{isBlank(invoice) ? 'Create new invoice' : `Invoice ${invoice.number}`}</h1>
        <div className="head-actions">
          <button className="icon-btn" onClick={() => onDuplicate(invoice)} aria-label="Duplicate invoice" title="Duplicate">
            <Icon name="copy" size={20} />
          </button>
          <button className="icon-btn" onClick={del} aria-label="Delete invoice" title="Delete">
            <Icon name="trash" size={20} />
          </button>
        </div>
      </header>

      <div className="seg no-print" role="tablist" aria-label="View">
        {['edit', 'preview'].map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t === 'edit' ? 'Edit' : 'Preview'}
          </button>
        ))}
      </div>

      <div className="editor-grid" data-tab={tab}>
        <section className="compose no-print" aria-label="Edit invoice">
          <ol className={`track track-${status}`} aria-label="Invoice status">
            {STEPS.map((s, i) => {
              const reached = STEPS.findIndex((x) => x.id === invoice.status) >= i;
              const label = s.id === 'sent' && status === 'overdue' ? 'Overdue' : s.label;
              return (
                <li key={s.id}>
                  <button
                    className={reached ? 'on' : ''}
                    aria-current={invoice.status === s.id ? 'step' : undefined}
                    onClick={() => onStatus(invoice, s.id)}
                  >
                    <span className="track-dot" aria-hidden="true">
                      {reached && <Icon name="check" size={12} />}
                    </span>
                    {label}
                  </button>
                </li>
              );
            })}
          </ol>

          <h2 className="label-lg">Send to</h2>
          <div className="ticket">
            <div className="ticket-body">
              <label className="sr-only" htmlFor="toName">
                Client name
              </label>
              <input
                id="toName"
                className="ticket-name"
                placeholder="Client name"
                value={invoice.toName}
                onChange={onClientName}
                list="client-names"
                autoComplete="off"
              />
              <datalist id="client-names">
                {clients.map((c) => (
                  <option key={c.name} value={c.name} />
                ))}
              </datalist>
              <label className="sr-only" htmlFor="toAddress">
                Client address
              </label>
              <textarea
                id="toAddress"
                rows="2"
                className="ticket-line"
                placeholder="Street, city"
                value={invoice.toAddress}
                onChange={set('toAddress')}
              />
              <label className="sr-only" htmlFor="toEmail">
                Client email
              </label>
              <input
                id="toEmail"
                ref={emailRef}
                type="email"
                className="ticket-line strong"
                placeholder="client@email.com"
                value={invoice.toEmail}
                onChange={set('toEmail')}
              />
              <label className="sr-only" htmlFor="toPhone">
                Client WhatsApp number
              </label>
              <input
                id="toPhone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                className="ticket-line"
                placeholder="WhatsApp number (optional)"
                value={invoice.toPhone || ''}
                onChange={set('toPhone')}
              />
            </div>
            <div className="ticket-stub">
              <details className="picker" ref={pickerRef}>
                <summary className="round-btn" aria-label="Choose a saved client">
                  <Icon name="arrow" size={20} />
                </summary>
                <div className="picker-menu">
                  <p className="picker-title">Saved clients</p>
                  {clients.length === 0 && <p className="muted small">Clients you bill show up here.</p>}
                  <ul>
                    {clients.map((c) => (
                      <li key={c.name}>
                        <button type="button" onClick={() => pickClient(c)}>
                          <Avatar name={c.name} size="sm" />
                          <span>
                            {c.name}
                            <small>{c.email}</small>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </div>
          </div>

          <div className="meta-grid">
            <label className="field">
              <span className="field-label">Invoice no.</span>
              <input className="mono" value={invoice.number} onChange={set('number')} />
            </label>
            <label className="field">
              <span className="field-label">Issued</span>
              <input type="date" value={invoice.date} onChange={set('date')} />
            </label>
            <label className="field">
              <span className="field-label">Due</span>
              <input type="date" value={invoice.dueDate} min={invoice.date} onChange={set('dueDate')} />
            </label>
            <label className="field">
              <span className="field-label">Currency</span>
              <select value={invoice.currency} onChange={set('currency')}>
                {Object.keys(CURRENCIES).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="section-head">
            <h2 className="label-lg">Invoice details</h2>
            <button className="link-btn" onClick={addItem}>
              <Icon name="plus" size={16} /> Add item
            </button>
          </div>

          <ul className="items">
            {invoice.items.map((it, i) => (
              <li key={it.id} className="item">
                <Avatar name={it.description || String(i + 1)} square />
                <div className="item-text">
                  <input
                    className="item-name"
                    placeholder="Item or service"
                    aria-label={`Item ${i + 1} description`}
                    value={it.description}
                    onChange={(e) => setItem(it.id, 'description', e.target.value)}
                  />
                  <input
                    className="item-detail"
                    placeholder="Details (optional)"
                    aria-label={`Item ${i + 1} details`}
                    value={it.detail}
                    onChange={(e) => setItem(it.id, 'detail', e.target.value)}
                  />
                </div>
                <div className="item-nums">
                  <label className="num-box qty">
                    <NumberInput
                      aria-label={`Item ${i + 1} quantity`}
                      placeholder="1"
                      value={it.qty}
                      onValue={(n) => setItem(it.id, 'qty', n)}
                    />
                    <span className="num-affix" aria-hidden="true">
                      qty
                    </span>
                  </label>
                  <span aria-hidden="true">×</span>
                  <label className="num-box price">
                    <span className="num-affix" aria-hidden="true">
                      {symbol}
                    </span>
                    <NumberInput
                      id={`price-${it.id}`}
                      aria-label={`Item ${i + 1} unit price`}
                      placeholder="Price"
                      value={it.price}
                      onValue={(n) => setItem(it.id, 'price', n)}
                    />
                  </label>
                </div>
                {/* clicking the amount takes you to the price */}
                <label className="item-total" htmlFor={`price-${it.id}`} title="Edit price">
                  {m(lineTotal(it))}
                </label>
                <button className="icon-btn sm" onClick={() => removeItem(it.id)} aria-label={`Remove item ${i + 1}`}>
                  <Icon name="x" size={16} />
                </button>
              </li>
            ))}
          </ul>
          <button className="add-row" onClick={addItem}>
            <Icon name="plus" size={18} /> Add another item
          </button>

          <div className="adjust">
            <label className="field">
              <span className="field-label">VAT %</span>
              <NumberInput value={invoice.vatRate} onValue={(n) => onChange({ ...invoice, vatRate: n })} placeholder="0" />
            </label>
            <label className="field">
              <span className="field-label">Discount ({invoice.currency})</span>
              <NumberInput value={invoice.discount} onValue={(n) => onChange({ ...invoice, discount: n })} placeholder="0" />
            </label>
          </div>

          <div className="total-line">
            <span>Total amount</span>
            <strong>{m(total)}</strong>
          </div>

          <label className="field">
            <span className="field-label">Note to client</span>
            <textarea rows="2" value={invoice.notes} onChange={set('notes')} />
          </label>

          <div className="cta">
            <div className="cta-row">
              <button className="btn btn-soft btn-block" onClick={() => window.print()}>
                Download PDF <Icon name="download" size={18} />
              </button>
              {actions.secondary && (
                <button className="btn btn-soft btn-block" onClick={actions.secondary.run}>
                  {actions.secondary.label} <Icon name={actions.secondary.icon} size={18} />
                </button>
              )}
            </div>
            <button className="btn btn-ink btn-block btn-lg" onClick={actions.primary.run}>
              {actions.primary.label} <Icon name={actions.primary.icon} size={18} />
            </button>
          </div>

          {sending && (
            <SendSheet
              invoice={invoice}
              profile={profile}
              onSent={sent}
              onClose={() => setSending(false)}
              notify={notify}
            />
          )}
        </section>

        <aside className="preview-pane" aria-label="Invoice preview">
          <Receipt invoice={invoice} profile={profile} />
        </aside>
      </div>
    </div>
  );
}
