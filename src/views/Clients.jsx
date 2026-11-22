import { useMemo } from 'react';
import { Avatar, Icon } from '../components/ui.jsx';
import { formatDate, formatMulti, groupClients, todayISO } from '../utils/invoice.js';
import { statementFor } from '../utils/printing.js';

export default function Clients({ invoices, onCreate, onPrint }) {
  const clients = useMemo(() => groupClients(invoices), [invoices]);

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <h1>Clients</h1>
          <p className="muted">Built automatically from the people you invoice.</p>
        </div>
      </header>

      {clients.length === 0 ? (
        <div className="empty">
          <h3>No clients yet</h3>
          <p>Add a client name to an invoice and they’ll appear here, ready to bill again.</p>
          <button className="btn btn-ink" onClick={() => onCreate()}>
            <Icon name="plus" size={18} /> New invoice
          </button>
        </div>
      ) : (
        <ul className="client-grid">
          {clients.map((c) => {
            const owes = Object.values(c.outstanding).some((v) => v > 0);
            return (
              <li key={c.name} className="client-card">
                <div className="client-top">
                  <Avatar name={c.name} size="lg" />
                  <div>
                    <h2>{c.name}</h2>
                    <p className="muted">{c.email || 'No email'}</p>
                  </div>
                </div>
                <dl className="client-stats">
                  <div>
                    <dt>Invoices</dt>
                    <dd>{c.count}</dd>
                  </div>
                  <div>
                    <dt>Billed</dt>
                    <dd>{formatMulti(c.billed)}</dd>
                  </div>
                  <div className={owes ? 'owes' : ''}>
                    <dt>Owes you</dt>
                    <dd>{formatMulti(c.outstanding)}</dd>
                  </div>
                </dl>
                <div className="client-foot">
                  <span className="muted">Last billed {formatDate(c.last, { day: 'numeric', month: 'short' })}</span>
                  <div className="client-actions">
                    <button
                      className="btn btn-soft btn-sm"
                      disabled={!Object.keys(c.billed).length}
                      title={Object.keys(c.billed).length ? 'Print or save a statement' : 'No sent invoices yet'}
                      onClick={() =>
                        onPrint({
                          kind: 'statement',
                          statement: statementFor(invoices, c.name),
                          title: `Statement ${c.name} ${todayISO()}`,
                        })
                      }
                    >
                      <Icon name="statement" size={16} /> Statement
                    </button>
                    <button className="btn btn-soft btn-sm" onClick={() => onCreate(c)}>
                      Bill again <Icon name="arrow" size={16} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
