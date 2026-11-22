import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from './store.js';
import { useHashRoute, navigate } from './hooks/useHashRoute.js';
import { groupClients, isBlank } from './utils/invoice.js';
import Nav from './components/Nav.jsx';
import { Logo } from './components/ui.jsx';
import UpdatePrompt from './components/UpdatePrompt.jsx';
import BackupDialog from './components/BackupDialog.jsx';
import PrintHost from './components/PrintHost.jsx';
import { useBackup } from './lib/useBackup.js';
import Home from './views/Home.jsx';
import Invoices from './views/Invoices.jsx';
import Editor from './views/Editor.jsx';
import Clients from './views/Clients.jsx';
import Settings from './views/Settings.jsx';
import Onboarding from './views/Onboarding.jsx';

export default function App() {
  const store = useStore();
  const route = useHashRoute();
  const [section = 'home', id] = route.parts;
  const [toast, setToast] = useState(null);
  const backup = useBackup({ invoices: store.invoices, profile: store.profile, ready: store.ready });
  const [backupOpen, setBackupOpen] = useState(false);
  const openBackup = useCallback(() => setBackupOpen(true), []);
  const [printJob, setPrintJob] = useState(null);
  const print = useCallback((job) => setPrintJob(job), []);

  const notify = useCallback((msg) => setToast({ msg, key: Date.now() }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const create = useCallback(
    (client) => {
      const inv = store.create(client);
      navigate(`/invoice/${inv.id}`);
    },
    [store]
  );

  // Leaving an invoice that was never filled in? Quietly discard it.
  const openId = section === 'invoice' ? id : null;
  const lastOpen = useRef(null);
  useEffect(() => {
    const prev = lastOpen.current;
    lastOpen.current = openId;
    if (prev && prev !== openId) {
      const inv = store.invoices.find((i) => i.id === prev);
      if (inv && inv.status === 'draft' && isBlank(inv)) store.remove(prev);
    }
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  // "#/new" (used by the installed app's "New invoice" shortcut)
  const handledNew = useRef(false);
  useEffect(() => {
    if (section !== 'new') {
      handledNew.current = false;
      return;
    }
    if (!store.ready || handledNew.current) return;
    handledNew.current = true;
    const inv = store.create();
    location.replace(`#/invoice/${inv.id}`);
  }, [section, store.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // "N" starts a new invoice from anywhere (when not typing)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest('input, textarea, select, [contenteditable]')) return;
      if (document.querySelector('dialog[open]')) return; // not while a dialog is up
      e.preventDefault();
      create();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [create]);

  const clients = useMemo(() => groupClients(store.invoices), [store.invoices]);

  if (!store.ready) {
    return (
      <div className="boot" aria-busy="true" aria-label="Loading KovaBill">
        <Logo size={56} />
      </div>
    );
  }

  // First run (nothing set up yet), or replayed from Settings via #/welcome
  if (section === 'welcome' || (!store.profile.onboarded && store.invoices.length === 0)) {
    const finish = (action) => {
      store.setProfile((p) => ({ ...p, onboarded: true }));
      if (action === 'new') create();
      else {
        if (action === 'sample') {
          store.loadSample();
          notify('Sample workspace loaded');
        }
        navigate('/');
      }
    };
    return (
      <>
        <Onboarding profile={store.profile} setProfile={store.setProfile} onFinish={finish} notify={notify} />
        <div className="toast-region no-print" role="status" aria-live="polite">
          {toast && (
            <div className="toast" key={toast.key}>
              {toast.msg}
            </div>
          )}
        </div>
      </>
    );
  }

  let view;
  switch (section) {
    case 'invoices':
      view = (
        <Invoices
          key={route.query.toString()}
          invoices={store.invoices}
          query={route.query}
          onCreate={create}
          onPrint={print}
          notify={notify}
          profileName={store.profile.business}
        />
      );
      break;
    case 'invoice':
      view = (
        <Editor
          key={id}
          invoice={store.invoices.find((i) => i.id === id)}
          profile={store.profile}
          clients={clients}
          onChange={store.update}
          onStatus={store.setStatus}
          onDelete={store.remove}
          onDuplicate={(inv) => {
            const copy = store.duplicate(inv);
            navigate(`/invoice/${copy.id}`);
            notify(`Duplicated as ${copy.number}`);
          }}
          notify={notify}
        />
      );
      break;
    case 'clients':
      view = <Clients invoices={store.invoices} onCreate={create} onPrint={print} />;
      break;
    case 'settings':
      view = (
        <Settings
          profile={store.profile}
          setProfile={store.setProfile}
          invoices={store.invoices}
          backup={backup}
          onBackup={openBackup}
          onRestore={store.restoreBackup}
          onLoadSample={() => {
            store.loadSample();
            notify('Sample workspace loaded');
          }}
          onErase={store.eraseAll}
          notify={notify}
        />
      );
      break;
    default:
      view = (
        <Home
          invoices={store.invoices}
          profile={store.profile}
          onCreate={() => create()}
          notify={notify}
          backup={backup}
          onBackup={openBackup}
          onLoadSample={() => {
            store.loadSample();
            notify('Sample workspace loaded');
          }}
        />
      );
  }

  return (
    <div className="shell">
      <a href="#main" className="skip no-print" onClick={(e) => (e.preventDefault(), document.getElementById('main').focus())}>
        Skip to content
      </a>
      <Nav active={section === 'invoice' ? 'invoices' : section} onCreate={() => create()} />
      <main id="main" tabIndex={-1} className="main">
        {view}
      </main>
      <UpdatePrompt notify={notify} />
      {printJob && <PrintHost job={printJob} profile={store.profile} onDone={() => setPrintJob(null)} />}
      {backupOpen && (
        <BackupDialog
          invoices={store.invoices}
          profile={store.profile}
          onDone={backup.markBackedUp}
          onClose={() => setBackupOpen(false)}
          notify={notify}
        />
      )}
      <div className="toast-region no-print" role="status" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.key}>
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}
