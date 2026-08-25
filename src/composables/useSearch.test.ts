import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { useSearch } from './useSearch'
import { useEntries } from './useEntries'
import type { Entry } from '../types'

function makeEntry(id: string, activity: string): Entry {
  return {
    id,
    date: '2026-08-10',
    activityId: '',
    activity,
    siteAppliedOn: '',
    jobType: '',
    employer: '',
    address: '',
    phone: '',
    contactName: '',
    contactMethod: '',
    result: '',
    notes: '',
    createdAt: '',
    updatedAt: '',
  }
}

const { replaceAll, clearAll } = useEntries()
const { searchQuery, matchCount, activeIndex, next, prev } = useSearch()

async function search(term: string) {
  searchQuery.value = term
  await nextTick()
}

describe('useSearch', () => {
  beforeEach(async () => {
    clearAll()
    await search('')
  })

  it('wraps next() past the last match back to the first', async () => {
    replaceAll([
      makeEntry('a', 'Applied online for a job'),
      makeEntry('b', 'Applied in person for a job'),
      makeEntry('c', 'Applied online for a job'),
    ])
    await search('applied')
    expect(matchCount.value).toBe(3)
    expect(activeIndex.value).toBe(0)

    next()
    expect(activeIndex.value).toBe(1)
    next()
    expect(activeIndex.value).toBe(2)
    next()
    expect(activeIndex.value).toBe(0)
  })

  it('wraps prev() past the first match to the last', async () => {
    replaceAll([
      makeEntry('a', 'Applied online for a job'),
      makeEntry('b', 'Applied in person for a job'),
    ])
    await search('applied')
    expect(activeIndex.value).toBe(0)

    prev()
    expect(activeIndex.value).toBe(1)
    prev()
    expect(activeIndex.value).toBe(0)
  })

  it('does nothing on next()/prev() when there are no matches', async () => {
    replaceAll([makeEntry('a', 'Attended workshop')])
    await search('applied')
    expect(matchCount.value).toBe(0)

    next()
    expect(activeIndex.value).toBe(0)
    prev()
    expect(activeIndex.value).toBe(0)
  })

  it('resets the active index to 0 whenever the match set changes', async () => {
    replaceAll([
      makeEntry('a', 'Applied online for a job'),
      makeEntry('b', 'Applied in person for a job'),
    ])
    await search('applied')
    next()
    expect(activeIndex.value).toBe(1)

    await search('workshop')
    expect(matchCount.value).toBe(0)
    expect(activeIndex.value).toBe(0)
  })
})
