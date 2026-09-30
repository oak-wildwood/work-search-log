import { ref } from 'vue'
import type { Entry, EntryDraft } from '../types'
import { createSeedEntries } from '../lib/seedEntries'
import { DEMO_DATA_ENABLED } from '../lib/demoMode'
import { LocalStorageEntryRepository, type EntryRepository } from '../lib/entryRepository'

const repository: EntryRepository = new LocalStorageEntryRepository()

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const storedEntries = repository.loadSync?.() ?? null
// Only on first run — clearing storage or clicking "Clear all" doesn't bring
// the sample entries back. See demoMode.ts for when seeding is allowed at all.
const seeded = storedEntries === null && DEMO_DATA_ENABLED

// Module-level state: every component calling useEntries() shares one store,
// with no need for provide/inject or a state-management library.
const entries = ref<Entry[]>(storedEntries ?? (seeded ? createSeedEntries() : []))
const saveError = ref(false)

// Writes are chained so they reach the repository in the order they were made,
// even when the backend is async. `entries` itself updates synchronously; only
// `saveError` waits for the adapter's result.
let pending: Promise<unknown> = Promise.resolve()

function persist(write: () => Promise<void>) {
  pending = pending
    .then(write)
    .then(
      () => false,
      () => true,
    )
    .then((failed) => {
      saveError.value = failed
    })
}

// Written immediately so the seed behaves like real data — edits and removals
// stick, and reloading doesn't regenerate a fresh batch mid-session.
if (seeded) persist(() => repository.replaceAll(entries.value))

// An adapter without a synchronous read hydrates once its list settles, unless
// the claimant has already changed something in the meantime.
if (!repository.loadSync) {
  const before = entries.value
  repository
    .list()
    .then((stored) => {
      if (entries.value === before) entries.value = stored
    })
    .catch(() => {})
}

function addEntry(draft: EntryDraft) {
  const now = new Date().toISOString()
  const entry: Entry = { ...draft, id: makeId(), createdAt: now, updatedAt: now }
  entries.value = [...entries.value, entry]
  persist(() => repository.put(entry))
}

function updateEntry(id: string, draft: EntryDraft) {
  const index = entries.value.findIndex((e) => e.id === id)
  if (index === -1) return
  const next = [...entries.value]
  next[index] = { ...next[index], ...draft, updatedAt: new Date().toISOString() }
  entries.value = next
  const updated = next[index]
  persist(() => repository.put(updated))
}

function removeEntry(id: string) {
  entries.value = entries.value.filter((e) => e.id !== id)
  persist(() => repository.remove(id))
}

function clearAll() {
  entries.value = []
  persist(() => repository.replaceAll([]))
}

function replaceAll(next: Entry[]) {
  entries.value = next
  persist(() => repository.replaceAll(next))
}

export function useEntries() {
  return {
    entries,
    saveError,
    isDemoData: seeded,
    addEntry,
    updateEntry,
    removeEntry,
    clearAll,
    replaceAll,
  }
}
