import { describe, expect, it } from 'vitest'
import { formatWeekRange, groupByWeek, parseLocalISO, weekStartDate } from './weeks'
import type { Entry } from '../types'

function makeEntry(date: string, id = date): Entry {
  return {
    id,
    date,
    activity: 'Applied online for a job',
    siteAppliedOn: '',
    jobType: '',
    employer: '',
    address: '',
    phone: '',
    contactName: '',
    contactMethod: '',
    result: '',
    notes: '',
    createdAt: date,
    updatedAt: date,
  }
}

describe('formatWeekRange', () => {
  it('condenses a range within the same month', () => {
    const range = formatWeekRange(parseLocalISO('2026-08-16'), parseLocalISO('2026-08-22'))
    expect(range).toBe('Aug 16–22, 2026')
  })

  it('spells out both ends across a month boundary', () => {
    const range = formatWeekRange(parseLocalISO('2026-08-30'), parseLocalISO('2026-09-05'))
    expect(range).toBe('Aug 30, 2026 – Sep 5, 2026')
  })

  it('spells out both ends across a year boundary', () => {
    const range = formatWeekRange(parseLocalISO('2026-12-28'), parseLocalISO('2027-01-03'))
    expect(range).toBe('Dec 28, 2026 – Jan 3, 2027')
  })
})

describe('weekStartDate', () => {
  it('returns the same date when given a Sunday', () => {
    const start = weekStartDate('2026-08-09') // a Sunday
    expect(start.getDay()).toBe(0)
    expect(start.getDate()).toBe(9)
  })

  it('rolls back to the preceding Sunday for a mid-week date', () => {
    const start = weekStartDate('2026-08-12') // Wednesday
    expect(start.getDay()).toBe(0)
    expect(start.getDate()).toBe(9)
  })

  it('rolls back correctly across a month boundary', () => {
    const start = weekStartDate('2026-09-01') // Tuesday
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(7) // August, 0-indexed
    expect(start.getDate()).toBe(30)
  })

  it('honours a non-Sunday week start', () => {
    // Monday-start week: Sunday belongs to the week that began the day before.
    const fromSunday = weekStartDate('2026-08-09', 1)
    expect(fromSunday.getDay()).toBe(1)
    expect(fromSunday.getDate()).toBe(3)

    const fromWednesday = weekStartDate('2026-08-12', 1)
    expect(fromWednesday.getDate()).toBe(10)
  })
})

describe('groupByWeek', () => {
  it('puts entries in the same week together', () => {
    const entries = [makeEntry('2026-08-09'), makeEntry('2026-08-12'), makeEntry('2026-08-14')]
    const groups = groupByWeek(entries)
    expect(groups).toHaveLength(1)
    expect(groups[0].entries).toHaveLength(3)
  })

  it('splits entries either side of a week boundary into separate groups', () => {
    const entries = [makeEntry('2026-08-08'), makeEntry('2026-08-09')]
    const groups = groupByWeek(entries)
    expect(groups).toHaveLength(2)
  })

  it('orders groups most recent week first', () => {
    const entries = [makeEntry('2026-08-02'), makeEntry('2026-08-16')]
    const groups = groupByWeek(entries)
    expect(groups[0].start.getDate()).toBe(16)
    expect(groups[1].start.getDate()).toBe(2)
  })

  it('orders entries within a group most recent first', () => {
    const entries = [makeEntry('2026-08-10'), makeEntry('2026-08-12'), makeEntry('2026-08-11')]
    const groups = groupByWeek(entries)
    expect(groups[0].entries.map((e) => e.date)).toEqual(['2026-08-12', '2026-08-11', '2026-08-10'])
  })

  it('splits weeks on the configured start day', () => {
    const entries = [makeEntry('2026-08-09'), makeEntry('2026-08-10')] // Sunday, Monday
    expect(groupByWeek(entries, 0)).toHaveLength(1)
    expect(groupByWeek(entries, 1)).toHaveLength(2)
  })
})
