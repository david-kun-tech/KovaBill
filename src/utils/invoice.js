export const formatNaira = (amount) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount || 0);

export function calcTotals(invoice) {
  const subtotal = invoice.items.reduce(
    (sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0),
    0
  );
  const vat = (subtotal * (Number(invoice.vatRate) || 0)) / 100;
  return { subtotal, vat, total: subtotal + vat };
}

const today = () => new Date().toISOString().slice(0, 10);

export function newItem() {
  return { id: crypto.randomUUID(), description: '', qty: 1, price: 0 };
}

export function newInvoice(number = 1) {
  return {
    id: crypto.randomUUID(),
    number: `INV-${String(number).padStart(3, '0')}`,
    date: today(),
    dueDate: '',
    fromName: '',
    fromEmail: '',
    toName: '',
    toEmail: '',
    items: [newItem()],
    vatRate: 7.5, // Nigeria standard VAT
    notes: 'Payment by bank transfer. Thank you for your business.',
  };
}
