import { calcTotals, formatNaira } from '../utils/invoice.js';

export default function SavedInvoices({ invoices, activeId, onOpen, onDelete }) {
  if (invoices.length === 0) {
    return (
      <section className="card saved">
        <h2>Saved invoices</h2>
        <p className="muted">Nothing saved yet. Fill in an invoice and hit Save.</p>
      </section>
    );
  }

  return (
    <section className="card saved">
      <h2>Saved invoices</h2>
      <ul>
        {invoices.map((inv) => (
          <li key={inv.id} className={inv.id === activeId ? 'active' : ''}>
            <button className="link" onClick={() => onOpen(inv)}>
              <strong>{inv.number}</strong> · {inv.toName || 'No client'}
            </button>
            <span>{formatNaira(calcTotals(inv).total)}</span>
            <button className="icon" onClick={() => onDelete(inv.id)} aria-label={`Delete ${inv.number}`}>
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
