import { forwardRef, useEffect, useState } from 'react';

// Turns whatever was typed ("25,000", "₦ 1 500.50", "1500.") into a number.
export function parseAmount(text) {
  const clean = String(text).replace(/[^\d.]/g, '');
  const [whole, ...rest] = clean.split('.');
  const n = parseFloat(rest.length ? `${whole}.${rest.join('')}` : whole);
  return Number.isFinite(n) ? n : 0;
}

const pretty = (n) =>
  Number(n) ? Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '';

/**
 * A forgiving number field: accepts commas, spaces and currency symbols,
 * shows "25,000" when not being edited, and reports a plain number.
 * (type="number" rejects "25,000" in Firefox/Safari and silently becomes 0.)
 */
const NumberInput = forwardRef(function NumberInput({ value, onValue, onFocus, onBlur, ...rest }, ref) {
  const [text, setText] = useState(pretty(value));
  const [editing, setEditing] = useState(false);

  // keep in sync when the value changes from outside (e.g. switching invoices)
  useEffect(() => {
    if (!editing) setText(pretty(value));
  }, [value, editing]);

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      {...rest}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        if (/[^\d.,\s₦$£€-]/.test(raw)) return; // ignore letters
        setText(raw);
        onValue(parseAmount(raw));
      }}
      onFocus={(e) => {
        setEditing(true);
        e.target.select();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setEditing(false);
        setText(pretty(value));
        onBlur?.(e);
      }}
    />
  );
});

export default NumberInput;
