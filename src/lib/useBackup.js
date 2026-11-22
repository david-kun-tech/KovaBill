import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { load, save } from './storage.js';
import { autoPermission, canAutoBackup, pickAutoFile, writeAutoFile } from './backup.js';

const DAY = 86400000;
export const REMIND_AFTER_DAYS = 7;

/**
 * Backup bookkeeping: when the last backup happened, whether a reminder is due,
 * and the optional auto-backup file (Chrome/Edge desktop) that is rewritten
 * a few seconds after every change.
 */
export function useBackup({ invoices, profile, ready }) {
  const [meta, setMeta] = useState(null); // { lastBackupAt, lastMethod, snoozeUntil }
  const [auto, setAuto] = useState({ status: canAutoBackup() ? 'off' : 'unsupported', handle: null, name: '' });
  const [writing, setWriting] = useState(false);

  // load bookkeeping + any remembered auto-backup file
  useEffect(() => {
    let alive = true;
    (async () => {
      const m = (await load('backupMeta')) || {};
      const handle = canAutoBackup() ? await load('autoHandle') : null;
      if (!alive) return;
      setMeta(m);
      if (handle) {
        const perm = await autoPermission(handle).catch(() => 'denied');
        if (alive) setAuto({ status: perm === 'granted' ? 'on' : 'paused', handle, name: handle.name });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const patchMeta = useCallback((patch) => {
    setMeta((m) => {
      const next = { ...m, ...patch };
      save('backupMeta', next);
      return next;
    });
  }, []);

  const markBackedUp = useCallback((method) => patchMeta({ lastBackupAt: Date.now(), lastMethod: method, snoozeUntil: 0 }), [patchMeta]);
  const snooze = useCallback((days = 3) => patchMeta({ snoozeUntil: Date.now() + days * DAY }), [patchMeta]);

  // ---------- auto-backup ----------
  const writeNow = useCallback(
    async (handle) => {
      setWriting(true);
      try {
        await writeAutoFile(handle, { invoices, profile });
        markBackedUp('auto');
        return true;
      } catch {
        setAuto((a) => ({ ...a, status: 'paused' }));
        return false;
      } finally {
        setWriting(false);
      }
    },
    [invoices, profile, markBackedUp]
  );

  const chooseAuto = useCallback(async () => {
    let handle;
    try {
      handle = await pickAutoFile();
    } catch (err) {
      if (err?.name === 'AbortError') return false;
      throw err;
    }
    await save('autoHandle', handle);
    setAuto({ status: 'on', handle, name: handle.name });
    return writeNow(handle);
  }, [writeNow]);

  const reconnectAuto = useCallback(async () => {
    if (!auto.handle) return false;
    const perm = await autoPermission(auto.handle, true).catch(() => 'denied');
    if (perm !== 'granted') return false;
    setAuto((a) => ({ ...a, status: 'on' }));
    return writeNow(auto.handle);
  }, [auto.handle, writeNow]);

  const stopAuto = useCallback(async () => {
    await save('autoHandle', null);
    setAuto({ status: 'off', handle: null, name: '' });
  }, []);

  // rewrite the auto-backup file shortly after data changes
  const firstData = useRef(true);
  useEffect(() => {
    if (!ready) return;
    if (firstData.current) {
      firstData.current = false; // nothing changed yet; that was just the initial load
      return;
    }
    if (auto.status !== 'on' || !auto.handle) return;
    const t = setTimeout(() => writeNow(auto.handle), 2500);
    return () => clearTimeout(t);
  }, [invoices, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- reminder ----------
  const status = useMemo(() => {
    const last = meta?.lastBackupAt || 0;
    const changed = invoices.filter((i) => (i.updatedAt || i.createdAt || 0) > last).length;
    const now = Date.now();
    const snoozed = (meta?.snoozeUntil || 0) > now;
    const due = last ? now - last > REMIND_AFTER_DAYS * DAY : invoices.length >= 3;
    return {
      lastBackupAt: last || null,
      lastMethod: meta?.lastMethod || null,
      changedSince: changed,
      needsBackup: Boolean(ready && meta && changed > 0 && due && !snoozed && auto.status !== 'on'),
    };
  }, [meta, invoices, ready, auto.status]);

  return { ...status, auto, writing, markBackedUp, snooze, chooseAuto, reconnectAuto, stopAuto, writeNow };
}
