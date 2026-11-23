import { calcTotals, formatDate, formatMoney, getStatus, lineTotal } from '../utils/invoice.js';
import { Logo, initials } from './ui.jsx';
import { APP_HOST, APP_URL } from '../config.js';

const STAMP = { paid: 'Paid', overdue: 'Overdue', draft: 'Draft' };

// The printable invoice: a paper slip with a torn edge and a rubber stamp for its status.
export default function Receipt({ invoice, profile }) {
  const { subtotal, discount, vat, total } = calcTotals(invoice);
  const status = getStatus(invoice);
  const m = (v) => formatMoney(v, invoice.currency);
  const items = invoice.items.filter((it) => it.description || Number(it.price));
  const hasBank = profile.bankName || profile.accountNumber;

  return (
    <div className="receipt-wrap">
      <article className="receipt" aria-label={`Invoice ${invoice.number} preview`}>
        {STAMP[status] && (
          <div className={`stamp stamp-${status}`} aria-hidden="true">
            {STAMP[status]}
            {status === 'paid' && invoice.paidAt && <small>{formatDate(invoice.paidAt)}</small>}
          </div>
        )}

        <header className="r-head">
          <div className="r-brand">
            {profile.logo ? (
              <img className="r-logo" src={profile.logo} alt="" />
            ) : (
              <span className="r-monogram" aria-hidden="true">
                {initials(profile.business || profile.firstName || 'Your business')}
              </span>
            )}
            <div>
              <strong>{profile.business || profile.firstName || 'Your business'}</strong>
              {profile.email && <span>{profile.email}</span>}
              {profile.phone && <span>{profile.phone}</span>}
              {profile.address && <span className="pre">{profile.address}</span>}
            </div>
          </div>
          <div className="r-title">
            <span className="eyebrow">Invoice</span>
            <span className="mono">{invoice.number}</span>
          </div>
        </header>

        <div className="r-meta">
          <div>
            <span className="eyebrow">Issued</span>
            {formatDate(invoice.date)}
          </div>
          <div>
            <span className="eyebrow">Due</span>
            {formatDate(invoice.dueDate)}
          </div>
          <div className="r-due">
            <span className="eyebrow">Amount due</span>
            {m(status === 'paid' ? 0 : total)}
          </div>
        </div>

        <div className="r-to">
          <span className="eyebrow">Billed to</span>
          <strong>{invoice.toName || 'Client name'}</strong>
          {invoice.toEmail && <span>{invoice.toEmail}</span>}
          {invoice.toPhone && <span>{invoice.toPhone}</span>}
          {invoice.toAddress && <span className="pre">{invoice.toAddress}</span>}
        </div>

        <table className="r-items">
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col" className="num">Qty</th>
              <th scope="col" className="num">Rate</th>
              <th scope="col" className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan="4" className="r-empty">Add an item to see it here</td>
              </tr>
            )}
            {items.map((it) => (
              <tr key={it.id}>
                <td>
                  {it.description || 'Item'}
                  {it.detail && <small>{it.detail}</small>}
                </td>
                <td className="num">{it.qty}</td>
                <td className="num">{m(it.price)}</td>
                <td className="num">{m(lineTotal(it))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="r-totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{m(subtotal)}</dd>
          </div>
          {discount > 0 && (
            <div>
              <dt>Discount</dt>
              <dd>−{m(discount)}</dd>
            </div>
          )}
          {Number(invoice.vatRate) > 0 && (
            <div>
              <dt>VAT ({invoice.vatRate}%)</dt>
              <dd>{m(vat)}</dd>
            </div>
          )}
          <div className="r-grand">
            <dt>Total</dt>
            <dd>{m(total)}</dd>
          </div>
        </dl>

        {(hasBank || invoice.notes) && (
          <footer className="r-foot">
            {hasBank && (
              <div>
                <span className="eyebrow">Pay to</span>
                {profile.bankName && <span>{profile.bankName}</span>}
                {profile.accountName && <span>{profile.accountName}</span>}
                {profile.accountNumber && <span className="mono">{profile.accountNumber}</span>}
              </div>
            )}
            {invoice.notes && (
              <div>
                <span className="eyebrow">Note</span>
                <span className="pre">{invoice.notes}</span>
              </div>
            )}
          </footer>
        )}

        <a className="r-made" href={APP_URL} target="_blank" rel="noopener">
          <span className="r-made-text">
            <Logo tile={false} size={15} />
            <span>
              Made with <b>Kova</b>Bill · free invoicing that stays on your device
            </span>
          </span>
          <span className="mono r-made-url">{APP_HOST}</span>
        </a>
      </article>
    </div>
  );
}
