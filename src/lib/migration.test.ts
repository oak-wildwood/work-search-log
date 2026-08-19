import { describe, expect, it } from 'vitest'
import { evaluateWeek } from './requirements'
import { groupByWeek } from './weeks'
import { getStateConfig, resolveActivity } from '../config'
import type { Entry } from '../types'
import type { RequirementSchedule } from '../config/types'

/**
 * Guards the upgrade path for logs written before state configs existed, when the
 * activity list was a hardcoded array and entries stored only a label. Those logs
 * are real records someone is relying on, so an upgrade must never make an
 * already-logged entry stop counting.
 *
 * These labels are verbatim from the pre-config build, and tx.json and
 * generic-us.json deliberately reuse that wording so those entries still resolve.
 * Changing a label in either config breaks these tests on purpose — that is the
 * alarm, not a nuisance.
 */
const LEGACY_LABELS = [
  'Applied online for a job',
  'Applied in person for a job',
  'Registered with a workforce center or job board',
  'Searched job listings online',
  'Followed up on a job contact',
  'Registered with private employment agency',
  'Mailed application or résumé',
  'Attended job fair / networking event',
  'Attended employment workshop',
  'Interview with employer',
  'Other reemployment activity',
] as const

/** An entry as the pre-config build wrote it: a label, and no activityId at all. */
function legacyEntry(date: string, activity: string): Entry {
  return {
    id: `${date}-${activity}`,
    date,
    activity,
    siteAppliedOn: 'WorkInTexas.com',
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

function scheduleOf(total: number): RequirementSchedule {
  return {
    requirements: [{ effective: '1970-01-01', total, minEmployerContacts: null }],
    exemptPeriods: [],
  }
}

describe('logs written before state configs existed', () => {
  it('still resolve to a category, because TX kept the pre-config wording', () => {
    // tx.json's labels are deliberately the old build's wording, so entries logged
    // before ids existed keep their category instead of going unclassified.
    const tx = getStateConfig('TX').config
    expect(resolveActivity(tx, legacyEntry('2026-08-11', 'Applied online for a job'))?.id).toBe(
      'apply_online',
    )
    expect(
      resolveActivity(
        tx,
        legacyEntry('2026-08-11', 'Registered with a workforce center or job board'),
      )?.id,
    ).toBe('registration')
  })

  it('counts an activity no config defines, rather than dropping the record', () => {
    // The guarantee that matters on any upgrade: an unrecognized activity still
    // counts toward the week. A config must never erase a record someone made.
    const tx = getStateConfig('TX').config
    const entry = legacyEntry('2026-08-11', 'Some activity no config has ever defined')
    expect(resolveActivity(tx, entry)).toBeNull()

    const [week] = groupByWeek([entry], tx.weekStartDay)
    expect(evaluateWeek(week, tx, scheduleOf(1)).counted).toBe(1)
  })

  it('counts every legacy label, so no activity is silently dropped', () => {
    const tx = getStateConfig('TX').config
    const entries = LEGACY_LABELS.map((label) => legacyEntry('2026-08-11', label))
    const [week] = groupByWeek(entries, tx.weekStartDay)

    expect(evaluateWeek(week, tx, scheduleOf(1)).counted).toBe(LEGACY_LABELS.length)
  })

  it('groups legacy entries into the same weeks the old build did', () => {
    // The pre-config build always cut weeks on Sunday. TX must still do that, or
    // entries would silently move between weeks on upgrade.
    const tx = getStateConfig('TX').config
    expect(tx.weekStartDay).toBe(0)

    const entries = [
      legacyEntry('2026-08-09', LEGACY_LABELS[0]), // Sunday
      legacyEntry('2026-08-15', LEGACY_LABELS[1]), // Saturday
      legacyEntry('2026-08-16', LEGACY_LABELS[2]), // next Sunday
    ]
    const weeks = groupByWeek(entries, tx.weekStartDay)

    expect(weeks.map((w) => w.key)).toEqual(['2026-08-16', '2026-08-09'])
    expect(weeks.find((w) => w.key === '2026-08-09')?.entries).toHaveLength(2)
  })

  it('keeps resolving labels that a config still spells the same way', () => {
    // generic-us.json inherited the old wording, so those entries keep their
    // category — and with it employer-contact classification and per-claim caps.
    const generic = getStateConfig(null).config
    const entry = legacyEntry('2026-08-11', 'Applied online for a job')
    expect(resolveActivity(generic, entry)?.id).toBe('apply_online')
  })
})
