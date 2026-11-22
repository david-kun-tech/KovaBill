// KovaBill backups: one JSON file holding every invoice and the profile.
// Optional password lock: AES-GCM with a key stretched from the password (PBKDF2),
// all done in the browser with Web Crypto. Nothing ever leaves the device unless
// the user downloads or shares the file themselves.
import { calcTotals } from '../utils/invoice.js';

export const FORMAT = 'kovabill-backup';
export const VERSION = 3;
const ITERATIONS = 310_000; // OWASP-recommended PBKDF2-SHA256 work factor

// ---------- building & reading ----------
export function buildBackup({ invoices, profile }) {
  return { format: FORMAT, app: 'KovaBill', version: VERSION, exportedAt: new Date().toISOString(), profile, invoices };
}

export function backupFileName(date = new Date()) {
  const d = date.toISOString().slice(0, 10);
  return `kovabill-backup-${d}.json`;
}

/** Parse a file's text. Accepts current, encrypted and older (v1/v2, or bare array) backups. */
export function readBackupText(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This isn’t a KovaBill backup file');
  }
  if (Array.isArray(data)) return { encrypted: false, backup: { invoices: data, profile: null, exportedAt: null } };
  if (data?.encrypted) return { encrypted: true, envelope: data };
  if (Array.isArray(data?.invoices)) return { encrypted: false, backup: data };
  throw new Error('This isn’t a KovaBill backup file');
}

export function summarize(backup) {
  const invoices = (backup.invoices || []).filter((i) => i && i.id && Array.isArray(i.items));
  const clients = new Set(invoices.map((i) => (i.toName || '').trim().toLowerCase()).filter(Boolean));
  const dates = invoices.map((i) => i.date).filter(Boolean).sort();
  const totals = {};
  for (const inv of invoices) {
    try {
      const c = inv.currency || 'NGN';
      totals[c] = (totals[c] || 0) + calcTotals({ discount: 0, vatRate: 0, ...inv }).total;
    } catch {
      /* ignore malformed */
    }
  }
  return {
    invoices: invoices.length,
    clients: clients.size,
    first: dates[0] || null,
    last: dates.at(-1) || null,
    exportedAt: backup.exportedAt || null,
    business: backup.profile?.business || backup.profile?.firstName || '',
    hasLogo: Boolean(backup.profile?.logo),
    totals,
  };
}

// ---------- password lock ----------
const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(bytes) {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(s);
}
const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function deriveKey(password, salt, iterations) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function lock(backup, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITERATIONS);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(backup))));
  return {
    format: FORMAT,
    app: 'KovaBill',
    version: VERSION,
    encrypted: true,
    exportedAt: backup.exportedAt,
    cipher: 'AES-GCM',
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS },
    salt: toB64(salt),
    iv: toB64(iv),
    data: toB64(data),
  };
}

export async function unlock(envelope, password) {
  try {
    const key = await deriveKey(password, fromB64(envelope.salt), envelope.kdf?.iterations || ITERATIONS);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(envelope.iv) }, key, fromB64(envelope.data));
    return JSON.parse(dec.decode(plain));
  } catch {
    throw new Error('Wrong password, or the file is damaged');
  }
}

// ---------- getting the file out ----------
export async function makeBackupFile(data, password) {
  const backup = buildBackup(data);
  const body = password ? await lock(backup, password) : backup;
  const text = JSON.stringify(body, null, password ? 0 : 2);
  return new File([text], backupFileName(), { type: 'application/json' });
}

export function downloadFile(file) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// Some share targets refuse .json, so fall back to a plain-text file (restore accepts both).
export function shareableFile(file) {
  if (!navigator.canShare) return null;
  if (navigator.canShare({ files: [file] })) return file;
  const txt = new File([file], file.name.replace(/\.json$/, '.txt'), { type: 'text/plain' });
  return navigator.canShare({ files: [txt] }) ? txt : null;
}

export const canShareFiles = () =>
  typeof navigator !== 'undefined' &&
  Boolean(navigator.canShare) &&
  Boolean(shareableFile(new File(['{}'], 'test.json', { type: 'application/json' })));

/** Resolves true if shared, false if the user cancelled. */
export async function shareFile(file) {
  const f = shareableFile(file);
  if (!f) throw new Error('Sharing files isn’t supported here');
  try {
    await navigator.share({ files: [f], title: 'KovaBill backup', text: 'My KovaBill backup' });
    return true;
  } catch (err) {
    if (err?.name === 'AbortError') return false;
    throw err;
  }
}

// ---------- auto-backup to a file (Chrome / Edge on desktop) ----------
export const canAutoBackup = () => typeof window !== 'undefined' && 'showSaveFilePicker' in window;

export async function pickAutoFile() {
  return window.showSaveFilePicker({
    suggestedName: 'kovabill-autobackup.json',
    types: [{ description: 'KovaBill backup', accept: { 'application/json': ['.json'] } }],
  });
}

export async function autoPermission(handle, ask = false) {
  const opts = { mode: 'readwrite' };
  if ((await handle.queryPermission(opts)) === 'granted') return 'granted';
  if (!ask) return 'prompt';
  return handle.requestPermission(opts);
}

export async function writeAutoFile(handle, data) {
  const file = await makeBackupFile(data);
  const w = await handle.createWritable();
  await w.write(file);
  await w.close();
}
