# Work Search Log

A small, private log for tracking job-search activity — built to satisfy the kind of work-search
record most U.S. state unemployment agencies can ask a claimant to produce, at any time, for any
week of their benefit year.

Everything is entered by hand, grouped by week with a "did I hit my required number of activities
this week" indicator, and exportable as CSV or a JSON backup. There is no server and no account —
your data lives only in your browser's local storage, on your machine.

> Not affiliated with or endorsed by any state workforce agency. It's a personal record-keeping
> tool shaped by the kind of work-search log those agencies typically require, not an official
> form.

## Features

- Log activities with the fields a typical state work-search log asks for: date, activity type,
  job sought, employer, contact info, contact method, result, notes
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

The build is a static site (`dist/`), so any static host works, but the simplest path is GitHub
Pages — it needs nothing beyond the repo you already have, no extra account, no signup.

1. Fork this repo.
2. In your fork, go to **Settings → Pages**. Under "Build and deployment", set **Source** to
   **GitHub Actions**. That's the only manual step — the `.github/workflows/pages.yml` workflow
   already in the repo handles the rest.
3. That setting change alone doesn't trigger a deploy — push any commit to `main` (or go to
   **Actions → "Deploy to GitHub Pages" → Run workflow** to trigger it without waiting for one).
4. Watch it under the **Actions** tab. Once it finishes (about 30 seconds to build, then a minute
   or so for Pages to actually serve it the first time), your copy is live at
   `https://<your-username>.github.io/work-search-log/`.

Every future push to `main` redeploys automatically.

You don't need a branch of your own to use this for a particular state. Which state the app follows
is a runtime choice stored in your browser, not something baked into the build, so the deployed copy
works for whoever opens it — including you. Your entries stay in your browser; there's no server to
share them with anyone.

> If Pages ever serves a blank page with a 404 for `/src/main.ts` in the console, GitHub fell back
> to its own generic deploy instead of running this repo's workflow — usually because the
> workflow hadn't run yet when Pages was first enabled. Push any commit (or re-run the workflow
> manually) and it self-corrects.

## Adapting it for your state

Everything state-specific lives in a JSON file under `src/config/states/` — activity types and how
each one counts, result options, contact methods, which fields the state's log asks for, which day
its week starts on, and where its rules are published. Pick your state from the header; anything
without a bundled config falls back to `generic-us.json`, so the tool still works in all 50 states.

Two states ship with real configs, verified against the agency's own published rules:

- **Texas** (TWC) — weekly count varies by county, so the app asks for yours
- **Washington** (ESD) — fixed statewide count, much larger activity taxonomy

Both are states where you keep your own log and produce it if the agency asks. Some states instead
make you enter work search in their portal before you can file a weekly claim, which makes a tool
like this a personal backup copy rather than the record itself.

**Forking is the expected path here** — writing a config for your own state is usually the only
change needed, and it's yours to keep. PRs aren't closed off, just slow. See
[CONTRIBUTING.md](./CONTRIBUTING.md) for the config format.

The required number of activities per week is only in a config where the state actually fixes one
for everybody — Washington's 3 is statewide, so it's offered as a starting value. Texas sets it per
county, so the app asks instead, and links you to TWC's county table. Either way your determination
letter is the authority and always wins. The number is recorded with the date it took effect, so if
it changes mid-claim, weeks you already logged are still scored against the number that applied
then.

On first run a short setup step asks your name, your state, and that weekly number. It's reachable
afterwards from **Preferences** in the header. Nothing is sent anywhere, and the app never asks for
a Social Security number — a browser-only app has nowhere safe to keep one.

## Tech stack

Vue 3 (`<script setup>`, TypeScript) + Vite, Vitest for unit tests, ESLint + Prettier. No backend,
no state-management library — a couple of small composables over `localStorage` cover it.

```
src/
  config/       per-state JSON rules, plus the loader that validates and resolves them
  lib/          pure functions: localStorage wrapper, weekly grouping, requirement scoring, CSV, JSON backup
  composables/  reactive stores built on lib/ (entries, settings, state config, theme)
  components/   presentational Vue components
```

## Roadmap

This is intentionally a local-only, no-backend v1. A hosted version — so someone non-technical
could use this without installing anything, syncing entries across devices — is a plausible future
phase, but it needs real auth and a real backend, and isn't part of this repo yet.

## License

MIT — see [LICENSE](./LICENSE).
