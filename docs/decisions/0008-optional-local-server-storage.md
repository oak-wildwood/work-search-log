# 8. Optional local-server storage

## Context

[ADR 0001](./0001-browser-only-storage.md) kept everything in `localStorage` and made no network call
at all. That is still the right default, but the log is only as durable as the browser's storage: clearing
site data loses the only copy. [ADR 0007](./0007-entry-repository.md) put storage behind an interface so
that an opt-in backend could be added without touching components. This is that backend, and it amends
0001: **no network call by default; an opt-in backend may talk to loopback addresses only, so nothing
leaves the claimant's machine.**

## Decision

Preferences has a Storage section. Browser storage is the default. The other choice, Local server, keeps
a second copy in a small companion service the claimant runs on their own computer. The adapter is
`LocalServerRepository` (`src/lib/localServerRepository.ts`); the choice, address and token live in
`src/composables/useStorageBackend.ts`. The wire contract is four calls, all with a bearer token and JSON
bodies: `GET /wsl/entries`, `PUT /wsl/entries/{id}`, `DELETE /wsl/entries/{id}` and
`POST /wsl/entries:bulk`.

**Loopback only.** The address is parsed with `new URL()` and accepted only as `http(s)` with no
credentials and a parsed host of `127.0.0.1`, `localhost` or `[::1]`; the form and the adapter share that
check. Every request uses `redirect: 'error'`, so whatever answers on the port can't forward an entry to
another host.

**Local first, never lossy.** Every write goes to `localStorage` before the network is tried, and a
failed call queues the change as pending. An unreachable server is never read as an empty one. The
adapter is never built in a demo or preview build, and a saved choice that can't be honored falls back to
browser storage rather than blocking anything.

**No request until it is on.** While it is off, nothing is sent on load, on a timer, or when the
setting is saved; the one request is the Test connection button. While Chrome's permission prompt is open the test waits with no
timeout and the button disabled, since a timeout would cancel the prompt before it is read.

**One way: the browser's log is the record, and the server holds a copy.** Changes flow from the
browser to the server and never back. Nothing the server holds is written to the log: an entry only the
server has is not added, a newer server copy does not replace the one here, and an empty or cleared log
is not restored from it. The server's list only decides what to send, and a removal made here is
replayed even over a newer server copy. An entry only the server has is left there rather than deleted,
since it may be the only copy of something newer than an older backup the log was restored from. A
two-way sync would let an entry removed while the setting was off, or test data that reached the server,
appear in the record unreviewed, so the adapter has no path that writes to the log, and
`EntryRepository` no longer has a hook for one. Two-way sync waits until it is decided on as its own
phase (see Consequences).

**Consent is consent to turn it on.** The adapter mirrors every entry the server lacks, whenever it is
on, so the confirmation dialog that offers to copy the log is the gate on enabling: Confirm turns it on,
Cancel changes nothing. The copy happens on the next load, not at confirmation: until then the session
still stores in the browser only, so copying earlier would put entries on the server that the claimant
might remove before reloading, and they would stay there. Nothing local is ever deleted.
Turning it off returns to browser storage, leaves the server as it was, and forgets the token (the
address is kept).

**The token is kept apart.** It lives in `localStorage` under its own key, not in `Settings`, because
`settings` is handed whole to the print view. It never appears in the JSON backup, the CSV, or the
printed sheet. A backend change applies on the next load, since the store is built once at startup.

## Trust boundary

The token sits in `localStorage`, so anything that can run script on the same origin can read it. On
GitHub Pages every project site under one account shares one origin, and so shares `localStorage` and
Chrome's per-site permission to reach the local network. A custom domain gives the app an origin of its
own. A token here protects against another machine or a stray local page, not against other sites on a
shared origin.

The app ships no Content-Security-Policy today. Any policy added later has to allow the configured
loopback host in `connect-src`, or these calls fail with the same bare network error as an unreachable
server.

## Consequences

- Chrome is the only browser this backend targets. It asks the claimant once per site to allow reaching a
  loopback address, and only the permission state tells a refusal apart from a server that isn't running.
  Chrome words the prompt "Access other apps and services on this device" and lists the permission as
  "Apps on device" in site settings; the Permissions API calls it `loopback-network`.
- When a test fails the page can't distinguish four causes (permission refused, server not running, wrong
  address or port, origin not on the server's allowed list), so the UI lists all four.
- The server can hold entries the log doesn't, and job-funnel sees them, until they are removed there
  by hand. A cleared browser is recovered from a JSON backup, not from the server.
- **Agreed: nothing is written from the server to the log until two-way sync is decided on as its own
  phase**, with its own ADR. The likely reasons are job-funnel creating entries (such as a skill that
  logs an application to both at once) and restoring a cleared browser from the server. That ADR has to
  settle how removals are recorded on both sides so they can't come back, how the claimant reviews
  anything before it enters the log, job-funnel's "store, not author" rule (its ADR 0006), and that every
  entry is still the claimant's own account of what they did
  ([ADR 0004](./0004-no-autofill-no-compliance-claims.md)).
- [ADR 0001](./0001-browser-only-storage.md) still describes the default. Revisit this record if a
  second network backend is ever proposed: the loopback-only rule is what keeps it small.
