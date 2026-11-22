import { calcTotals, formatNaira } from '../utils/invoice.js';

export default function InvoicePreview({ invoice }) {
  const { subtotal, vat, total } = calcTotals(invoice);

  return (
    <article className="card preview" id="invoice-preview">
      <header>
        <h2>INVOICE</h2>
        <div className="meta">
          <div><strong>{invoice.number}</strong></div>
          <div>Date: {invoice.date || '-'}</div>
          <div>Due: {invoice.dueDate || '-'}</div>
        </div>
      </header>

      <section className="parties">
        <div>
          <h4>From</h4>
          <p>{invoice.fromName || '—'}</p>
          <p>{invoice.fromEmail}</p>
        </div>
        <div>
          <h4>Bill to</h4>
          <p>{invoice.toName || '—'}</p>
          <p>{invoice.toEmail}</p>
        </div>
      </section>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th className="num">Qty</th>
            <th className="num">Price</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it) => (
            <tr key={it.id}>
              <td>{it.description || '—'}</td>
              <td className="num">{it.qty}</td>
              <td className="num">{formatNaira(it.price)}</td>
              <td className="num">{formatNaira((Number(it.qty) || 0) * (Number(it.price) || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="totals">
        <div><dt>Subtotal</dt><dd>{formatNaira(subtotal)}</dd></div>
        <div><dt>VAT ({invoice.vatRate || 0}%)</dt><dd>{formatNaira(vat)}</dd></div>
        <div className="grand"><dt>Total</dt><dd>{formatNaira(total)}</dd></div>
      </dl>

      {invoice.notes && <p className="notes">{invoice.notes}</p>}
    </article>
  );
}
