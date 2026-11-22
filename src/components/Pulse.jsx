import { useState } from 'react';
import { formatDate, formatMoney } from '../utils/invoice.js';

// Revenue "pulse": paid money rises above the baseline, money still owed hangs below it.
export default function Pulse({ data, currency }) {
  const [hover, setHover] = useState(null);
  const W = 240;
  const H = 120;
  const mid = H / 2;
  const slot = W / data.length;
  const barW = Math.min(8, slot - 4); // keeps a gap between neighbours
  const max = Math.max(1, ...data.map((d) => Math.max(d.paid, d.due)));
  const h = (v) => (v > 0 ? Math.max(4, (v / max) * (mid - 6)) : 0);
  const totalPaid = data.reduce((s, d) => s + d.paid, 0);
  const totalDue = data.reduce((s, d) => s + d.due, 0);
  const active = hover != null ? data[hover] : null;

  return (
    <div className="pulse">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Last ${data.length} weeks: ${formatMoney(totalPaid, currency)} collected, ${formatMoney(totalDue, currency)} still outstanding`}
        onMouseLeave={() => setHover(null)}
      >
        <line x1="0" x2={W} y1={mid} y2={mid} className="pulse-base" />
        {data.map((d, i) => {
          const x = i * slot + slot / 2;
          const up = h(d.paid);
          const down = h(d.due);
          return (
            <g
              key={d.start}
              className={hover === i ? 'is-hover' : hover != null ? 'is-dim' : ''}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              tabIndex={0}
              aria-label={`Week of ${formatDate(d.start)}: ${formatMoney(d.paid, currency)} paid, ${formatMoney(d.due, currency)} outstanding`}
            >
              <rect x={i * slot} y="0" width={slot} height={H} className="pulse-hit" />
              {up > 0 && (
                <rect x={x - barW / 2} y={mid - 1 - up} width={barW} height={up} rx={barW / 2} className="pulse-paid" />
              )}
              {down > 0 && (
                <rect x={x - barW / 2} y={mid + 1} width={barW} height={down} rx={barW / 2} className="pulse-due" />
              )}
              {!up && !down && <circle cx={x} cy={mid} r="1.6" className="pulse-empty" />}
            </g>
          );
        })}
      </svg>
      <div className="pulse-foot" aria-live="polite">
        {active ? (
          <span>
            Wk of {formatDate(active.start, { day: 'numeric', month: 'short' })} ·{' '}
            <b>{formatMoney(active.paid, currency, { compact: true })}</b> in ·{' '}
            {formatMoney(active.due, currency, { compact: true })} owed
          </span>
        ) : (
          <span className="pulse-legend">
            <i className="key key-paid" aria-hidden="true" /> Paid
            <i className="key key-due" aria-hidden="true" /> Outstanding
          </span>
        )}
      </div>
    </div>
  );
}
