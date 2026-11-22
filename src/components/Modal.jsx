import { useEffect, useId, useRef } from 'react';
import { Icon } from './ui.jsx';

/**
 * Native <dialog> opened with showModal(): the browser handles focus, Esc,
 * the inert page behind it and returning focus afterwards.
 * Mount it to open; it calls onClose when closed by any means.
 * children may be a function receiving close().
 */
export default function Modal({ title, subtitle, onClose, children, className = '' }) {
  const ref = useRef(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const d = ref.current;
    if (!d.open) {
      d.showModal();
      // React's autoFocus fires before showModal(), which then moves focus itself;
      // so focus the intended control afterwards.
      d.querySelector('[data-autofocus]')?.focus();
    }
    const handle = () => onCloseRef.current?.();
    d.addEventListener('close', handle);
    return () => d.removeEventListener('close', handle);
  }, []);

  const close = () => ref.current?.close();

  return (
    <dialog ref={ref} className={`sheet ${className}`} aria-labelledby={titleId} closedby="any">
      <header className="sheet-head">
        <div>
          <h2 id={titleId}>{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        <button type="button" className="icon-btn" onClick={close} aria-label="Close">
          <Icon name="x" size={18} />
        </button>
      </header>
      {typeof children === 'function' ? children(close) : children}
    </dialog>
  );
}
