# Invoice Generator

A simple, fast invoice builder for freelancers and small businesses. Create an invoice, see a live preview, save it, and print or export it as PDF. Amounts are in Naira (₦) with 7.5% VAT by default (editable).

Everything runs in the browser. Invoices are stored in `localStorage`, so there is no backend and no sign-up.

## Features

- Live invoice preview while you type
- Line items with automatic subtotal, VAT and total
- Naira formatting via `Intl.NumberFormat('en-NG')`
- Save, reopen and delete invoices (persisted in the browser)
- Print / Save as PDF with a clean print stylesheet
- Responsive layout

## Tech

React 18 · Vite 5 · plain CSS · custom `useLocalStorage` hook

## Getting started

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Project structure

```
src/
  components/   InvoiceForm, InvoicePreview, SavedInvoices
  hooks/        useLocalStorage
  utils/        invoice helpers (totals, Naira formatting, defaults)
  App.jsx       state + layout
```

## Deploy to GitHub Pages

A workflow is included at `.github/workflows/deploy.yml`.

1. Push this repo to GitHub (branch `main`).
2. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push again (or run the workflow manually). Your site goes live at `https://<your-username>.github.io/<repo-name>/`.

## Ideas to extend

- Business logo upload
- Client address book
- Multiple currencies (NGN, USD, GBP)
- Invoice status (draft / sent / paid) with filters
- Export / import invoices as JSON
- Tests with Vitest + React Testing Library

## License

MIT
