import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Entry } from '../types'
import { InMemoryEntryRepository } from '../lib/entryRepository'
import { createEntriesStore } from './useEntries'

/**
 * The seed flag is read once at module load time (see useEntries.ts), so each
 * case needs a fresh module instance — vi.resetModules() plus a dynamic
 * import — rather than re-mounting the same singleton.
 */
async function loadEntries() {
  vi.resetModules()
  const mod = await import('./useEntries')
  return mod.useEntries()
}

const draft = {
  date: '2000-01-03',
  activity: 'Test activity',
  siteAppliedOn: '',
  jobType: '',
  employer: 'Test Employer',
  address: '',
  phone: '',
  contactName: '',
  contactMethod: '',
  result: '',
  notes: '',
}

function entryFor(id: string): Entry {
  return {
    ...draft,
    id,
    createdAt: '2000-01-03T00:00:00.000Z',
    updatedAt: '2000-01-03T00:00:00.000Z',
  }
}

const stored = () => JSON.parse(localStorage.getItem(`work-search-log:entries:v1`) ?? 'null')
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('useEntries seeding', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_DEMO_DATA', undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does not seed when VITE_DEMO_DATA is unset', async () => {
    const { entries, isDemoData } = await loadEntries()
    expect(isDemoData).toBe(false)
    expect(entries.value).toEqual([])
  })

  it('does not seed when VITE_DEMO_DATA is any value other than "1"', async () => {
    for (const value of ['0', 'false', 'true', 'yes']) {
      vi.stubEnv('VITE_DEMO_DATA', value)
      const { entries, isDemoData } = await loadEntries()
      expect(isDemoData).toBe(false)
      expect(entries.value).toEqual([])
    }
  })

  it('seeds when VITE_DEMO_DATA is exactly "1"', async () => {
    vi.stubEnv('VITE_DEMO_DATA', '1')
    const { entries, isDemoData } = await loadEntries()
    expect(isDemoData).toBe(true)
    expect(entries.value.length).toBeGreaterThan(0)
  })

  it('seeds in dev regardless of the flag', async () => {
    // MODE too: under vitest it is 'test', which demoMode.ts excludes so that
    // component tests aren't silently handed seeded data.
    vi.stubEnv('DEV', true)
    vi.stubEnv('MODE', 'development')
    const { entries, isDemoData } = await loadEntries()
    expect(isDemoData).toBe(true)
    expect(entries.value.length).toBeGreaterThan(0)
  })
})

describe('useEntries persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_DEMO_DATA', undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('persists add, update, remove and replace, updating the ref synchronously', async () => {
    const store = await loadEntries()
    store.addEntry(draft)
    expect(store.entries.value).toHaveLength(1)
    const id = store.entries.value[0].id
    store.updateEntry(id, { ...draft, notes: 'changed' })
    store.updateEntry('missing', draft)
    await vi.waitFor(() => expect(stored()[0].notes).toBe('changed'))
    expect(stored()).toHaveLength(1)
    store.removeEntry(id)
    await vi.waitFor(() => expect(stored()).toEqual([]))
    store.replaceAll([{ ...draft, id: 'x', createdAt: '', updatedAt: '' }])
    await vi.waitFor(() => expect(stored()).toHaveLength(1))
    store.clearAll()
    await vi.waitFor(() => expect(stored()).toEqual([]))
    expect(store.saveError.value).toBe(false)
  })

  it('sets saveError once a write fails', async () => {
    const store = await loadEntries()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    store.addEntry(draft)
    expect(store.entries.value).toHaveLength(1)
    await vi.waitFor(() => expect(store.saveError.value).toBe(true))
  })

  it('saves the whole log after a failed write, and only then clears saveError', async () => {
    const store = await loadEntries()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('quota')
    })
    store.addEntry({ ...draft, employer: 'Test Employer A' })
    await vi.waitFor(() => expect(store.saveError.value).toBe(true))
    expect(stored()).toBeNull()

    store.addEntry({ ...draft, employer: 'Test Employer B' })
    await vi.waitFor(() => expect(store.saveError.value).toBe(false))
    expect(stored().map((e: Entry) => e.employer)).toEqual(['Test Employer A', 'Test Employer B'])
  })

  it('does not bring back a removed entry after a failed remove', async () => {
    const store = await loadEntries()
    store.addEntry({ ...draft, employer: 'Test Employer A' })
    await vi.waitFor(() => expect(stored()).toHaveLength(1))
    const id = store.entries.value[0].id

    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('quota')
    })
    store.removeEntry(id)
    await vi.waitFor(() => expect(store.saveError.value).toBe(true))

    store.addEntry({ ...draft, employer: 'Test Employer B' })
    await vi.waitFor(() => expect(store.saveError.value).toBe(false))
    expect(stored().map((e: Entry) => e.employer)).toEqual(['Test Employer B'])
  })
})

describe('useEntries over an adapter with no synchronous read', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_DEMO_DATA', undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('starts empty, then hydrates from list()', async () => {
    const repository = new InMemoryEntryRepository()
    await repository.replaceAll([entryFor('stored')])
    const store = createEntriesStore(repository)
    expect(store.entries.value).toEqual([])
    await vi.waitFor(() => expect(store.entries.value).toEqual([entryFor('stored')]))
  })

  it('does not replace what the claimant changed before list() settled', async () => {
    const repository = new InMemoryEntryRepository()
    await repository.replaceAll([entryFor('stored')])
    const store = createEntriesStore(repository)
    store.addEntry({ ...draft, employer: 'Test Employer A' })
    await flush()
    expect(store.entries.value.map((e) => e.employer)).toEqual(['Test Employer A'])
    expect(await repository.list()).toHaveLength(2)
  })

  it('never rewrites the whole repository after a failed write while unhydrated', async () => {
    const repository = new InMemoryEntryRepository()
    await repository.replaceAll([entryFor('stored')])
    vi.spyOn(repository, 'put').mockRejectedValueOnce(new Error('offline'))
    const store = createEntriesStore(repository)
    store.addEntry({ ...draft, employer: 'Test Employer A' })
    await vi.waitFor(() => expect(store.saveError.value).toBe(true))

    store.addEntry({ ...draft, employer: 'Test Employer B' })
    await flush()
    const ids = (await repository.list()).map((e) => e.id)
    expect(ids).toContain('stored')
    expect(ids).toHaveLength(2)
    expect(store.saveError.value).toBe(true)
  })

  it('resyncs the whole log after a failed write once it has hydrated', async () => {
    const repository = new InMemoryEntryRepository()
    await repository.replaceAll([entryFor('stored')])
    const store = createEntriesStore(repository)
    await vi.waitFor(() => expect(store.entries.value).toEqual([entryFor('stored')]))
    vi.spyOn(repository, 'put').mockRejectedValueOnce(new Error('offline'))
    store.addEntry({ ...draft, employer: 'Test Employer A' })
    await vi.waitFor(() => expect(store.saveError.value).toBe(true))

    store.addEntry({ ...draft, employer: 'Test Employer B' })
    await vi.waitFor(() => expect(store.saveError.value).toBe(false))
    expect((await repository.list()).map((e) => e.employer)).toEqual([
      'Test Employer',
      'Test Employer A',
      'Test Employer B',
    ])
  })

  it('never seeds sample data over its contents, even in a demo build', async () => {
    vi.stubEnv('VITE_DEMO_DATA', '1')
    vi.resetModules()
    const { createEntriesStore: createDemoStore } = await import('./useEntries')
    const repository = new InMemoryEntryRepository()
    await repository.replaceAll([entryFor('stored')])
    const store = createDemoStore(repository)
    expect(store.isDemoData).toBe(false)
    await flush()
    expect(await repository.list()).toEqual([entryFor('stored')])
    expect(store.entries.value).toEqual([entryFor('stored')])
  })
})

describe('useEntries over an adapter with onReconciled', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_DEMO_DATA', undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  /** A fake with a synchronous mirror, like LocalServerRepository's, whose list we trigger by hand. */
  function setup(initial: Entry[] = []) {
    const inner = new InMemoryEntryRepository()
    let listener: (entries: Entry[]) => void = () => {}
    const repository = {
      loadSync: () => initial,
      list: () => inner.list(),
      put: vi.fn((e: Entry) => inner.put(e)),
      remove: vi.fn((id: string) => inner.remove(id)),
      replaceAll: vi.fn((all: Entry[]) => inner.replaceAll(all)),
      onReconciled: (l: (entries: Entry[]) => void) => {
        listener = l
        return () => {}
      },
    }
    const store = createEntriesStore(repository)
    return { store, repository, reconcile: (list: Entry[]) => listener(list) }
  }
  const at = (id: string, updatedAt: string, notes = '') => ({ ...entryFor(id), updatedAt, notes })

  it('a later server updatedAt replaces the in-memory entry', () => {
    const { store, reconcile } = setup([at('a', '2000-01-01T00:00:00.000Z', 'mine')])
    reconcile([at('a', '2000-02-01T00:00:00.000Z', 'theirs')])
    expect(store.entries.value[0].notes).toBe('theirs')
  })

  it('a later in-memory updatedAt is kept', () => {
    const { store, reconcile } = setup([at('a', '2000-03-01T00:00:00.000Z', 'mine')])
    reconcile([at('a', '2000-02-01T00:00:00.000Z', 'theirs')])
    expect(store.entries.value[0].notes).toBe('mine')
  })

  it('adds an entry that exists only on the server', () => {
    const { store, reconcile } = setup([entryFor('a')])
    reconcile([entryFor('a'), entryFor('s')])
    expect(store.entries.value.map((e) => e.id)).toEqual(['a', 's'])
  })

  it('never removes an entry the list lacks, and never writes back', () => {
    const { store, repository, reconcile } = setup([entryFor('a'), entryFor('b')])
    reconcile([entryFor('a')])
    expect(store.entries.value.map((e) => e.id)).toEqual(['a', 'b'])
    expect(repository.replaceAll).not.toHaveBeenCalled()
    expect(repository.put).not.toHaveBeenCalled()
  })

  it('does not bring back an id removed this session', async () => {
    const { store, repository, reconcile } = setup([entryFor('a')])
    store.removeEntry('a')
    await vi.waitFor(() => expect(repository.remove).toHaveBeenCalled())
    reconcile([entryFor('a')])
    expect(store.entries.value).toEqual([])
  })

  it('does not bring back entries cleared this session', () => {
    const { store, reconcile } = setup([entryFor('a')])
    store.clearAll()
    reconcile([entryFor('a')])
    expect(store.entries.value).toEqual([])
  })

  it('stays unhydrated until the first list: no replaceAll after a failed write', async () => {
    const { store, repository, reconcile } = setup([entryFor('a')])
    repository.put.mockRejectedValueOnce(new Error('disk'))
    store.addEntry({ ...draft, employer: 'Test Employer A' })
    await vi.waitFor(() => expect(store.saveError.value).toBe(true))
    store.addEntry({ ...draft, employer: 'Test Employer B' })
    await flush()
    expect(repository.replaceAll).not.toHaveBeenCalled()

    reconcile([entryFor('s')])
    store.addEntry({ ...draft, employer: 'Test Employer C' })
    await vi.waitFor(() => expect(repository.replaceAll).toHaveBeenCalledTimes(1))
    expect(repository.replaceAll.mock.calls[0][0].map((e: Entry) => e.id)).toContain('s')
  })
})
