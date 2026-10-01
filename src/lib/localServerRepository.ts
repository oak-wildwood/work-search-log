import type { Entry } from '../types'
import { DEMO_DATA_ENABLED, STORAGE_SUFFIX } from './demoMode'
import {
  LocalStorageEntryRepository,
  isLaterTimestamp,
  type EntryRepository,
} from './entryRepository'
import { readJSON, writeJSON } from './storage'

export const PENDING_KEY = `work-search-log:pending:v1${STORAGE_SUFFIX}`

const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '[::1]']
const DEFAULT_TIMEOUT_MS = 5000

/** What the companion server listens on unless it is told otherwise. */
export const DEFAULT_SERVER_PORT = 8765
export const DEFAULT_SERVER_URL = `http://127.0.0.1:${DEFAULT_SERVER_PORT}`

export type ConnectionResult =
  { kind: 'connected' } | { kind: 'unauthorized' } | { kind: 'unreachable' } | { kind: 'malformed' }

export type LoopbackPermission = 'granted' | 'prompt' | 'denied' | 'unsupported'

/** A change the server has not acknowledged yet. A put's content is the local entry. */
export interface PendingOp {
  op: 'put' | 'remove'
  id: string
  updatedAt: string
}

export interface LocalServerOptions {
  baseUrl: string
  token: string
  /** Per-request timeout, not applied while the permission prompt may be open. */
  timeoutMs?: number
  /** Replay pending operations as soon as the repository is constructed. Default true. */
  reconcileOnLoad?: boolean
}

/** Throws unless `raw` is an http(s) URL with no credentials whose parsed host is loopback. */
export function parseLoopbackBase(raw: string): string {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('Server address is not a valid URL')
  }
  const ok =
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    url.username === '' &&
    url.password === '' &&
    LOOPBACK_HOSTS.includes(url.hostname)
  if (!ok) throw new Error('Server address must be a loopback address on this machine')
  return (url.origin + url.pathname).replace(/\/+$/, '')
}

const STRING_FIELDS = [
  'id',
  'date',
  'activityId',
  'activity',
  'siteAppliedOn',
  'jobType',
  'employer',
  'address',
  'phone',
  'contactName',
  'contactMethod',
  'result',
  'notes',
  'createdAt',
  'updatedAt',
] as const

// Only the id is required. A backup import accepts an entry with as little as an id,
// a date and an activity, and one such entry must not turn the whole list "malformed"
// and stall sync for good. Any known field that is present must still be a string.
function isEntry(value: unknown): value is Entry {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    STRING_FIELDS.every((k) => v[k] === undefined || typeof v[k] === 'string')
  )
}

type Fetched = { result: ConnectionResult; entries?: Entry[] }

/** A response whose body has already been read, so nothing is left to stall on. */
type Reply = { ok: boolean; status: number; text: string }

/**
 * Stores entries in localStorage first, then mirrors them to a companion service on
 * this machine. The server being down, refused, or answering nonsense never loses
 * or blocks a write: the change stays local and is queued as pending until a later
 * successful call replays it. "Unavailable" is never read as "the server is empty".
 *
 * One way only: nothing the server holds is ever written to the log. Two-way sync
 * waits for a decision of its own (ADR 0008).
 */
export class LocalServerRepository implements EntryRepository {
  private readonly base: string
  private readonly token: string
  private readonly timeoutMs: number
  private readonly local = new LocalStorageEntryRepository()
  private readonly pendingListeners = new Set<(count: number) => void>()
  // Network work runs one at a time, in the order it was asked for.
  private chain: Promise<unknown> = Promise.resolve()

  constructor(options: LocalServerOptions) {
    if (DEMO_DATA_ENABLED) throw new Error('The local server is never used in a demo build')
    this.base = parseLoopbackBase(options.baseUrl)
    this.token = options.token
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    if (options.reconcileOnLoad ?? true) void this.enqueue(() => this.reconcileNow())
  }

  loadSync(): Entry[] | null {
    return this.local.loadSync()
  }

  /** Subscribe to changes of `pendingCount()`. The returned function unsubscribes. */
  onPendingChange(listener: (count: number) => void): () => void {
    this.pendingListeners.add(listener)
    return () => this.pendingListeners.delete(listener)
  }

  pendingCount(): number {
    return this.readPending().length
  }

  async permission(): Promise<LoopbackPermission> {
    try {
      const status = await navigator.permissions.query({
        name: 'loopback-network' as PermissionName,
      })
      const state: string = status.state
      return state === 'granted' || state === 'prompt' || state === 'denied' ? state : 'unsupported'
    } catch {
      return 'unsupported'
    }
  }

  /**
   * `reconcile: false` probes without copying anything: reconciliation pushes every
   * entry the server lacks, which a caller asking for consent first must not trigger.
   */
  async testConnection(options: { reconcile?: boolean } = {}): Promise<ConnectionResult> {
    // The only call allowed to raise the permission prompt, and so never timed out
    // while it may be open: aborting would report "unreachable" before it is read.
    const prompting = (await this.permission()) === 'prompt'
    const { result } = await this.fetchList(!prompting)
    // This is the call that gets the claimant to allow access, so whatever was
    // written while it was blocked goes now rather than at the next write.
    if (result.kind === 'connected' && (options.reconcile ?? true)) void this.reconcile()
    return result
  }

  /** Replays pending operations and copies what the server lacks. False if a call failed. */
  reconcile(): Promise<boolean> {
    return this.enqueue(() => this.reconcileNow())
  }

  async list(): Promise<Entry[]> {
    return (await this.local.list()).map((e) => ({ ...e }))
  }

  async put(entry: Entry): Promise<void> {
    await this.mutateLocal((all) => {
      const index = all.findIndex((e) => e.id === entry.id)
      if (index === -1) return [...all, entry]
      const next = [...all]
      next[index] = entry
      return next
    })
    const op: PendingOp = {
      op: 'put',
      id: entry.id,
      updatedAt: stampOf(entry, new Date().toISOString()),
    }
    const queued = this.setPending([op])
    void this.enqueue(async () => {
      if (!(await this.networkAllowed())) return
      const res = await this.send('PUT', entryPath(entry.id), entry)
      if (res?.ok) await this.afterSuccess([op])
    })
    if (!queued) throw new Error(QUEUE_FAILED)
  }

  async remove(id: string): Promise<void> {
    await this.mutateLocal((all) => all.filter((e) => e.id !== id))
    const op: PendingOp = { op: 'remove', id, updatedAt: new Date().toISOString() }
    const queued = this.setPending([op])
    void this.enqueue(async () => {
      if (!(await this.networkAllowed())) return
      const res = await this.send('DELETE', entryPath(id))
      if (res && (res.ok || res.status === 404)) await this.afterSuccess([op])
    })
    if (!queued) throw new Error(QUEUE_FAILED)
  }

  async replaceAll(entries: Entry[]): Promise<void> {
    const before = this.local.loadSync() ?? []
    await this.local.replaceAll(entries)
    const keep = new Set(entries.map((e) => e.id))
    const now = new Date().toISOString()
    const ops: PendingOp[] = [
      ...entries.map((e): PendingOp => ({ op: 'put', id: e.id, updatedAt: stampOf(e, now) })),
      ...before
        .filter((e) => !keep.has(e.id))
        .map((e): PendingOp => ({ op: 'remove', id: e.id, updatedAt: now })),
    ]
    const queued = this.setPending(ops)
    void this.enqueue(async () => {
      if (!(await this.networkAllowed())) return
      const { result, entries: server } = await this.fetchList(true)
      if (result.kind !== 'connected' || !server) return
      if (entries.length > 0) {
        const res = await this.send('POST', '/wsl/entries:bulk', { entries })
        if (!res?.ok) return
      }
      for (const s of server) {
        if (keep.has(s.id)) continue
        const res = await this.send('DELETE', entryPath(s.id))
        if (!res || !(res.ok || res.status === 404)) return
      }
      await this.afterSuccess(ops)
    })
    if (!queued) throw new Error(QUEUE_FAILED)
  }

  // ---- internals ----

  private enqueue<T>(work: () => Promise<T>): Promise<T | false> {
    const run = this.chain.then(work, work).catch(() => false as const)
    this.chain = run
    return run
  }

  private async networkAllowed(): Promise<boolean> {
    const permission = await this.permission()
    return permission !== 'prompt' && permission !== 'denied'
  }

  /** Read and write in one tick, so nothing else can interleave a change between them. */
  private mutateLocal(change: (all: Entry[]) => Entry[]): Promise<void> {
    return this.local.replaceAll(change(this.local.loadSync() ?? []))
  }

  /**
   * Resolves to null when the request fails outright: a network error, or a timeout
   * waiting for the headers or for the body. The body is read here, inside the
   * timeout, because the queue is serial and one stalled read would block every
   * later request. `timed: false` waits on the headers without limit, for a request
   * that may be waiting on the permission prompt; once they arrive the prompt is
   * over, so the body is always timed.
   */
  private async send(
    method: string,
    path: string,
    body?: unknown,
    timed = true,
  ): Promise<Reply | null> {
    const controller = new AbortController()
    const limit = async <T>(work: Promise<T>): Promise<T> => {
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        return await Promise.race([
          work,
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              controller.abort()
              reject(new Error('timeout'))
            }, this.timeoutMs)
          }),
        ])
      } finally {
        clearTimeout(timer)
      }
    }
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${this.token}` }
      if (body !== undefined) headers['Content-Type'] = 'application/json'
      const request = fetch(this.base + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: 'error',
        signal: controller.signal,
      })
      const res = await (timed ? limit(request) : request)
      const text = await limit(res.text())
      return { ok: res.ok, status: res.status, text }
    } catch {
      return null
    }
  }

  private async fetchList(timed: boolean): Promise<Fetched> {
    const res = await this.send('GET', '/wsl/entries', undefined, timed)
    if (!res) return { result: { kind: 'unreachable' } }
    if (res.status === 401 || res.status === 403) return { result: { kind: 'unauthorized' } }
    if (!res.ok) return { result: { kind: 'unreachable' } }
    try {
      const body: unknown = JSON.parse(res.text)
      if (Array.isArray(body) && body.every(isEntry)) {
        return { result: { kind: 'connected' }, entries: body }
      }
    } catch {
      // fall through: a 2xx that isn't JSON is malformed
    }
    return { result: { kind: 'malformed' } }
  }

  private async afterSuccess(done: PendingOp[]) {
    this.clearPending(done)
    if (this.pendingCount() > 0) await this.reconcileNow()
  }

  /** Must run inside the queue. Returns whether the server now has every change. */
  private async reconcileNow(): Promise<boolean> {
    if (!(await this.networkAllowed())) return false
    const { result, entries: server } = await this.fetchList(true)
    if (result.kind !== 'connected' || !server) return false

    // One way: the server's list only decides what to send. An entry only the server
    // has is left there, since it was removed here or reached the server some other way.
    const pending = this.readPending()
    const pendingById = new Map(pending.map((op) => [op.id, op]))
    const logEntries = this.local.loadSync() ?? []
    const logIds = new Set(logEntries.map((entry) => entry.id))
    const serverById = new Map(server.map((entry) => [entry.id, entry]))
    // A change made here is replayed even over a newer server copy. Otherwise an entry
    // is sent when its copy here is newer; one with no updatedAt (a backup import
    // allows one) counts as oldest.
    const push = logEntries.filter((entry) => {
      const serverCopy = serverById.get(entry.id)
      if (!serverCopy || pendingById.has(entry.id)) return true
      return isLaterTimestamp(stampOf(entry, ''), stampOf(serverCopy, ''))
    })
    const remove = pending
      .filter((op) => op.op === 'remove' && !logIds.has(op.id) && serverById.has(op.id))
      .map((op) => op.id)

    // A failed call leaves its operations pending for the next attempt.
    const unresolved = new Set<string>()
    if (push.length > 0) {
      const res = await this.send('POST', '/wsl/entries:bulk', { entries: push })
      if (!res?.ok) for (const entry of push) unresolved.add(entry.id)
    }
    for (const [index, id] of remove.entries()) {
      const res = await this.send('DELETE', entryPath(id))
      if (!res || !(res.ok || res.status === 404)) {
        for (const rest of remove.slice(index)) unresolved.add(rest)
        break
      }
    }
    this.clearPending(pending.filter((op) => !unresolved.has(op.id)))
    return unresolved.size === 0
  }

  // ---- pending queue ----

  private readPending(): PendingOp[] {
    const raw = readJSON<unknown>(PENDING_KEY, [])
    return Array.isArray(raw)
      ? raw.filter(
          (p): p is PendingOp =>
            typeof p === 'object' &&
            p !== null &&
            (p.op === 'put' || p.op === 'remove') &&
            typeof p.id === 'string' &&
            typeof p.updatedAt === 'string',
        )
      : []
  }

  /** The latest operation for an id replaces any earlier one. False if it couldn't be stored. */
  private setPending(ops: PendingOp[]): boolean {
    const byId = new Map(this.readPending().map((p) => [p.id, p]))
    for (const op of ops) byId.set(op.id, op)
    return this.writePending([...byId.values()])
  }

  /** Drops only operations that are still exactly what was sent. */
  private clearPending(done: PendingOp[]) {
    const sent = new Set(done.map(key))
    this.writePending(this.readPending().filter((p) => !sent.has(key(p))))
  }

  /** Listeners hear only about a count that was actually stored. */
  private writePending(ops: PendingOp[]): boolean {
    const before = this.pendingCount()
    if (!writeJSON(PENDING_KEY, ops)) return false
    if (ops.length !== before) for (const l of [...this.pendingListeners]) l(ops.length)
    return true
  }
}

const QUEUE_FAILED = 'Could not queue the change for the local server'
const key = (p: PendingOp) => `${p.op}\u0000${p.id}\u0000${p.updatedAt}`
/** The entry's updatedAt, or `fallback` for an imported entry that has none. */
const stampOf = (entry: Entry, fallback: string): string =>
  typeof entry.updatedAt === 'string' ? entry.updatedAt : fallback
const entryPath = (id: string) => `/wsl/entries/${encodeURIComponent(id)}`
