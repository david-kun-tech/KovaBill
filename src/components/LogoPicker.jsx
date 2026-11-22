import { useRef, useState } from 'react';
import { Icon, initials } from './ui.jsx';

const MAX_SIDE = 480; // plenty for print at the size we show it
const MAX_SVG_BYTES = 150 * 1024;

const readAsDataURL = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Couldn’t read that file'));
    r.readAsDataURL(blob);
  });

// Shrinks a picture to a sensible size and returns it as a data URL to store on-device.
export async function prepareLogo(file) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file');

  if (file.type === 'image/svg+xml') {
    if (file.size > MAX_SVG_BYTES) throw new Error('That SVG is too large (max 150 KB)');
    return readAsDataURL(file); // shown via <img>, so any scripts inside never run
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('That image couldn’t be opened');
  });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  // JPEGs stay JPEG (small); everything else keeps transparency as PNG
  return file.type === 'image/jpeg'
    ? canvas.toDataURL('image/jpeg', 0.9)
    : canvas.toDataURL('image/png');
}

export default function LogoPicker({ logo, business, onChange, notify }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      onChange(await prepareLogo(file));
      notify('Logo added to your invoices');
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="logo-picker">
      <div className={`logo-preview ${logo ? 'has-logo' : ''}`}>
        {logo ? <img src={logo} alt="Your logo" /> : <span aria-hidden="true">{initials(business || 'Your business')}</span>}
      </div>
      <div className="logo-picker-body">
        <strong>Business logo</strong>
        <span className="muted">PNG, JPG, WebP or SVG. A transparent background looks best.</span>
        <div className="row-btns">
          <button type="button" className="btn btn-soft btn-sm" onClick={() => fileRef.current.click()} disabled={busy}>
            <Icon name="upload" size={16} /> {logo ? 'Replace' : 'Upload logo'}
          </button>
          {logo && (
            <button type="button" className="btn btn-sm link-danger" onClick={() => onChange('')}>
              Remove
            </button>
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={pick} />
    </div>
  );
}
