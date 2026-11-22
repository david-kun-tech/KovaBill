// Public address of KovaBill, printed on invoices ("Made with KovaBill") and in emails.
// Set VITE_APP_URL when you deploy (e.g. in Vercel's Environment Variables) to pin it,
// otherwise it uses wherever the app is currently running.
const fromEnv = import.meta.env.VITE_APP_URL;
const here = typeof location !== 'undefined' ? new URL('./', location.href).href : '';

export const APP_URL = (fromEnv || here).replace(/#.*$/, '');
export const APP_HOST = APP_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
