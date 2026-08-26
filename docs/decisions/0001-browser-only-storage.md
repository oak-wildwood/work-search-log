# 1. No backend, no accounts, browser storage only

## Context

This tool exists to produce a work-search record a claimant can hand to a state unemployment
agency. That record only has to be useful to the one person who kept it, on the device they kept
it on — it never needs to be queried, shared, or aggregated server-side. A backend and accounts
would add a place for the data to live, a login to lose, and infrastructure someone has to run and
pay for indefinitely to keep a personal record-keeping tool alive.

## Decision

Everything is stored in the browser's `localStorage`, read and written through
`src/lib/storage.ts`. There is no server, no account, and no network call in the app at all. The
only personal detail kept is the claimant's name (`Settings.name` in
`src/composables/useSettings.ts`); an SSN or claim number is never asked for and has nowhere safe
to go, since any key protecting one would sit in the same storage next to it.

## Consequences

- No sync across devices or browsers, and no recovery if the browser's storage is cleared,
  the site data is reset, or the machine is wiped. This is why a full JSON export/import
  (`src/lib/backup.ts`) exists, and why the README repeatedly nags claimants to back up before
  clearing data, switching devices, or reinstalling.
- Nothing about work search ever leaves the machine — no analytics, no telemetry, nothing to
  breach.
- A hosted, syncing version is a plausible future (see the Roadmap section of the README), but it
  is a different, larger decision: it needs real auth and a real backend, neither of which this
  decision buys us. Revisit this record if that phase is ever started.
