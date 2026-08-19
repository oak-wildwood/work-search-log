import { describe, expect, it } from 'vitest'
import {
  GENERIC_US_CODE,
  genericConfig,
  getStateConfig,
  isStale,
  listStateConfigs,
  resolveActivity,
} from './index'
import type { Entry } from '../types'

function entry(partial: Partial<Entry>): Entry {
  return {
    id: 'x',
    date: '2026-08-10',
    activity: '',
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
    ...partial,
  }
}

describe('getStateConfig', () => {
  it('loads a bundled state', () => {
    const { config, isFallback } = getStateConfig('TX')
    expect(config.code).toBe('TX')
    expect(config.agencyShort).toBe('TWC')
    expect(isFallback).toBe(false)
  })

  it('falls back to the generic config for an unknown state, flagging it', () => {
    const { config, isFallback } = getStateConfig('ZZ')
    expect(config.code).toBe(GENERIC_US_CODE)
    expect(isFallback).toBe(true)
  })

  it('uses the generic config without flagging when no state is set', () => {
    const { config, isFallback } = getStateConfig(null)
    expect(config.code).toBe(GENERIC_US_CODE)
    expect(isFallback).toBe(false)
  })
})

describe('bundled configs', () => {
  it('ships the generic fallback plus at least TX and WA', () => {
    const codes = listStateConfigs().map((c) => c.code)
    expect(codes).toContain('TX')
    expect(codes).toContain('WA')
    expect(codes).not.toContain(GENERIC_US_CODE)
  })

  it('never presets a weekly count anywhere in a state config', () => {
    for (const config of [genericConfig, ...listStateConfigs()]) {
      expect(config).not.toHaveProperty('total')
      expect(config).not.toHaveProperty('minPerWeek')
    }
  })

  it('always requires a date, whatever the config says', () => {
    for (const config of [genericConfig, ...listStateConfigs()]) {
      expect(config.requiredFields).toContain('date')
    }
  })

  it('gives every activity type a recognized category', () => {
    for (const config of [genericConfig, ...listStateConfigs()]) {
      for (const activity of config.activityTypes) {
        expect(['employer_contact', 'approved_activity', 'registration']).toContain(
          activity.countsAs,
        )
      }
    }
  })

  it('splits employer contacts from approved activities in WA', () => {
    const wa = getStateConfig('WA').config
    const categories = new Set(wa.activityTypes.map((a) => a.countsAs))
    expect(categories.has('employer_contact')).toBe(true)
    expect(categories.has('approved_activity')).toBe(true)
  })

  it('caps an activity per claim only where the agency actually says repeats do not count', () => {
    // ESD states it plainly: "You cannot repeat the exact same activity and have
    // it count." Signing up with WorkSource is a one-time act, so it is capped.
    const wa = getStateConfig('WA').config
    expect(wa.activityTypes.find((a) => a.id === 'worksource_registration')?.maxPerClaim).toBe(1)

    // TWC publishes no equivalent rule — neither its work search requirements page
    // nor its own log form mentions a cap — so TX asserts none. Inventing one would
    // discount a claimant's own logged activity on our say-so.
    const tx = getStateConfig('TX').config
    expect(tx.activityTypes.find((a) => a.id === 'registration')?.maxPerClaim).toBeUndefined()
  })
})

describe('weeklyRequirement', () => {
  it('carries the number where the state fixes one statewide', () => {
    const wa = getStateConfig('WA').config
    expect(wa.requirementSource).toBe('state')
    expect(wa.weeklyRequirement).toBe(3)
  })

  it('leaves it unset where the count varies by county', () => {
    const tx = getStateConfig('TX').config
    expect(tx.requirementSource).toBe('county')
    expect(tx.weeklyRequirement).toBeUndefined()
  })

  it('never presumes a number for the generic fallback', () => {
    expect(genericConfig.weeklyRequirement).toBeUndefined()
  })

  it('offers a lookup link where the claimant has to find their own number', () => {
    expect(getStateConfig('TX').config.requirementLookupUrl).toContain('twc.texas.gov')
  })
})

describe('isStale', () => {
  const base = { ...genericConfig }

  it('treats a never-verified config as stale', () => {
    expect(isStale({ ...base, lastVerified: null })).toBe(true)
  })

  it('treats a recently verified config as current', () => {
    expect(isStale({ ...base, lastVerified: '2026-08-01' }, new Date('2026-08-11'))).toBe(false)
  })

  it('treats a config verified over a year ago as stale', () => {
    expect(isStale({ ...base, lastVerified: '2025-01-01' }, new Date('2026-08-11'))).toBe(true)
  })
})

describe('resolveActivity', () => {
  const tx = getStateConfig('TX').config

  it('matches on activity id', () => {
    expect(resolveActivity(tx, entry({ activityId: 'apply_online' }))?.label).toBe(
      'Applied online for a job',
    )
  })

  it('falls back to the stored label for entries logged before ids existed', () => {
    expect(resolveActivity(tx, entry({ activity: 'Applied online for a job' }))?.id).toBe(
      'apply_online',
    )
  })

  it('returns null for an activity this state does not define', () => {
    expect(resolveActivity(tx, entry({ activity: 'Walked a dog' }))).toBeNull()
  })
})
