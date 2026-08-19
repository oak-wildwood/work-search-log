import type { Entry } from '../types'
import type { ActivityType, CountsAs, FieldId, RequirementSource, StateConfig } from './types'
import { isFieldId } from './types'
import { parseLocalISO } from '../lib/weeks'

export const GENERIC_US_CODE = 'GENERIC_US'

/** A config whose values were last checked longer ago than this renders a staleness notice. */
export const STALE_AFTER_MONTHS = 12

const COUNTS_AS: readonly CountsAs[] = ['employer_contact', 'approved_activity', 'registration']
const REQUIREMENT_SOURCES: readonly RequirementSource[] = ['state', 'county', 'letter']

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function posInt(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined
}

function strList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && !!v) : []
}

function normalizeActivity(raw: unknown): ActivityType | null {
  const rec = asRecord(raw)
  const id = str(rec.id)
  if (!id) return null
  const countsAsRaw = str(rec.counts_as)
  const activity: ActivityType = {
    id,
    label: str(rec.label, id),
    // An unrecognized category still counts toward the weekly total, just not as an
    // employer contact — an unknown value must never make an activity unloggable.
    countsAs: (COUNTS_AS as readonly string[]).includes(countsAsRaw)
      ? (countsAsRaw as CountsAs)
      : 'approved_activity',
  }
  const maxPerClaim = posInt(rec.max_per_claim)
  const maxPerWeek = posInt(rec.max_per_week)
  if (maxPerClaim !== undefined) activity.maxPerClaim = maxPerClaim
  if (maxPerWeek !== undefined) activity.maxPerWeek = maxPerWeek
  if (bool(rec.offline)) activity.offline = true
  return activity
}

function normalizeConfig(raw: unknown): StateConfig | null {
  const rec = asRecord(raw)
  const code = str(rec.code)
  if (!code) return null

  const weekStartDayRaw = rec.week_start_day
  const weekStartDay =
    typeof weekStartDayRaw === 'number' && weekStartDayRaw >= 0 && weekStartDayRaw <= 6
      ? Math.floor(weekStartDayRaw)
      : 0

  const requirementSourceRaw = str(rec.requirement_source)

  const config: StateConfig = {
    code,
    agencyName: str(rec.agency_name, 'your state workforce agency'),
    agencyShort: str(rec.agency_short, str(rec.agency_name, 'your state agency')),
    weekStartDay,
    requirementSource: (REQUIREMENT_SOURCES as readonly string[]).includes(requirementSourceRaw)
      ? (requirementSourceRaw as RequirementSource)
      : 'letter',
    jurisdictionLabel: str(rec.jurisdiction_label, 'Local office / area'),
    claimIdLabel: str(rec.claim_id_label, 'Claim number'),
    hasOnlineLogging: bool(rec.has_online_logging),
    activityTypes: Array.isArray(rec.activity_types)
      ? rec.activity_types.map(normalizeActivity).filter((a): a is ActivityType => a !== null)
      : [],
    contactMethods: strList(rec.contact_methods),
    resultOptions: strList(rec.result_options),
    siteOptions: strList(rec.site_options),
    // Only ids this build knows how to render survive; an unknown one would otherwise
    // become a required field with no input attached to it.
    requiredFields: strList(rec.required_fields).filter((f): f is FieldId => isFieldId(f)),
    duplicateEmployerCounts: bool(rec.duplicate_employer_counts, true),
    retention: str(rec.retention, 'for your entire benefit year'),
    lastVerified: str(rec.last_verified) || null,
  }

  const officialLogUrl = str(rec.official_log_url)
  const rulesUrl = str(rec.rules_url)
  const requirementLookupUrl = str(rec.requirement_lookup_url)
  if (officialLogUrl) config.officialLogUrl = officialLogUrl
  if (rulesUrl) config.rulesUrl = rulesUrl
  if (requirementLookupUrl) config.requirementLookupUrl = requirementLookupUrl

  // Only honoured for `state`, so a config can't quietly presume a number in a
  // place where it actually varies by county or by claimant.
  const weeklyRequirement = posInt(rec.weekly_requirement)
  if (weeklyRequirement !== undefined && config.requirementSource === 'state') {
    config.weeklyRequirement = weeklyRequirement
  }

  // Date is the one field nothing can degrade past: an undated record isn't a record.
  if (!config.requiredFields.includes('date')) config.requiredFields.unshift('date')

  return config
}

const modules = import.meta.glob('./states/*.json', { eager: true, import: 'default' })

const registry = new Map<string, StateConfig>()
for (const raw of Object.values(modules)) {
  const config = normalizeConfig(raw)
  if (config) registry.set(config.code, config)
}

/**
 * Last-resort config, used when even GENERIC_US failed to load. Built by handing
 * the normalizer nothing but a code, so it can only ever be the normalizer's own
 * defaults — spelling them out again here would let the two drift apart.
 */
const MINIMAL_FALLBACK = normalizeConfig({ code: GENERIC_US_CODE }) as StateConfig

export const genericConfig: StateConfig = registry.get(GENERIC_US_CODE) ?? MINIMAL_FALLBACK

export interface ResolvedConfig {
  config: StateConfig
  /** True when no config was bundled for the requested state and GENERIC_US stood in. */
  isFallback: boolean
}

/**
 * Resolves a state code to its config. An unknown or missing code falls back to
 * GENERIC_US rather than failing — the tool has to stay usable in all 50 states.
 */
export function getStateConfig(code: string | null | undefined): ResolvedConfig {
  if (!code) return { config: genericConfig, isFallback: false }
  const config = registry.get(code)
  return config ? { config, isFallback: false } : { config: genericConfig, isFallback: true }
}

/** Every bundled state config except the generic fallback, for a state picker. */
export function listStateConfigs(): StateConfig[] {
  return [...registry.values()]
    .filter((c) => c.code !== GENERIC_US_CODE)
    .sort((a, b) => a.code.localeCompare(b.code))
}

/**
 * Whether a config's values are old enough (or unverified) to warrant a notice.
 * Stale rules are this tool's main failure mode, so staleness is made visible
 * rather than treated as impossible.
 */
export function isStale(config: StateConfig, now = new Date()): boolean {
  if (!config.lastVerified) return true
  const verified = parseLocalISO(config.lastVerified)
  if (Number.isNaN(verified.getTime())) return true
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() - STALE_AFTER_MONTHS)
  return verified < cutoff
}

/**
 * Lookups for `resolveActivity`, built once per config. Entries logged before
 * activity ids existed resolve by label, and that runs for every entry of every
 * week on each rescore — scanning and lowercasing the whole activity list each
 * time would do that work again and again for a config that never changes.
 */
interface ActivityIndex {
  byId: Map<string, ActivityType>
  byLabel: Map<string, ActivityType>
}

// Keyed weakly so a config built in a test doesn't outlive the test.
const indexes = new WeakMap<StateConfig, ActivityIndex>()

function indexOf(config: StateConfig): ActivityIndex {
  let index = indexes.get(config)
  if (!index) {
    index = { byId: new Map(), byLabel: new Map() }
    for (const activity of config.activityTypes) {
      index.byId.set(activity.id, activity)
      index.byLabel.set(activity.label.trim().toLowerCase(), activity)
    }
    indexes.set(config, index)
  }
  return index
}

/**
 * Finds the activity type behind an entry. Matches on id first, then falls back to
 * the stored label so entries logged before activity ids existed — or under a
 * different state's config — still resolve where the label happens to line up.
 */
export function resolveActivity(config: StateConfig, entry: Entry): ActivityType | null {
  const { byId, byLabel } = indexOf(config)
  if (entry.activityId) {
    const match = byId.get(entry.activityId)
    if (match) return match
  }
  const label = entry.activity?.trim().toLowerCase()
  if (!label) return null
  return byLabel.get(label) ?? null
}
