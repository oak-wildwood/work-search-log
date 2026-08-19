import { describe, expect, it } from 'vitest'
import { evaluateWeeks, findExemptPeriod, resolveRequirement } from './requirements'
import { groupByWeek } from './weeks'
import type { RequirementSchedule, StateConfig } from '../config/types'
import type { Entry } from '../types'

const config: StateConfig = {
  code: 'TEST',
  agencyName: 'Test Agency',
  agencyShort: 'TA',
  weekStartDay: 0,
  requirementSource: 'letter',
  jurisdictionLabel: 'County',
  claimIdLabel: 'Claim number',
  hasOnlineLogging: false,
  activityTypes: [
    { id: 'apply_online', label: 'Applied online', countsAs: 'employer_contact' },
    { id: 'workshop', label: 'Attended workshop', countsAs: 'approved_activity' },
    { id: 'registration', label: 'Registered', countsAs: 'registration', maxPerClaim: 1 },
    { id: 'search', label: 'Searched listings', countsAs: 'approved_activity', maxPerWeek: 1 },
  ],
  contactMethods: [],
  resultOptions: [],
  siteOptions: [],
  requiredFields: ['date', 'activity_type'],
  duplicateEmployerCounts: true,
  retention: 'benefit_year',
  lastVerified: null,
}

function makeEntry(date: string, activityId: string, extra: Partial<Entry> = {}): Entry {
  const type = config.activityTypes.find((a) => a.id === activityId)
  return {
    id: `${date}-${activityId}-${Math.random()}`,
    date,
    activityId,
    activity: type?.label ?? activityId,
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
    ...extra,
  }
}

function schedule(
  requirements: RequirementSchedule['requirements'],
  exemptPeriods: RequirementSchedule['exemptPeriods'] = [],
): RequirementSchedule {
  return { requirements, exemptPeriods }
}

function statusFor(entries: Entry[], sched: RequirementSchedule, weekKey: string) {
  const statuses = evaluateWeeks(groupByWeek(entries), config, sched)
  return statuses.get(weekKey)
}

describe('resolveRequirement', () => {
  it('picks the most recent requirement effective on or before the week start', () => {
    const sched = schedule([
      { effective: '2026-01-01', total: 2, minEmployerContacts: null },
      { effective: '2026-08-16', total: 4, minEmployerContacts: null },
    ])
    expect(resolveRequirement(sched, '2026-08-09')?.total).toBe(2)
    expect(resolveRequirement(sched, '2026-08-16')?.total).toBe(4)
  })

  it('returns null when no requirement covers the week', () => {
    const sched = schedule([{ effective: '2026-08-16', total: 4, minEmployerContacts: null }])
    expect(resolveRequirement(sched, '2026-08-09')).toBeNull()
  })
})

describe('findExemptPeriod', () => {
  const sched = schedule([], [{ start: '2026-09-06', end: '2026-09-26', reason: 'Temp layoff' }])

  it('matches a week inside the period', () => {
    expect(findExemptPeriod(sched, '2026-09-13', '2026-09-19')?.reason).toBe('Temp layoff')
  })

  it('ignores weeks either side of the period', () => {
    expect(findExemptPeriod(sched, '2026-08-30', '2026-09-05')).toBeNull()
    expect(findExemptPeriod(sched, '2026-09-27', '2026-10-03')).toBeNull()
  })

  it('matches a week the period only partly covers', () => {
    const partial = schedule([], [{ start: '2026-09-09', end: '2026-09-11', reason: 'Training' }])
    expect(findExemptPeriod(partial, '2026-09-06', '2026-09-12')?.reason).toBe('Training')
  })
})

describe('evaluateWeeks', () => {
  const week = '2026-08-09' // Sunday

  it('marks a week met once the required count is reached', () => {
    const entries = [
      makeEntry('2026-08-10', 'apply_online'),
      makeEntry('2026-08-11', 'apply_online'),
      makeEntry('2026-08-12', 'workshop'),
    ]
    const sched = schedule([{ effective: week, total: 3, minEmployerContacts: null }])
    const status = statusFor(entries, sched, week)
    expect(status?.outcome).toBe('met')
    expect(status?.counted).toBe(3)
  })

  it('reports unknown, not short, when no requirement is on file', () => {
    const entries = [makeEntry('2026-08-10', 'apply_online')]
    const status = statusFor(entries, schedule([]), week)
    expect(status?.outcome).toBe('unknown')
    expect(status?.required).toBeNull()
  })

  it('does not retroactively fail a week when the requirement rises later', () => {
    const entries = [makeEntry('2026-08-10', 'apply_online'), makeEntry('2026-08-11', 'workshop')]
    const sched = schedule([
      { effective: '2026-01-01', total: 2, minEmployerContacts: null },
      { effective: '2026-08-16', total: 5, minEmployerContacts: null },
    ])
    expect(statusFor(entries, sched, week)?.outcome).toBe('met')
  })

  it('falls short when the total is met but employer contacts are not', () => {
    const entries = [
      makeEntry('2026-08-10', 'apply_online'),
      makeEntry('2026-08-11', 'workshop'),
      makeEntry('2026-08-12', 'workshop'),
    ]
    const sched = schedule([{ effective: week, total: 3, minEmployerContacts: 2 }])
    const status = statusFor(entries, sched, week)
    expect(status?.counted).toBe(3)
    expect(status?.employerContacts).toBe(1)
    expect(status?.outcome).toBe('short')
  })

  it('counts a per-claim capped activity only in the first week that uses it', () => {
    const entries = [
      makeEntry('2026-08-10', 'registration'),
      makeEntry('2026-08-17', 'registration'),
    ]
    const sched = schedule([{ effective: '2026-01-01', total: 1, minEmployerContacts: null }])
    const statuses = evaluateWeeks(groupByWeek(entries), config, sched)
    expect(statuses.get('2026-08-09')?.counted).toBe(1)
    const later = statuses.get('2026-08-16')
    expect(later?.counted).toBe(0)
    expect(later?.logged).toBe(1)
    expect(later?.notices.join(' ')).toMatch(/per claim/)
  })

  it('applies a per-week cap without discarding the logged entries', () => {
    const entries = [
      makeEntry('2026-08-10', 'search'),
      makeEntry('2026-08-11', 'search'),
      makeEntry('2026-08-12', 'search'),
    ]
    const sched = schedule([{ effective: week, total: 3, minEmployerContacts: null }])
    const status = statusFor(entries, sched, week)
    expect(status?.logged).toBe(3)
    expect(status?.counted).toBe(1)
    expect(status?.outcome).toBe('short')
  })

  it('still counts an activity the config does not recognize', () => {
    const entries = [
      makeEntry('2026-08-10', 'not_in_config', { activity: 'Something this state never listed' }),
      makeEntry('2026-08-11', 'apply_online'),
    ]
    const sched = schedule([{ effective: week, total: 2, minEmployerContacts: null }])
    const status = statusFor(entries, sched, week)
    expect(status?.counted).toBe(2)
    expect(status?.employerContacts).toBe(1)
    expect(status?.outcome).toBe('met')
  })

  it('resolves a legacy entry that has a label but no activity id', () => {
    const legacy = makeEntry('2026-08-10', 'apply_online')
    delete legacy.activityId
    const sched = schedule([{ effective: week, total: 1, minEmployerContacts: null }])
    expect(statusFor([legacy], sched, week)?.employerContacts).toBe(1)
  })

  it('reports an exempt week instead of a shortfall', () => {
    const entries = [makeEntry('2026-08-10', 'apply_online')]
    const sched = schedule(
      [{ effective: week, total: 3, minEmployerContacts: null }],
      [{ start: '2026-08-09', end: '2026-08-15', reason: 'Temporary layoff' }],
    )
    const status = statusFor(entries, sched, week)
    expect(status?.outcome).toBe('exempt')
    expect(status?.exemptReason).toBe('Temporary layoff')
  })

  it('warns about a repeat employer without subtracting it', () => {
    const strict: StateConfig = { ...config, duplicateEmployerCounts: false }
    const entries = [
      makeEntry('2026-08-10', 'apply_online', { employer: 'Acme', jobType: 'Driver' }),
      makeEntry('2026-08-11', 'apply_online', { employer: 'acme', jobType: 'driver' }),
    ]
    const sched = schedule([{ effective: week, total: 2, minEmployerContacts: null }])
    const status = evaluateWeeks(groupByWeek(entries), strict, sched).get(week)
    expect(status?.counted).toBe(2)
    expect(status?.notices).toHaveLength(1)
    expect(status?.notices[0]).toMatch(/acme/i)
  })
})
