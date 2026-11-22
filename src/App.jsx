import { useState } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { newInvoice } from './utils/invoice.js';
import InvoiceForm from './components/InvoiceForm.jsx';
import InvoicePreview from './components/InvoicePreview.jsx';
import SavedInvoices from './components/SavedInvoices.jsx';

export default function App() {
  const [saved, setSaved] = useLocalStorage('invoices', []);
  const [draft, setDraft] = useState(() => newInvoice(saved.length + 1));

  const save = () =>
    setSaved((list) =>
      list.some((i) => i.id === draft.id)
        ? list.map((i) => (i.id === draft.id ? draft : i))
        : [draft, ...list]
    );

  const remove = (id) => {
    setSaved((list) => list.filter((i) => i.id !== id));
    if (id === draft.id) setDraft(newInvoice(saved.length + 1));
  };

  const startNew = () => setDraft(newInvoice(saved.length + 1));

  return (
    <div className="app">
      <header className="topbar no-print">
        <h1>Invoice Generator</h1>
        <div className="actions">
          <button className="ghost" onClick={startNew}>New</button>
          <button onClick={save}>Save</button>
          <button className="primary" onClick={() => window.print()}>Print / PDF</button>
        </div>
      </header>

      <main className="layout">
        <div className="no-print">
          <InvoiceForm invoice={draft} onChange={setDraft} />
          <SavedInvoices invoices={saved} activeId={draft.id} onOpen={setDraft} onDelete={remove} />
        </div>
        <InvoicePreview invoice={draft} />
      </main>
    </div>
  );
}
