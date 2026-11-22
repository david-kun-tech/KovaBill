// Helpers for "print all", CSV export and client statements.
import { addDays, byNewest, calcTotals, formatDate, fromISO, getStatus, todayISO } from './invoice.js';

export const STATUS_FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'unpaid', label: 'Unpaid', test: (s) => s === 'sent' || s === 'overdue' },
  { id: 'overdue', label: 'Overdue', test: (s) => s === 'overdue' },
  { id: 'paid', label: 'Paid', test: (s) => s === 'paid' },
  { id: 'draft', label: 'Draft', test: (s) => s === 'draft' },
];

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Date-range presets, computed from today. */
export function datePresets() {
  const t = fromISO(todayISO());
  const y = t.getFullYear();
  const m = t.getMonth();
  const q = Math.floor(m / 3) * 3;
  return [
    { id: 'all', label: 'All time', from: '', to: '' },
    { id: 'month', label: 'This month', from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) },
    { id: 'last-month', label: 'Last month', from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) },
    { id: 'quarter', label: 'This quarter', from: iso(new Date(y, q, 1)), to: iso(new Date(y, q + 3, 0)) },
    { id: 'year', label: 'This year', from: iso(new Date(y, 0, 1)), to: iso(new Date(y, 11, 31)) },
    { id: 'last-90', label: 'Last 90 days', from: addDays(todayISO(), -89), to: todayISO() },
  ];
}

export function filterInvoices(invoices, { status = 'all', from = '', to = '', client = '' } = {}) {
  const test = STATUS_FILTERS.find((f) => f.id === status)?.test || (() => true);
  const c = client.trim().toLowerCase();
  return invoices
    .filter((inv) => test(getStatus(inv)))
    .filter((inv) => (!from || inv.date >= from) && (!to || inv.date <= to))
    .filter((inv) => !c || inv.toName.trim().toLowerCase() === c)
    .slice()
    .sort((a, b) => byNewest(b, a)); // oldest first reads naturally on paper
}

export function periodLabel(from, to) {
  if (!from && !to) return 'All time';
  if (from && to) return `${formatDate(from)} – ${formatDate(to)}`;
  return from ? `From ${formatDate(from)}` : `Up to ${formatDate(to)}`;
}

/** Totals per currency: billed (excl. drafts), paid, outstanding. */
export function totalsByCurrency(invoices) {
  const out = {};
  for (const inv of invoices) {
    const c = inv.currency;
    out[c] ??= { billed: 0, paid: 0, outstanding: 0, drafts: 0 };
    const total = calcTotals(inv).total;
    const s = getStatus(inv);
    if (s === 'draft') out[c].drafts += total;
    else {
      out[c].billed += total;
      if (s === 'paid') out[c].paid += total;
      else out[c].outstanding += total;
    }
  }
  return out;
}

// ---------- CSV ----------
const cell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function invoicesToCSV(invoices) {
  const head = ['Invoice', 'Client', 'Client email', 'Issued', 'Due', 'Status', 'Paid on', 'Currency', 'Subtotal', 'Discount', 'VAT %', 'VAT', 'Total', 'Items'];
  const rows = invoices.map((inv) => {
    const t = calcTotals(inv);
    const r = (n) => Math.round(n * 100) / 100;
    return [
      inv.number,
      inv.toName,
      inv.toEmail,
      inv.date,
      inv.dueDate,
      getStatus(inv),
      inv.status === 'paid' ? inv.paidAt || '' : '',
      inv.currency,
      r(t.subtotal),
      r(t.discount),
      Number(inv.vatRate) || 0,
      r(t.vat),
      r(t.total),
      inv.items.filter((it) => it.description).map((it) => `${it.description} × ${it.qty}`).join('; '),
    ];
  });
  // BOM so Excel opens ₦ and other symbols correctly
  return '﻿' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}

// ---------- client statement ----------
export function statementFor(invoices, clientName) {
  const key = clientName.trim().toLowerCase();
  const list = invoices
    .filter((i) => i.status !== 'draft' && i.toName.trim().toLowerCase() === key)
    .slice()
    .sort((a, b) => byNewest(b, a));
  const latest = list.at(-1);
  return {
    client: { name: clientName, email: latest?.toEmail || '', address: latest?.toAddress || '' },
    invoices: list,
    totals: totalsByCurrency(list),
  };
}
