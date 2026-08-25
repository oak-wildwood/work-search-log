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
import { parseLocalISO } from '../lib/weeks'

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

// `normalizeConfig` is deliberately permissive at runtime — a bad config must never
// stop someone recording what they did. These assert on the raw JSON instead, before
// the fallbacks can paper over a contributor's mistake (e.g. `activity_type` instead
// of `activity_types`, which would otherwise load, register, and render an empty
// dropdown with no error anywhere).
const KNOWN_CONFIG_KEYS = new Set([
  'code',
  'agency_name',
  'agency_short',
  'week_start_day',
  'requirement_source',
  'weekly_requirement',
  'requirement_lookup_url',
  'jurisdiction_label',
  'claim_id_label',
  'has_online_logging',
  'activity_types',
  'contact_methods',
  'result_options',
  'site_options',
  'required_fields',
  'duplicate_employer_counts',
  'retention',
  'official_log_url',
  'rules_url',
  'last_verified',
])

type RawStateConfig = Record<string, unknown>

const rawStateModules = import.meta.glob('./states/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, RawStateConfig>

describe('bundled config files (raw JSON, before normalization)', () => {
  for (const [path, raw] of Object.entries(rawStateModules)) {
    describe(path, () => {
      it('has no unrecognized top-level keys', () => {
        const unknown = Object.keys(raw).filter((key) => !KNOWN_CONFIG_KEYS.has(key))
        expect(unknown, `${path} has unrecognized key(s): ${unknown.join(', ')}`).toEqual([])
      })

      it('defines at least one activity type, each with a non-empty id and label', () => {
        const activities = Array.isArray(raw.activity_types) ? raw.activity_types : []
        expect(
          activities.length,
          `${path}: activity_types must be a non-empty array`,
        ).toBeGreaterThan(0)
        activities.forEach((activity: unknown, i: number) => {
          const rec = (activity ?? {}) as Record<string, unknown>
          expect(
            typeof rec.id === 'string' && rec.id.trim() !== '',
            `${path}: activity_types[${i}] is missing a non-empty id`,
          ).toBe(true)
          expect(
            typeof rec.label === 'string' && rec.label.trim() !== '',
            `${path}: activity_types[${i}] (id: ${String(rec.id)}) is missing a non-empty label`,
          ).toBe(true)
        })
      })

      it('has unique activity ids', () => {
        const activities = Array.isArray(raw.activity_types) ? raw.activity_types : []
        const ids = activities.map((a: unknown) => (a as Record<string, unknown>)?.id)
        const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
        expect(
          duplicates,
          `${path} has duplicate activity id(s): ${duplicates.join(', ')}`,
        ).toEqual([])
      })

      it('has a week_start_day that is an integer from 0 to 6', () => {
        const value = raw.week_start_day
        expect(
          typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6,
          `${path}: week_start_day must be an integer 0-6, got ${JSON.stringify(value)}`,
        ).toBe(true)
      })

      it('only sets weekly_requirement when requirement_source is "state"', () => {
        const hasWeeklyRequirement =
          Object.hasOwn(raw, 'weekly_requirement') && raw.weekly_requirement !== null
        if (raw.requirement_source === 'state') {
          expect(
            hasWeeklyRequirement,
            `${path}: requirement_source is "state" but weekly_requirement is missing`,
          ).toBe(true)
        } else {
          expect(
            hasWeeklyRequirement,
            `${path}: requirement_source is "${String(raw.requirement_source)}", so weekly_requirement must not be set — it only applies where the state fixes a number for everybody`,
          ).toBe(false)
        }
      })

      // GENERIC_US isn't tied to any one agency's page, so it's the one config
      // allowed to ship without a source to verify against — every real state
      // config needs one.
      it.skipIf(raw.code === GENERIC_US_CODE)(
        'has a rules_url pointing at the agency source',
        () => {
          expect(
            typeof raw.rules_url === 'string' && raw.rules_url.trim() !== '',
            `${path}: rules_url is required — set it to the official page the values came from`,
          ).toBe(true)
        },
      )

      it.skipIf(raw.code === GENERIC_US_CODE)(
        'has a parseable, non-future last_verified date',
        () => {
          const value = raw.last_verified
          expect(
            typeof value === 'string' && value.trim() !== '',
            `${path}: last_verified is required`,
          ).toBe(true)
          const parsed = parseLocalISO(value as string)
          expect(
            !Number.isNaN(parsed.getTime()),
            `${path}: last_verified "${String(value)}" is not a parseable date`,
          ).toBe(true)
          expect(
            parsed.getTime() <= Date.now(),
            `${path}: last_verified "${String(value)}" is in the future`,
          ).toBe(true)
        },
      )
    })
  }
})
