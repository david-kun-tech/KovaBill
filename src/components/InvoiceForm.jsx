import { newItem } from '../utils/invoice.js';

export default function InvoiceForm({ invoice, onChange }) {
  const set = (field) => (e) => onChange({ ...invoice, [field]: e.target.value });

  const setItem = (id, field, value) =>
    onChange({
      ...invoice,
      items: invoice.items.map((it) => (it.id === id ? { ...it, [field]: value } : it)),
    });

  const addItem = () => onChange({ ...invoice, items: [...invoice.items, newItem()] });

  const removeItem = (id) =>
    onChange({
      ...invoice,
      items: invoice.items.length > 1 ? invoice.items.filter((it) => it.id !== id) : invoice.items,
    });

  return (
    <form className="card form" onSubmit={(e) => e.preventDefault()}>
      <h2>Invoice details</h2>

      <div className="grid-3">
        <label>
          Invoice no.
          <input value={invoice.number} onChange={set('number')} />
        </label>
        <label>
          Date
          <input type="date" value={invoice.date} onChange={set('date')} />
        </label>
        <label>
          Due date
          <input type="date" value={invoice.dueDate} onChange={set('dueDate')} />
        </label>
      </div>

      <div className="grid-2">
        <fieldset>
          <legend>From</legend>
          <label>
            Name / business
            <input value={invoice.fromName} onChange={set('fromName')} placeholder="Your name" />
          </label>
          <label>
            Email
            <input type="email" value={invoice.fromEmail} onChange={set('fromEmail')} />
          </label>
        </fieldset>
        <fieldset>
          <legend>Bill to</legend>
          <label>
            Client
            <input value={invoice.toName} onChange={set('toName')} placeholder="Client name" />
          </label>
          <label>
            Email
            <input type="email" value={invoice.toEmail} onChange={set('toEmail')} />
          </label>
        </fieldset>
      </div>

      <h3>Line items</h3>
      {invoice.items.map((it) => (
        <div className="item-row" key={it.id}>
          <input
            className="desc"
            placeholder="Description"
            value={it.description}
            onChange={(e) => setItem(it.id, 'description', e.target.value)}
          />
          <input
            type="number"
            min="0"
            aria-label="Quantity"
            value={it.qty}
            onChange={(e) => setItem(it.id, 'qty', e.target.value)}
          />
          <input
            type="number"
            min="0"
            aria-label="Unit price"
            value={it.price}
            onChange={(e) => setItem(it.id, 'price', e.target.value)}
          />
          <button type="button" className="icon" onClick={() => removeItem(it.id)} aria-label="Remove item">
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="ghost" onClick={addItem}>
        + Add item
      </button>

      <div className="grid-2">
        <label>
          VAT (%)
          <input type="number" min="0" step="0.1" value={invoice.vatRate} onChange={set('vatRate')} />
        </label>
      </div>

      <label>
        Notes
        <textarea rows="3" value={invoice.notes} onChange={set('notes')} />
      </label>
    </form>
  );
}
