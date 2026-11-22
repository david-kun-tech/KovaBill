import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, Logo, Wordmark } from '../components/ui.jsx';
import LogoPicker from '../components/LogoPicker.jsx';
import NumberInput from '../components/NumberInput.jsx';
import Receipt from '../components/Receipt.jsx';
import { CURRENCIES, addDays, currencySymbol, newItem, todayISO } from '../utils/invoice.js';

const STEPS = ['welcome', 'you', 'paid', 'done'];
const TERMS = [7, 14, 30];

// A pretend invoice so people can watch their details land on real paper.
function demoInvoice(profile) {
  const date = todayISO();
  return {
    id: 'demo',
    number: 'INV-001',
    date,
    dueDate: addDays(date, Number(profile.terms) || 14),
    status: 'sent',
    currency: profile.currency || 'NGN',
    toName: 'Your first client',
    toEmail: 'client@example.com',
    toAddress: '',
    items: [newItem({ id: 'd1', description: 'Design work', detail: 'Example item', qty: 1, price: 150000 })],
    vatRate: profile.vatRate,
    discount: 0,
    notes: profile.notes,
  };
}

export default function Onboarding({ profile, setProfile, onFinish, notify }) {
  const [step, setStep] = useState(0);
  const name = STEPS[step];
  const set = (key) => (e) => setProfile((p) => ({ ...p, [key]: e.target.value }));
  const put = (key, value) => setProfile((p) => ({ ...p, [key]: value }));
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const demo = useMemo(() => demoInvoice(profile), [profile]);
  const first = profile.firstName?.trim();
  const formRef = useRef(null);

  // On each new step: back to the top, and move focus to the step (for keyboard & screen readers)
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    window.scrollTo(0, 0);
    const form = formRef.current;
    if (!form || form.contains(document.activeElement)) return; // a field already took focus
    const target = form.querySelector('[data-first]') || form.querySelector('h1');
    if (target?.tagName === 'H1') target.tabIndex = -1;
    target?.focus();
  }, [step]);

  return (
    <div className={`onboard step-${name}`}>
      <section className="onboard-main">
        <header className="onboard-top">
          <Wordmark size={20} />
          {name !== 'done' && (
            <button type="button" className="link-btn" onClick={() => onFinish('home')}>
              Skip for now
            </button>
          )}
        </header>

        {step > 0 && (
          <ol className="onboard-progress" aria-label={`Step ${Math.min(step, 3)} of 3`}>
            {[1, 2, 3].map((i) => (
              <li key={i} className={i < step ? 'done' : i === step ? 'now' : ''} />
            ))}
          </ol>
        )}

        <form
          key={name}
          ref={formRef}
          className="onboard-step"
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          {name === 'welcome' && (
            <>
              <div className="onboard-hero" aria-hidden="true">
                <Logo size={84} />
              </div>
              <h1>
                Invoices that <span className="hl">get paid.</span>
              </h1>
              <p className="onboard-lead">
                Create, send and track invoices in a minute. No account, no sign-up, and nothing leaves your device.
              </p>
              <ul className="onboard-points">
                <li>
                  <span className="device-icon">
                    <Icon name="shield" size={18} />
                  </span>
                  <span>
                    <strong>Private by design</strong>
                    Your invoices live on this device, not on a server.
                  </span>
                </li>
                <li>
                  <span className="device-icon">
                    <Icon name="phone" size={18} />
                  </span>
                  <span>
                    <strong>Works offline</strong>
                    Install it like an app on your phone or computer.
                  </span>
                </li>
                <li>
                  <span className="device-icon">
                    <Icon name="sparkle" size={18} />
                  </span>
                  <span>
                    <strong>Free</strong>
                    Print, email, PDFs, backups and client statements included.
                  </span>
                </li>
              </ul>
              <div className="onboard-actions">
                <button type="submit" className="btn btn-ink btn-lg" data-first>
                  Get started <Icon name="arrow" size={18} />
                </button>
              </div>
              <p className="onboard-fine">Takes about a minute. You can change everything later in Settings.</p>
            </>
          )}

          {name === 'you' && (
            <>
              <span className="eyebrow">Step 1 of 3</span>
              <h1>What should your invoices say?</h1>
              <p className="onboard-lead">This goes at the top of every invoice you send.</p>
              <div className="onboard-fields">
                <div className="fields-2">
                  <label className="field">
                    <span className="field-label">Your first name</span>
                    <input value={profile.firstName} onChange={set('firstName')} autoComplete="given-name" placeholder="Jany" autoFocus />
                  </label>
                  <label className="field">
                    <span className="field-label">Business name</span>
                    <input value={profile.business} onChange={set('business')} autoComplete="organization" placeholder="Jany Studio" />
                  </label>
                </div>
                <label className="field">
                  <span className="field-label">Business email (optional)</span>
                  <input type="email" value={profile.email} onChange={set('email')} autoComplete="email" placeholder="you@business.com" />
                </label>
                <LogoPicker logo={profile.logo} business={profile.business} onChange={(logo) => put('logo', logo)} notify={notify} />
              </div>
            </>
          )}

          {name === 'paid' && (
            <>
              <span className="eyebrow">Step 2 of 3</span>
              <h1>How do you get paid?</h1>
              <p className="onboard-lead">Your defaults for new invoices. Bank details show up so clients know where to pay.</p>
              <div className="onboard-fields">
                <fieldset className="filter-group">
                  <legend className="field-label">Currency</legend>
                  <div className="chips wrap">
                    {Object.keys(CURRENCIES).map((c) => (
                      <button key={c} type="button" className="chip" aria-pressed={profile.currency === c} onClick={() => put('currency', c)}>
                        {currencySymbol(c)} {c}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="fields-2">
                  <label className="field">
                    <span className="field-label">VAT %</span>
                    <NumberInput value={profile.vatRate} onValue={(n) => put('vatRate', n)} placeholder="0" />
                  </label>
                  <fieldset className="filter-group">
                    <legend className="field-label">Payment due in</legend>
                    <div className="chips wrap">
                      {TERMS.map((d) => (
                        <button key={d} type="button" className="chip" aria-pressed={Number(profile.terms) === d} onClick={() => put('terms', d)}>
                          {d} days
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
                <div className="fields-2">
                  <label className="field">
                    <span className="field-label">Bank (optional)</span>
                    <input value={profile.bankName} onChange={set('bankName')} placeholder="e.g. GTBank" />
                  </label>
                  <label className="field">
                    <span className="field-label">Account name</span>
                    <input value={profile.accountName} onChange={set('accountName')} />
                  </label>
                </div>
                <label className="field">
                  <span className="field-label">Account number</span>
                  <input value={profile.accountNumber} onChange={set('accountNumber')} inputMode="numeric" autoComplete="off" />
                </label>
              </div>
            </>
          )}

          {name === 'done' && (
            <>
              <span className="eyebrow">Step 3 of 3</span>
              <h1>
                You’re all set{first ? `, ${first}` : ''}. <span className="hl">Let’s get paid.</span>
              </h1>
              <p className="onboard-lead">What would you like to do first?</p>
              <div className="onboard-choices">
                <button type="button" className="choice-card primary" onClick={() => onFinish('new')} data-first>
                  <span className="device-icon">
                    <Icon name="plus" size={20} />
                  </span>
                  <span>
                    <strong>Create my first invoice</strong>
                    <small>Takes about a minute</small>
                  </span>
                  <Icon name="arrow" size={18} />
                </button>
                <button type="button" className="choice-card" onClick={() => onFinish('sample')}>
                  <span className="device-icon">
                    <Icon name="sparkle" size={20} />
                  </span>
                  <span>
                    <strong>Explore with sample data</strong>
                    <small>See a busy month of invoices. You can erase it later</small>
                  </span>
                  <Icon name="arrow" size={18} />
                </button>
                <button type="button" className="choice-card" onClick={() => onFinish('home')}>
                  <span className="device-icon">
                    <Icon name="home" size={20} />
                  </span>
                  <span>
                    <strong>Go to my dashboard</strong>
                    <small>Start from a clean slate</small>
                  </span>
                  <Icon name="arrow" size={18} />
                </button>
              </div>
              <p className="onboard-tip">
                <Icon name="shield" size={16} /> Tip: your invoices live only on this device. Back them up from Settings now and then.
              </p>
            </>
          )}

          {(name === 'you' || name === 'paid') && (
            <div className="onboard-actions">
              <button type="button" className="btn btn-soft" onClick={back}>
                <Icon name="back" size={18} /> Back
              </button>
              <button type="submit" className="btn btn-ink">
                Continue <Icon name="arrow" size={18} />
              </button>
            </div>
          )}
          {name === 'done' && (
            <div className="onboard-actions">
              <button type="button" className="btn btn-soft" onClick={back}>
                <Icon name="back" size={18} /> Back
              </button>
            </div>
          )}
        </form>
      </section>

      <aside className="onboard-preview" aria-label="Preview of your invoice">
        <div className="onboard-preview-inner">
          <span className="preview-tag">
            <span className="pulse-dot" aria-hidden="true" /> Live preview
          </span>
          <div className="preview-paper">
            <Receipt invoice={demo} profile={profile} />
          </div>
        </div>
      </aside>
    </div>
  );
}
