# 7. Entry storage behind an EntryRepository interface

## Context

`useEntries` read and wrote `localStorage` directly, so the browser was the only place the log
could live. Some claimants may later want an opt-in backend (a local server, for instance). That
is a separate, later decision; this one only removes the coupling that would make it invasive.

## Decision

`src/lib/entryRepository.ts` defines `EntryRepository`: `list()`, `put(entry)` (create or replace,
keyed by `entry.id`), `remove(id)` and `replaceAll(entries)`. Methods return promises so a
network-backed adapter fits, and a failed write rejects — the composable turns that into the
existing `saveError` flag once the adapter settles. `LocalStorageEntryRepository` wraps
`readJSON`/`writeJSON` with the existing storage key, including the `:demo` suffix.
`InMemoryEntryRepository` exists for tests only. `describeEntryRepositoryContract` in
`src/lib/entryRepositoryContract.ts` is a shared suite each adapter's test file calls.

`useEntries` depends only on the interface: `createEntriesStore(repository)` builds the store,
`useEntries()` returns the one the app builds over `LocalStorageEntryRepository`, and tests build
their own over other adapters. Id generation and timestamps stay in the composable. The `entries`
ref still updates synchronously; only persistence is async, and writes are chained so they reach
the repository in order.

**Failed writes.** The in-memory log is what the claimant sees, so after a failed write the next
write is a full `replaceAll(entries.value)` rather than a single-entry change, and `saveError`
clears only once that succeeds. Without this, a later small write would succeed while an earlier
entry stayed unsaved, and the warning would disappear. A full write is only safe when memory
matches what the repository holds: always for an adapter with `loadSync`, and for an async one
once hydration has applied. Before that (hydration skipped because the claimant changed something
first, or `list()` failing) a full write would delete what the backend has and memory lacks, so
writes stay single-entry and `saveError` stays set until a whole-log write (clear all, import)
succeeds.

**Synchronous initial read.** The first render must already have the stored entries, and seeding
depends on distinguishing "never stored" from "stored empty". So the interface has an optional
`loadSync()`; the localStorage adapter implements it and the composable uses it at import time.
An adapter without it starts empty and hydrates from `list()` when that settles (skipped if the
claimant has already changed something). Demo seeding also needs that knowledge, so it only
happens for adapters with `loadSync`; an async backend is never overwritten with sample data.

## Consequences

- Behavior a claimant sees is unchanged; this is groundwork for opt-in backends.
- Adding a backend means a new adapter that passes the contract, not edits to components.
- [ADR 0001](./0001-browser-only-storage.md) is unchanged: nothing leaves the browser until an
  adapter that does so exists and is opted into.
