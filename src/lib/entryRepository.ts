import type { Entry } from '../types'
import { readJSON, writeJSON } from './storage'
import { STORAGE_SUFFIX } from './demoMode'

/**
 * Where the log lives. Methods are async so a network-backed adapter fits; a
 * failed write rejects, which is how the composable tells it from success
 * (and sets `saveError`).
 */
export interface EntryRepository {
  list(): Promise<Entry[]>
  /** Create, or replace the entry with the same `id`. */
  put(entry: Entry): Promise<void>
  /** Removing an unknown id is a no-op. */
  remove(id: string): Promise<void>
  replaceAll(entries: Entry[]): Promise<void>
  /**
   * Optional synchronous initial read, so the first render already has the
   * stored entries. `null` means nothing has ever been stored (which is what
   * gates demo seeding). Adapters that can't read synchronously omit it and
   * the composable hydrates from `list()` once it settles.
   */
  loadSync?(): Entry[] | null
}

/** Whether timestamp `a` is strictly after `b`; unparseable values compare as strings. */
export function isLaterTimestamp(a: string, b: string): boolean {
  const ta = Date.parse(a)
  const tb = Date.parse(b)
  return Number.isNaN(ta) || Number.isNaN(tb) ? a > b : ta > tb
}

export const STORAGE_KEY = `work-search-log:entries:v1${STORAGE_SUFFIX}`

export class LocalStorageEntryRepository implements EntryRepository {
  loadSync(): Entry[] | null {
    return readJSON<Entry[] | null>(STORAGE_KEY, null)
  }

  async list(): Promise<Entry[]> {
    return this.loadSync() ?? []
  }

  async put(entry: Entry): Promise<void> {
    const all = await this.list()
    const index = all.findIndex((e) => e.id === entry.id)
    if (index === -1) all.push(entry)
    else all[index] = entry
    return this.replaceAll(all)
  }

  async remove(id: string): Promise<void> {
    const all = await this.list()
    if (!all.some((e) => e.id === id)) return
    return this.replaceAll(all.filter((e) => e.id !== id))
  }

  async replaceAll(entries: Entry[]): Promise<void> {
    if (!writeJSON(STORAGE_KEY, entries)) throw new Error('Could not write entries to localStorage')
  }
}

/** Test support only — nothing in the app should construct this. */
export class InMemoryEntryRepository implements EntryRepository {
  private entries: Entry[] = []

  async list(): Promise<Entry[]> {
    return structuredClone(this.entries)
  }

  async put(entry: Entry): Promise<void> {
    const copy = structuredClone(entry)
    const index = this.entries.findIndex((e) => e.id === entry.id)
    if (index === -1) this.entries.push(copy)
    else this.entries[index] = copy
  }

  async remove(id: string): Promise<void> {
    this.entries = this.entries.filter((e) => e.id !== id)
  }

  async replaceAll(entries: Entry[]): Promise<void> {
    this.entries = structuredClone(entries)
  }
}
