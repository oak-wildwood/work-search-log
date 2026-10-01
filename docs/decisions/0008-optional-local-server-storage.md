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

**No request until asked.** Nothing is sent on load, on a timer, or when the setting is saved. The one
request is the Test connection button. While Chrome's permission prompt is open the test waits with no
timeout and the button disabled, since a timeout would cancel the prompt before it is read.

**The browser's log is the record; the server holds a copy.** When the two disagree about whether an
entry exists, the browser wins: an entry on the server that the log lacks is removed from the server,
never added to the log. Otherwise an entry removed while the setting was off, or after `job-funnel
import-wsl` copied it, would reappear in the record. The one exception is an empty log with nothing
waiting to sync, which is what a browser looks like after its site data is cleared: then the server's
entries are restored into it.

**Consent is consent to turn it on.** The adapter mirrors every entry the server lacks, whenever it is
on, so the confirmation dialog that offers to copy the log is the gate on enabling: Confirm turns it on,
Cancel changes nothing. The copy happens on the next load, not at confirmation: until then the session
still stores in the browser only, so copying earlier would put entries on the server that the claimant
might remove before reloading, and the next load would bring them back. Nothing local is ever deleted.
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
- After an offline "Clear all", entries that exist only on the server come back once the clear has
  replayed, since they were never seen here to remove.
- Revisit the ownership rule if job-funnel should ever create entries, such as a skill that logs an
  application to both at once. The server would then be a source rather than a copy, so the rule would
  no longer hold, and removals would need recording on both sides so they can't come back. That also
  amends job-funnel's "store, not author" rule (its ADR 0006), and every entry would still have to be
  the claimant's own account of what they did ([ADR 0004](./0004-no-autofill-no-compliance-claims.md)).
- [ADR 0001](./0001-browser-only-storage.md) still describes the default. Revisit this record if a
  second network backend is ever proposed: the loopback-only rule is what keeps it small.
