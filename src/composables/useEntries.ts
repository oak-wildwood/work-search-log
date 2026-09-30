import { ref } from 'vue'
import type { Entry, EntryDraft } from '../types'
import { createSeedEntries } from '../lib/seedEntries'
import { DEMO_DATA_ENABLED } from '../lib/demoMode'
import { LocalStorageEntryRepository, type EntryRepository } from '../lib/entryRepository'

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/**
 * Builds the log's store over a repository. The app builds exactly one, over
 * localStorage (below); tests build their own over other adapters.
 */
export function createEntriesStore(repository: EntryRepository) {
  const storedEntries = repository.loadSync?.() ?? null
  // Only on first run — clearing storage or clicking "Clear all" doesn't bring
  // the sample entries back. See demoMode.ts for when seeding is allowed at all.
  // It needs the synchronous read to know the repository was never written, so an
  // adapter that can only list asynchronously is never overwritten with samples.
  const seeded = repository.loadSync !== undefined && storedEntries === null && DEMO_DATA_ENABLED

  const entries = ref<Entry[]>(storedEntries ?? (seeded ? createSeedEntries() : []))
  const saveError = ref(false)

  // Writes are chained so they reach the repository in the order they were made,
  // even when the backend is async. `entries` itself updates synchronously; only
  // `saveError` waits for the adapter's result.
  let pending: Promise<unknown> = Promise.resolve()
  // Whether `entries` is known to match what the repository holds. Always true
  // with a synchronous read. An async adapter is not until hydration has applied
  // (it is skipped if the claimant changes something first, and a failing list()
  // never applies), and a whole-log write would then delete what the backend has
  // and memory doesn't.
  let hydrated = repository.loadSync !== undefined
  // After a failed write the repository may be missing entries that exist only in
  // memory. Writing just the next change would succeed, clear `saveError`, and
  // leave them unsaved, so once `hydrated` the next write saves the whole log
  // instead. Until a whole-log write succeeds, `saveError` stays set.
  let needsResync = false

  // Adapters get plain objects, never Vue's reactive proxies: structuredClone, for
  // one, throws on those.
  const snapshot = () => entries.value.map((entry) => ({ ...entry }))

  function persist(write: () => Promise<void>, writesWholeLog = false) {
    pending = pending.then(async () => {
      const resync = needsResync && hydrated
      try {
        await (resync ? repository.replaceAll(snapshot()) : write())
        if (resync || writesWholeLog) {
          needsResync = false
          hydrated = true
        }
      } catch {
        needsResync = true
      }
      saveError.value = needsResync
    })
  }

  // Written immediately so the seed behaves like real data — edits and removals
  // stick, and reloading doesn't regenerate a fresh batch mid-session.
  if (seeded) persist(() => repository.replaceAll(snapshot()), true)

  // An adapter without a synchronous read hydrates once its list settles, unless
  // the claimant has already changed something in the meantime.
  if (!repository.loadSync) {
    const before = entries.value
    repository
      .list()
      .then((stored) => {
        if (entries.value === before) {
          entries.value = stored
          hydrated = true
        }
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
    persist(() => repository.replaceAll([]), true)
  }

  function replaceAll(next: Entry[]) {
    entries.value = next
    persist(() => repository.replaceAll(next), true)
  }

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

// Module-level state: every component calling useEntries() shares one store,
// with no need for provide/inject or a state-management library.
const store = createEntriesStore(new LocalStorageEntryRepository())

export function useEntries() {
  return store
}
