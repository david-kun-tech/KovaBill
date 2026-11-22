import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { load, loadAll, requestPersistence, save } from './lib/storage.js';
import { migrateInvoice, newInvoice, nextNumber, sampleData, todayISO } from './utils/invoice.js';

export const DEFAULT_PROFILE = {
  firstName: '',
  business: '',
  logo: '', // data URL, stored on-device
  email: '',
  phone: '',
  address: '',
  bankName: '',
  accountName: '',
  accountNumber: '',
  currency: 'NGN',
  vatRate: 7.5,
  terms: 14,
  notes: 'Thank you for your business.',
};

// Tells other open KovaBill tabs that data changed, so they never overwrite each other.
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('kovabill') : null;

// Keeps one key in state, persisted on-device and synced across tabs.
function usePersisted(key, setValue, value) {
  const fromOtherTab = useRef(false);

  useEffect(() => {
    if (value === null) return; // not loaded yet
    if (fromOtherTab.current) {
      fromOtherTab.current = false;
      return;
    }
    save(key, value).then(() => channel?.postMessage(key));
  }, [key, value]);

  useEffect(() => {
    if (!channel) return;
    const onMessage = async (e) => {
      if (e.data !== key) return;
      const next = await load(key);
      if (next === undefined) return;
      fromOtherTab.current = true;
      setValue(next);
    };
    channel.addEventListener('message', onMessage);
    return () => channel.removeEventListener('message', onMessage);
  }, [key, setValue]);
}

export function useStore() {
  const [raw, setRaw] = useState(null); // null = still loading
  const [storedProfile, setProfile] = useState(null);
  const ready = raw !== null && storedProfile !== null;

  useEffect(() => {
    let alive = true;
    loadAll().then(({ invoices, profile }) => {
      if (!alive) return;
      setRaw(Array.isArray(invoices) ? invoices : []);
      setProfile(profile && typeof profile === 'object' ? profile : {});
    });
    return () => {
      alive = false;
    };
  }, []);

  usePersisted('invoices', setRaw, raw);
  usePersisted('profile', setProfile, storedProfile);

  const invoices = useMemo(() => (raw || []).map(migrateInvoice), [raw]);
  const profile = useMemo(() => ({ ...DEFAULT_PROFILE, ...storedProfile }), [storedProfile]);

  const create = useCallback(
    (client) => {
      const inv = newInvoice({ number: nextNumber(raw), profile, client });
      setRaw((list) => [inv, ...list]);
      requestPersistence(); // first real data: ask the browser to keep it safe
      return inv;
    },
    [raw, profile]
  );

  const update = useCallback(
    (inv) => setRaw((list) => list.map((i) => (i.id === inv.id ? { ...inv, updatedAt: Date.now() } : i))),
    []
  );

  const remove = useCallback((id) => setRaw((list) => list.filter((i) => i.id !== id)), []);

  const duplicate = useCallback(
    (inv) => {
      const fresh = newInvoice({ number: nextNumber(raw), profile });
      const copy = {
        ...inv,
        id: fresh.id,
        number: fresh.number,
        date: fresh.date,
        dueDate: fresh.dueDate,
        status: 'draft',
        paidAt: undefined,
        sentAt: undefined,
        createdAt: Date.now(),
        items: inv.items.map((it) => ({ ...it, id: crypto.randomUUID() })),
      };
      setRaw((list) => [copy, ...list]);
      return copy;
    },
    [raw, profile]
  );

  const setStatus = useCallback(
    (inv, status) => {
      const next = { ...inv, status };
      if (status === 'paid') next.paidAt = inv.paidAt || todayISO();
      else next.paidAt = undefined;
      if (status !== 'draft') next.sentAt = inv.sentAt || todayISO();
      update(next);
      return next;
    },
    [update]
  );

  const loadSample = useCallback(() => {
    setRaw((list) => [...sampleData(), ...list]);
    setProfile((p) => (p.firstName || p.business ? p : { ...p, firstName: 'Jany', business: 'Jany Studio' }));
    requestPersistence();
  }, []);

  /**
   * mode 'merge': add the backup's invoices; where both have the same invoice keep
   *   the more recently edited copy; profile fields are only filled in where blank.
   * mode 'replace': the backup becomes everything on this device.
   */
  const restoreBackup = useCallback((backup, mode = 'merge') => {
    const clean = (backup.invoices || []).filter((i) => i && i.id && Array.isArray(i.items)).map(migrateInvoice);
    const stamp = (i) => i.updatedAt || i.createdAt || 0;
    const result = { total: clean.length, added: 0, updated: 0 };
    if (mode === 'replace') {
      setRaw(clean);
      setProfile(backup.profile && typeof backup.profile === 'object' ? backup.profile : {});
    } else {
      const byId = new Map((raw || []).map((i) => [i.id, i]));
      for (const inv of clean) {
        const mine = byId.get(inv.id);
        if (!mine) result.added++;
        else if (stamp(inv) > stamp(mine)) result.updated++;
        else continue;
        byId.set(inv.id, inv);
      }
      setRaw([...byId.values()]);
      if (backup.profile) {
        setProfile((p) => {
          const next = { ...p };
          for (const [k, v] of Object.entries(backup.profile)) if (v !== '' && v != null && !next[k]) next[k] = v;
          return next;
        });
      }
    }
    requestPersistence();
    return result;
  }, [raw]);

  const eraseAll = useCallback(() => {
    setRaw([]);
    setProfile({});
  }, []);

  return {
    ready,
    invoices,
    profile,
    setProfile,
    create,
    update,
    remove,
    duplicate,
    setStatus,
    loadSample,
    restoreBackup,
    eraseAll,
  };
}
