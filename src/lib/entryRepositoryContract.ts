import { beforeEach, describe, expect, it } from 'vitest'
import type { Entry } from '../types'
import type { EntryRepository } from './entryRepository'

// Deliberately synthetic — nothing here should read like a real employer.
function makeEntry(id: string, overrides: Partial<Entry> = {}): Entry {
  return {
    id,
    date: '2000-01-03',
    activityId: 'test-activity',
    activity: 'Test activity',
    siteAppliedOn: 'test-site.invalid',
    jobType: 'Test job type',
    employer: `Test Employer ${id}`,
    address: '0 Test Way',
    phone: '000-000-0000',
    contactName: 'Test Contact',
    contactMethod: 'test',
    result: 'test result',
    notes: 'test notes',
    createdAt: '2000-01-03T00:00:00.000Z',
    updatedAt: '2000-01-04T00:00:00.000Z',
    ...overrides,
  }
}

/**
 * Behavior every EntryRepository adapter must share. Adapter test files call
 * this with a factory returning a fresh, empty repository.
 */
export function describeEntryRepositoryContract(
  name: string,
  factory: () => EntryRepository | Promise<EntryRepository>,
) {
  describe(`EntryRepository contract: ${name}`, () => {
    let repo: EntryRepository

    beforeEach(async () => {
      repo = await factory()
    })

    it('starts empty', async () => {
      expect(await repo.list()).toEqual([])
    })

    it('put creates an entry', async () => {
      const entry = makeEntry('a')
      await repo.put(entry)
      expect(await repo.list()).toEqual([entry])
    })

    it('put with an existing id replaces without duplicating', async () => {
      await repo.put(makeEntry('a'))
      await repo.put(makeEntry('b'))
      const changed = makeEntry('a', { notes: 'changed', updatedAt: '2000-02-01T00:00:00.000Z' })
      await repo.put(changed)
      const all = await repo.list()
      expect(all).toHaveLength(2)
      expect(all.find((e) => e.id === 'a')).toEqual(changed)
    })

    it('remove deletes the entry', async () => {
      await repo.put(makeEntry('a'))
      await repo.put(makeEntry('b'))
      await repo.remove('a')
      expect((await repo.list()).map((e) => e.id)).toEqual(['b'])
    })

    it('remove of an unknown id is a no-op', async () => {
      await repo.put(makeEntry('a'))
      await expect(repo.remove('missing')).resolves.toBeUndefined()
      expect((await repo.list()).map((e) => e.id)).toEqual(['a'])
    })

    it('list returns everything written', async () => {
      const written = [makeEntry('a'), makeEntry('b'), makeEntry('c')]
      for (const e of written) await repo.put(e)
      expect(await repo.list()).toEqual(expect.arrayContaining(written))
      expect(await repo.list()).toHaveLength(3)
    })

    it('replaceAll replaces exactly', async () => {
      await repo.put(makeEntry('a'))
      await repo.put(makeEntry('b'))
      const next = [makeEntry('c'), makeEntry('d')]
      await repo.replaceAll(next)
      expect(await repo.list()).toEqual(next)
      await repo.replaceAll([])
      expect(await repo.list()).toEqual([])
    })

    it('round-trips entries byte-for-byte', async () => {
      const full = makeEntry('a')
      // Entries logged before activity ids existed have no activityId key.
      const { activityId: _omitted, ...legacy } = makeEntry('b')
      void _omitted
      await repo.replaceAll([full, legacy])
      const back = await repo.list()
      expect(JSON.stringify(back)).toBe(JSON.stringify([full, legacy]))
      expect(back[0].activityId).toBe('test-activity')
      expect(back[0].createdAt).toBe(full.createdAt)
      expect(back[0].updatedAt).toBe(full.updatedAt)
      expect('activityId' in back[1]).toBe(false)
    })
  })
}
