// ---------- money ----------
export const CURRENCIES = {
  NGN: { label: 'Nigerian Naira', locale: 'en-NG' },
  USD: { label: 'US Dollar', locale: 'en-US' },
  GBP: { label: 'British Pound', locale: 'en-GB' },
  EUR: { label: 'Euro', locale: 'en-IE' },
};

const fmtCache = new Map();
export function formatMoney(amount, currency = 'NGN', { compact = false } = {}) {
  const key = `${currency}:${compact}`;
  if (!fmtCache.has(key)) {
    fmtCache.set(
      key,
      new Intl.NumberFormat(CURRENCIES[currency]?.locale || 'en-US', {
        style: 'currency',
        currency,
        ...(compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}),
      })
    );
  }
  return fmtCache.get(key).format(amount || 0);
}

// Back-compat helper
export const formatNaira = (amount) => formatMoney(amount, 'NGN');

export const lineTotal = (it) => (Number(it.qty) || 0) * (Number(it.price) || 0);

export function calcTotals(invoice) {
  const subtotal = invoice.items.reduce((sum, it) => sum + lineTotal(it), 0);
  const discount = Math.min(subtotal, Math.max(0, Number(invoice.discount) || 0));
  const vat = ((subtotal - discount) * (Number(invoice.vatRate) || 0)) / 100;
  return { subtotal, discount, vat, total: subtotal - discount + vat };
}

// ---------- dates (local, not UTC) ----------
const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (iso) => new Date(`${iso}T00:00`);
export const todayISO = () => toISO(new Date());
export function addDays(iso, n) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
export function formatDate(iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return '—';
  return fromISO(iso).toLocaleDateString('en-GB', opts);
}
export function daysBetween(aISO, bISO) {
  return Math.round((fromISO(bISO) - fromISO(aISO)) / 86400000);
}

// ---------- status ----------
// stored: draft | sent | paid. "overdue" is derived from a sent invoice past its due date.
export function getStatus(inv) {
  if (inv.status === 'sent' && inv.dueDate && inv.dueDate < todayISO()) return 'overdue';
  return inv.status || 'draft';
}
export const STATUS_LABEL = { draft: 'Draft', sent: 'Sent', overdue: 'Overdue', paid: 'Paid' };

// ---------- factories ----------
export function newItem(fields = {}) {
  return { id: crypto.randomUUID(), description: '', detail: '', qty: 1, price: 0, ...fields };
}

export function nextNumber(invoices) {
  const max = invoices.reduce((m, inv) => {
    const n = parseInt(String(inv.number).match(/(\d+)\s*$/)?.[1] ?? '0', 10);
    return Math.max(m, n);
  }, 0);
  return `INV-${String(max + 1).padStart(3, '0')}`;
}

export function newInvoice({ number = 'INV-001', profile = {}, client = {} } = {}) {
  const date = todayISO();
  return {
    id: crypto.randomUUID(),
    number,
    date,
    dueDate: addDays(date, Number(profile.terms) || 14),
    status: 'draft',
    currency: profile.currency || 'NGN',
    toName: client.name || '',
    toEmail: client.email || '',
    toAddress: client.address || '',
    items: [newItem()],
    vatRate: profile.vatRate ?? 7.5, // Nigeria standard VAT
    discount: 0,
    notes: profile.notes ?? 'Thank you for your business.',
    createdAt: Date.now(),
  };
}

// Brings invoices saved by older versions up to the current shape.
export function migrateInvoice(raw) {
  return {
    dueDate: '',
    toAddress: '',
    discount: 0,
    notes: '',
    ...raw,
    status: raw.status || 'draft',
    currency: raw.currency || 'NGN',
    items: (raw.items?.length ? raw.items : [newItem()]).map((it) => ({ detail: '', ...it })),
  };
}

export const isBlank = (inv) =>
  !inv.toName.trim() && inv.items.every((it) => !it.description.trim() && !Number(it.price));

// ---------- aggregates ----------
export function overview(invoices, currency) {
  const list = invoices.filter((i) => i.currency === currency && i.status !== 'draft');
  const s = { billed: 0, paid: 0, outstanding: 0, unpaid: 0, overdue: 0, overdueAmount: 0, dueSoon: 0 };
  const today = todayISO();
  const weekAhead = addDays(today, 7);
  for (const inv of list) {
    const total = calcTotals(inv).total;
    s.billed += total;
    const st = getStatus(inv);
    if (st === 'paid') s.paid += total;
    else {
      s.outstanding += total;
      s.unpaid += 1;
      if (st === 'overdue') {
        s.overdue += 1;
        s.overdueAmount += total;
      } else if (inv.dueDate && inv.dueDate <= weekAhead) s.dueSoon += total;
    }
  }
  s.drafts = invoices.filter((i) => i.status === 'draft').length;
  s.rate = s.billed ? Math.round((s.paid / s.billed) * 100) : 0;
  s.otherCurrencies = invoices.some((i) => i.currency !== currency);
  return s;
}

// 12 weekly buckets ending this week: paid (by paid date) vs. still outstanding (by issue date)
export function weeklyPulse(invoices, currency, weeks = 12) {
  const today = fromISO(todayISO());
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay() - 7 * (weeks - 1)); // Sunday, N-1 weeks back
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i * 7);
    return { start: toISO(d), paid: 0, due: 0 };
  });
  const indexOf = (iso) => Math.floor((fromISO(iso) - start) / (7 * 86400000));
  for (const inv of invoices) {
    if (inv.currency !== currency || inv.status === 'draft') continue;
    const total = calcTotals(inv).total;
    const paid = inv.status === 'paid';
    const i = indexOf(paid ? inv.paidAt || inv.date : inv.date);
    if (i >= 0 && i < weeks) buckets[i][paid ? 'paid' : 'due'] += total;
  }
  return buckets;
}

export function groupClients(invoices) {
  const map = new Map();
  for (const inv of invoices) {
    const name = inv.toName.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!map.has(key))
      map.set(key, { name, email: '', address: '', count: 0, billed: {}, outstanding: {}, last: '' });
    const c = map.get(key);
    const total = calcTotals(inv).total;
    c.count += 1;
    if (inv.date >= c.last) {
      c.last = inv.date;
      c.email = inv.toEmail || c.email;
      c.address = inv.toAddress || c.address;
    }
    if (inv.status !== 'draft') {
      c.billed[inv.currency] = (c.billed[inv.currency] || 0) + total;
      if (inv.status !== 'paid')
        c.outstanding[inv.currency] = (c.outstanding[inv.currency] || 0) + total;
    }
  }
  return [...map.values()].sort((a, b) => (a.last < b.last ? 1 : -1));
}

export const formatMulti = (byCurrency) => {
  const parts = Object.entries(byCurrency).filter(([, v]) => v > 0);
  return parts.length ? parts.map(([c, v]) => formatMoney(v, c)).join(' · ') : formatMoney(0);
};

// ---------- plain-text invoice for email ----------
export function invoiceAsText(inv, profile, appUrl = '') {
  const { subtotal, discount, vat, total } = calcTotals(inv);
  const m = (v) => formatMoney(v, inv.currency);
  const lines = [
    `Hi ${inv.toName || 'there'},`,
    '',
    `Please find invoice ${inv.number} below${inv.dueDate ? `, due ${formatDate(inv.dueDate)}` : ''}.`,
    '',
    ...inv.items
      .filter((it) => it.description || Number(it.price))
      .map((it) => `• ${it.description || 'Item'} — ${it.qty} × ${m(it.price)} = ${m(lineTotal(it))}`),
    '',
    `Subtotal: ${m(subtotal)}`,
    ...(discount ? [`Discount: −${m(discount)}`] : []),
    ...(Number(inv.vatRate) ? [`VAT (${inv.vatRate}%): ${m(vat)}`] : []),
    `Total due: ${m(total)}`,
  ];
  if (profile.bankName || profile.accountNumber) {
    lines.push('', 'Payment details:');
    if (profile.bankName) lines.push(`Bank: ${profile.bankName}`);
    if (profile.accountName) lines.push(`Account name: ${profile.accountName}`);
    if (profile.accountNumber) lines.push(`Account number: ${profile.accountNumber}`);
  }
  if (inv.notes) lines.push('', inv.notes);
  lines.push('', profile.business || profile.firstName || '');
  if (appUrl) lines.push('', '—', `Sent with KovaBill, free invoicing: ${appUrl}`);
  return lines.join('\n');
}

// ---------- sample data ----------
export function sampleData() {
  const t = todayISO();
  const mk = (n, daysAgo, client, items, status, extra = {}) => {
    const date = addDays(t, -daysAgo);
    return migrateInvoice({
      id: crypto.randomUUID(),
      number: `INV-${String(n).padStart(3, '0')}`,
      date,
      dueDate: addDays(date, 14),
      status,
      paidAt: status === 'paid' ? addDays(date, extra.paidAfter ?? 6) : undefined,
      currency: 'NGN',
      toName: client.name,
      toEmail: client.email,
      toAddress: client.address,
      items: items.map(([description, detail, qty, price]) => newItem({ description, detail, qty, price })),
      vatRate: 7.5,
      discount: extra.discount || 0,
      notes: 'Payment by bank transfer within 14 days. Thank you!',
      createdAt: Date.now() - daysAgo * 86400000,
    });
  };
  const C = {
    digital: { name: 'Digital Institution', email: 'billing@digitalinstitution.example', address: 'Storvagen 105\n153 48 Stockholm' },
    bloom: { name: 'Lagos Bloom Studio', email: 'hello@lagosbloom.example', address: '12 Admiralty Way\nLekki, Lagos' },
    kano: { name: 'Kano Textiles', email: 'accounts@kanotextiles.example', address: '4 Bompai Road\nKano' },
    ada: { name: 'Ada Okafor', email: 'ada@okafor.example', address: 'Wuse II, Abuja' },
    bright: { name: 'Brightpath Logistics', email: 'finance@brightpath.example', address: '21 Aba Road\nPort Harcourt' },
  };
  const invoices = [
    mk(1, 80, C.bloom, [['Brand identity', 'Logo + guidelines', 1, 450000]], 'paid', { paidAfter: 9 }),
    mk(2, 66, C.kano, [['Product photography', '40 shots, edited', 1, 280000], ['Studio hire', 'Half day', 1, 60000]], 'paid'),
    mk(3, 52, C.digital, [['Backpack', 'Trebor corting', 4, 20000], ['Safety jacket', 'XXL size', 6, 30000]], 'paid', { paidAfter: 3 }),
    mk(4, 41, C.ada, [['Website refresh', 'Landing + 4 pages', 1, 620000]], 'paid', { paidAfter: 12 }),
    mk(5, 33, C.bright, [['Fleet dashboard', 'Sprint 1 of 3', 1, 900000]], 'sent'),
    mk(6, 24, C.bloom, [['Social campaign', 'December launch', 1, 350000]], 'paid', { paidAfter: 5 }),
    mk(7, 16, C.kano, [['Lookbook design', '24 pages', 1, 410000]], 'sent', { discount: 20000 }),
    mk(8, 8, C.bright, [['Fleet dashboard', 'Sprint 2 of 3', 1, 900000]], 'sent'),
    mk(9, 4, C.digital, [['Backpack', 'Trebor corting', 1, 20000], ['Safety jacket', 'XXL size', 1, 30000]], 'paid', { paidAfter: 1 }),
    mk(10, 1, C.ada, [['Maintenance retainer', 'January', 1, 150000]], 'draft'),
  ];
  return invoices.reverse();
}

export const byNewest = (a, b) =>
  (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0);

export function currencySymbol(currency = 'NGN') {
  try {
    return (
      new Intl.NumberFormat(CURRENCIES[currency]?.locale || 'en-US', {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
      })
        .formatToParts(0)
        .find((p) => p.type === 'currency')?.value || currency
    );
  } catch {
    return currency;
  }
}
