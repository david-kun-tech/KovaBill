import { useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { Icon } from './ui.jsx';
import { APP_URL } from '../config.js';
import { MESSAGE_KINDS, buildMessage, defaultMessageKind, whatsappNumber } from '../utils/invoice.js';

const canShareText = () => typeof navigator !== 'undefined' && Boolean(navigator.share);

/**
 * Send an invoice, reminder or thank-you through WhatsApp, Gmail, the phone's
 * email app, the share menu, or the clipboard. The message is editable first.
 */
export default function SendSheet({ invoice, profile, onSent, onClose, notify }) {
  const [kind, setKind] = useState(() => defaultMessageKind(invoice));
  const [edited, setEdited] = useState(null); // null = use the generated text

  const plain = useMemo(() => buildMessage(invoice, profile, kind, { appUrl: APP_URL }), [invoice, profile, kind]);
  const rich = useMemo(() => buildMessage(invoice, profile, kind, { rich: true, appUrl: APP_URL }), [invoice, profile, kind]);
  const text = edited ?? plain.text;
  const wa = whatsappNumber(invoice.toPhone, invoice.currency);
  const email = invoice.toEmail?.trim() || '';
  const enc = encodeURIComponent;

  const done = (how, close) => {
    onSent(kind, how);
    close();
  };

  const open = (url) => window.open(url, '_blank', 'noopener');

  const channels = [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      hint: wa ? `To ${invoice.toPhone}` : 'Pick a chat',
      icon: 'chat',
      run: () => open(`https://wa.me/${wa}?text=${enc(edited ?? rich.text)}`),
    },
    {
      id: 'gmail',
      label: 'Gmail',
      hint: email || 'Add the address in Gmail',
      icon: 'mail',
      run: () => open(`https://mail.google.com/mail/?view=cm&fs=1&to=${enc(email)}&su=${enc(plain.subject)}&body=${enc(text)}`),
    },
    {
      id: 'email',
      label: 'Email app',
      hint: 'Your phone’s mail app',
      icon: 'send',
      run: () => {
        window.location.href = `mailto:${enc(email)}?subject=${enc(plain.subject)}&body=${enc(text)}`;
      },
    },
  ];

  const share = async (close) => {
    try {
      await navigator.share({ title: plain.subject, text });
      done('share', close);
    } catch (err) {
      if (err?.name !== 'AbortError') notify('Couldn’t open the share menu');
    }
  };

  const copy = async (close) => {
    try {
      await navigator.clipboard.writeText(text);
      notify('Message copied');
      done('copy', close);
    } catch {
      notify('Couldn’t copy. Select the text and copy it instead');
    }
  };

  return (
    <Modal title="Send" subtitle={`${invoice.number}${invoice.toName ? ` to ${invoice.toName}` : ''}`} onClose={onClose}>
      {(close) => (
        <div className="sheet-body send-sheet">
          <div className="chips wrap" role="group" aria-label="Message type">
            {MESSAGE_KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                className="chip"
                aria-pressed={kind === k.id}
                onClick={() => {
                  setKind(k.id);
                  setEdited(null);
                }}
              >
                {k.label}
              </button>
            ))}
          </div>

          <label className="field">
            <span className="field-label">
              Message {edited != null && <button type="button" className="link-btn reset-msg" onClick={() => setEdited(null)}>Reset</button>}
            </span>
            <textarea className="send-text" rows="9" value={text} onChange={(e) => setEdited(e.target.value)} />
          </label>

          <div className="send-grid">
            {channels.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`send-btn send-${c.id}`}
                data-autofocus={c.id === 'whatsapp' ? true : undefined}
                onClick={() => {
                  c.run();
                  done(c.id, close);
                }}
              >
                <span className="send-icon">
                  <Icon name={c.icon} size={20} />
                </span>
                <span>
                  <strong>{c.label}</strong>
                  <small>{c.hint}</small>
                </span>
              </button>
            ))}
            {canShareText() && (
              <button type="button" className="send-btn" onClick={() => share(close)}>
                <span className="send-icon">
                  <Icon name="share" size={20} />
                </span>
                <span>
                  <strong>More apps</strong>
                  <small>Telegram, SMS…</small>
                </span>
              </button>
            )}
            <button type="button" className="send-btn" onClick={() => copy(close)}>
              <span className="send-icon">
                <Icon name="copy" size={20} />
              </span>
              <span>
                <strong>Copy text</strong>
                <small>Paste it anywhere</small>
              </span>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
