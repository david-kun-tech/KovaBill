// On-device storage for KovaBill.
//
// Data lives in IndexedDB (sturdier and much roomier than localStorage).
// If IndexedDB is unavailable (some private-browsing modes), we fall back to
// localStorage so the app still works for the session.
import { createStore, getMany, set, setMany } from 'idb-keyval';

const db = createStore('kovabill', 'kv');
let backend = 'indexeddb';

const LEGACY = {
  invoices: 'invoices',
  profile: 'kova.profile',
};

function readLegacy(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Load everything once at start-up. Returns { invoices, profile }, where a
 * value is `undefined` if nothing has ever been stored.
 * Data saved by older versions (localStorage) is moved into IndexedDB here.
 */
export async function loadAll() {
  let invoices;
  let profile;
  try {
    [invoices, profile] = await getMany(['invoices', 'profile'], db);
  } catch {
    backend = 'localstorage';
    return { invoices: readLegacy(LEGACY.invoices), profile: readLegacy(LEGACY.profile) };
  }

  // One-time migration from localStorage
  const legacyInvoices = invoices === undefined ? readLegacy(LEGACY.invoices) : undefined;
  let legacyProfile = profile === undefined ? readLegacy(LEGACY.profile) : undefined;
  if (profile === undefined && legacyProfile === undefined) {
    // Very old versions kept the business name on each invoice instead
    const old = (legacyInvoices || []).find((i) => i.fromName);
    if (old) legacyProfile = { business: old.fromName, email: old.fromEmail || '' };
  }
  if (legacyInvoices !== undefined || legacyProfile !== undefined) {
    const entries = [];
    if (legacyInvoices !== undefined) entries.push(['invoices', (invoices = legacyInvoices)]);
    if (legacyProfile !== undefined) entries.push(['profile', (profile = legacyProfile)]);
    try {
      await setMany(entries, db);
      // Only clear the old copy once the new one is safely written
      if (legacyInvoices !== undefined) localStorage.removeItem(LEGACY.invoices);
      if (legacyProfile !== undefined) localStorage.removeItem(LEGACY.profile);
    } catch {
      backend = 'localstorage';
    }
  }
  return { invoices, profile };
}

export async function load(key) {
  if (backend === 'indexeddb') {
    try {
      return (await getMany([key], db))[0];
    } catch {
      /* fall through */
    }
  }
  return readLegacy(LEGACY[key] || key);
}

export async function save(key, value) {
  if (backend === 'indexeddb') {
    try {
      await set(key, value, db);
      return;
    } catch {
      backend = 'localstorage';
    }
  }
  try {
    localStorage.setItem(LEGACY[key] || key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable */
  }
}

export const storageBackend = () => backend;

// ---------- persistence (ask the browser not to evict our data) ----------
export async function storageStatus() {
  const s = navigator.storage;
  const persisted = s?.persisted ? await s.persisted().catch(() => false) : false;
  const estimate = s?.estimate ? await s.estimate().catch(() => null) : null;
  return {
    backend,
    supported: Boolean(s?.persist),
    persisted,
    usage: estimate?.usage ?? null,
    quota: estimate?.quota ?? null,
  };
}

export async function requestPersistence() {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist().catch(() => false);
}
