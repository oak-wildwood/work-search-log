# Work Search Log

A small, private log for tracking job-search activity — built to satisfy the kind of work-search
record the Texas Workforce Commission (TWC) can ask an unemployment claimant to produce, at any
time, for any week of their benefit year.

Everything is entered by hand, grouped by week with a "did I hit my required number of activities
this week" indicator, and exportable as CSV or a JSON backup. There is no server and no account —
your data lives only in your browser's local storage, on your machine.

> Not affiliated with or endorsed by TWC. It's a personal record-keeping tool shaped by TWC's work
> search log requirements, not an official form.

## Features

- Log activities with the fields TWC's work search log asks for: date, activity type, job sought,
  employer, contact info, contact method, result, notes
- Entries grouped by week, each week showing a met/short badge against a configurable required
  count
- Edit or delete any entry
- Export to CSV (for printing or attaching to a claim)
- Export/import a full JSON backup — the only copy of this data lives in your browser, so back it
  up before you clear browser data, switch devices, or reinstall
- Print / save-as-PDF view
- Light and dark themes, responsive down to phone width
- Nothing leaves your browser: no accounts, no network calls, no analytics

## Running it yourself

```bash
npm install
npm run dev
```

Then open the printed local URL. To produce a static build:

```bash
npm run build   # outputs to dist/
npm run preview # serve that build locally to sanity-check it
```

## Deploying your own copy

The build is a static site (`dist/`), so any static host works.

- **Vercel**: import this repo at [vercel.com/new](https://vercel.com/new) — it's a zero-config
  Vite app, no settings to change.
- **GitHub Pages**: this repo ships `.github/workflows/pages.yml`, disabled by default. In your
  fork, go to Settings → Pages → Source → "GitHub Actions", then remove the `if: false` line (or
  flip it to `true`) in that workflow file and push to `main`.

## Adapting it for another state

The activity types, result options, and header copy are TWC-specific and live in `src/types.ts`
and `src/components/AppHeader.vue`. Every other state runs its own work-search-record requirements
— edit those two spots to match yours; the rest of the app (storage, weekly grouping, exports)
doesn't know or care which state it's for.

## Tech stack

Vue 3 (`<script setup>`, TypeScript) + Vite, Vitest for unit tests, ESLint + Prettier. No backend,
no state-management library — a couple of small composables over `localStorage` cover it.

```
src/
  lib/          pure functions: localStorage wrapper, weekly grouping, CSV, JSON backup
  composables/  reactive stores built on lib/ (entries, settings, theme)
  components/   presentational Vue components
```

## Roadmap

This is intentionally a local-only, no-backend v1. A hosted version — so someone non-technical
could use this without installing anything, syncing entries across devices — is a plausible future
phase, but it needs real auth and a real backend, and isn't part of this repo yet.

## License

MIT — see [LICENSE](./LICENSE).
