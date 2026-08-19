import type { Entry } from '../types'

/**
 * How an activity counts toward a week's requirement. Some states require that a
 * portion of the weekly total be actual employer contacts rather than workshops,
 * résumé uploads, or networking events.
 */
export type CountsAs = 'employer_contact' | 'approved_activity' | 'registration'

/**
 * Where the weekly required count comes from. Anything other than `state` means
 * the number varies per claimant, so the UI must ask them to read it off their
 * determination letter rather than offering a default.
 */
export type RequirementSource = 'state' | 'county' | 'letter'

export interface ActivityType {
  id: string
  label: string
  countsAs: CountsAs
  /** Counts at most this many times across the whole claim (e.g. job-bank registration). */
  maxPerClaim?: number
  /** Counts at most this many times in any one week. */
  maxPerWeek?: number
  /** Not done through a job site or board, so the "Site or source" field is hidden. */
  offline?: boolean
}

export interface SubmissionInfo {
  portalUrl?: string
  acceptsMail: boolean
  acceptsFax: boolean
}

/**
 * Layer 3 — everything that varies by state. Shipped as one JSON file per state
 * under `src/config/states/`, contributable by PR.
 */
export interface StateConfig {
  code: string
  agencyName: string
  agencyShort: string
  /** 0 = Sunday. */
  weekStartDay: number
  requirementSource: RequirementSource
  /**
   * The weekly count, where the state fixes one for everybody. Only meaningful
   * when `requirementSource` is `state`; anywhere else the number varies per
   * claimant and presuming one would be worse than asking. Offered as a starting
   * value, never silently applied — the claimant's letter always wins.
   */
  weeklyRequirement?: number
  /** Where a claimant looks up their own number when the state doesn't fix one. */
  requirementLookupUrl?: string
  jurisdictionLabel: string
  claimIdLabel: string
  /** True when the state records work search in its own portal and this tool is only a backup copy. */
  hasOnlineLogging: boolean
  activityTypes: ActivityType[]
  contactMethods: string[]
  resultOptions: string[]
  siteOptions: string[]
  requiredFields: FieldId[]
  duplicateEmployerCounts: boolean
  retention: string
  officialLogUrl?: string
  rulesUrl?: string
  submission?: SubmissionInfo
  /** yyyy-mm-dd the values were last checked against the agency's own page. Null when never verified. */
  lastVerified: string | null
}

/**
 * The fields an entry can carry, as referenced by a state config's
 * `required_fields`. Ids are stable across states; labels and requiredness are not.
 */
export const FIELD_IDS = [
  'date',
  'activity_type',
  'site_or_source',
  'job_sought',
  'employer_name',
  'employer_contact_info',
  'employer_phone',
  'contact_name',
  'contact_method',
  'result',
  'notes',
] as const

export type FieldId = (typeof FIELD_IDS)[number]

/** Maps a config field id onto the key it occupies in a stored entry. */
export const FIELD_ENTRY_KEYS: Record<FieldId, keyof Entry> = {
  date: 'date',
  activity_type: 'activity',
  site_or_source: 'siteAppliedOn',
  job_sought: 'jobType',
  employer_name: 'employer',
  employer_contact_info: 'address',
  employer_phone: 'phone',
  contact_name: 'contactName',
  contact_method: 'contactMethod',
  result: 'result',
  notes: 'notes',
}

export function isFieldId(value: string): value is FieldId {
  return (FIELD_IDS as readonly string[]).includes(value)
}

/**
 * Layer 2 — the requirement schedule. Effective-dated, because the required count
 * can change mid-claim and a change must never retroactively mark past weeks as
 * failing.
 */
export interface RequirementEntry {
  /** yyyy-mm-dd this count took effect. */
  effective: string
  /** Minimum activities per week. Null means the claimant hasn't supplied it yet — never presume a number. */
  total: number | null
  /** How many of `total` must be employer contacts. Null where the state doesn't split categories. */
  minEmployerContacts: number | null
}

/** A stretch of weeks that legitimately requires no activity. */
export interface ExemptPeriod {
  /** yyyy-mm-dd, inclusive. */
  start: string
  /** yyyy-mm-dd, inclusive. */
  end: string
  reason: string
}

export interface RequirementSchedule {
  requirements: RequirementEntry[]
  exemptPeriods: ExemptPeriod[]
}
