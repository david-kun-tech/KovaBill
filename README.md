<p><img src="public/logo.svg" alt="" height="56"></p>

# KovaBill

Invoices that get paid. KovaBill is a fast, good-looking invoicing app for freelancers and small businesses. Create an invoice, send it, track it until it's paid, and print a clean PDF. Amounts default to Naira (₦) with 7.5% VAT, and USD, GBP and EUR are supported too.

Everything runs on the user's device: no backend, no sign-up. It installs as an app (PWA), works offline, and keeps data in the browser's IndexedDB.

## Features

- **Onboarding**: a short first-run welcome (your business, how you get paid, then create an invoice or explore sample data) with a live preview of your invoice. Replay it any time from Settings
- **Overview dashboard**: unpaid and overdue counts, a collection-rate ring, and a 12-week **revenue pulse** (money paid rises above the line, money still owed hangs below)
- **Invoice editor** with a live preview: a "Send to" ticket card, line items with details, VAT, discount and multi-currency support
- **Status tracking**: Draft → Sent → Paid. Overdue invoices are flagged automatically, and the preview gets a rubber-stamp status
- **Send via WhatsApp, Gmail or email**: one tap opens WhatsApp (straight to the client's chat if you saved their number), Gmail or your mail app with the message written for you: the invoice, a payment reminder, or a thank-you once paid. Edit it first if you like; drafts are marked as sent
- **Download PDF** through a print stylesheet that shows only the invoice, with the file named after the invoice
- **Clients**: an address book built from your invoices, showing billed and outstanding totals and a "Bill again" button
- **Search and filters**: All, Draft, Unpaid, Overdue and Paid
- **Print & export**: filter by status, date range (this month, last month, quarter, year, last 90 days or custom) and client. Then print or save a PDF with a summary page and every invoice on its own page, or export a CSV for Excel or your accountant
- **Client statements**: one page per client with each invoice, a running balance, the amount due and your bank details
- **Settings**: business profile, bank details for the "Pay to" block, and default currency, VAT, terms and note
- **Backups**: one file with everything. Download it, or share it to Google Drive, iCloud, WhatsApp or email from a phone. Optionally lock it with a password (AES-GCM encryption in the browser). On Chrome and Edge desktop, **automatic backup** keeps a chosen file updated after every change
- **Restore** with a preview (invoices, clients, date range, totals), then either add to what's there (the newer copy of each invoice wins) or replace everything. Older backup files still work
- **Backup reminders** on Home when invoices have changed and the last backup is over a week old
- **Installable PWA**: add it to the home screen or desktop. It works fully offline and asks before updating to a new version
- **Durable on-device storage**: data is kept in IndexedDB and the app asks the browser to protect it (`navigator.storage.persist()`). Data from older versions is migrated from `localStorage` automatically, and open tabs stay in sync
- Keyboard shortcut: press **N** anywhere to start a new invoice
- Responsive: bottom tab bar on phones, a dark side rail on desktop; respects reduced-motion settings

## Tech

React 18 · Vite 5 · vite-plugin-pwa (Workbox) · idb-keyval · Lucide icons · plain CSS (no UI framework) · self-hosted fonts (Bricolage Grotesque, Geist, Geist Mono via Fontsource) · hash routing so it works on GitHub Pages

## Getting started

```bash
npm install
npm run dev
```

Build for production (the service worker only runs in the production build):

```bash
npm run build
npm run preview
```

The logo lives in `src/brand/mark.js`. Tune it visually at `/design/logo-tuner.html` (with `npm run dev` running), copy the numbers into `MARK`, then regenerate the logo files and app icons:

```bash
npm run brand
```

## Project structure

```
src/
  components/   Nav, Receipt (printable invoice), Pulse chart, DeviceStatus, InstallBanner, UpdatePrompt, shared UI
  views/        Home, Invoices, Editor, Clients, Settings
  brand/        mark.js, the logo geometry and colours (one source for the app and the icons)
  lib/          storage (IndexedDB + migration + persistence), pwa (install prompt)
  hooks/        useHashRoute
  utils/        invoice maths, dates, status, aggregates, sample data
  store.js      all invoice/profile state and actions
  App.jsx       shell, routing, toasts
```

## Deploy to GitHub Pages

A workflow is included at `.github/workflows/deploy.yml`.

1. Push this repo to GitHub (branch `main`).
2. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push again (or run the workflow manually). Your site goes live at `https://<your-username>.github.io/<repo-name>/`.

## License

MIT
