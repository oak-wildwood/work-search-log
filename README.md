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

The build is a static site (`dist/`), so any static host works. If you just forked this to use it
yourself, GitHub Pages needs nothing beyond the repo you already have — no extra account, no
signup.

### GitHub Pages (no extra account needed)

1. Fork this repo.
2. In your fork, go to **Settings → Pages**. Under "Build and deployment", set **Source** to
   **GitHub Actions**.
3. Open `.github/workflows/pages.yml` in your fork and delete this line (it ships disabled so
   forking the repo doesn't silently start deploying to your account):
   ```yaml
   if: false # flip to `true` (or delete this line) once Pages is enabled for your fork
   ```
   Commit that change directly on `main` (editing the file in the GitHub web UI and committing to
   `main` works fine).
4. That commit itself triggers the workflow — watch it under the **Actions** tab. You can also
   re-run it anytime from Actions → "Deploy to GitHub Pages" → "Run workflow".
5. Once it finishes (about 30 seconds to build, then a minute or so for Pages to actually serve
   it the first time), your copy is live at `https://<your-username>.github.io/work-search-log/`.

Every future push to `main` redeploys automatically.

### Vercel

Import this repo at [vercel.com/new](https://vercel.com/new) — it's a zero-config Vite app, no
settings to change. Requires a Vercel account; gives you preview deployments per branch/PR, which
GitHub Pages doesn't.

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
