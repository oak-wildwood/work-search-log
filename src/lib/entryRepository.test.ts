import { beforeEach, describe, expect, it, vi } from 'vitest'
import { describeEntryRepositoryContract } from './entryRepositoryContract'
import {
  InMemoryEntryRepository,
  LocalStorageEntryRepository,
  STORAGE_KEY,
} from './entryRepository'

describeEntryRepositoryContract('InMemoryEntryRepository', () => new InMemoryEntryRepository())

describeEntryRepositoryContract('LocalStorageEntryRepository', () => {
  localStorage.clear()
  return new LocalStorageEntryRepository()
})

describe('LocalStorageEntryRepository', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('loadSync is null before anything is stored, then the stored list', async () => {
    const repo = new LocalStorageEntryRepository()
    expect(repo.loadSync()).toBeNull()
    await repo.replaceAll([])
    expect(repo.loadSync()).toEqual([])
  })

  it('writes under the shared storage key', async () => {
    await new LocalStorageEntryRepository().replaceAll([])
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[]')
  })

  it('rejects when the write fails', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await expect(new LocalStorageEntryRepository().replaceAll([])).rejects.toThrow()
  })
})
